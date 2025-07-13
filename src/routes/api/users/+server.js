import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

/**
 * Odczytuje dane użytkowników z pliku JSON
 * @returns {Promise<Array<any>>}
 */
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading users file:", error);
    return [];
  }
}

/**
 * Zapisuje dane użytkowników do pliku JSON
 * @param {Array<any>} users
 */
async function writeUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing users file:", error);
    throw error;
  }
}

/**
 * Obsługuje żądania GET - zwraca listę użytkowników
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const users = await readUsers();
    return json(users);
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania POST - dodaje nowego użytkownika
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function POST({ request }) {
  try {
    const newUser = await request.json();
    const users = await readUsers();

    // Generuj nowe ID
    const maxId = users.length > 0 ? Math.max(...users.map((u) => u.id)) : 0;
    newUser.id = maxId + 1;

    users.push(newUser);
    await writeUsers(users);

    return json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users:", error);
    return json({ error: "Failed to create user" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania DELETE - usuwa użytkownika
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function DELETE({ request }) {
  try {
    const { id } = await request.json();
    const users = await readUsers();

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return json({ error: "User not found" }, { status: 404 });
    }

    // Sprawdź czy użytkownik ma przypisany sprzęt
    // Wczytaj sprzęt żeby sprawdzić
    const equipmentPath = path.join(process.cwd(), "data", "equipment.json");
    try {
      const equipmentData = await fs.readFile(equipmentPath, "utf-8");
      const equipment = JSON.parse(equipmentData);

      const hasAssignedEquipment = equipment.some(
        /** @param {any} item */
        (item) => item.assignedUser && item.assignedUser.id === id
      );

      if (hasAssignedEquipment) {
        return json(
          {
            error:
              "Cannot delete user who has assigned equipment. Please unassign all equipment first.",
          },
          { status: 400 }
        );
      }
    } catch (equipmentError) {
      console.warn("Could not check equipment assignments:", equipmentError);
    }

    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);
    await writeUsers(users);

    return json({ message: "User deleted successfully", deletedUser });
  } catch (error) {
    console.error("Error in DELETE /api/users:", error);
    return json({ error: "Failed to delete user" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania PUT - aktualizuje użytkownika
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function PUT({ request }) {
  try {
    const updateData = await request.json();
    const users = await readUsers();

    const userIndex = users.findIndex((u) => u.id === updateData.id);
    if (userIndex === -1) {
      return json({ error: "User not found" }, { status: 404 });
    }

    // Sprawdź czy email nie jest już używany przez innego użytkownika
    const existingUser = users.find(
      (u) => u.id !== updateData.id && u.email === updateData.email
    );
    if (existingUser) {
      return json({ error: "Email already exists" }, { status: 400 });
    }

    users[userIndex] = {
      ...users[userIndex],
      ...users[userIndex],
      ...updateData,
    };
    await writeUsers(users);

    return json(users[userIndex]);
  } catch (error) {
    console.error("Error in PUT /api/users:", error);
    return json({ error: "Failed to update user" }, { status: 500 });
  }
}

/**
 * Obsługuje żądania PATCH - masowe usuwanie wszystkich użytkowników
 * @param {Object} param0
 * @param {Request} param0.request
 */
export async function PATCH({ request }) {
  try {
    const { action } = await request.json();

    if (action === "deleteAll") {
      // Sprawdź czy któryś użytkownik ma przypisany sprzęt
      try {
        const EQUIPMENT_FILE = path.join(
          process.cwd(),
          "data",
          "equipment.json"
        );
        const equipmentData = await fs.readFile(EQUIPMENT_FILE, "utf-8");
        const equipment = JSON.parse(equipmentData);

        const hasAssignedEquipment = equipment.some(
          (/** @type {any} */ e) => e.assignedTo
        );
        if (hasAssignedEquipment) {
          return json(
            {
              error:
                "Cannot delete all users. Some users have assigned equipment. Please unassign all equipment first.",
            },
            { status: 400 }
          );
        }
      } catch (equipmentError) {
        console.warn("Could not check equipment assignments:", equipmentError);
      }

      const users = await readUsers();
      const deletedCount = users.length;

      // Zapisz pustą tablicę
      await writeUsers([]);

      return json({
        message: `Successfully deleted all ${deletedCount} users`,
        deletedCount,
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in PATCH /api/users:", error);
    return json({ error: "Failed to delete all users" }, { status: 500 });
  }
}
