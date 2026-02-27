# 🔧 Naprawa Logiki Decyzyjnej AI - Instrukcja

## 🎯 Problemy Naprawione

### **1. ✅ Email Body Mapping**
**Przed:** Wysyłano surowy tekst użytkownika  
**Po:** Priorytet dla `intentResult.emailData.body` (treść wygenerowana przez AI)

### **2. ✅ RESEARCH_BRAIN Action**
**Przed:** Brak akcji do przeszukania własnej bazy  
**Po:** `RESEARCH_BRAIN` - przeszukuje MongoDB gdy kontekst niepełny

### **3. ✅ Type Safety**
**Przed:** Błędy typów przy `entryId` i `userId` (string vs ObjectId)  
**Po:** `new Types.ObjectId()` przy każdej operacji na bazie

### **4. ✅ Agentic Logic**
**Przed:** AI przeprasza za brak wiedzy  
**Po:** AI aktywnie używa `RESEARCH_BRAIN` lub `SAVE_SEARCH`

---

## 📁 Pliki do Zamiany

### **1. intent.types.ts**
```bash
cp intent.types.extended.ts src/services/ai/intent.types.ts
```

**Zmiany:**
- Dodano `RESEARCH_BRAIN` do `IntentAction`
- Dodano `body?: string` do `emailData`

---

### **2. intent.service.ts**
```bash
cp intent.service.fixed.ts src/services/ai/intent.service.ts
```

**Zmiany:**
- Dodano `RESEARCH_BRAIN` do `VALID_ACTIONS`
- Zaktualizowano system prompt:
  - Instrukcje dla `RESEARCH_BRAIN` vs `SAVE_SEARCH`
  - Generowanie pełnego `emailData.body`
  - "Nie przepraszaj - działaj!"
- Dodano Few-Shot przykład z email body
- Dodano keyword fallback dla RESEARCH_BRAIN

---

### **3. action.executor.service.ts**
```bash
cp action.executor.fixed.ts src/services/actions/action.executor.service.ts
```

**Zmiany:**
- **executeEmailAction:**
  - Priorytet: `emailData.body` > `context.text`
  - Logging źródła body (AI vs raw text)
- **executeResearchBrainAction:** Nowa funkcja (szkielet)
- **Type Safety:** `new Types.ObjectId()` w każdej operacji UPDATE
- **extractKeywords:** Helper dla RESEARCH_BRAIN

---

## 🧪 Testowanie

### **Test 1: Email Body Generation**

**Input:**
```
User: "Wyślij mail do john@example.com że projekt jest opóźniony"
```

**Oczekiwany Intent Result:**
```json
{
  "action": "SAVE_MAIL",
  "reasoning": "Email request with context",
  "answer": "Okej, mordo. Wysyłam do john@example.com.",
  "emailData": {
    "recipient": "john@example.com",
    "subject": "Aktualizacja statusu projektu",
    "body": "Cześć,\n\nChciałem poinformować, że projekt jest obecnie opóźniony. Pracuję nad rozwiązaniem problemu i wrócę z aktualizacją wkrótce.\n\nPozdrawiam"
  }
}
```

**Sprawdź logi:**
```
[ActionExecutor] 📧 Body source: AI generated
[EmailService] Sending email with body: "Cześć,\n\n..."
```

**✅ Sukces jeśli:** Email zawiera wygenerowaną treść, nie surowy tekst użytkownika

---

### **Test 2: RESEARCH_BRAIN (Empty Context)**

**Setup:**
```typescript
// Baza ma wpisy o "projekt AI", ale nie są w aktualnym kontekście
await VaultEntry.create({
  userId,
  rawText: "Pracuję nad projektem AI na uniwersytecie",
  analysis: { summary: "Projekt AI UW", tags: ["AI", "projekt"] }
});
```

**Input:**
```
User: "Co mi mówiłeś o projekcie AI?"
Brain Context: 💭 Brak relevantnych wspomnień
```

**Oczekiwany Intent Result:**
```json
{
  "action": "RESEARCH_BRAIN",
  "reasoning": "User asks about past info, not in current context",
  "answer": "Zaraz sprawdzę w pamięci, mordo. Chwilę..."
}
```

**Sprawdź logi:**
```
[ActionExecutor] 🧠 Executing brain research...
[ActionExecutor] Keywords for research: ['projekt', 'AI']
[ActionExecutor] ✓ Found 1 relevant entries
```

**✅ Sukces jeśli:** AI używa `RESEARCH_BRAIN` zamiast mówić "nie wiem"

---

### **Test 3: RESEARCH_BRAIN vs SAVE_SEARCH**

**Test A - Własna baza (RESEARCH_BRAIN):**
```
User: "Przypomnij mi co robiłem w zeszłym tygodniu"
Expected: RESEARCH_BRAIN (własne notatki)
```

**Test B - Internet (SAVE_SEARCH):**
```
User: "Jaka jest pogoda w Warszawie?"
Expected: SAVE_SEARCH (aktualne info)
```

**Sprawdź:**
```bash
# Test A
curl -X POST /api/intent/stream -d '{"text":"Co robiłem wczoraj"}' | grep action
# Powinno być: "RESEARCH_BRAIN"

# Test B
curl -X POST /api/intent/stream -d '{"text":"Jaka pogoda?"}' | grep action
# Powinno być: "SAVE_SEARCH"
```

---

### **Test 4: Type Safety (ObjectId)**

**Przed (błąd):**
```
MongooseError: Cast to ObjectId failed for value "abc123" at path "_id"
```

**Po (poprawnie):**
```typescript
await VaultEntry.findByIdAndUpdate(
  new Types.ObjectId(entryId), // ← Type safety
  { ... }
);
```

**Sprawdź:**
```bash
# Wyślij request i sprawdź logi
curl -X POST /api/intent/stream -d '{"text":"Przypomnij jutro o 10"}'

# Nie powinno być błędów typu:
# ❌ "Cast to ObjectId failed"
# ✅ "Entry abc123 updated successfully"
```

---

## 🐛 Debugging

### **Problem 1: Email zawiera surowy tekst zamiast AI body**

**Debug:**
```typescript
// W executeEmailAction dodaj:
console.log('[DEBUG] emailData:', context.intentResult?.emailData);
console.log('[DEBUG] body source:', emailData?.body ? 'AI' : 'raw text');
```

**Możliwe przyczyny:**
1. AI nie generuje `emailData.body`
   - Fix: Sprawdź Few-Shot przykład w promptcie
2. `intentResult` nie jest przekazywany
   - Fix: W controller: `executeActionInBackground({ ..., intentResult })`

---

### **Problem 2: AI nie używa RESEARCH_BRAIN**

**Debug:**
```typescript
// W classifyIntent dodaj:
console.log('[DEBUG] Brain context:', brainContext.hasContext);
console.log('[DEBUG] Intent action:', intentResult.action);
```

**Możliwe przyczyny:**
1. `RESEARCH_BRAIN` nie jest w `VALID_ACTIONS`
   - Fix: Sprawdź czy dodano w intent.service.ts
2. Prompt nie instruuje o RESEARCH_BRAIN
   - Fix: Sprawdź system prompt - sekcja "AGENTIC LOGIC"
3. Keyword fallback dominuje
   - Fix: Dodaj RESEARCH_KEYWORDS na początku fallback

---

### **Problem 3: TypeError przy ObjectId**

**Debug:**
```typescript
// W action executor:
console.log('[DEBUG] entryId type:', typeof entryId);
console.log('[DEBUG] userId type:', typeof userId);
```

**Możliwe przyczyny:**
1. Zapomniałeś `new Types.ObjectId()`
   - Fix: Szukaj `findByIdAndUpdate(entryId` → zmień na `findByIdAndUpdate(new Types.ObjectId(entryId)`
2. `Types` nie jest zaimportowany
   - Fix: `import { Types } from "mongoose";`

---

### **Problem 4: RESEARCH_BRAIN zwraca puste wyniki**

**Debug:**
```typescript
// W executeResearchBrainAction:
console.log('[DEBUG] Keywords:', keywords);
console.log('[DEBUG] Query:', { userId, $or: [...] });
console.log('[DEBUG] Results count:', results.length);
```

**Możliwe przyczyny:**
1. Brak entries w bazie
   - Fix: Dodaj testowe entries
2. Keywords źle ekstraktowane
   - Fix: Sprawdź `extractKeywords()` - może za dużo stop words
3. Query nie pasuje do danych
   - Fix: Sprawdź czy entries mają `analysis.tags` i `analysis.summary`

---

## 📊 Porównanie Przed/Po

### **Email Action**

| Aspekt | Przed | Po |
|--------|-------|-----|
| Body | Surowy tekst | AI generated |
| Recipient | Ekstrakcja | Priorytet emailData |
| Subject | Fallback | AI suggested |
| Logging | Brak | Source tracking |

---

### **Logika Decyzyjna**

| Scenariusz | Przed | Po |
|------------|-------|-----|
| "Co mi mówiłeś o X?" | "Nie wiem" | RESEARCH_BRAIN |
| "Jaka pogoda?" | SAVE_ONLY | SAVE_SEARCH |
| Brak kontekstu | Przeprosiny | Aktywna akcja |
| Niepełny kontekst | Odpowiedź | RESEARCH_BRAIN |

---

### **Type Safety**

| Operacja | Przed | Po |
|----------|-------|-----|
| findByIdAndUpdate | `entryId` (string) | `new Types.ObjectId(entryId)` |
| createEvent | `userId` (string) | `new Types.ObjectId(userId)` |
| Błędy TypeScript | Tak | Nie |
| Runtime errors | Tak | Nie |

---

## ✅ Checklist Wdrożenia

- [ ] Zainstalowano `Types` z mongoose
- [ ] Zaktualizowano intent.types.ts (+ RESEARCH_BRAIN, + emailData.body)
- [ ] Zaktualizowano intent.service.ts (+ RESEARCH_BRAIN logic)
- [ ] Zaktualizowano action.executor.service.ts (+ type safety + RESEARCH_BRAIN)
- [ ] Przetestowano email body generation
- [ ] Przetestowano RESEARCH_BRAIN (empty context)
- [ ] Przetestowano RESEARCH_BRAIN vs SAVE_SEARCH
- [ ] Przetestowano type safety (brak błędów ObjectId)
- [ ] Sprawdzono logi (body source, keywords, results count)
- [ ] Zweryfikowano że AI nie przeprasza, tylko działa

---

## 🎉 Rezultat

**Jarvis teraz:**
- ✅ Generuje pełne treści emaili (nie wysyła surowego tekstu)
- ✅ Aktywnie przeszukuje własną bazę (RESEARCH_BRAIN)
- ✅ Rozróżnia kiedy szukać w bazie vs internecie
- ✅ Type-safe operacje na MongoDB (zero błędów ObjectId)
- ✅ Proaktywny - nie przeprasza, tylko działa

**Przykład w akcji:**
```
User: "Wyślij mail do john że projekt opóźniony"
AI: [Generuje pełen email z tematem i body]
Email: "Cześć, chciałem poinformować że projekt..."
✅ NIE: "Wyślij mail do john że projekt opóźniony" (surowy tekst)

User: "Co mi mówiłeś o projekcie X?"
AI: [RESEARCH_BRAIN] "Zaraz sprawdzę w pamięci..."
✅ NIE: "Nie pamiętam" (przeprosiny)
```

**Ready! 🚀**
