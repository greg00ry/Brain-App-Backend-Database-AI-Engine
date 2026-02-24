# 🎯 INSTRUKCJA WDROŻENIA - Action Tools Architecture

## 📋 Spis Treści
1. [Przegląd Architektury](#przegląd-architektury)
2. [Instalacja Dependencies](#instalacja-dependencies)
3. [Konfiguracja Środowiska](#konfiguracja-środowiska)
4. [Struktura Plików](#struktura-plików)
5. [Krok po Kroku - Wdrożenie](#krok-po-kroku---wdrożenie)
6. [Testowanie](#testowanie)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Przegląd Architektury

```
User Request
     ↓
Intent Classification (SAVE_ONLY / SAVE_SEARCH / SAVE_MAIL)
     ↓
AI Queue → AI Analysis → Database Save
     ↓
Action Executor (ASYNC, w tle)
     ├─→ Tavily Search (SAVE_SEARCH)
     │   └─→ Update Entry with Facts
     │
     └─→ Nodemailer Email (SAVE_MAIL)
         └─→ Update Entry with Status
```

### Kluczowe Cechy:
- ✅ **Asynchroniczne działanie** - akcje nie blokują odpowiedzi dla użytkownika
- ✅ **Kolejkowanie** - zapobiega przeciążeniu AI
- ✅ **Aktualizacja bazy** - wyniki researchu/emaila zapisywane do synaps
- ✅ **Monitoring** - endpointy do sprawdzania statusu akcji

---

## 📦 Instalacja Dependencies

### 1. Zainstaluj nowe paczki:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Sprawdź czy masz wszystkie zależności:

```bash
npm list express mongoose axios dotenv cors jsonwebtoken nodemailer
```

Jeśli brakuje którejś, zainstaluj:
```bash
npm install express mongoose axios dotenv cors jsonwebtoken
```

---

## ⚙️ Konfiguracja Środowiska

### 1. Skopiuj template .env:

```bash
cp .env.template .env
```

### 2. Wypełnij zmienne środowiskowe:

**Tavily API Key:**
```bash
# 1. Zarejestruj się: https://tavily.com/
# 2. Skopiuj API key
# 3. Wklej do .env:
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxx
```

**Gmail SMTP (dla emaili):**
```bash
# 1. Włącz 2FA w Google Account
# 2. Idź do: https://myaccount.google.com/apppasswords
# 3. Wygeneruj hasło aplikacji dla "Mail"
# 4. Wklej do .env:
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-znakowe hasło aplikacji
ADMIN_EMAIL=admin@example.com
```

**Alternatywa: SendGrid**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

---

## 📁 Struktura Plików

Utwórz następującą strukturę:

```
src/
├── services/
│   ├── actions/
│   │   ├── tavily.service.ts          ← NOWY
│   │   ├── email.service.ts           ← NOWY
│   │   └── action.executor.service.ts ← NOWY
│   ├── ai/
│   │   ├── intent.service.ts          (istniejący)
│   │   ├── analyze.service.ts         (istniejący)
│   │   └── ai.service.ts              (istniejący)
│   ├── db/
│   │   └── entry.service.ts           ← ROZSZERZONY
│   └── queue.service.ts               ← NOWY
├── controllers/
│   └── intent.controller.ts           ← ZAKTUALIZOWANY
├── routes/
│   ├── intent.route.ts                (istniejący)
│   └── actions.route.ts               ← NOWY
├── models/
│   └── Entry.model.ts                 ← ROZSZERZONY SCHEMA
└── app.ts                             ← ZAKTUALIZOWANY ROUTING
```

---

## 🚀 Krok po Kroku - Wdrożenie

### KROK 1: Dodaj Action Services

**Lokalizacja:** `src/services/actions/`

```bash
mkdir -p src/services/actions
```

Skopiuj pliki:
- `tavily.service.ts` → `src/services/actions/tavily.service.ts`
- `email.service.ts` → `src/services/actions/email.service.ts`
- `action.executor.service.ts` → `src/services/actions/action.executor.service.ts`

---

### KROK 2: Rozszerz Entry Model

**Lokalizacja:** `src/models/Entry.model.ts`

⚠️ **BACKUP FIRST:**
```bash
cp src/models/Entry.model.ts src/models/Entry.model.backup.ts
```

Dodaj do schematu pole `actionTools`:

```typescript
const EntrySchema = new mongoose.Schema({
  // ... istniejące pola (userId, rawText, analysis)
  
  // DODAJ TO:
  actionTools: {
    search: {
      completed: { type: Boolean, default: false },
      facts: [{ type: String }],
      searchResults: { type: String },
      sources: [{ type: String }],
      timestamp: { type: Date },
      error: { type: String }
    },
    email: {
      completed: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      messageId: { type: String },
      timestamp: { type: Date },
      error: { type: String }
    }
  },
  
  // ... reszta pól
});

// Dodaj indexy:
EntrySchema.index({ userId: 1, "actionTools.search.completed": 1 });
EntrySchema.index({ userId: 1, "actionTools.email.completed": 1 });
```

---

### KROK 3: Rozszerz Entry Service

**Lokalizacja:** `src/services/db/entry.service.ts`

Dodaj funkcję `updateEntry`:

```typescript
export async function updateEntry(
  entryId: string,
  updateData: Record<string, any>
): Promise<any> {
  const updatedEntry = await Entry.findByIdAndUpdate(
    entryId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  
  if (!updatedEntry) {
    throw new Error(`Entry ${entryId} not found`);
  }
  
  return updatedEntry;
}
```

---

### KROK 4: Zaktualizuj Intent Controller

**Lokalizacja:** `src/controllers/intent.controller.ts`

⚠️ **BACKUP:**
```bash
cp src/controllers/intent.controller.ts src/controllers/intent.controller.backup.ts
```

Zastąp zawartością z `intent.controller.with-actions.ts`

**Kluczowa zmiana:**
```typescript
// DODAJ import:
import { executeActionInBackground } from "../services/actions/action.executor.service.js";

// DODAJ po zapisie do bazy:
if (intentResult.action !== "SAVE_ONLY") {
  executeActionInBackground({
    userId: userId.toString(),
    entryId: queueResult.entry._id.toString(),
    text: text.trim(),
    action: intentResult.action,
  });
}
```

---

### KROK 5: Dodaj Actions Router

**Lokalizacja:** `src/routes/actions.route.ts`

Skopiuj plik `actions.route.ts`

---

### KROK 6: Zaktualizuj Main App

**Lokalizacja:** `src/app.ts`

Dodaj routing:
```typescript
import actionsRouter from "./routes/actions.route.js";

// ...

app.use("/api/actions", actionsRouter);
```

---

## 🧪 Testowanie

### 1. Restart Serwera:

```bash
npm run dev
```

Powinieneś zobaczyć:
```
🧠 NEURAL CONSOLE API
Server running on: http://localhost:3001

Routes:
• POST   /api/intent/stream      - AI Processing (streaming)
• GET    /api/actions/status/:id - Action Tools Status
• GET    /api/actions/list       - All Actions
• GET    /api/actions/health     - Service Health
```

---

### 2. Test Health Check:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/actions/health
```

Oczekiwany output:
```json
{
  "tavily": {
    "configured": true,
    "status": "unknown"
  },
  "email": {
    "configured": true,
    "status": "ok"
  }
}
```

---

### 3. Test Research (Tavily):

**W Frontend - Neural Console:**
```
Wpisz: "Znajdź najnowsze informacje o AI w 2024"
```

**Backend Logs:**
```
[IntentController] Zapytanie od użytkownika: 67890...
[IntentService] LM Studio raw output: {"action":"SAVE_SEARCH",...}
[Queue] Dodano zadanie ...
[ActionExecutor] 🚀 Starting background action: SAVE_SEARCH
[TavilyService] Searching: "Znajdź najnowsze informacje o AI w 2024"
[TavilyService] ✓ Found 5 results in 1234ms
[ActionExecutor] ✓ Entry 123... updated with search results
```

---

### 4. Sprawdź Status Akcji:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/actions/status/ENTRY_ID
```

Oczekiwany output:
```json
{
  "entryId": "67890...",
  "actionTools": {
    "search": {
      "completed": true,
      "facts": [
        "AI models in 2024 have reached...",
        "GPT-5 was announced in..."
      ],
      "sources": [
        "https://example.com/ai-news",
        "https://example.com/gpt5"
      ],
      "timestamp": "2024-02-24T12:34:56.789Z"
    }
  }
}
```

---

### 5. Test Email:

**W Frontend:**
```
Wpisz: "Wyślij mail do szefa o spotkaniu w piątek"
```

**Backend Logs:**
```
[IntentService] LM Studio raw output: {"action":"SAVE_MAIL",...}
[ActionExecutor] 📧 Executing email action
[EmailService] Sending email to: admin@example.com
[EmailService] ✓ Email sent: <message-id>
```

**Sprawdź skrzynkę** `ADMIN_EMAIL` - powinieneś dostać email!

---

## 🐛 Troubleshooting

### Problem: "TAVILY_API_KEY not configured"

**Przyczyna:** Brak klucza API w `.env`

**Rozwiązanie:**
1. Zarejestruj się na https://tavily.com/
2. Skopiuj API key
3. Dodaj do `.env`: `TAVILY_API_KEY=tvly-...`
4. Restart serwera

---

### Problem: "SMTP_USER and SMTP_PASS must be configured"

**Przyczyna:** Brak konfiguracji email

**Rozwiązanie:**
1. Włącz 2FA w Google Account
2. Wygeneruj hasło aplikacji: https://myaccount.google.com/apppasswords
3. Dodaj do `.env`:
   ```
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```
4. Restart serwera

---

### Problem: Action Tools nie aktualizują bazy

**Przyczyna:** Błędny import modelu Entry

**Rozwiązanie:**
Sprawdź w `action.executor.service.ts`:
```typescript
const { updateEntry } = await import("../db/entry.service.js");
```

Ścieżka musi wskazywać na prawidłową lokalizację!

---

### Problem: Tavily zwraca "Brak wyników"

**Przyczyna:** Query zbyt szczegółowe lub w złym języku

**Rozwiązanie:**
Tavily działa lepiej z angielskimi zapytaniami:
```typescript
// W intent.controller.ts możesz dodać tłumaczenie:
const query = translateToEnglish(text); // opcjonalne
```

---

### Problem: Email nie dochodzi

**Diagnoza:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/actions/health
```

Jeśli `email.status: "error"`:
1. Sprawdź czy hasło aplikacji jest poprawne (16 znaków, bez spacji)
2. Sprawdź czy 2FA jest włączone w Google
3. Spróbuj SendGrid jako alternatywę

---

## 📊 Monitoring w Produkcji

### 1. Dodaj logger (Winston):

```bash
npm install winston
```

```typescript
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: "action-tools.log" })
  ]
});

// W action.executor.service.ts:
logger.info("Action completed", { entryId, action });
```

---

### 2. Dashboard w Frontend:

```typescript
// Komponent: ActionToolsStatus.tsx
useEffect(() => {
  fetch(`/api/actions/list`)
    .then(res => res.json())
    .then(data => {
      // Wyświetl listę akcji z statusami
    });
}, []);
```

---

## ✅ Checklist Wdrożenia

- [ ] Zainstalowano nodemailer
- [ ] Skopiowano pliki action services
- [ ] Rozszerzono Entry model o actionTools
- [ ] Dodano funkcję updateEntry
- [ ] Zaktualizowano intent controller
- [ ] Dodano actions router
- [ ] Zaktualizowano app.ts
- [ ] Skonfigurowano .env (Tavily + SMTP)
- [ ] Zrestartowano serwer
- [ ] Przetestowano health check
- [ ] Przetestowano research (Tavily)
- [ ] Przetestowano email
- [ ] Sprawdzono logi w konsoli
- [ ] Sprawdzono aktualizację bazy danych

---

## 🎉 Gratulacje!

Twój Neural Console ma teraz:
- ✅ Asynchroniczne Action Tools
- ✅ Web Research (Tavily)
- ✅ Email Notifications (Nodemailer)
- ✅ Automatyczną aktualizację synaps o fakty z internetu
- ✅ Monitoring i health checks

**Questions?** Sprawdź logi: `npm run dev` i console.log w action.executor.service.ts
