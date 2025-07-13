import { json } from "@sveltejs/kit";
import fs from "fs";
import path from "path";
import { writeFile, readdir, stat, unlink } from "fs/promises";

// Configuration
const CONFIG = {
	paths: {
		documentsDir: path.join(process.cwd(), "documents"),
		documentsData: path.join(process.cwd(), "data", "documents.json")
	},
	validation: {
		maxFileSize: 10 * 1024 * 1024, // 10MB
		allowedTypes: [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		]
	},
	defaults: {
		categoryId: 1 // "Ogólne" category
	},
	messages: {
		errors: {
			noFiles: "No files provided",
			invalidId: "Document ID is required",
			documentNotFound: "Document not found",
			loadDataFailed: "Failed to load documents data",
			uploadFailed: "Failed to upload documents",
			deleteFailed: "Failed to delete document"
		},
		success: {
			deleted: "Document deleted successfully"
		}
	}
};

// Types
/** @typedef {{id: number, name: string, filename: string, size: string, type: string, categoryId: number, uploadDate: string, description: string}} Document */

// Utility functions
/**
 * @returns {Promise<Document[]>}
 */
async function loadDocuments() {
	try {
		const data = await fs.promises.readFile(CONFIG.paths.documentsData, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		return [];
	}
}

/**
 * @param {Document[]} documents
 */
async function saveDocuments(documents) {
	await writeFile(CONFIG.paths.documentsData, JSON.stringify(documents, null, 2));
}

/**
 * @param {Document[]} documents
 * @returns {number}
 */
function getNextDocumentId(documents) {
	return documents.length > 0 
		? Math.max(...documents.map(d => d.id)) + 1 
		: 1;
}

/**
 * @param {File} file
 * @returns {{valid: boolean, error?: string}}
 */
function validateFile(file) {
	if (!file || file.size === 0) {
		return { valid: false, error: "Empty file" };
	}

	if (!CONFIG.validation.allowedTypes.includes(file.type)) {
		return { valid: false, error: `Invalid file type: ${file.type}` };
	}

	if (file.size > CONFIG.validation.maxFileSize) {
		return { valid: false, error: `File too large: ${file.name}` };
	}

	return { valid: true };
}

/**
 * @param {string} filename
 * @returns {string}
 */
function generateUniqueFilename(filename) {
	const timestamp = Date.now();
	const extension = path.extname(filename);
	const baseName = path.basename(filename, extension);
	return `${timestamp}_${baseName}${extension}`;
}

/**
 * @param {File} file
 * @param {number} categoryId
 * @param {number} id
 * @returns {Document}
 */
function createDocumentData(file, categoryId, id) {
	const uniqueFilename = generateUniqueFilename(file.name);
	
	return {
		id,
		name: file.name,
		filename: uniqueFilename,
		size: file.size.toString(),
		type: file.type,
		categoryId,
		uploadDate: new Date().toISOString(),
		description: ""
	};
}

/**
 * @param {File} file
 * @param {string} filename
 */
async function saveFileToDisc(file, filename) {
	const filePath = path.join(CONFIG.paths.documentsDir, filename);
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer);
}

/**
 * @param {string} filename
 */
async function deleteFileFromDisc(filename) {
	try {
		const filePath = path.join(CONFIG.paths.documentsDir, filename);
		await unlink(filePath);
	} catch (error) {
		console.warn(`Could not delete file ${filename}:`, error);
	}
}

/**
 * @param {number} documentId
 * @param {Document[]} documents
 * @returns {number}
 */
function findDocumentIndex(documentId, documents) {
	return documents.findIndex(d => d.id === documentId);
}

/**
 * @param {string} message
 * @param {number} status
 */
function errorResponse(message, status = 500) {
	return json({ error: message }, { status });
}

/**
 * @param {any} data
 */
function successResponse(data) {
	return json(data);
}

// Initialize directories
async function initializeDirectories() {
	// Ensure documents directory exists
	if (!fs.existsSync(CONFIG.paths.documentsDir)) {
		fs.mkdirSync(CONFIG.paths.documentsDir, { recursive: true });
	}

	// Ensure documents data file exists
	if (!fs.existsSync(CONFIG.paths.documentsData)) {
		await writeFile(CONFIG.paths.documentsData, JSON.stringify([]));
	}
}

// Initialize on module load
await initializeDirectories();

/**
 * GET handler for documents
 */
export async function GET() {
	try {
		const documents = await loadDocuments();
		return successResponse(documents);
	} catch (error) {
		console.error("Error reading documents:", error);
		return successResponse([]);
	}
}

/**
 * POST handler for uploading documents
 */
export async function POST({ request }) {
	try {
		const data = await request.formData();
		const files = data.getAll("files");
		const categoryId = data.get("categoryId");

		if (!files || files.length === 0) {
			return errorResponse(CONFIG.messages.errors.noFiles, 400);
		}

		// Validate and parse categoryId
		const categoryIdNum = categoryId ? parseInt(categoryId.toString()) : CONFIG.defaults.categoryId;

		// Load existing documents
		const documents = await loadDocuments();
		let nextId = getNextDocumentId(documents);
		let uploadedCount = 0;

		for (const fileEntry of files) {
			// Type guard to ensure we're working with File objects
			if (!(fileEntry instanceof File)) {
				console.warn(`Skipping non-file entry`);
				continue;
			}
			
			const file = fileEntry;
			const validation = validateFile(file);
			if (!validation.valid) {
				console.warn(`Skipping file: ${validation.error}`);
				continue;
			}

			try {
				// Create document data
				const documentData = createDocumentData(file, categoryIdNum, nextId++);
				
				// Save file to disk
				await saveFileToDisc(file, documentData.filename);
				
				// Add to documents array
				documents.push(documentData);
				uploadedCount++;

				console.log(`Uploaded document: ${file.name} (${file.size} bytes)`);
			} catch (error) {
				console.error(`Error uploading file ${file.name}:`, error);
			}
		}

		// Save updated documents data
		await saveDocuments(documents);

		return successResponse({
			uploaded: uploadedCount,
			total: files.length,
			message: `Uploaded ${uploadedCount} out of ${files.length} files`
		});
	} catch (error) {
		console.error("Error uploading documents:", error);
		return errorResponse(CONFIG.messages.errors.uploadFailed);
	}
}

/**
 * DELETE handler for deleting documents
 */
export async function DELETE({ request }) {
	try {
		const { id } = await request.json();

		if (!id) {
			return errorResponse(CONFIG.messages.errors.invalidId, 400);
		}

		// Load documents data
		const documents = await loadDocuments();
		
		// Find document
		const documentIndex = findDocumentIndex(id, documents);
		if (documentIndex === -1) {
			return errorResponse(CONFIG.messages.errors.documentNotFound, 404);
		}

		const document = documents[documentIndex];

		// Delete file from filesystem
		await deleteFileFromDisc(document.filename);

		// Remove from data array
		documents.splice(documentIndex, 1);

		// Save updated data
		await saveDocuments(documents);

		return successResponse({ 
			success: true, 
			message: CONFIG.messages.success.deleted 
		});
	} catch (error) {
		console.error("Error deleting document:", error);
		return errorResponse(CONFIG.messages.errors.deleteFailed);
	}
}
