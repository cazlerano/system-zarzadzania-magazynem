import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

const HISTORY_FILE = path.join(process.cwd(), "data", "history.json");

/**
 * Obsługuje żądanie DELETE - usuwa całą historię
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function DELETE({ request }) {
  try {
    // Odczytaj aktualną historię
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    const history = JSON.parse(data);
    const deletedCount = history.length;

    // Usuń całą historię (zapisz pustą tablicę)
    await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2), "utf-8");

    return json({
      message: "All history deleted successfully",
      deletedCount: deletedCount,
    });
  } catch (error) {
    console.error("Error in DELETE /api/history/deleteAll:", error);
    return json({ error: "Failed to delete all history" }, { status: 500 });
  }
}
