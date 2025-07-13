import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

// Configuration
const CONFIG = {
	files: {
		categories: path.join(process.cwd(), "data", "categories.json"),
		documents: path.join(process.cwd(), "data", "documents.json")
	},
	messages: {
		validation: {
			nameRequired: "Nazwa kategorii jest wymagana",
			nameExists: "Kategoria o tej nazwie już istnieje",
			notFound: "Kategoria nie znaleziona",
			hasDocuments: "Nie można usunąć kategorii zawierającej dokumenty"
		},
		errors: {
			create: "Błąd podczas tworzenia kategorii",
			update: "Błąd podczas aktualizacji kategorii",
			delete: "Błąd podczas usuwania kategorii"
		}
	}
};

// Types
/** @typedef {{id: number, name: string, description: string, createdDate: string}} Category */
/** @typedef {{id: number, categoryId: number}} Document */

// Utility functions
/**
 * @returns {Promise<Category[]>}
 */
async function loadCategories() {
	try {
		const data = await fs.readFile(CONFIG.files.categories, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		return [];
	}
}

/**
 * @param {Category[]} categories
 */
async function saveCategories(categories) {
	await fs.writeFile(CONFIG.files.categories, JSON.stringify(categories, null, 2));
}

/**
 * @returns {Promise<Document[]>}
 */
async function loadDocuments() {
	try {
		const data = await fs.readFile(CONFIG.files.documents, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		return [];
	}
}

/**
 * @param {string} name
 * @param {Category[]} categories
 * @param {number} excludeId
 */
function categoryNameExists(name, categories, excludeId = -1) {
	return categories.some(cat => 
		cat.id !== excludeId && cat.name.toLowerCase() === name.toLowerCase()
	);
}

/**
 * @param {number} categoryId
 * @param {Document[]} documents
 */
function categoryHasDocuments(categoryId, documents) {
	return documents.some(doc => doc.categoryId === categoryId);
}

/**
 * @param {Category[]} categories
 */
function getNextCategoryId(categories) {
	return categories.length > 0 
		? Math.max(...categories.map(c => c.id)) + 1 
		: 1;
}

/**
 * @param {string} name
 * @param {string} description
 * @returns {Category}
 */
function createCategory(name, description) {
	return {
		id: 0, // Will be set by caller
		name: name.trim(),
		description: description?.trim() || "",
		createdDate: new Date().toISOString()
	};
}

/**
 * @param {string} name
 */
function validateCategoryName(name) {
	if (!name || name.trim() === "") {
		return { valid: false, error: CONFIG.messages.validation.nameRequired };
	}
	return { valid: true, error: null };
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
	return json({ success: true, ...data });
}

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	try {
		const categories = await loadCategories();
		return json(categories);
	} catch (error) {
		console.error("Error reading categories:", error);
		return json([]);
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { name, description } = await request.json();

		// Validate input
		const validation = validateCategoryName(name);
		if (!validation.valid && validation.error) {
			return errorResponse(validation.error, 400);
		}

		// Load existing categories
		const categories = await loadCategories();

		// Check if category name already exists
		if (categoryNameExists(name, categories)) {
			return errorResponse(CONFIG.messages.validation.nameExists, 400);
		}

		// Create new category
		const newCategory = createCategory(name, description);
		newCategory.id = getNextCategoryId(categories);
		
		categories.push(newCategory);

		// Save categories
		await saveCategories(categories);

		return successResponse({ category: newCategory });
	} catch (error) {
		console.error("Error creating category:", error);
		return errorResponse(CONFIG.messages.errors.create);
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	try {
		const { id, name, description } = await request.json();

		// Validate input
		const validation = validateCategoryName(name);
		if (!validation.valid && validation.error) {
			return errorResponse(validation.error, 400);
		}

		// Load existing categories
		const categories = await loadCategories();

		// Find category to update
		const categoryIndex = categories.findIndex(cat => cat.id === id);
		if (categoryIndex === -1) {
			return errorResponse(CONFIG.messages.validation.notFound, 404);
		}

		// Check if new name conflicts with other categories
		if (categoryNameExists(name, categories, id)) {
			return errorResponse(CONFIG.messages.validation.nameExists, 400);
		}

		// Update category
		categories[categoryIndex] = {
			...categories[categoryIndex],
			name: name.trim(),
			description: description?.trim() || ""
		};

		// Save categories
		await saveCategories(categories);

		return successResponse({ category: categories[categoryIndex] });
	} catch (error) {
		console.error("Error updating category:", error);
		return errorResponse(CONFIG.messages.errors.update);
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request }) {
	try {
		const { id } = await request.json();

		// Load existing categories
		const categories = await loadCategories();

		// Find category to delete
		const categoryIndex = categories.findIndex(cat => cat.id === id);
		if (categoryIndex === -1) {
			return errorResponse(CONFIG.messages.validation.notFound, 404);
		}

		// Check if there are documents in this category
		const documents = await loadDocuments();
		if (categoryHasDocuments(id, documents)) {
			return errorResponse(CONFIG.messages.validation.hasDocuments, 400);
		}

		// Remove category
		const deletedCategory = categories[categoryIndex];
		categories.splice(categoryIndex, 1);

		// Save categories
		await saveCategories(categories);

		return successResponse({ deletedCategory });
	} catch (error) {
		console.error("Error deleting category:", error);
		return errorResponse(CONFIG.messages.errors.delete);
	}
}
