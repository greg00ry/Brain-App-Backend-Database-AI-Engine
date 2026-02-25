# 🤖 JARVIS Integration - Instrukcja Wdrożenia

## 📋 Przegląd Zmian

### **Nowe Funkcjonalności:**

1. **🧠 Dostęp do Pamięci (Synapses)**
   - Jarvis przeszukuje VaultEntry i Synapse
   - Używa słów kluczowych do znajdowania powiązań
   - Formatuje pamięć w czytelny kontekst dla AI

2. **💬 Historia Rozmowy**
   - Jarvis pamięta ostatnie 5 wiadomości
   - Kontekst rozmowy w System Prompt
   - Naturalniejsze odpowiedzi

3. **🗣️ Pole "answer" - Naturalna Konwersacja**
   - Jarvis mówi do użytkownika w stylu "sir"
   - Odpowiedzi w języku polskim
   - Osobowość: konkretny, pragmatyczny, pomocny

---

## 📁 Struktura Plików

```
src/services/ai/
├── intent.context.service.ts    ← NOWY (dostęp do pamięci)
├── intent.service.jarvis.ts     ← NOWY (zastępuje intent.service.ts)
└── intent.types.extended.ts     ← ZAKTUALIZOWANY (+ answer field)
```

---

## 🚀 Instalacja

### **KROK 1: Dodaj Nowe Pliki**

```bash
# Copy context service
cp intent.context.service.ts src/services/ai/

# Replace intent service
cp intent.service.jarvis.ts src/services/ai/intent.service.ts

# Update types
cp intent.types.extended.ts src/services/ai/intent.types.ts
```

---

### **KROK 2: Aktualizuj Intent Controller**

**Lokalizacja:** `src/controllers/intent.controller.ts`

**PRZED:**
```typescript
const intentResult = await classifyIntent(text.trim());
```

**PO:**
```typescript
// Pobierz historię rozmowy (np. z sesji/bazy)
const chatHistory = await getChatHistory(userId); // Twoja implementacja

const intentResult = await classifyIntent({
  userText: text.trim(),
  userId: userId.toString(),
  chatHistory: chatHistory, // Opcjonalne
});

// Wyślij answer do frontendu
sendSSE({
  stage: "jarvis_response",
  status: "complete",
  content: intentResult.answer, // ← Jarvis mówi do użytkownika!
  data: intentResult,
});
```

---

### **KROK 3: Frontend - Wyświetl Odpowiedź Jarvisa**

**Przykład React:**

```typescript
// handleSendMessage.tsx
if (data.stage === "jarvis_response") {
  // Dodaj odpowiedź Jarvisa do czatu
  setMessages(prev => [...prev, {
    id: Date.now(),
    text: data.content,  // "Oczywiście, sir. Ustawiam przypomnienie..."
    sender: "ai"
  }]);
}
```

---

## 🧪 Testowanie

### **Test 1: Pamięć (Synapses)**

**Setup:**
```typescript
// Utwórz kilka wpisów w VaultEntry
await VaultEntry.create({
  userId,
  rawText: "Projekt AI na Uniwersytecie Warszawskim",
  analysis: {
    summary: "Projekt AI na UW",
    tags: ["AI", "projekt", "uczelnia"],
    strength: 8
  }
});

await VaultEntry.create({
  userId,
  rawText: "Deep Learning kurs online",
  analysis: {
    summary: "Kurs DL",
    tags: ["AI", "deep learning", "kurs"],
    strength: 7
  }
});

// Utwórz synapsę między nimi
await Synapse.create({
  from: entry1._id,
  to: entry2._id,
  weight: 0.9,
  reason: "Oba dotyczą sztucznej inteligencji"
});
```

**Test Query:**
```
User: "Co wiesz o AI?"
```

**Oczekiwany Output:**
```json
{
  "action": "SAVE_ONLY",
  "reasoning": "User asks about AI knowledge",
  "answer": "Pamiętam, sir, że pracował pan nad projektem AI na Uniwersytecie Warszawskim. To powiązane z pana kursem Deep Learning. Czy chce pan więcej szczegółów?"
}
```

---

### **Test 2: Historia Rozmowy**

**Setup:**
```typescript
const chatHistory = [
  { role: "user", content: "Jak się masz?" },
  { role: "assistant", content: "Wszystkie systemy działają, sir." },
  { role: "user", content: "Co robiłem wczoraj?" },
];
```

**Test Query:**
```
User: "A przedwczoraj?"
```

**Oczekiwany Output:**
```json
{
  "action": "SAVE_ONLY",
  "reasoning": "User asks about past activities",
  "answer": "Sir pytał wczoraj o wczorajsze aktywności, sir. Niestety nie mam danych z przedwczoraj w mojej bezpośredniej pamięci. Czy mogę przeszukać starsze wpisy?"
}
```

---

### **Test 3: Utworzenie Wydarzenia**

**Test Query:**
```
User: "Przypomnij mi jutro o 10:00 o spotkaniu z klientem"
```

**Oczekiwany Output:**
```json
{
  "action": "CREATE_EVENT",
  "reasoning": "User requests reminder with specific date and time",
  "answer": "Oczywiście, sir. Ustawiam przypomnienie na jutro o godzinie 10:00. Powiadomię pana o spotkaniu z klientem z odpowiednim wyprzedzeniem.",
  "eventData": {
    "title": "Spotkanie z klientem",
    "startDate": "2024-12-26T10:00:00Z",
    "category": "meeting"
  }
}
```

---

### **Test 4: Email**

**Test Query:**
```
User: "Wyślij mail do john@example.com o projekcie"
```

**Oczekiwany Output:**
```json
{
  "action": "SAVE_MAIL",
  "reasoning": "User wants to send email to specific recipient",
  "answer": "Dobrze, sir. Przygotowuję wiadomość do john@example.com. Potwierd zę wysłanie gdy będzie gotowa.",
  "emailData": {
    "recipient": "john@example.com",
    "subject": "o projekcie"
  }
}
```

---

### **Test 5: Pusta Pamięć (Fallback)**

**Test Query:**
```
User: "Witaj Jarvis"
```

**Oczekiwany Output (bez pamięci):**
```json
{
  "action": "SAVE_ONLY",
  "reasoning": "Greeting from user",
  "answer": "Dzień dobry, sir. Wszystkie systemy gotowe do pracy. Jak mogę pomóc?"
}
```

---

## 🎨 Frontend - Jarvis HUD Integration

### **Wyświetlanie Odpowiedzi:**

```tsx
// JarvisChat.tsx
const JarvisMessage: React.FC<{ message: Message }> = ({ message }) => {
  if (message.sender === 'ai') {
    return (
      <div className="jarvis-message">
        <div className="jarvis-avatar">
          <JarvisIcon />
        </div>
        <div className="jarvis-bubble">
          {message.text}
          {message.action && (
            <div className="jarvis-action-badge">
              {message.action === 'CREATE_EVENT' && '📅 Przypomnienie ustawione'}
              {message.action === 'SAVE_MAIL' && '📧 Email w przygotowaniu'}
              {message.action === 'SAVE_SEARCH' && '🔍 Szukam w internecie'}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // User message...
};
```

### **Animacje dla Jarvisa:**

```css
.jarvis-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  animation: jarvis-appear 0.3s ease;
}

@keyframes jarvis-appear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.jarvis-action-badge {
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 12px;
  display: inline-block;
}
```

---

## 🔧 Konfiguracja Advanced

### **Dostosowanie Pamięci:**

W `intent.context.service.ts`:

```typescript
// Zmień limity wyszukiwania
const entries = await searchRelevantEntries(userId, keywords, 10); // Więcej wpisów

// Zmień wagę synaps
const synapses = await searchRelevantSynapses(entryIds, 15); // Więcej połączeń
```

### **Dostosowanie Osobowości Jarvisa:**

W `intent.service.jarvis.ts` - `buildJarvisSystemPrompt()`:

```typescript
PERSONALITY & STYLE:
- Konkretny, pragmatyczny, pomocny
- Używaj zwrotów: "sir", "dobrze, sir", "zrobione, sir"
- Mów w pierwszej osobie: "Sprawdzam, sir"
- Język: POLSKI

// Możesz zmienić na:
- Bardziej formalny: "Proszę pana", "Oczywiście, proszę pana"
- Bardziej casualowy: "Hej", "No problem", "Załatwione"
- Inny język: English with "sir", Japanese with "sama"
```

---

## 🐛 Troubleshooting

### **Problem: "Brak relevantnych wspomnień"**

**Przyczyna:** Pusta baza VaultEntry lub Synapse

**Rozwiązanie:**
```typescript
// Sprawdź czy są wpisy
const count = await VaultEntry.countDocuments({ userId });
console.log("Wpisy w bazie:", count);

// Sprawdź czy są synapsy
const synCount = await Synapse.countDocuments();
console.log("Synapsy w bazie:", synCount);
```

---

### **Problem: Jarvis nie używa pamięci**

**Przyczyna:** Słowa kluczowe nie pasują do tagów

**Debug:**
```typescript
// W intent.context.service.ts dodaj:
console.log("Keywords:", keywords);
console.log("Found entries:", entries.length);
console.log("Entry tags:", entries.map(e => e.analysis?.tags));
```

**Rozwiązanie:** Dostosuj tagi w VaultEntry do popularnych słów

---

### **Problem: "answer" field jest pusty**

**Przyczyna:** LLM nie zwraca pola "answer"

**Rozwiązanie:**
```typescript
// W parseIntentJSON dodano już fallback:
const answer = typeof parsed["answer"] === "string"
  ? parsed["answer"]
  : "Dobrze, sir."; // ← Default
```

---

## 📊 Metryki & Monitoring

### **Loguj Performance:**

```typescript
// W classifyIntent:
const startTime = Date.now();
const memoryContext = await getConversationContext(userId, userText);
console.log(`[Perf] Memory lookup: ${Date.now() - startTime}ms`);

const llmStart = Date.now();
const response = await axios.post(...);
console.log(`[Perf] LLM call: ${Date.now() - llmStart}ms`);
```

---

## ✅ Checklist Wdrożenia

- [ ] Skopiowano intent.context.service.ts
- [ ] Zastąpiono intent.service.ts → intent.service.jarvis.ts
- [ ] Zaktualizowano intent.types.ts (+ answer field)
- [ ] Zaktualizowano intent.controller.ts (+ chatHistory)
- [ ] Dodano wyświetlanie "answer" w frontend
- [ ] Przetestowano z pustą bazą (fallback)
- [ ] Przetestowano z pamięcią (synapses)
- [ ] Przetestowano z historią rozmowy
- [ ] Dodano CSS dla Jarvis messages
- [ ] Zweryfikowano logi performance

---

## 🎉 Gratulacje!

Jarvis ma teraz:
- ✅ Dostęp do pamięci (VaultEntry + Synapses)
- ✅ Historia rozmowy (ostatnie 5 wiadomości)
- ✅ Naturalną konwersację (pole "answer")
- ✅ Osobowość ("sir", konkretny, pomocny)
- ✅ Fallback gdy baza pusta

**"At your service, sir!" 🤖⚡**
