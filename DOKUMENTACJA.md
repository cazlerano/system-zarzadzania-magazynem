# 📦 System Zarządzania Magazynem IT

## Spis treści
1. [Wprowadzenie](#wprowadzenie)
2. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
3. [Struktura projektu](#struktura-projektu)
4. [Funkcjonalności](#funkcjonalności)
5. [API i endpointy](#api-i-endpointy)
6. [Komponenty](#komponenty)
7. [Zarządzanie danymi](#zarządzanie-danymi)
8. [Przewodnik użytkownika](#przewodnik-użytkownika)
9. [Przewodnik dewelopera](#przewodnik-dewelopera)
10. [Technologie](#technologie)
11. [Troubleshooting](#troubleshooting)
12. [Changelog](#changelog)

---

## Wprowadzenie

System Zarządzania Magazynem IT to nowoczesna aplikacja webowa stworzona z myślą o małych i średnich firmach, które potrzebują prostego, ale funkcjonalnego narzędzia do zarządzania sprzętem IT.

### Dlaczego powstał ten projekt?

**Głównym celem było zastąpienie chaotycznych arkuszy Excel jednym, centralnym systemem zarządzania sprzętem IT.**

#### Kluczowe problemy rozwiązywane przez aplikację:
- 📊 **Koniec z Excelami** - centralizacja danych w jednym miejscu
- 🔍 **Łatwe wyszukiwanie** - natychmiastowy dostęp do informacji
- 📱 **Dostęp z każdego urządzenia** - responsywny interfejs
- 👥 **Współdzielony dostęp** - praca zespołowa bez konfliktów
- 📈 **Historia i statystyki** - automatyczne śledzenie zmian
- ⚡ **Szybkość i wydajność** - natychmiastowe operacje

### Informacje podstawowe
- **Wersja:** 0.8.2 Beta
- **Autor:** Karol Żmijkowski (@cazlerano)
- **Licencja:** MIT
- **Język:** Polski
- **Status:** Aktywny rozwój

---

## Instalacja i uruchomienie

### Wymagania systemowe
- Node.js 18+ 
- npm 8+
- Przeglądarka internetowa (Chrome, Firefox, Safari, Edge)

### Instalacja

```bash
# Klonowanie repozytorium
git clone https://github.com/cazlerano/system-zarzadzania-magazynem.git
cd system-zarzadzania-magazynem

# Instalacja zależności
npm install

# Uruchomienie w trybie deweloperskim
npm run dev

# Budowanie wersji produkcyjnej
npm run build

# Podgląd wersji produkcyjnej
npm run preview
```

### Konfiguracja

Aplikacja nie wymaga dodatkowej konfiguracji. Dane są przechowywane w plikach JSON w katalogu `data/`:
- `users.json` - użytkownicy
- `equipment.json` - sprzęt
- `history.json` - historia zmian
- `categories.json` - kategorie sprzętu
- `documents.json` - dokumenty

---

## Struktura projektu

```
myapp/
├── src/
│   ├── lib/                          # Komponenty wielokrotnego użytku
│   │   ├── data.js                   # Główny moduł zarządzania danymi
│   │   ├── EquipmentEditModal.svelte # Modal edycji sprzętu
│   │   ├── EquipmentHistoryModal.svelte # Modal historii sprzętu
│   │   ├── EquipmentManagementModal.svelte # Modal zarządzania sprzętem
│   │   ├── UserEditModal.svelte      # Modal edycji użytkownika
│   │   └── UserHistoryModal.svelte   # Modal historii użytkownika
│   ├── routes/                       # Strony aplikacji
│   │   ├── +layout.svelte           # Layout główny
│   │   ├── +page.svelte             # Strona główna (Przegląd)
│   │   ├── admin/                   # Panel administracyjny
│   │   ├── api/                     # Endpointy API
│   │   ├── dokumenty/               # Zarządzanie dokumentami
│   │   ├── import/                  # Import danych
│   │   ├── magazyn/                 # Zarządzanie sprzętem
│   │   └── o-projekcie/             # Informacje o projekcie
│   ├── app.css                      # Style globalne
│   ├── app.d.ts                     # Definicje typów
│   └── app.html                     # Template HTML
├── static/                          # Pliki statyczne
├── data/                           # Baza danych (JSON)
├── documents/                      # Przechowywane dokumenty
├── package.json                    # Konfiguracja npm
├── svelte.config.js               # Konfiguracja SvelteKit
├── vite.config.js                 # Konfiguracja Vite
├── tailwind.config.js             # Konfiguracja Tailwind CSS
└── jsconfig.json                  # Konfiguracja JavaScript/TypeScript
```

---

## Funkcjonalności

### 👥 Zarządzanie użytkownikami
- Dodawanie, edytowanie i usuwanie użytkowników
- Wyszukiwanie użytkowników po nazwie lub emailu
- Historia przypisań sprzętu dla każdego użytkownika
- Walidacja unikalności adresów email

### 📦 Zarządzanie sprzętem
- **Obsługiwane typy sprzętu:**
  - Komputer
  - Monitor
  - Drukarka
  - Myszka
  - Klawiatura
  - Zasilacz
  - Stacja dokująca
  - YubiKey

- **Funkcjonalności:**
  - Dodawanie, edytowanie i usuwanie sprzętu
  - Numery identyfikacyjne: seryjny, inwentarzowy
  - Status uszkodzenia sprzętu
  - Lokalizacja dla monitorów i drukarek
  - Filtrowanie po typie, statusie, użytkowniku
  - Sortowanie według różnych kryteriów

### 🔗 Przypisywanie sprzętu
- Przypisywanie sprzętu do użytkowników
- Odłączanie sprzętu od użytkowników
- Historia wszystkich przypisań
- Automatyczne logowanie zmian

### 📊 Historia i audyt
- Pełna historia wszystkich operacji
- Typy zdarzeń:
  - Przypisanie sprzętu
  - Odłączenie sprzętu
  - Oznaczenie jako uszkodzony
  - Naprawa sprzętu
  - Dodanie sprzętu
  - Edycja sprzętu

### 📄 Zarządzanie dokumentami
- Upload dokumentów (PDF, DOCX, itp.)
- Powiązywanie dokumentów ze sprzętem lub użytkownikami
- Podgląd i pobieranie dokumentów
- Usuwanie dokumentów

### 📥 Import/Export danych
- **Import CSV:**
  - Masowy import użytkowników
  - Masowy import sprzętu z walidacją
  - Obsługa błędów i raportowanie
  
- **Export CSV:**
  - Export całej bazy sprzętu
  - Export z filtrami
  - Szczegółowe raporty

### ⚙️ Panel administracyjny
- Statystyki systemu
- Masowe operacje usuwania
- Czyszczenie bazy danych
- Informacje o stanie systemu

---

## API i endpointy

### Użytkownicy (`/api/users`)
```
GET    /api/users              # Pobierz wszystkich użytkowników
POST   /api/users              # Dodaj nowego użytkownika
PUT    /api/users              # Edytuj użytkownika
DELETE /api/users              # Usuń użytkownika
DELETE /api/users/deleteAll    # Usuń wszystkich użytkowników
```

### Sprzęt (`/api/equipment`)
```
GET    /api/equipment          # Pobierz cały sprzęt
POST   /api/equipment          # Dodaj sprzęt
PUT    /api/equipment          # Edytuj sprzęt
DELETE /api/equipment          # Usuń sprzęt
POST   /api/equipment/bulk     # Masowe dodawanie sprzętu
DELETE /api/equipment/deleteAll # Usuń cały sprzęt
```

### Historia (`/api/history`)
```
GET    /api/history            # Pobierz historię
POST   /api/history            # Dodaj wpis do historii
DELETE /api/history/deleteAll  # Usuń całą historię
```

### Dokumenty (`/api/documents`)
```
GET    /api/documents          # Pobierz listę dokumentów
POST   /api/documents          # Upload dokumentu
GET    /api/documents/[id]/download # Pobierz dokument
DELETE /api/documents          # Usuń dokument
DELETE /api/documents/deleteAll # Usuń wszystkie dokumenty
GET    /api/documents/export   # Export dokumentów
```

### Kategorie (`/api/categories`)
```
GET    /api/categories         # Pobierz kategorie sprzętu
```

---

## Komponenty

### Główne komponenty modali

#### `EquipmentEditModal.svelte`
Modal do edycji i dodawania sprzętu.

**Props:**
- `isOpen: boolean` - czy modal jest otwarty
- `equipment: Object | null` - obiekt sprzętu do edycji (null = nowy sprzęt)
- `onUpdate: Function` - callback po zapisaniu zmian

**Funkcjonalności:**
- Walidacja formularza
- Obsługa różnych typów sprzętu
- Checkbox dla statusu uszkodzenia

#### `EquipmentManagementModal.svelte`
Modal do zarządzania przypisaniami sprzętu.

**Props:**
- `isOpen: boolean` - czy modal jest otwarty
- `selectedUser: Object` - użytkownik, dla którego zarządzamy sprzętem
- `onUpdate: Function` - callback po zmianach

**Funkcjonalności:**
- Lista dostępnego sprzętu
- Przypisywanie sprzętu do użytkownika
- Odłączanie sprzętu od użytkownika
- Filtrowanie sprzętu

#### `EquipmentHistoryModal.svelte`
Modal do przeglądania historii sprzętu.

**Props:**
- `isOpen: boolean` - czy modal jest otwarty
- `equipment: Object` - sprzęt, którego historia ma być wyświetlona

**Funkcjonalności:**
- Timeline historii
- Szczegóły każdego zdarzenia
- Informacje o użytkownikach
- Formatowanie dat

#### `UserEditModal.svelte`
Modal do edycji użytkowników.

**Props:**
- `isOpen: boolean` - czy modal jest otwarty
- `user: Object | null` - użytkownik do edycji (null = nowy)
- `onUpdate: Function` - callback po zapisaniu

#### `UserHistoryModal.svelte`
Modal do przeglądania historii użytkownika.

**Props:**
- `isOpen: boolean` - czy modal jest otwarty
- `selectedUser: Object` - użytkownik, którego historia ma być wyświetlona

---

## Zarządzanie danymi

### Struktura danych

#### Użytkownik (User)
```json
{
  "id": 1,
  "name": "Jan Kowalski",
  "email": "jan.kowalski@firma.pl",
  "createdAt": "2025-01-13T10:00:00.000Z"
}
```

#### Sprzęt (Equipment)
```json
```json
{
  "name": "Dell Latitude 5520",
  "type": "Komputer",
  "serialNumber": "DL123456789",
  "inventoryNumber": "INV001",
  "roomLocation": "",
  "damaged": false,
  "assignedUser": "jan.kowalski@firma.pl",
  "createdAt": "2025-01-13T10:00:00.000Z"
}
```
```

#### Historia (History)
```json
{
  "id": 1,
  "equipmentId": 1,
  "equipmentName": "Dell Latitude 5520",
  "action": "assigned",
  "userEmail": "jan.kowalski@firma.pl",
  "userName": "Jan Kowalski",
  "timestamp": "2025-01-13T10:00:00.000Z",
  "details": "Przypisano sprzęt do użytkownika"
}
```

#### Dokument (Document)
```json
{
  "id": 1,
  "filename": "faktura_123.pdf",
  "originalName": "Faktura komputera.pdf",
  "size": 1024567,
  "mimeType": "application/pdf",
  "uploadedAt": "2025-01-13T10:00:00.000Z"
}
```

### Moduł `data.js`

Główny moduł zarządzania danymi zawiera funkcje:

#### Użytkownicy
- `getUsers()` - pobierz wszystkich użytkowników
- `addUser(name, email)` - dodaj użytkownika
- `updateUser(id, userData)` - aktualizuj użytkownika
- `deleteUser(id)` - usuń użytkownika
- `getUserHistory(userEmail)` - pobierz historię użytkownika

#### Sprzęt
- `getEquipment()` - pobierz cały sprzęt
- `addEquipment(...)` - dodaj sprzęt
- `updateEquipment(id, data)` - aktualizuj sprzęt
- `deleteEquipment(id)` - usuń sprzęt
- `getEquipmentByUserId(userId)` - pobierz sprzęt użytkownika
- `assignEquipmentToUser(equipmentId, userEmail)` - przypisz sprzęt
- `unassignEquipmentFromUser(equipmentId)` - odłącz sprzęt
- `updateEquipmentDamageStatus(equipmentId, damaged)` - zmień status uszkodzenia
- `bulkAddEquipment(items)` - masowe dodawanie sprzętu

#### Historia
- `getHistory()` - pobierz historię
- `addHistoryEntry(entry)` - dodaj wpis do historii

#### Utilities
- `forceRefreshAllData()` - odśwież cache danych
- `formatCount(count, type)` - formatuj liczby z polską pluralizacją
- `pluralizePattern(count, pattern)` - wzorce pluralizacji

---

## Przewodnik użytkownika

### Pierwsze kroki

1. **Uruchomienie aplikacji**
   - Otwórz przeglądarkę i przejdź do `http://localhost:5173`
   - Aplikacja uruchomi się z pustą bazą danych

2. **Dodawanie pierwszych użytkowników**
   - Przejdź do zakładki "Import"
   - Użyj formularza "Ręczne dodawanie" w sekcji "Import Użytkowników"
   - Wypełnij imię, nazwisko i email

3. **Dodawanie sprzętu**
   - W zakładce "Import", sekcja "Import Sprzętu"
   - Wypełnij wymagane pola: nazwa, typ, numer seryjny
   - Pola inwentarzowy i lokalizacja są opcjonalne

### Codzienne użytkowanie

#### Przegląd główny
- **Statystyki sprzętu** - widok na górze strony głównej
- **Lista użytkowników** - kliknij na użytkownika aby zobaczyć przypisany sprzęt
- **Wyszukiwanie** - użyj pola wyszukiwania aby znaleźć użytkownika

#### Zarządzanie sprzętem (zakładka Magazyn)
- **Filtrowanie** - użyj filtrów po lewej stronie
- **Sortowanie** - kliknij nagłówki kolumn w tabeli
- **Edycja** - kliknij przycisk "Edytuj" przy sprzęcie
- **Historia** - kliknij "Historia" aby zobaczyć historię sprzętu

#### Przypisywanie sprzętu
1. Przejdź na stronę główną
2. Kliknij na użytkownika
3. Kliknij "Zarządzaj sprzętem"
4. Wybierz sprzęt z listy dostępnych
5. Kliknij "Przypisz"

#### Import danych CSV
1. Przygotuj plik CSV zgodnie z formatem (przykłady w aplikacji)
2. Przejdź do zakładki "Import"
3. Wybierz zakładkę "Import z CSV"
4. Wybierz plik i załaduj

### Funkcje zaawansowane

#### Panel administracyjny
⚠️ **Uwaga: Operacje są nieodwracalne!**
- Dostęp do statystyk systemu
- Masowe usuwanie danych
- Reset całego systemu

#### Eksport danych
- W zakładce "Magazyn" kliknij "Eksportuj do CSV"
- Wybierz zakres danych do eksportu
- Plik zostanie pobrany automatycznie

#### Zarządzanie dokumentami
- Upload dokumentów związanych ze sprzętem
- Organizacja dokumentów
- Podgląd i pobieranie

---

## Przewodnik dewelopera

### Architektura aplikacji

Aplikacja jest zbudowana w architekturze **SPA (Single Page Application)** z **SvelteKit** jako frameworkiem głównym.

#### Warstwa prezentacji (Frontend)
- **SvelteKit 5** z **Svelte 5 Runes** dla reaktywności
- **Tailwind CSS** dla stylizacji
- **TypeScript** dla bezpieczeństwa typów

#### Warstwa logiki biznesowej
- Moduł `src/lib/data.js` - główna logika zarządzania danymi
- Komponenty modali w `src/lib/` - logika UI
- Endpointy API w `src/routes/api/` - logika backendowa

#### Warstwa danych
- **JSON files** jako baza danych
- **File System API** dla zarządzania dokumentami
- Cache w pamięci dla wydajności

### Wzorce projektowe

#### State Management
```javascript
// Svelte 5 Runes dla lokalnego stanu
let users = $state([]);
let isLoading = $state(false);

// Derived state dla obliczeń
let filteredUsers = $derived.by(() => {
    return users.filter(user => user.name.includes(searchQuery));
});

// Effects dla side effects
$effect(() => {
    loadData();
});
```

#### Centralizacja konfiguracji
```javascript
const APP_CONFIG = {
    equipmentTypes: ['Komputer', 'Monitor', ...],
    formFields: { /* ... */ },
    messages: { /* ... */ }
};
```

#### Obsługa błędów
```javascript
try {
    const result = await apiCall();
    showSuccessMessage();
} catch (error) {
    console.error('Error:', error);
    showErrorMessage();
}
```

### Konwencje kodowania

#### Nazewnictwo
- **Komponenty**: PascalCase (`UserEditModal.svelte`)
- **Funkcje**: camelCase (`validateAndAddUser`)
- **Zmienne**: camelCase (`userMessage`)
- **Stałe**: UPPER_SNAKE_CASE (`APP_CONFIG`)

#### Struktura komponentów
```svelte
<script>
    // 1. Importy
    import { ... } from '...';
    
    // 2. Props
    let { isOpen = false, user = null } = $props();
    
    // 3. State
    let isLoading = $state(false);
    
    // 4. Derived state
    let computedValue = $derived(...);
    
    // 5. Effects
    $effect(() => { ... });
    
    // 6. Funkcje
    function handleSubmit() { ... }
</script>

<!-- HTML template -->
<div>...</div>

<!-- Opcjonalnie: scoped styles -->
<style>
    .custom-class { ... }
</style>
```

#### Obsługa API
```javascript
// Zawsze obsługuj błędy
async function apiCall() {
    try {
        const response = await fetch('/api/endpoint');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
```

### Rozszerzanie aplikacji

#### Dodawanie nowego typu sprzętu
1. Dodaj typ do `APP_CONFIG.equipmentTypes` w pliku importu
2. Dodaj emoji w funkcji `getEquipmentEmoji`
3. Dodaj wzorzec pluralizacji w `PLURAL_PATTERNS`
4. Zaktualizuj ikony w `CATEGORY_ICONS`

#### Dodawanie nowej strony
1. Utwórz katalog w `src/routes/`
2. Dodaj `+page.svelte`
3. Dodaj link w nawigacji (`src/routes/+layout.svelte`)
4. Opcjonalnie dodaj API endpoints w `src/routes/api/`

#### Dodawanie nowego pola do sprzętu
1. Zaktualizuj strukturę danych w `data.js`
2. Dodaj pole do formularzy (modal edycji, import)
3. Zaktualizuj walidację
4. Dodaj do eksportu CSV
5. Zaktualizuj typy TypeScript

### Testowanie

#### Testowanie manualne
```bash
# Uruchom dev server
npm run dev

# Sprawdź różne scenariusze:
# - Dodawanie/edycja danych
# - Import/export CSV
# - Przypisywanie sprzętu
# - Filtrowanie i sortowanie
```

#### Sprawdzanie typów
```bash
# Sprawdź błędy TypeScript
npm run check

# Watch mode
npm run check:watch
```

#### Build test
```bash
# Test czy aplikacja się buduje
npm run build

# Test wersji produkcyjnej
npm run preview
```

---

## Technologie

### Frontend
- **SvelteKit 5** - Full-stack framework
- **Svelte 5** - Komponenty z najnowszym systemem runes
- **Tailwind CSS 4** - Utility-first CSS framework
- **TypeScript** - Typowanie statyczne
- **Vite** - Build tool i dev server

### Backend
- **Node.js** - Środowisko uruchomieniowe
- **SvelteKit API routes** - Endpointy API
- **File System** - Przechowywanie plików

### Biblioteki
- **ExcelJS** - Generowanie plików Excel
- **Archiver** - Tworzenie archiwów ZIP
- **Tailwind Forms** - Stylizacja formularzy
- **Tailwind Typography** - Stylizacja typografii

### Development Tools
- **Vite** - Build tool
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS prefixes
- **svelte-check** - Type checking

---

## Troubleshooting

### Częste problemy

#### Aplikacja nie startuje
```bash
# Sprawdź czy Node.js jest zainstalowany
node --version

# Sprawdź czy npm jest zainstalowany
npm --version

# Zainstaluj zależności ponownie
rm -rf node_modules package-lock.json
npm install
```

#### Błędy podczas importu CSV
- **Problem**: "Plik CSV musi zawierać kolumny..."
- **Rozwiązanie**: Sprawdź czy plik ma nagłówki w pierwszym wierszu
- **Format**: `name,email` dla użytkowników, `name,type,serialnumber,...` dla sprzętu

#### Błędy podczas buildu
```bash
# Sprawdź błędy TypeScript
npm run check

# Wyczyść cache
rm -rf .svelte-kit
npm run dev
```

#### Problemy z dodawaniem sprzętu
- **Problem**: "Wszystkie pola są wymagane"
- **Rozwiązanie**: Tylko nazwa, typ i numer seryjny są wymagane
- **Uwaga**: inwentarzowy i lokalizacja są opcjonalne

#### Problemy z dokumentami
- **Problem**: Dokumenty nie są zapisywane
- **Rozwiązanie**: Sprawdź czy katalog `documents/` istnieje i ma odpowiednie uprawnienia

### Debugging

#### Logi w konsoli
```javascript
// Włącz szczegółowe logi w data.js
console.log('Debug info:', data);
```

#### Network tab
- Sprawdź czy API calls kończą się sukcesem
- Sprawdź response codes i błędy

#### Sprawdzanie plików danych
```bash
# Sprawdź czy pliki JSON istnieją
ls -la data/

# Sprawdź zawartość
cat data/users.json
cat data/equipment.json
```

### Performance

#### Optymalizacja
- Aplikacja automatycznie cachuje dane w pamięci
- Użyj `forceRefreshAllData()` gdy potrzebujesz świeżych danych
- Bulk operations dla dużych importów

#### Limity
- Brak twardych limitów na liczbę rekordów
- Wydajność zależy od przeglądarki i sprzętu
- Zalecane do ~1000 pozycji sprzętu i ~100 użytkowników

---

## Licencja

Projekt jest dostępny na licencji MIT. Zobacz plik `LICENSE` dla szczegółów.

## Kontakt

- **Autor**: Karol Żmijkowski
- **GitHub**: @cazlerano
- **Email**: karolzmijkowski@proton.me

## Współtworzenie

Projekt jest otwarty na propozycje ulepszeń:

1. Fork repozytorium
2. Utwórz branch feature (`git checkout -b feature/amazing-feature`)
3. Commit zmiany (`git commit -m 'Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

---

**Ostatnia aktualizacja dokumentacji**: 17 lipca 2025
