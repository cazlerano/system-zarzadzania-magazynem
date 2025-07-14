import { json } from "@sveltejs/kit";
import fs from "fs";
import path from "path";
import { writeFile, readdir, unlink } from "fs/promises";

// Configuration
const CONFIG = {
	paths: {
		documentsDir: path.join(process.cwd(), "documents"),
		documentsData: path.join(process.cwd(), "data", "documents.json")
	},
	messages: {
		info: {
			starting: "API: Usuwanie wszystkich dokumentów...",
			noDataFile: "No documents data file found, nothing to delete",
			fileDeleted: "Deleted file:",
			completed: "API: Usunięto"
		},
		errors: {
			deletingFiles: "Error deleting physical files:",
			deleteAll: "Error in DELETE /api/documents/deleteAll:",
			failedToDelete: "Failed to delete documents"
		},
		success: {
			deleted: "documents deleted successfully"
		}
	}
};

// Types
/** @typedef {{id: number, filename: string}} Document */

// Utility functions
/**
 * @returns {Promise<Document[]>}
 */
async function loadDocumentsData() {
	try {
		const data = await fs.promises.readFile(CONFIG.paths.documentsData, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		console.log(CONFIG.messages.info.noDataFile);
		return [];
	}
}

/**
 * @returns {Promise<void>}
 */
async function clearDocumentsData() {
	await writeFile(CONFIG.paths.documentsData, JSON.stringify([]));
}

/**
 * @returns {Promise<number>}
 */
async function deleteAllPhysicalFiles() {
	let deletedCount = 0;
	
	try {
		if (!fs.existsSync(CONFIG.paths.documentsDir)) {
			return deletedCount;
		}

		const files = await readdir(CONFIG.paths.documentsDir);
		
		for (const file of files) {
			await deletePhysicalFile(file);
			deletedCount++;
		}
	} catch (error) {
		console.error(CONFIG.messages.errors.deletingFiles, error);
		throw error;
	}
	
	return deletedCount;
}

/**
 * @param {string} filename
 */
async function deletePhysicalFile(filename) {
	const filePath = path.join(CONFIG.paths.documentsDir, filename);
	await unlink(filePath);
	console.log(`${CONFIG.messages.info.fileDeleted} ${filename}`);
}

/**
 * @param {number} deletedCount
 */
function createSuccessResponse(deletedCount) {
	return json({
		success: true,
		deletedCount,
		message: `${deletedCount} ${CONFIG.messages.success.deleted}`
	});
}

/**
 * @param {unknown} error
 */
function createErrorResponse(error) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	
	return json(
		{
			success: false,
			error: CONFIG.messages.errors.failedToDelete,
			details: errorMessage
		},
		{ status: 500 }
	);
}

/**
 * @param {number} count
 */
function logCompletion(count) {
	console.log(`${CONFIG.messages.info.completed} ${count} dokumentów`);
}

/**
 * Delete all documents and their data
 */
export async function DELETE() {
	try {
		console.log(CONFIG.messages.info.starting);

		// Load existing documents data (for completeness)
		await loadDocumentsData();

		// Delete all physical files from documents directory
		const deletedCount = await deleteAllPhysicalFiles();

		// Clear documents data file
		await clearDocumentsData();

		// Log completion
		logCompletion(deletedCount);

		return createSuccessResponse(deletedCount);
	} catch (error) {
		console.error(CONFIG.messages.errors.deleteAll, error);
		return createErrorResponse(error);
	}
}
