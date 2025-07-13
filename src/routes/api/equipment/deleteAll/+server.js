import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

const EQUIPMENT_FILE = path.join(process.cwd(), "data", "equipment.json");

/**
 * Obsługuje żądanie DELETE - usuwa cały sprzęt
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function DELETE({ request }) {
  try {
    // Odczytaj aktualną listę sprzętu
    const data = await fs.readFile(EQUIPMENT_FILE, "utf-8");
    const equipment = JSON.parse(data);
    const deletedCount = equipment.length;

    // Usuń cały sprzęt (zapisz pustą tablicę)
    await fs.writeFile(EQUIPMENT_FILE, JSON.stringify([], null, 2), "utf-8");

    return json({
      message: "All equipment deleted successfully",
      deletedCount: deletedCount,
    });
  } catch (error) {
    console.error("Error in DELETE /api/equipment/deleteAll:", error);
    return json({ error: "Failed to delete all equipment" }, { status: 500 });
  }
}
