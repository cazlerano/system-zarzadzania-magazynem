import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

const HISTORY_FILE = path.join(process.cwd(), "data", "history.json");

/**
 * Odczytuje dane historii z pliku JSON
 * @returns {Promise<Array<any>>}
 */
async function readHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading history file:", error);
    return [];
  }
}

/**
 * Zapisuje dane historii do pliku JSON
 * @param {Array<any>} history
 */
async function writeHistory(history) {
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing history file:", error);
    throw error;
  }
}

/**
 * Obsługuje żądania GET - zwraca listę historii
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const history = await readHistory();
    return json(history);
  } catch (error) {
    console.error("Error in GET /api/history:", error);
    return json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania POST - dodaje nową pozycję do historii
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function POST({ request }) {
  try {
    const newHistoryItem = await request.json();
    const history = await readHistory();

    // Znajdź istniejący wpis dla danego sprzętu lub utwórz nowy
    let equipmentHistory = history.find(
      (h) => h.equipmentId === newHistoryItem.equipmentId
    );

    if (!equipmentHistory) {
      equipmentHistory = {
        equipmentId: newHistoryItem.equipmentId,
        events: [],
      };
      history.push(equipmentHistory);
    }

    // Dodaj nowe zdarzenie z timestampem
    const event = {
      ...newHistoryItem,
      date: new Date().toISOString(),
    };

    equipmentHistory.events.push(event);

    await writeHistory(history);

    return json(event, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/history:", error);
    return json({ error: "Failed to create history entry" }, { status: 500 });
  }
}
