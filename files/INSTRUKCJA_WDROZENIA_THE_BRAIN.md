# 🧠 THE BRAIN - Instrukcja Wdrożenia Rozbudowy

## 📋 Spis Treści
1. [Przegląd Zmian](#przegląd-zmian)
2. [Struktura Plików](#struktura-plików)
3. [Instalacja Krok po Kroku](#instalacja-krok-po-kroku)
4. [Konfiguracja Environment](#konfiguracja-environment)
5. [Integracja z index.ts](#integracja-z-indexts)
6. [Testowanie](#testowanie)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Przegląd Zmian

### **Nowe Funkcjonalności:**

1. **📅 Offline Calendar**
   - Model `CalendarEvent` z pełnym CRUD
   - Automatyczne tworzenie wydarzeń przez AI
   - Kategorie: work, health, personal, meeting, reminder, other
   - Tracking źródła (sourceEntryId)

2. **📧 Dynamic Email Recipients**
   - Ekstrakcja odbiorcy z tekstu użytkownika
   - Fallback na `.env` jeśli nie wykryto
   - Automatyczne sugerowanie tematów

3. **🎨 UI Hints dla Jarvis HUD**
   - Pole `uiHint` w `actionTools`
   - Typy: pulse, calendar_entry, mail_sent, search_complete, thinking, error, success
   - Real-time feedback dla animacji CSS

4. **🧠 Rozszerzona Intent Detection**
   - Detekcja dat i przypomnień → `CREATE_EVENT`
   - Normalizacja dat do ISO 8601
   - Walidacja eventData i emailData

---

## 📁 Struktura Plików

```
src/
├── models/
│   ├── CalendarEvent.ts                    ← NOWY
│   ├── VaultEntry.ts                       ← ZAKTUALIZOWANY (+ calendar, uiHint)
│   └── User.ts
│
├── services/
│   ├── actions/
│   │   ├── action.executor.service.ts     ← ZAKTUALIZOWANY (+ calendar action)
│   │   ├── email.service.ts               ← ZAKTUALIZOWANY (+ extractRecipient)
│   │   ├── tavily.service.ts
│   │   └── calendar.service.ts            ← NOWY
│   │
│   ├── ai/
│   │   ├── intent.service.ts              ← ZAKTUALIZOWANY (+ CREATE_EVENT)
│   │   ├── intent.types.ts                ← ZAKTUALIZOWANY (+ eventData, emailData)
│   │   └── ai.service.ts
│   │
│   └── db/
│       └── entry.service.ts
│
├── routes/
│   ├── intent.route.ts
│   ├── actions.route.ts
│   └── calendar.route.ts                   ← NOWY
│
└── index.ts                                ← ZAKTUALIZOWANY (+ calendar router)
```

---

## 🚀 Instalacja Krok po Kroku

### **KROK 1: Backup Istniejących Plików**

```bash
# Utwórz folder backups
mkdir -p backups

# Backup kluczowych plików
cp src/models/VaultEntry.ts backups/VaultEntry.backup.ts
cp src/services/actions/action.executor.service.ts backups/action.executor.backup.ts
cp src/services/actions/email.service.ts backups/email.backup.ts
cp src/services/ai/intent.service.ts backups/intent.service.backup.ts
cp src/services/ai/intent.types.ts backups/intent.types.backup.ts
```

---

### **KROK 2: Dodaj Nowe Pliki**

```bash
# Models
cp CalendarEvent.ts src/models/

# Services
cp calendar.service.ts src/services/actions/

# Routes
cp calendar.route.ts src/routes/
```

---

### **KROK 3: Zaktualizuj Istniejące Pliki**

#### **3.1 VaultEntry.ts**

**Lokalizacja:** `src/models/VaultEntry.ts`

**Zmiany:**
- Dodaj pole `calendar` w `actionTools`
- Dodaj pole `uiHint` w `actionTools`

```typescript
actionTools: {
  // ... existing search, email
  
  calendar: {
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending' 
    },
    completed: { type: Boolean, default: false },
    eventId: { type: Schema.Types.ObjectId, ref: 'CalendarEvent' },
    eventTitle: { type: String },
    eventDate: { type: Date },
    timestamp: { type: Date },
    error: { type: String },
  },
  
  uiHint: {
    type: String,
    enum: ['pulse', 'calendar_entry', 'mail_sent', 'search_complete', 'thinking', 'error', 'success'],
    default: 'pulse',
  },
}
```

**Lub:** Użyj `VaultEntry.extended.ts` który zawiera wszystko.

---

#### **3.2 intent.types.ts**

**Lokalizacja:** `src/services/ai/intent.types.ts`

**Zamień cały plik** na `intent.types.extended.ts`

**Kluczowe zmiany:**
```typescript
export type IntentAction = 
  | "SAVE_ONLY"
  | "SAVE_SEARCH"
  | "SAVE_MAIL"
  | "CREATE_EVENT";  // ← NOWE!

export interface IntentResult {
  action: IntentAction;
  reasoning: string;
  eventData?: { ... };    // ← NOWE!
  emailData?: { ... };    // ← NOWE!
}
```

---

#### **3.3 intent.service.ts**

**Lokalizacja:** `src/services/ai/intent.service.ts`

**Zamień cały plik** na `intent.service.extended.ts`

**Kluczowe zmiany:**
- System prompt z detekcją dat
- Keyword fallback dla EVENT_KEYWORDS
- Parser dla `eventData` i `emailData`
- Funkcja `validateEventData()`

---

#### **3.4 email.service.ts**

**Lokalizacja:** `src/services/actions/email.service.ts`

**Zamień cały plik** na `email.service.extended.ts`

**Kluczowe zmiany:**
- Funkcja `extractRecipient(text)` - regex dla email
- Funkcja `extractSubject(text)` - ekstrakcja tematu
- `sendEmail()` przyjmuje opcjonalny `contextText`
- Fallback na `DEFAULT_EMAIL_RECIPIENT` z `.env`

---

#### **3.5 action.executor.service.ts**

**Lokalizacja:** `src/services/actions/action.executor.service.ts`

**Zamień cały plik** na `action.executor.extended.ts`

**Kluczowe zmiany:**
- Nowa funkcja `executeCalendarAction()`
- `executeEmailAction()` używa `extractRecipient()`
- Wszystkie akcje ustawiają `uiHint`
- `ActionContext` zawiera `intentResult`

---

### **KROK 4: Konfiguracja Environment**

**Lokalizacja:** `.env`

**Dodaj nowe zmienne:**

```bash
# ─── Email Configuration (EXISTING) ───────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Defaults
EMAIL_FROM=The Brain <your-email@gmail.com>
ADMIN_EMAIL=admin@example.com

# ← NOWE: Default recipient jeśli nie wykryto w tekście
DEFAULT_EMAIL_RECIPIENT=admin@example.com

# ─── LLM Configuration (EXISTING) ─────────────────────────────────
LLM_API_URL=http://localhost:1234/v1/chat/completions
LLM_MODEL=qwen
LLM_TIMEOUT=15000

# ─── Tavily API (EXISTING) ────────────────────────────────────────
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxx
```

---

### **KROK 5: Integracja z index.ts**

**Lokalizacja:** `src/index.ts` (lub `src/app.ts`)

**Dodaj routing dla kalendarza:**

```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// ─── Import Routes ────────────────────────────────────────────────
import intentRouter from "./routes/intent.route.js";
import actionsRouter from "./routes/actions.route.js";
import calendarRouter from "./routes/calendar.route.js";  // ← NOWY!

// ─── Initialize App ───────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "The Brain API",
    version: "2.0.0"
  });
});

// Intent & AI Processing
app.use("/api/intent", intentRouter);

// Action Tools Monitoring
app.use("/api/actions", actionsRouter);

// Calendar (NOWY!)
app.use("/api/calendar", calendarRouter);  // ← DODAJ TO!

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════════════╗
  ║                                                                   ║
  ║   🧠 THE BRAIN API                                                ║
  ║                                                                   ║
  ║   Server running on: http://localhost:${PORT}                       ║
  ║                                                                   ║
  ║   Routes:                                                         ║
  ║   • POST   /api/intent/stream      - AI Processing               ║
  ║   • GET    /api/actions/status/:id - Action Tools Status         ║
  ║   • POST   /api/calendar           - Create Event                ║
  ║   • GET    /api/calendar/upcoming  - Get Upcoming Events         ║
  ║   • GET    /api/calendar/today     - Get Today Events            ║
  ║   • GET    /api/calendar/stats     - Calendar Stats              ║
  ║                                                                   ║
  ╚═══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
```

---

## 🧪 Testowanie

### **Test 1: Intent Detection - Calendar**

```bash
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Przypomnij mi jutro o 10:00 o spotkaniu z klientem"}'
```

**Oczekiwany output (SSE):**
```
data: {"stage":"intent_classification","status":"complete","data":{"action":"CREATE_EVENT","eventData":{"title":"spotkanie z klientem","startDate":"2024-12-26T10:00:00Z","category":"meeting"}}}

data: {"stage":"action_tools","status":"background","content":"CREATE_EVENT wykona się w tle"}

data: {"stage":"complete","status":"done","data":{"entryId":"...","action":"CREATE_EVENT"}}
```

---

### **Test 2: Dynamic Email Recipient**

```bash
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Wyślij mail do john@example.com o zebraniu"}'
```

**Oczekiwany log backendu:**
```
[EmailService] Extracted recipient: john@example.com
[EmailService] Sending email to: john@example.com
[EmailService] ✓ Email sent: <message-id>
```

---

### **Test 3: Calendar API**

**Pobierz nadchodzące wydarzenia:**
```bash
curl http://localhost:3001/api/calendar/upcoming?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Pobierz dzisiejsze:**
```bash
curl http://localhost:3001/api/calendar/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Statystyki:**
```bash
curl http://localhost:3001/api/calendar/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oczekiwany output:**
```json
{
  "totalEvents": 15,
  "upcomingEvents": 8,
  "overdueEvents": 2,
  "completedToday": 3,
  "eventsByCategory": {
    "work": 5,
    "meeting": 4,
    "health": 2,
    "personal": 3,
    "reminder": 1,
    "other": 0
  }
}
```

---

### **Test 4: UI Hints dla Jarvis HUD**

**Sprawdź uiHint w entry:**
```bash
curl http://localhost:3001/api/actions/status/ENTRY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oczekiwany output:**
```json
{
  "entryId": "...",
  "actionTools": {
    "calendar": {
      "status": "completed",
      "completed": true,
      "eventId": "...",
      "eventTitle": "spotkanie z klientem",
      "eventDate": "2024-12-26T10:00:00Z"
    },
    "uiHint": "calendar_entry"  // ← Frontend użyje tej animacji!
  }
}
```

---

## 🐛 Troubleshooting

### **Problem: "Cannot find module CalendarEvent"**

**Przyczyna:** Nie skopiowano pliku modelu

**Rozwiązanie:**
```bash
cp CalendarEvent.ts src/models/
npm run build  # Jeśli TypeScript
```

---

### **Problem: "Missing DEFAULT_EMAIL_RECIPIENT"**

**Przyczyna:** Brak konfiguracji w `.env`

**Rozwiązanie:**
```bash
echo 'DEFAULT_EMAIL_RECIPIENT=admin@example.com' >> .env
```

---

### **Problem: "Invalid startDate format"**

**Przyczyna:** LLM nie zwrócił ISO 8601 date

**Rozwiązanie:**
Dodaj więcej przykładów w system prompt:
```typescript
IMPORTANT DATE PARSING EXAMPLES:
- "jutro o 10" → tomorrow at 10:00 → "2024-12-26T10:00:00Z"
- "w piątek" → next Friday → "2024-12-29T09:00:00Z"
- "za tydzień" → 7 days from now
```

---

### **Problem: Calendar events nie pokazują się**

**Przyczyna:** Brak indexów w MongoDB

**Rozwiązanie:**
```bash
# W MongoDB shell:
use your_database
db.calendarevents.createIndex({ userId: 1, startDate: 1 })
db.calendarevents.createIndex({ userId: 1, isDone: 1, startDate: 1 })
```

---

### **Problem: Email idzie na default mimo że podano odbiorcę**

**Przyczyna:** Regex nie wykrywa emaila w tekście

**Debug:**
```typescript
// W email.service.ts dodaj:
console.log("Extracting from:", text);
const match = text.match(emailRegex);
console.log("Matches:", match);
```

**Rozwiązanie:**
Sprawdź czy email ma format: `word@domain.com`

---

## ✅ Checklist Wdrożenia

- [ ] Backup istniejących plików
- [ ] Skopiowano `CalendarEvent.ts` do models
- [ ] Skopiowano `calendar.service.ts` do services/actions
- [ ] Skopiowano `calendar.route.ts` do routes
- [ ] Zaktualizowano `VaultEntry.ts` (+ calendar, uiHint)
- [ ] Zaktualizowano `intent.types.ts` (+ eventData, emailData)
- [ ] Zaktualizowano `intent.service.ts` (+ CREATE_EVENT)
- [ ] Zaktualizowano `email.service.ts` (+ extractRecipient)
- [ ] Zaktualizowano `action.executor.service.ts` (+ calendar action)
- [ ] Dodano routing w `index.ts`
- [ ] Skonfigurowano `.env` (DEFAULT_EMAIL_RECIPIENT)
- [ ] Zrestartowano serwer
- [ ] Przetestowano intent detection (calendar)
- [ ] Przetestowano dynamic email recipient
- [ ] Przetestowano Calendar API endpoints
- [ ] Sprawdzono uiHint w entry

---

## 🎉 Gratulacje!

Twój **The Brain** ma teraz:
- ✅ Offline Calendar z pełnym CRUD
- ✅ Dynamiczną ekstrakcję odbiorców emaili
- ✅ UI Hints dla Jarvis HUD animacji
- ✅ Rozszerzoną detekcję intencji (CREATE_EVENT)
- ✅ Async action tools z statusami

**Next Steps:**
1. Frontend - obsługa `uiHint` w CSS animations
2. Notification system - przypomnienia przed wydarzeniami
3. Calendar sync - integracja z Google Calendar
4. Voice commands - "Jarvis, co mam jutro?"

**The Brain is getting smarter! 🧠⚡**
