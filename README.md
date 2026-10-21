# astrolab-quiz

## Informacje
- Wymagania: `node.js > 22.5`, `npm`, `prąd`
- Jeśli w pliku `.env` nie znajduje się hash hasła to tymczasowym hasłem jest `admin123`
- Panel zarządzania znajduje się pod `/admin`

## Start
1. Instalacja zależności `npm i`
2. Przekopiuj plik `.env.example` do `.env`
3. Wygeneruj hash hasła (np. https://bcrypt-generator.com/, Cost Factor `12`) i umieść go w `.env`
4. Uruchom aplikację `npm start` lub z wykrywaniem zmian `npm run dev`