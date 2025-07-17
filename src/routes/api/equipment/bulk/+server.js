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
 * Obsługuje żądania POST - dodaje wiele sprzętów jednocześnie
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function POST({ request }) {
  try {
    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return json(
        { error: "Items array is required and cannot be empty" },
        { status: 400 }
      );
    }

    console.log(`API Bulk: Masowy import ${items.length} pozycji sprzętu`);

    const equipment = await readEquipment();
    const existingSerialNumbers = new Set(equipment.map((e) => e.serialNumber));

    // Generuj nowe ID
    let maxId =
      equipment.length > 0 ? Math.max(...equipment.map((e) => e.id)) : 0;

    const results = {
      added: /** @type {Array<any>} */ ([]),
      skipped: /** @type {Array<any>} */ ([]),
      errors: /** @type {Array<any>} */ ([]),
    };

    for (const item of items) {
      try {
        // Walidacja danych
        if (!item.name || !item.type || !item.serialNumber) {
          results.errors.push({
            item: item,
            error: "Missing required fields (name, type, serialNumber)",
          });
          continue;
        }

        // Sprawdź duplikaty
        if (existingSerialNumbers.has(item.serialNumber)) {
          results.skipped.push({
            item: item,
            reason: "Duplicate serial number",
          });
          continue;
        }

        // Przygotuj nowy sprzęt
        const newEquipment = {
          id: ++maxId,
          name: item.name,
          type: item.type,
          serialNumber: item.serialNumber,
          inventoryNumber: item.inventoryNumber || "",
          roomLocation: item.roomLocation || "",
          status: "available",
          assignedTo: null,
          assignedDate: null,
          notes: "",
          lastModified: new Date().toISOString(),
        };

        equipment.push(newEquipment);
        existingSerialNumbers.add(item.serialNumber);
        results.added.push(newEquipment);

        console.log(
          `API Bulk: Dodano ${newEquipment.name} (ID: ${newEquipment.id})`
        );
      } catch (error) {
        console.error(`API Bulk: Błąd podczas przetwarzania sprzętu:`, error);
        results.errors.push({
          item: item,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Zapisz wszystkie zmiany jednorazowo
    await writeEquipment(equipment);

    console.log(
      `API Bulk: Import zakończony - dodano ${results.added.length}, pominięto ${results.skipped.length}, błędów ${results.errors.length}`
    );

    return json(
      {
        success: true,
        message: `Bulk import completed`,
        results: results,
        summary: {
          total: items.length,
          added: results.added.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/equipment/bulk:", error);
    return json({ error: "Failed to bulk import equipment" }, { status: 500 });
  }
}
