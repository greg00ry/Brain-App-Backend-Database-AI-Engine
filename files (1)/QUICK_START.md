# ⚡ Quick Start Guide - Action Tools

## 🚀 5-minutowe wdrożenie

### 1. Zainstaluj zależności (30 sekund)

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

### 2. Skopiuj pliki (1 minuta)

```bash
# Utwórz folder
mkdir -p src/services/actions

# Skopiuj services
cp tavily.service.ts src/services/actions/
cp email.service.ts src/services/actions/
cp action.executor.service.ts src/services/actions/

# Skopiuj router
cp actions.route.ts src/routes/

# Skopiuj zaktualizowany controller
cp intent.controller.with-actions.ts src/controllers/intent.controller.ts
```

---

### 3. Konfiguracja .env (2 minuty)

**Minimum required:**

```bash
# Dodaj do .env:

# Tavily (darmowy plan: 1000 req/miesiąc)
TAVILY_API_KEY=tvly-YOUR_KEY_HERE

# Gmail (darmowe)
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App password z Google
ADMIN_EMAIL=admin@example.com
```

**Jak zdobyć:**
- **Tavily:** https://tavily.com/ → Sign up → Copy API Key
- **Gmail App Password:** https://myaccount.google.com/apppasswords → Create → Copy

---

### 4. Rozszerz Entry Model (1 minuta)

**src/models/Entry.model.ts** - dodaj to pole:

```typescript
const EntrySchema = new mongoose.Schema({
  // ... existing fields
  
  actionTools: {  // ← DODAJ TO
    search: {
      completed: Boolean,
      facts: [String],
      searchResults: String,
      sources: [String],
      timestamp: Date
    },
    email: {
      completed: Boolean,
      sent: Boolean,
      messageId: String,
      timestamp: Date
    }
  }
});
```

---

### 5. Dodaj funkcję updateEntry (30 sekund)

**src/services/db/entry.service.ts** - dodaj:

```typescript
export async function updateEntry(entryId: string, updateData: any) {
  const { Entry } = await import("../../models/Entry.model.js");
  return await Entry.findByIdAndUpdate(
    entryId, 
    { $set: updateData }, 
    { new: true }
  );
}
```

---

### 6. Dodaj routing (30 sekunds)

**src/app.ts** - dodaj:

```typescript
import actionsRouter from "./routes/actions.route.js";

// ...

app.use("/api/actions", actionsRouter);
```

---

### 7. Restart & Test (30 sekund)

```bash
npm run dev
```

**Test:**
```bash
curl http://localhost:3001/api/actions/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
```json
{
  "tavily": { "configured": true },
  "email": { "configured": true, "status": "ok" }
}
```

✅ **GOTOWE!**

---

## 🧪 Szybki Test w UI

**1. Otwórz Neural Console**

**2. Wpisz:**
```
Znajdź najnowsze informacje o sztucznej inteligencji
```

**3. Sprawdź logi backendu:**
```
[IntentService] → SAVE_SEARCH
[ActionExecutor] 🚀 Starting background action
[TavilyService] Searching...
[TavilyService] ✓ Found 5 results
```

**4. Sprawdź bazę danych:**
```bash
curl http://localhost:3001/api/actions/status/ENTRY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**5. Zobaczysz:**
```json
{
  "actionTools": {
    "search": {
      "completed": true,
      "facts": ["...", "..."],
      "sources": ["https://...", "https://..."]
    }
  }
}
```

---

## 🐛 Jeśli coś nie działa

### "TAVILY_API_KEY not configured"
```bash
# Sprawdź .env
cat .env | grep TAVILY

# Jeśli puste:
echo 'TAVILY_API_KEY=tvly-YOUR_KEY' >> .env
```

### "SMTP_USER must be configured"
```bash
# Sprawdź .env
cat .env | grep SMTP

# Dodaj:
echo 'SMTP_USER=your-email@gmail.com' >> .env
echo 'SMTP_PASS=xxxx xxxx xxxx xxxx' >> .env
```

### Action nie wykonuje się
```bash
# Sprawdź logi
tail -f logs/app.log

# Lub w konsoli:
npm run dev
# Szukaj: [ActionExecutor] 🚀
```

---

## 📚 Więcej Info

- **Pełna instrukcja:** `ACTION_TOOLS_INSTRUKCJA.md`
- **Diagramy:** `FLOW_DIAGRAMS.md`
- **Environment:** `.env.template`

---

## ✅ Checklist

- [ ] Zainstalowano nodemailer
- [ ] Skopiowano 3 pliki services
- [ ] Skopiowano actions.route.ts
- [ ] Zaktualizowano intent.controller.ts
- [ ] Dodano pole actionTools do Entry model
- [ ] Dodano funkcję updateEntry
- [ ] Dodano routing w app.ts
- [ ] Skonfigurowano .env (Tavily + SMTP)
- [ ] Zrestartowano serwer
- [ ] Przetestowano health check ✓

**Jeśli wszystko ✅ - gratulacje! 🎉**
