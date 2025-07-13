# Katalog documents/

Ten katalog zawiera przesłane dokumenty (PDF, DOCX, itp.).

## Struktura

- Dokumenty są przechowywane z automatycznie generowanymi nazwami plików
- Metadane dokumentów są przechowywane w `data/documents.json`
- Aplikacja obsługuje różne typy plików: PDF, DOCX, TXT, itp.

## Bezpieczeństwo

- Wszystkie przesłane pliki w tym katalogu są ignorowane przez git
- Katalog jest automatycznie tworzony przy pierwszym uruchomieniu aplikacji
- Uprawnienia do plików są zarządzane przez system operacyjny

## API

Dokumenty są dostępne przez endpointy:
- `GET /api/documents` - lista dokumentów
- `POST /api/documents` - upload dokumentu
- `GET /api/documents/[id]/download` - pobieranie dokumentu
- `DELETE /api/documents` - usuwanie dokumentu

## Uwagi

- Maksymalny rozmiar pliku jest ograniczony przez konfigurację serwera
- Aplikacja automatycznie czyści nieużywane pliki
- Wszystkie pliki w tym katalogu (oprócz README.md i .gitkeep) są ignorowane przez git
