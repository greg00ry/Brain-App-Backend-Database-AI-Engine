# 🚀 Instrukcja Wdrożenia - Neural Console z Streamingiem

## 📦 Pliki do wdrożenia

### Backend (Node.js/TypeScript):
1. **queue.service.ts** → `src/services/queue.service.ts`
2. **intent.controller.streaming.ts** → `src/controllers/intent.controller.ts` (NADPISZ)
3. **intent.route.updated.ts** → `src/routes/intent.route.ts` (NADPISZ)

### Frontend (React):
4. **NeuralConsole.tsx** → zastąp obecny komponent

---

## 🔧 KROK 1: Backend - Dodaj Queue Service

**Lokalizacja:** `src/services/queue.service.ts`

```bash
# Utwórz nowy plik
touch src/services/queue.service.ts
```

Skopiuj zawartość z **queue.service.ts**

---

## 🔧 KROK 2: Backend - Zaktualizuj Controller

**Lokalizacja:** `src/controllers/intent.controller.ts`

⚠️ **BACKUP:** Najpierw zrób kopię obecnego controllera!

```bash
cp src/controllers/intent.controller.ts src/controllers/intent.controller.backup.ts
```

Następnie **NADPISZ** zawartością z **intent.controller.streaming.ts**

### Kluczowe zmiany w controllerze:

```typescript
// PRZED (JSON response):
res.json(result);

// PO (SSE streaming):
res.setHeader('Content-Type', 'text/event-stream');
res.write(`data: ${JSON.stringify(data)}\n\n`);
```

---

## 🔧 KROK 3: Backend - Zaktualizuj Routing

**Lokalizacja:** `src/routes/intent.route.ts`

```bash
cp src/routes/intent.route.ts src/routes/intent.route.backup.ts
```

Zastąp zawartością z **intent.route.updated.ts**

### Nowe endpointy:

- `POST /api/intent` - wersja klasyczna (JSON)
- `POST /api/intent/stream` - wersja ze streamingiem ✅

---

## 🔧 KROK 4: Frontend - Zaktualizuj Komponent

**Lokalizacja:** `src/components/NeuralConsole.tsx`

```bash
cp src/components/NeuralConsole.tsx src/components/NeuralConsole.backup.tsx
```

Zastąp zawartością z **NeuralConsole.tsx**

### Kluczowe zmiany:

```typescript
// ZMIENIONY URL:
fetch("http://localhost:3001/api/intent/stream", { ... })

// DODANE:
whitespace-pre-wrap  // Dla formatowania wielolinijkowego tekstu z emoji
```

---

## 🧪 KROK 5: Testowanie

### 1. Restart Backend:
```bash
npm run dev
# lub
yarn dev
```

### 2. Restart Frontend:
```bash
npm start
# lub
yarn start
```

### 3. Test w przeglądarce:

Otwórz DevTools (F12) → zakładka "Network"

**Testowy prompt:**
```
Chcę napisać mail do Marka o spotkaniu w piątek
```

**Oczekiwany output w konsoli (streaming):**

```
🧠 Analizuję intencję...
🧠 Wykryto: SAVE_MAIL
⏳ W kolejce: 0 zadań
⚙️ Analizuję treść...
⚙️ Analiza zakończona
✅ Gotowe!

📊 Szczegółowa Analiza:
━━━━━━━━━━━━━━━━━━━━━━
📝 Mail do Marka o spotkaniu

🏷️  Kategoria: Communication
🔖 Tagi: email, meeting, work
💪 Siła: 7/10
```

---

## 🐛 Troubleshooting

### Problem: "400 Bad Request"
**Przyczyna:** Niewłaściwy format body

**Rozwiązanie:**
```typescript
// ✅ POPRAWNE:
body: JSON.stringify({ text: userInput })

// ❌ BŁĘDNE:
body: JSON.stringify({ messages: [...] })
```

---

### Problem: "Brak strumienia danych"
**Przyczyna:** Backend nie ustawia SSE headers

**Rozwiązanie:** Sprawdź czy controller ma:
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

---

### Problem: Kolejka nie działa
**Przyczyna:** Import nie jest singleton

**Rozwiązanie:** Upewnij się że importujesz:
```typescript
import { aiQueue } from "../services/queue.service.js";
// NIE: import AIQueue from ...
```

---

### Problem: Emoji się nie wyświetlają
**Przyczyna:** Brak `whitespace-pre-wrap`

**Rozwiązanie:** Dodaj do className div z wiadomością:
```typescript
className="... whitespace-pre-wrap"
```

---

## 📊 Monitoring kolejki

Dodaj endpoint do monitorowania:

```typescript
// src/routes/intent.route.ts
router.get("/queue/status", requireAuth, (req, res) => {
  res.json(aiQueue.getStatus());
});
```

Test:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/intent/queue/status
```

---

## 🎯 Flow systemu (dla zrozumienia):

```
User: "Chcę napisać mail"
    ↓
Frontend: POST /api/intent/stream
    ↓
Backend: SSE Stream Start
    ↓
🧠 Intent Classification → SAVE_MAIL
    ↓
⏳ Queue Position: 0
    ↓
⚙️ AI Analysis (LM Studio)
    ↓
💾 Database Save
    ↓
✅ Complete + Data
    ↓
Frontend: Wyświetl progresywnie
```

---

## ⚙️ Konfiguracja opcjonalna

### Zmień opóźnienie kolejki:
```typescript
// queue.service.ts
private readonly delay = 1000; // 1 sekunda zamiast 500ms
```

### Zwiększ concurrent tasks:
```typescript
private readonly maxConcurrent = 3; // Przetwarzaj 3 równolegle
```

⚠️ **UWAGA:** LM Studio może nie obsłużyć wielu równoczesnych requestów!

---

## ✅ Checklist wdrożenia

- [ ] Skopiowano queue.service.ts
- [ ] Zaktualizowano intent.controller.ts
- [ ] Zaktualizowano intent.route.ts
- [ ] Zaktualizowano NeuralConsole.tsx
- [ ] Zrestartowano backend
- [ ] Zrestartowano frontend
- [ ] Przetestowano prompt w UI
- [ ] Sprawdzono Network tab (DevTools)
- [ ] Sprawdzono logi backendu

---

## 🎉 Gotowe!

Teraz Twój Neural Console:
- ✅ Streamuje odpowiedzi w czasie rzeczywistym
- ✅ Pokazuje progres przetwarzania
- ✅ Używa kolejki do zarządzania obciążeniem
- ✅ Zapisuje wszystko do bazy danych
- ✅ Klasyfikuje intencje użytkownika

**Questions?** Sprawdź logi backendu i frontend console!
