import fs from "fs";
import path from "path";

// Configuration
const CONFIG = {
	paths: {
		documentsDir: path.join(process.cwd(), "documents"),
		documentsData: path.join(process.cwd(), "data", "documents.json")
	},
	messages: {
		errors: {
			documentsNotFound: "Documents data not found",
			documentNotFound: "Document not found", 
			fileNotFound: "File not found on disk",
			serverError: "Internal server error"
		}
	},
	defaults: {
		contentType: "application/octet-stream"
	}
};

// Types
/** @typedef {{id: number, name: string, filename: string, type: string, size: string}} Document */

// Utility functions
/**
 * @returns {Promise<Document[]>}
 */
async function loadDocuments() {
	try {
		const data = await fs.promises.readFile(CONFIG.paths.documentsData, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		throw new Error(CONFIG.messages.errors.documentsNotFound);
	}
}

/**
 * @param {number} documentId
 * @param {Document[]} documents
 * @returns {Document | null}
 */
function findDocumentById(documentId, documents) {
	return documents.find(d => d.id === documentId) || null;
}

/**
 * @param {string} filename
 * @returns {boolean}
 */
function fileExists(filename) {
	const filePath = path.join(CONFIG.paths.documentsDir, filename);
	return fs.existsSync(filePath);
}

/**
 * @param {string} filename
 * @returns {Promise<Buffer>}
 */
async function readDocumentFile(filename) {
	const filePath = path.join(CONFIG.paths.documentsDir, filename);
	return await fs.promises.readFile(filePath);
}

/**
 * @param {Document} document
 * @returns {Headers}
 */
function createDownloadHeaders(document) {
	const headers = new Headers();
	headers.set("Content-Type", document.type || CONFIG.defaults.contentType);
	headers.set("Content-Disposition", `attachment; filename="${document.name}"`);
	headers.set("Content-Length", document.size);
	return headers;
}

/**
 * @param {string} message
 * @param {number} status
 */
function errorResponse(message, status) {
	return new Response(message, { status });
}

/**
 * @param {Buffer} fileBuffer
 * @param {Headers} headers
 */
function successResponse(fileBuffer, headers) {
	return new Response(fileBuffer, { status: 200, headers });
}

/**
 * @param {{ params: { id: string } }} request
 */
export async function GET({ params }) {
	try {
		const documentId = parseInt(params.id);

		// Validate document ID
		if (isNaN(documentId)) {
			return errorResponse(CONFIG.messages.errors.documentNotFound, 400);
		}

		// Load documents data
		const documents = await loadDocuments();

		// Find document
		const document = findDocumentById(documentId, documents);
		if (!document) {
			return errorResponse(CONFIG.messages.errors.documentNotFound, 404);
		}

		// Check if file exists on disk
		if (!fileExists(document.filename)) {
			return errorResponse(CONFIG.messages.errors.fileNotFound, 404);
		}

		// Read file and create response
		const fileBuffer = await readDocumentFile(document.filename);
		const headers = createDownloadHeaders(document);

		return successResponse(fileBuffer, headers);
	} catch (error) {
		console.error("Error downloading document:", error);
		
		// Handle specific error messages
		if (error instanceof Error && error.message === CONFIG.messages.errors.documentsNotFound) {
			return errorResponse(error.message, 404);
		}
		
		return errorResponse(CONFIG.messages.errors.serverError, 500);
	}
}
