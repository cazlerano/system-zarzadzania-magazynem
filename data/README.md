# Katalog data/

Ten katalog zawiera pliki JSON z danymi aplikacji.

## Struktura plików

Aplikacja automatycznie utworzy następujące pliki podczas pierwszego uruchomienia:

- `users.json` - dane użytkowników
- `equipment.json` - dane sprzętu
- `history.json` - historia zmian
- `categories.json` - kategorie sprzętu
- `documents.json` - metadane dokumentów

## Format danych

### users.json
```json
[
  {
    "id": 1,
    "name": "Jan Kowalski",
    "email": "jan.kowalski@firma.pl",
    "createdAt": "2025-01-14T10:00:00.000Z"
  }
]
```

### equipment.json
```json
[
  {
    "id": 1,
    "name": "Dell Latitude 5520",
    "type": "Komputer",
    "serialNumber": "DL123456789",
    "inventoryNumber": "INV001",
    "roomLocation": "",
    "damaged": false,
    "assignedUser": "jan.kowalski@firma.pl",
    "createdAt": "2025-01-14T10:00:00.000Z"
  }
]
```

### history.json
```json
[
  {
    "id": 1,
    "equipmentId": 1,
    "equipmentName": "Dell Latitude 5520",
    "action": "assigned",
    "userEmail": "jan.kowalski@firma.pl", 
    "userName": "Jan Kowalski",
    "timestamp": "2025-01-14T10:00:00.000Z",
    "details": "Przypisano sprzęt do użytkownika"
  }
]
```

### categories.json
```json
[
  {
    "id": "computer",
    "name": "Komputer",
    "icon": "💻"
  }
]
```

### documents.json
```json
[
  {
    "id": 1,
    "filename": "document_123.pdf",
    "originalName": "Faktura.pdf",
    "size": 1024567,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-01-14T10:00:00.000Z"
  }
]
```

## Uwagi

- Pliki są tworzone automatycznie przy pierwszym uruchomieniu aplikacji
- Aplikacja gracefully radzi sobie z brakiem plików danych
- Wszystkie pliki *.json w tym katalogu są ignorowane przez git (patrz .gitignore)
