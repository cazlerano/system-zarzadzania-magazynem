// Zarządzanie danymi oparte na API dla aplikacji magazynowej

// Polska funkcja pluralizacji
/**
 * Pluralizuj polskie słowa na podstawie liczby
 * @param {number} count - Liczba określająca formę liczby mnogiej
 * @param {string} singular - Forma pojedyncza (1 element)
 * @param {string} plural2to4 - Forma mnoga dla 2-4 elementów
 * @param {string} plural5plus - Forma mnoga dla 5+ elementów
 * @returns {string} Odpowiednio odmienione słowo
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
 * Predefiniowane wzorce pluralizacji dla popularnych słów
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
 * Szybka pluralizacja dla predefiniowanych wzorców
 * @param {number} count - Liczba do określenia formy liczby mnogiej
 * @param {keyof PLURAL_PATTERNS} pattern - Klucz predefiniowanego wzorca
 * @returns {string} Odmienione słowo
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
 * Formatuj liczbę z odmienionym słowem
 * @param {number} count - Liczba do wyświetlenia
 * @param {keyof PLURAL_PATTERNS} pattern - Klucz predefiniowanego wzorca
 * @returns {string} Sformatowana liczba z odmienionym słowem
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

// Konfiguracja API
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

// Centralne zarządzanie błędami
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
 * Ogólna obsługa wywołań API
 * @param {string} endpoint - Punkt końcowy API
 * @param {RequestInit} options - Opcje zapytania
 * @returns {Promise<any>} - Odpowiedź z API
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
 * Ogólny loader danych z cache lub API
 * @param {string} endpoint - Punkt końcowy API
 * @param {function(): any} getState - Funkcja pobierająca stan cache
 * @param {function(any): void} setState - Funkcja ustawiająca stan cache
 * @param {string} errorMessage - Wiadomość błędu w przypadku niepowodzenia
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
 * Narzędzia do zarządzania cache
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
 * Załaduj użytkowników z API
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
 * Załaduj sprzęt z API
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
 * Załaduj historię z API
 */
async function loadHistory() {
  return loadData(
    API_CONFIG.ENDPOINTS.HISTORY,
    () => historyState,
    (/** @type {any} */ data) => historyState = data,
    "Błąd podczas ładowania historii:"
  );
}

// Publiczne funkcje API

/**
 * Pobierz użytkowników (z cache lub z API)
 */
export async function getUsers() {
  if (!usersState) {
    await loadUsers();
  }
  return usersState || [];
}

/**
 * Pobierz sprzęt (z cache lub z API)
 */
export async function getEquipment() {
  if (!equipmentState) {
    await loadEquipment();
  }
  return equipmentState || [];
}

/**
 * Pobierz historię (z cache lub z API)
 */
export async function getHistory() {
  if (!historyState) {
    await loadHistory();
  }
  return historyState || [];
}

/**
 * Pobierz sprzęt przypisany do użytkownika
 * @param {number} userId - ID użytkownika
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
 * Wyczyść cache sprzętu
 */
export function clearEquipmentCache() {
  cacheManager.equipment.clear();
}

/**
 * Pobierz cały sprzęt z informacją o przypisanych użytkownikach
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
 * Pobierz historię sprzętu
 * @param {number} equipmentId - ID sprzętu
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
 * Formatuj datę na polski format
 * @param {string} dateString - Data w formacie string
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
 * Pobierz dostępny sprzęt (bez przypisanych użytkowników)
 */
export async function getAvailableEquipment() {
  const equipment = await getEquipment();
  return equipment.filter((/** @type {any} */ item) => !item.assignedTo);
}

// Funkcje zarządzania sprzętem i użytkownikami

/**
 * Ogólna funkcja do obsługi przypisywania/odpinania sprzętu
 * @param {number} equipmentId - ID sprzętu
 * @param {number | null} userId - ID użytkownika (null dla odpięcia)
 * @param {string} action - Akcja (przypisanie/odpięcie)
 * @param {string} note - Notatka
 */
async function updateEquipmentAssignment(equipmentId, userId, action, note) {
  try {
    // Edytuj przypisanie sprzętu
    const equipmentResponse = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "PUT",
      body: JSON.stringify({
        id: equipmentId,
        assignedTo: userId,
      }),
    });

    // Dodaj do historii
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId,
        action,
        userId,
        note,
      }),
    });

    // Wyczyść odpowiednie cache
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return true;
  } catch (error) {
    console.error(`Error ${action} equipment:`, error);
    return false;
  }
}

/**
 * Przypisz sprzęt do użytkownika
 * @param {number} equipmentId - ID sprzętu
 * @param {number} userId - ID użytkownika
 * @param {string} note - Notatka
 */
export async function assignEquipment(equipmentId, userId, note = "") {
  return updateEquipmentAssignment(equipmentId, userId, "assigned", note);
}

/**
 * Odłącz sprzęt od użytkownika
 * @param {number} equipmentId - ID sprzętu
 * @param {string} note - Notatka
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
 * Dodaj nowego użytkownika
 * @param {string} name - Imię użytkownika
 * @param {string} email - Email użytkownika
 * @returns {Promise<boolean>} Czy operacja się powiodła
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
 * Dodaj nowy sprzęt z centralną logiką
 * @param {string} name - Nazwa sprzętu
 * @param {string} type - Typ sprzętu
 * @param {string} serialNumber - Numer seryjny
 * @param {string} [clnNumber] - Numer CLN (wymagany dla komputerów)
 * @param {string} [inventoryNumber] - Numer inwentarzowy (opcjonalny)
 * @param {string} [roomLocation] - Lokalizacja (opcjonalna, dla monitorów i drukarek)
 * @returns {Promise<boolean>} Czy operacja się powiodła
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

    // Dodaj numer CLN dla komputerów
    if (type === "Komputer" && clnNumber) {
      equipmentData.clnNumber = clnNumber.trim();
    }

    // Dodaj numer inwentarzowy, jeśli podano
    if (inventoryNumber && inventoryNumber.trim()) {
      equipmentData.inventoryNumber = inventoryNumber.trim();
    }

    // Dodaj lokalizację dla monitorów i drukarek, jeśli podano
    if (
      (type === "Monitor" || type === "Drukarka") &&
      roomLocation &&
      roomLocation.trim()
    ) {
      equipmentData.roomLocation = roomLocation.trim();
    }

    // Dodaj informację o uszkodzeniu, jeśli podano
    if (damaged) {
      equipmentData.damaged = damaged;
    }

    const newEquipment = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "POST",
      body: JSON.stringify(equipmentData),
    });

    // Dodaj do historii
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId: newEquipment.id,
        action: "added",
        userId: null,
        note: "Dodano do magazynu (Ręcznie)",
      }),
    });

    // Jeśli sprzęt został dodany jako uszkodzony, dodaj wpis o uszkodzeniu
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

    // Wyczyść odpowiednie cache
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return true;
  } catch (error) {
    console.error("Error adding equipment:", error);
    return false;
  }
}

/**
 * Masowe dodawanie sprzętu - import wielu pozycji jednocześnie
 * @param {Array<{name: string, type: string, serialNumber: string, clnNumber?: string, inventoryNumber?: string, roomLocation?: string, damaged?: boolean}>} items - Lista sprzętu do dodania
 * @returns {Promise<{success: boolean, results?: any, error?: string}>} Wynik operacji
 */
export async function bulkAddEquipment(items) {
  try {
    console.log(`Bulk import: Wysyłanie ${items.length} pozycji do API`);

    const result = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT_BULK, {
      method: "POST",
      body: JSON.stringify({ items }),
    });

    // Dodaj wpisy do historii dla każdej dodanej pozycji
    if (result.results && result.results.added) {
      for (let i = 0; i < result.results.added.length; i++) {
        const addedItem = result.results.added[i];
        const originalItem = items[i]; // Assuming order is preserved
        
        try {
          // Dodaj podstawowy wpis do historii
          await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
            method: "POST",
            body: JSON.stringify({
              equipmentId: addedItem.id,
              action: "added",
              userId: null,
              note: "Dodano do magazynu (import CSV)",
            }),
          });

          // Jeśli sprzęt został dodany jako uszkodzony, dodaj wpis o uszkodzeniu
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

    // Wyczyść odpowiednie cache
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
 * Usuń sprzęt
 * @param {number} equipmentId - ID sprzętu
 * @returns {Promise<{success: boolean, error?: string}>} Wynik operacji
 */
export async function deleteEquipment(equipmentId) {
  try {
    const result = await apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT, {
      method: "DELETE",
      body: JSON.stringify({ id: equipmentId }),
    });

    // Dodaj wpis do historii
    await apiCall(API_CONFIG.ENDPOINTS.HISTORY, {
      method: "POST",
      body: JSON.stringify({
        equipmentId: equipmentId,
        action: "deleted",
        userId: null,
        note: "Usunięto z magazynu",
      }),
    });

    // Wyczyść odpowiednie cache
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
 * Usuń użytkownika
 * @param {number} userId - ID użytkownika
 * @returns {Promise<{success: boolean, error?: string}>} Wynik operacji
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
 * Generuj kolejny numer CLN
 * @returns {Promise<string>} Wygenerowany numer CLN
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

    // Wyszukaj najwyższy numer CLN
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
 * Wymuś odświeżenie wszystkich cache
 */
export async function forceRefreshAllData() {
  console.log("Wymuszanie odświeżenia wszystkich cache'ów");
  
  // Wyczyść wszystkie cache
  Object.values(cacheManager).forEach(cache => cache.clear());

  // Przeładuj wszystkie dane
  await Promise.all([loadUsers(), loadEquipment(), loadHistory()]);
}

// Inicjalizacja danych przy ładowaniu modułu
if (typeof window !== "undefined") {
  // Tylko w przeglądarce
  loadUsers();
  loadEquipment();
  loadHistory();
}

/**
 * Zaktualizuj status uszkodzenia sprzętu i dodaj wpis do historii
 * @param {number} equipmentId - ID sprzętu
 * @param {boolean} damaged - Czy sprzęt jest uszkodzony
 * @param {number | null} userId - ID użytkownika wykonującego zmianę
 * @param {string} note - Notatka
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

    // Dodaj wpis do historii
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

    // Wyczyść odpowiednie cache
    cacheManager.equipment.clear();
    cacheManager.history.clear();

    return true;
  } catch (error) {
    console.error(`Error updating equipment damage status:`, error);
    return false;
  }
}

/**
 * Pobierz historię użytkownika - wszystkie przypisania i odłączenia sprzętu dla danego użytkownika
 * @param {number} userId - ID użytkownika
 * @returns {Promise<any[]>} Lista zdarzeń
 */
export async function getUserHistory(userId) {
  const history = await getHistory();
  const equipment = await getEquipment();
  
  // Zbierz wszystkie zdarzenia dla danego użytkownika
  const userEvents = [];
  
  for (const equipmentHistory of history) {
    const equipmentItem = equipment.find(e => e.id === equipmentHistory.equipmentId);
    
    for (const event of equipmentHistory.events) {
      // Włącz tylko zdarzenia przypisania lub odłączenia, które dotyczą danego użytkownika
      let shouldInclude = false;
      
      if (event.action === 'assigned' && event.userId === userId) {
        shouldInclude = true;
      } else if (event.action === 'unassigned') {
        // Dla zdarzeń odłączenia, sprawdź, czy ten sprzęt był wcześniej przypisany do tego użytkownika
        // Sprawdź bieżące/poprzednie przypisanie sprzętu na podstawie danych o sprzęcie
        // Lub znajdź poprzednie zdarzenia 'assigned' w tej samej historii sprzętu
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
  
  // Sortuj po dacie (najnowsze na górze)
  return userEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
