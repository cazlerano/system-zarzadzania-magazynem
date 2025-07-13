import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

const EQUIPMENT_FILE = path.join(process.cwd(), "data", "equipment.json");

/**
 * Odczytuje dane sprzętu z pliku JSON
 * @returns {Promise<Array<any>>}
 */
async function readEquipment() {
  try {
    const data = await fs.readFile(EQUIPMENT_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading equipment file:", error);
    return [];
  }
}

/**
 * Zapisuje dane sprzętu do pliku JSON
 * @param {Array<any>} equipment
 */
async function writeEquipment(equipment) {
  try {
    await fs.writeFile(
      EQUIPMENT_FILE,
      JSON.stringify(equipment, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error writing equipment file:", error);
    throw error;
  }
}

/**
 * Obsługuje żądania GET - zwraca listę sprzętu
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const equipment = await readEquipment();
    return json(equipment);
  } catch (error) {
    console.error("Error in GET /api/equipment:", error);
    return json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania POST - dodaje nowy sprzęt
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function POST({ request }) {
  try {
    const newEquipment = await request.json();
    console.log(`API: Dodawanie sprzętu: ${newEquipment.name}`);

    const equipment = await readEquipment();

    // Generuj nowe ID
    const maxId =
      equipment.length > 0 ? Math.max(...equipment.map((e) => e.id)) : 0;
    newEquipment.id = maxId + 1;

    // Dodaj datę utworzenia/modyfikacji
    newEquipment.lastModified = new Date().toISOString();

    equipment.push(newEquipment);
    await writeEquipment(equipment);

    console.log(
      `API: Sprzęt dodany pomyślnie: ${newEquipment.name} (ID: ${newEquipment.id})`
    );
    return json(newEquipment, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/equipment:", error);
    return json({ error: "Failed to create equipment" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania PUT - aktualizuje sprzęt
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function PUT({ request }) {
  try {
    const updateData = await request.json();
    const equipment = await readEquipment();

    const equipmentIndex = equipment.findIndex((e) => e.id === updateData.id);
    if (equipmentIndex === -1) {
      return json({ error: "Equipment not found" }, { status: 404 });
    }

    // Dodaj datę modyfikacji
    updateData.lastModified = new Date().toISOString();

    equipment[equipmentIndex] = { ...equipment[equipmentIndex], ...updateData };
    await writeEquipment(equipment);

    return json(equipment[equipmentIndex]);
  } catch (error) {
    console.error("Error in PUT /api/equipment:", error);
    return json({ error: "Failed to update equipment" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania DELETE - usuwa sprzęt
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function DELETE({ request }) {
  try {
    const { id } = await request.json();
    const equipment = await readEquipment();

    const equipmentIndex = equipment.findIndex((e) => e.id === id);
    if (equipmentIndex === -1) {
      return json({ error: "Equipment not found" }, { status: 404 });
    }

    const deletedEquipment = equipment[equipmentIndex];

    // Sprawdź czy sprzęt jest przypisany do użytkownika
    if (deletedEquipment.assignedTo) {
      return json(
        {
          error:
            "Cannot delete equipment that is assigned to a user. Please unassign first.",
        },
        { status: 400 }
      );
    }

    equipment.splice(equipmentIndex, 1);
    await writeEquipment(equipment);

    return json({
      message: "Equipment deleted successfully",
      deletedEquipment,
    });
  } catch (error) {
    console.error("Error in DELETE /api/equipment:", error);
    return json({ error: "Failed to delete equipment" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania PATCH - masowe usuwanie całego sprzętu
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function PATCH({ request }) {
  try {
    const { action } = await request.json();

    if (action === "deleteAll") {
      const equipment = await readEquipment();

      // Sprawdź czy któryś sprzęt jest przypisany
      const hasAssignedEquipment = equipment.some((e) => e.assignedTo);
      if (hasAssignedEquipment) {
        return json(
          {
            error:
              "Cannot delete all equipment. Some equipment is assigned to users. Please unassign all equipment first.",
          },
          { status: 400 }
        );
      }

      const deletedCount = equipment.length;

      // Zapisz pustą tablicę
      await writeEquipment([]);

      return json({
        message: `Successfully deleted all ${deletedCount} equipment items`,
        deletedCount,
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in PATCH /api/equipment:", error);
    return json({ error: "Failed to delete all equipment" }, { status: 500 });
  }
}
