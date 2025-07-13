import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

/**
 * Obsługuje żądanie DELETE - usuwa wszystkich użytkowników
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function DELETE({ request }) {
  try {
    // Odczytaj aktualną listę użytkowników
    const data = await fs.readFile(USERS_FILE, "utf-8");
    const users = JSON.parse(data);
    const deletedCount = users.length;

    // Sprawdź czy jakiś użytkownik ma przypisany sprzęt
    const equipmentPath = path.join(process.cwd(), "data", "equipment.json");
    try {
      const equipmentData = await fs.readFile(equipmentPath, "utf-8");
      const equipment = JSON.parse(equipmentData);

      // Usuń przypisania użytkowników ze sprzętu
      const updatedEquipment = equipment.map((/** @type {any} */ item) => {
        if (item.assignedUser) {
          return {
            ...item,
            assignedUser: null,
            assignedTo: null,
          };
        }
        return item;
      });

      // Zapisz zaktualizowany sprzęt
      await fs.writeFile(
        equipmentPath,
        JSON.stringify(updatedEquipment, null, 2),
        "utf-8"
      );
    } catch (equipmentError) {
      console.warn("Could not update equipment assignments:", equipmentError);
    }

    // Usuń wszystkich użytkowników (zapisz pustą tablicę)
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2), "utf-8");

    return json({
      message: "All users deleted successfully",
      deletedCount: deletedCount,
    });
  } catch (error) {
    console.error("Error in DELETE /api/users/deleteAll:", error);
    return json({ error: "Failed to delete all users" }, { status: 500 });
  }
}
