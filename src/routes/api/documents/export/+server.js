import { json, error } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";
import * as archiver from "archiver";

// Configuration
const CONFIG = {
	paths: {
		documents: path.join(process.cwd(), "documents"),
		documentsData: path.join(process.cwd(), "data", "documents.json"),
		categoriesData: path.join(process.cwd(), "data", "categories.json")
	},
	archive: {
		compressionLevel: 9,
		type: "zip"
	},
	messages: {
		errors: {
			noDocuments: "Brak dokumentów do eksportu",
			archiveError: "Błąd podczas tworzenia archiwum",
			exportError: "Błąd podczas eksportu dokumentów"
		}
	},
	defaults: {
		unknownCategory: "Nieznana",
		unknownFirm: "nieznana_firma",
		allDocuments: "wszystkie_dokumenty"
	}
};

// Types
/** @typedef {{id: number, name: string, filename: string, categoryId: number}} Document */
/** @typedef {{id: number, name: string}} Category */

// Utility functions
/**
 * @returns {Promise<Document[]>}
 */
async function loadDocuments() {
	const documentsData = await fs.readFile(CONFIG.paths.documentsData, "utf8");
	return JSON.parse(documentsData);
}

/**
 * @returns {Promise<Category[]>}
 */
async function loadCategories() {
	const categoriesData = await fs.readFile(CONFIG.paths.categoriesData, "utf8");
	return JSON.parse(categoriesData);
}

/**
 * @param {Document[]} documents
 * @param {string | null} categoryId
 * @returns {Document[]}
 */
function filterDocumentsByCategory(documents, categoryId) {
	if (!categoryId) return documents;
	
	const parsedCategoryId = parseInt(categoryId);
	return documents.filter(doc => doc.categoryId === parsedCategoryId);
}

/**
 * @param {number} categoryId
 * @param {Category[]} categories
 * @returns {string}
 */
function getCategoryName(categoryId, categories) {
	const category = categories.find(cat => cat.id === categoryId);
	return category?.name || CONFIG.defaults.unknownCategory;
}

/**
 * @param {string} filename
 * @returns {string}
 */
function sanitizeFilename(filename) {
	return filename.replace(/[<>:"/\\|?*]/g, "_");
}

/**
 * @param {string | null} categoryId
 * @param {Category[]} categories
 * @returns {string}
 */
function generateExportFilename(categoryId, categories) {
	const categoryName = categoryId
		? getCategoryName(parseInt(categoryId), categories) || CONFIG.defaults.unknownFirm
		: CONFIG.defaults.allDocuments;
	
	const safeCategoryName = sanitizeFilename(categoryName);
	const date = new Date().toISOString().split("T")[0];
	
	return `dokumenty_${safeCategoryName}_${date}.zip`;
}

/**
 * @returns {any}
 */
function createArchive() {
	// @ts-ignore - archiver default export issue
	return archiver.default(CONFIG.archive.type, {
		zlib: { level: CONFIG.archive.compressionLevel }
	});
}

/**
 * @param {any} archive
 * @returns {Promise<Buffer>}
 */
function archiveToBuffer(archive) {
	return new Promise((resolve, reject) => {
		/** @type {Buffer[]} */
		const chunks = [];
		
		archive.on("data", (/** @type {Buffer} */ chunk) => chunks.push(chunk));
		archive.on("error", (/** @type {any} */ err) => {
			console.error("Archive error:", err);
			reject(new Error(CONFIG.messages.errors.archiveError));
		});
		archive.on("end", () => {
			resolve(Buffer.concat(chunks));
		});
	});
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {Document} document
 * @param {any} archive
 * @param {Category[]} categories
 */
async function addDocumentToArchive(document, archive, categories) {
	const filePath = path.join(CONFIG.paths.documents, document.filename);
	
	try {
		// Check if file exists
		if (!(await fileExists(filePath))) {
			console.error(`File not found: ${document.filename}`);
			return;
		}

		// Read file
		const fileBuffer = await fs.readFile(filePath);

		// Get category name for folder structure
		const categoryName = getCategoryName(document.categoryId, categories);
		const safeCategoryName = sanitizeFilename(categoryName);
		const safeFileName = sanitizeFilename(document.name);

		// Add file to archive with folder structure
		archive.append(fileBuffer, {
			name: `${safeCategoryName}/${safeFileName}`
		});
	} catch (fileError) {
		console.error(`Error reading file ${document.filename}:`, fileError);
		// Continue with other files, don't fail the entire export
	}
}

/**
 * @param {Buffer} zipBuffer
 * @param {string} filename
 */
function createZipResponse(zipBuffer, filename) {
	return new Response(zipBuffer, {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": zipBuffer.length.toString()
		}
	});
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const categoryId = url.searchParams.get("categoryId");

		// Load data
		const [documents, categories] = await Promise.all([
			loadDocuments(),
			loadCategories()
		]);

		// Filter documents if categoryId is provided
		const filteredDocuments = filterDocumentsByCategory(documents, categoryId);

		if (filteredDocuments.length === 0) {
			throw error(404, CONFIG.messages.errors.noDocuments);
		}

		// Create and setup archive
		const archive = createArchive();
		const bufferPromise = archiveToBuffer(archive);

		// Add files to archive
		for (const document of filteredDocuments) {
			await addDocumentToArchive(document, archive, categories);
		}

		// Finalize archive
		await archive.finalize();

		// Get buffer and create response
		const zipBuffer = await bufferPromise;
		const filename = generateExportFilename(categoryId, categories);

		return createZipResponse(zipBuffer, filename);
	} catch (err) {
		console.error("Export error:", err);
		// @ts-ignore
		if (err && typeof err === "object" && "status" in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, CONFIG.messages.errors.exportError);
	}
}
