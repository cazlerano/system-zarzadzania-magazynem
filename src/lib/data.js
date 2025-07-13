// Zarządzanie danymi oparte na API dla aplikacji magazynowej

// Polish pluralization utility - KISS & DRY approach
/**
 * Pluralize Polish words based on count
 * @param {number} count - Number to determine plural form
 * @param {string} singular - Singular form (1 item)
 * @param {string} plural2to4 - Plural form for 2-4 items
 * @param {string} plural5plus - Plural form for 5+ items
 * @returns {string} Properly pluralized word
 */
export function pluralize(count, singular, plural2to4, plural5plus) {
  const absCount = Math.abs(count);
  
  if (absCount === 1) {
    return singular;
  }
  
  if (absCount >= 2 && absCount <= 4) {
    return plural2to4;
  }
  
  return plural5plus;
}

/**
 * Predefined pluralization patterns for common words
 */
export const PLURAL_PATTERNS = {
  equipment: {
    singular: 'sprzęt',
    plural2to4: 'sprzęty', 
    plural5plus: 'sprzętów'
  },
  computer: {
    singular: 'komputer',
    plural2to4: 'komputery',
    plural5plus: 'komputerów'
  },
  monitor: {
    singular: 'monitor', 
    plural2to4: 'monitory',
    plural5plus: 'monitorów'
  },
  printer: {
    singular: 'drukarka',
    plural2to4: 'drukarki', 
    plural5plus: 'drukarek'
  },
  item: {
    singular: 'pozycja',
    plural2to4: 'pozycje',
    plural5plus: 'pozycji'
  },
  company: {
    singular: 'firma',
    plural2to4: 'firmy',
    plural5plus: 'firm'
  },
  user: {
    singular: 'użytkownik',
    plural2to4: 'użytkowników',
    plural5plus: 'użytkowników'
  },
  category: {
    singular: 'kategoria',
    plural2to4: 'kategorie', 
    plural5plus: 'kategorii'
  },
  document: {
    singular: 'dokument',
    plural2to4: 'dokumenty',
    plural5plus: 'dokumentów'
  },
  history: {
    singular: 'wpis historii',
    plural2to4: 'wpisy historii',
    plural5plus: 'wpisów historii'
  }
};

/**
 * Quick pluralization for predefined patterns
 * @param {number} count - Number to determine plural form
 * @param {keyof PLURAL_PATTERNS} pattern - Predefined pattern key
 * @returns {string} Pluralized word
 */
export function pluralizePattern(count, pattern) {
  const p = PLURAL_PATTERNS[pattern];
  if (!p) {
    console.warn(`Pluralization pattern "${pattern}" not found`);
    return `${count} ${pattern}`;
  }
  return pluralize(count, p.singular, p.plural2to4, p.plural5plus);
}

/**
 * Format count with pluralized word
 * @param {number} count - Number to display
 * @param {keyof PLURAL_PATTERNS} pattern - Predefined pattern key
 * @returns {string} Formatted count with pluralized word
 */
export function formatCount(count, pattern) {
  return `${count} ${pluralizePattern(count, pattern)}`;
}

export const equipmentTypes = {
  COMPUTER: "Komputer",
  PRINTER: "Drukarka", 
  MONITOR: "Monitor",
  MOUSE: "Myszka",
  POWER_SUPPLY: "Zasilacz",
  DOCKING_STATION: "Stacja dokująca",
  YUBIKEY: "YubiKey",
};

// Cache state management
/** @type {Array<any> | null} */
let usersState = null;
/** @type {Array<any> | null} */
let equipmentState = null;
/** @type {Array<any> | null} */
let historyState = null;

// API configuration
const API_CONFIG = {
  BASE: "/api",
  ENDPOINTS: {
    USERS: "/users",
    EQUIPMENT: "/equipment", 
    HISTORY: "/history",
    EQUIPMENT_BULK: "/equipment/bulk"
  },
  HEADERS: {
    "Content-Type": "application/json"
  }
};

// Centralized error handling
class APIError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string} endpoint
   */
  constructor(message, status, endpoint) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

/**
 * Generic API call handler
 * @param {string} endpoint
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function apiCall(endpoint, options = {}) {
  try {
    const url = `${API_CONFIG.BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: API_CONFIG.HEADERS,
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(
        `API Error: ${response.status} - ${errorText}`,
        response.status,
        endpoint
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) throw error;
    
    console.error(`Network error for ${endpoint}:`, error);
    throw new APIError(
      `Network error: ${/** @type {Error} */(error).message}`,
      0,
      endpoint
    );
  }
}

/**
 * Generic data loader with caching
 * @param {string} endpoint
 * @param {function(): any} getState
 * @param {function(any): void} setState
 * @param {string} errorMessage
 */
async function loadData(endpoint, getState, setState, errorMessage) {
  try {
    const data = await apiCall(endpoint);
    setState(data);
    return data;
  } catch (error) {
    console.error(errorMessage, error);
    setState([]);
    return [];
  }
}

/**
 * Cache management utilities
 */
const cacheManager = {
  users: {
    get: () => usersState,
    set: (/** @type {any} */ data) => usersState = data,
    clear: () => usersState = null
  },
  equipment: {
    get: () => equipmentState,
    set: (/** @type {any} */ data) => equipmentState = data,
    clear: () => equipmentState = null
  },
  history: {
    get: () => historyState,
    set: (/** @type {any} */ data) => historyState = data,
    clear: () => historyState = null
  }
};

/**
 * Load users from API
 */
async function loadUsers() {
  return loadData(
    API_CONFIG.ENDPOINTS.USERS,
    () => usersState,
    (/** @type {any} */ data) => usersState = data,
    "Błąd podczas ładowania użytkowników:"
  );
}

/**
 * Load equipment from API
 */
async function loadEquipment() {
  return loadData(
    API_CONFIG.ENDPOINTS.EQUIPMENT,
    () => equipmentState,
    (/** @type {any} */ data) => equipmentState = data,
    "Błąd podczas ładowania sprzętu:"
  );
}

/**
 * Load history from API
 */
async function loadHistory() {
  return loadData(
    API_CONFIG.ENDPOINTS.HISTORY,
    () => historyState,
    (/** @type {any} */ data) => historyState = data,
    "Błąd podczas ładowania historii:"
  );
}

// Public API functions

/**
 * Get users (with cache or from API)
 */
export async function getUsers() {
  if (!usersState) {
    await loadUsers();
  }
  return usersState || [];
}

/**
 * Get equipment (with cache or from API)
 */
export async function getEquipment() {
  if (!equipmentState) {
    await loadEquipment();
  }
  return equipmentState || [];
}

/**
 * Get history (with cache or from API)
 */
export async function getHistory() {
  if (!historyState) {
    await loadHistory();
  }
  return historyState || [];
}

/**
 * @param {number} userId
 */
export async function getEquipmentByUserId(userId) {
  const equipment = await getEquipment();
  const users = await getUsers();

  return equipment
    .filter((/** @type {any} */ item) => item.assignedTo === userId)
    .map((/** @type {any} */ item) => ({
      ...item,
      assignedUser: item.assignedTo
        ? users.find((/** @type {any} */ u) => u.id === item.assignedTo)
        : null,
    }));
}

/**
 * Clear equipment cache only
 */
export function clearEquipmentCache() {
  cacheManager.equipment.clear();
}

/**
 * Get all equipment with assigned user info
 */
export async function getAllEquipment() {
  const equipment = await getEquipment();
  const users = await getUsers();

  return equipment.map((/** @type {any} */ item) => ({
    ...item,
    assignedUser: item.assignedTo
      ? users.find((/** @type {any} */ u) => u.id === item.assignedTo)
      : null,
  }));
}

/**
 * @param {number} equipmentId
 */
export async function getEquipmentHistory(equipmentId) {
  const history = await getHistory();
  const users = await getUsers();

  const equipmentHistory = history.find((/** @type {any} */ h) => h.equipmentId === equipmentId);
  if (!equipmentHistory) return [];

  return equipmentHistory.events
    .map((/** @type {any} */ event) => ({
      ...event,
      user: event.userId
        ? users.find((/** @type {any} */ u) => u.id === event.userId)
        : null,
    }))
    .sort(
      (/** @type {any} */ a, /** @type {any} */ b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

/**
 * @param {string} dateString
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get available equipment (bez przypisanych)
 */
export async function getAvailableEquipment() {
  const equipment = await getEquipment();
  return equipment.filter((/** @type {any} */ item) => !item.assignedTo);
}

// Equipment and User management functions

/**
 * Generic function to handle equipment assignment/unassignment
 * @param {number} equipmentId
 * @param {number | null} userId
 * @param {string} action
 * @param {string} note
 */
async function updateEquipmentAssignment(equipmentId, userId, action, note) {
  try {
    // Update equipment assignment
    const equipmentResponse = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "PUT",
      body: JSON.stringify({
        id: equipmentId,
        assignedTo: userId,
      }),
    });

    // Add to history
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId,
        action,
        userId,
        note,
      }),
    });

    // Clear relevant caches
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return true;
  } catch (error) {
    console.error(`Error ${action} equipment:`, error);
    return false;
  }
}

/**
 * Assign equipment to user
 * @param {number} equipmentId
 * @param {number} userId
 * @param {string} note
 */
export async function assignEquipment(equipmentId, userId, note = "") {
  return updateEquipmentAssignment(equipmentId, userId, "assigned", note);
}

/**
 * Unassign equipment from user
 * @param {number} equipmentId
 * @param {string} note
 */
export async function unassignEquipment(equipmentId, note = "") {
  try {
    const equipment = await getEquipment();
    const equipmentItem = equipment.find((/** @type {any} */ item) => item.id === equipmentId);
    if (!equipmentItem) return false;

    const previousUserId = equipmentItem.assignedTo;
    return updateEquipmentAssignment(equipmentId, null, "unassigned", note);
  } catch (error) {
    console.error("Error unassigning equipment:", error);
    return false;
  }
}

/**
 * Add new user
 * @param {string} name
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function addUser(name, email) {
  try {
    await apiCall(API_CONFIG.ENDPOINTS.USERS, {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
      }),
    });

    cacheManager.users.clear();
    return true;
  } catch (error) {
    console.error("Error adding user:", error);
    return false;
  }
}

/**
 * Add new equipment with centralized logic
 * @param {string} name
 * @param {string} type
 * @param {string} serialNumber
 * @param {string} [clnNumber] - CLN number (required for computers)
 * @param {string} [inventoryNumber] - Inventory number (optional)
 * @param {string} [roomLocation] - Room location (optional, for monitors and printers)
 * @returns {Promise<boolean>}
 */
export async function addEquipment(
  name,
  type,
  serialNumber,
  clnNumber = "",
  inventoryNumber = "",
  roomLocation = "",
  damaged = false
) {
  try {
    /** @type {{ name: string; type: string; serialNumber: string; clnNumber?: string; inventoryNumber?: string; roomLocation?: string; damaged?: boolean }} */
    const equipmentData = {
      name: name.trim(),
      type: type,
      serialNumber: serialNumber.trim(),
    };

    // Add CLN number for computers
    if (type === "Komputer" && clnNumber) {
      equipmentData.clnNumber = clnNumber.trim();
    }

    // Add inventory number if provided
    if (inventoryNumber && inventoryNumber.trim()) {
      equipmentData.inventoryNumber = inventoryNumber.trim();
    }

    // Add room location if provided (for monitors and printers)
    if (
      (type === "Monitor" || type === "Drukarka") &&
      roomLocation &&
      roomLocation.trim()
    ) {
      equipmentData.roomLocation = roomLocation.trim();
    }

    // Add damaged status
    if (damaged) {
      equipmentData.damaged = damaged;
    }

    const newEquipment = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "POST",
      body: JSON.stringify(equipmentData),
    });

    // Add to history
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId: newEquipment.id,
        action: "added",
        userId: null,
        note: "Dodano do magazynu (Ręcznie)",
      }),
    });

    // If equipment was added as damaged, add damage history entry
    if (damaged) {
      await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
        method: "POST",
        body: JSON.stringify({
          equipmentId: newEquipment.id,
          action: "damaged",
          userId: null,
          note: "Dodano jako uszkodzone",
        }),
      });
    }

    // Clear relevant caches
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return true;
  } catch (error) {
    console.error("Error adding equipment:", error);
    return false;
  }
}

/**
 * Bulk add equipment - import multiple equipment at once
 * @param {Array<{name: string, type: string, serialNumber: string, clnNumber?: string, inventoryNumber?: string, roomLocation?: string, damaged?: boolean}>} items
 * @returns {Promise<{success: boolean, results?: any, error?: string}>}
 */
export async function bulkAddEquipment(items) {
  try {
    console.log(`Bulk import: Wysyłanie ${items.length} pozycji do API`);

    const result = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT_BULK, {
      method: "POST",
      body: JSON.stringify({ items }),
    });

    // Add to history for each successfully added equipment
    if (result.results && result.results.added) {
      for (let i = 0; i < result.results.added.length; i++) {
        const addedItem = result.results.added[i];
        const originalItem = items[i]; // Assuming order is preserved
        
        try {
          // Add basic "added" history entry
          await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
            method: "POST",
            body: JSON.stringify({
              equipmentId: addedItem.id,
              action: "added",
              userId: null,
              note: "Dodano do magazynu (import CSV)",
            }),
          });

          // If equipment was added as damaged, add damage history entry
          if (originalItem && originalItem.damaged) {
            await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
              method: "POST",
              body: JSON.stringify({
                equipmentId: addedItem.id,
                action: "damaged",
                userId: null,
                note: "Dodano jako uszkodzone (import CSV)",
              }),
            });
          }
        } catch (historyError) {
          console.error(
            `Błąd dodawania do historii dla sprzętu ${addedItem.id}:`,
            historyError
          );
        }
      }
    }

    // Clear relevant caches
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    console.log(`Bulk import: Zakończono pomyślnie`, result.summary);
    return { success: true, results: result };
  } catch (error) {
    console.error("Error in bulk add equipment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete equipment
 * @param {number} equipmentId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteEquipment(equipmentId) {
  try {
    const result = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "DELETE",
      body: JSON.stringify({ id: equipmentId }),
    });

    // Add to history
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId: equipmentId,
        action: "deleted",
        userId: null,
        note: "Usunięto z magazynu",
      }),
    });

    // Clear relevant caches
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return { success: true };
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return { 
      success: false, 
      error: error instanceof APIError ? error.message : "Network error occurred"
    };
  }
}

/**
 * Delete user
 * @param {number} userId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUser(userId) {
  try {
    await apiCall(API_CONFIG.ENDPOINTS.USERS, {
      method: "DELETE",
      body: JSON.stringify({ id: userId }),
    });

    cacheManager.users.clear();
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { 
      success: false, 
      error: error instanceof APIError ? error.message : "Network error occurred"
    };
  }
}

/**
 * Generate next CLN number
 * @returns {Promise<string>}
 */
export async function generateNextClnNumber() {
  try {
    /** @type {any[]} */
    const equipment = await getEquipment();
    const computers = equipment.filter(
      (/** @type {any} */ item) => item.type === "Komputer" && item.clnNumber
    );

    if (computers.length === 0) {
      return "CLN000001";
    }

    // Find highest CLN number
    const clnNumbers = computers
      .map((/** @type {any} */ computer) => computer.clnNumber)
      .filter((/** @type {any} */ cln) => cln && cln.startsWith("CLN"))
      .map((/** @type {any} */ cln) => parseInt(cln.substring(3), 10))
      .filter((/** @type {any} */ num) => !isNaN(num));

    const maxNumber = Math.max(...clnNumbers);
    const nextNumber = maxNumber + 1;

    return `CLN${nextNumber.toString().padStart(6, "0")}`;
  } catch (error) {
    console.error("Error generating CLN number:", error);
    return "CLN000001";
  }
}

/**
 * Force refresh all caches - forces refresh of all caches
 */
export async function forceRefreshAllData() {
  console.log("Wymuszanie odświeżenia wszystkich cache'ów");
  
  // Clear all caches
  Object.values(cacheManager).forEach(cache => cache.clear());

  // Reload data
  await Promise.all([loadUsers(), loadEquipment(), loadHistory()]);
}

// Initialize data when module loads
if (typeof window !== "undefined") {
  // Only in browser environment
  loadUsers();
  loadEquipment();
  loadHistory();
}

/**
 * Update equipment damage status and add history entry
 * @param {number} equipmentId
 * @param {boolean} damaged
 * @param {number | null} userId - ID użytkownika wykonującego zmianę
 * @param {string} note
 */
export async function updateEquipmentDamageStatus(equipmentId, damaged, userId = null, note = "") {
  try {
    // Update equipment damage status
    const equipmentResponse = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "PUT",
      body: JSON.stringify({
        id: equipmentId,
        damaged: damaged,
      }),
    });

    // Add to history
    const action = damaged ? "damaged" : "repaired";
    const historyNote = note || (damaged ? "Oznaczono jako uszkodzone" : "Oznaczono jako naprawione");
    
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId,
        action,
        userId,
        note: historyNote,
      }),
    });

    // Clear relevant caches
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return true;
  } catch (error) {
    console.error(`Error updating equipment damage status:`, error);
    return false;
  }
}

/**
 * Get user history - all equipment assignments and unassignments for a specific user
 * @param {number} userId 
 * @returns {Promise<any[]>}
 */
export async function getUserHistory(userId) {
  const history = await getHistory();
  const equipment = await getEquipment();
  
  // Collect all events for this user from all equipment
  const userEvents = [];
  
  for (const equipmentHistory of history) {
    const equipmentItem = equipment.find(e => e.id === equipmentHistory.equipmentId);
    
    for (const event of equipmentHistory.events) {
      // Include events where user was involved (assigned TO or unassigned FROM)
      let shouldInclude = false;
      
      if (event.action === 'assigned' && event.userId === userId) {
        shouldInclude = true;
      } else if (event.action === 'unassigned') {
        // For unassigned events, we need to check if this equipment was previously assigned to this user
        // We can check the equipment's current/previous assignment from the equipment data
        // Or find previous 'assigned' events in the same equipment history
        const previousAssignedEvent = equipmentHistory.events
          .slice(0, equipmentHistory.events.indexOf(event))
          .reverse()
          .find((/** @type {any} */ e) => e.action === 'assigned');
        
        if (previousAssignedEvent && previousAssignedEvent.userId === userId) {
          shouldInclude = true;
        }
      }
      
      if (shouldInclude) {
        userEvents.push({
          ...event,
          equipment: equipmentItem || { id: equipmentHistory.equipmentId, name: 'Nieznany sprzęt', type: 'Nieznany' }
        });
      }
    }
  }
  
  // Sort by date (newest first)
  return userEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
