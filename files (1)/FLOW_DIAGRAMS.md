# 🎯 Action Tools - Flow Diagrams

## 1️⃣ Podstawowy Flow - Request do Completion

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Frontend)                              │
│                                                                      │
│  "Znajdź najnowsze informacje o AI w 2024"                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ POST /api/intent/stream
                             │ { text: "..." }
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    INTENT CONTROLLER                                 │
│                                                                      │
│  SSE Stream Start                                                    │
│    ↓                                                                 │
│  1. 🧠 Intent Classification                                         │
│     → classifyIntent(text)                                           │
│     → Result: SAVE_SEARCH                                            │
│     → SSE: "Wykryto: SAVE_SEARCH"                                    │
│                                                                      │
│  2. ⏳ AI Queue                                                       │
│     → aiQueue.enqueue(userId, text, action)                          │
│     → SSE: "Analizuję treść..."                                      │
│                                                                      │
│  3. 💾 Database Save                                                 │
│     → proccessAndStore() → Entry created                             │
│     → SSE: "Analiza zakończona"                                      │
│                                                                      │
│  4. 🚀 Action Executor (ASYNC - nie czekamy!)                        │
│     → executeActionInBackground(context)                             │
│     → SSE: "Uruchamiam SAVE_SEARCH w tle..."                         │
│                                                                      │
│  5. ✅ Response Complete                                             │
│     → SSE: "Gotowe!" + entryId                                       │
│     → Stream End                                                     │
│                                                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ User dostaje natychmiastową odpowiedź
                             │
┌─────────────────────────────────────────────────────────────────────┐
│                  ACTION EXECUTOR (Background)                        │
│                                                                      │
│  Działa ASYNCHRONICZNIE - nie blokuje response!                      │
│                                                                      │
│  1. 🔍 Tavily Search                                                 │
│     → searchWithTavily(query)                                        │
│     → Results: 5 articles                                            │
│                                                                      │
│  2. 📊 Extract Facts                                                 │
│     → extractKeyFacts(results)                                       │
│     → Facts: ["AI models in 2024...", "GPT-5 announced..."]          │
│                                                                      │
│  3. 💾 Update Database                                               │
│     → updateEntry(entryId, {                                         │
│         "actionTools.search": {                                      │
│           completed: true,                                           │
│           facts: [...],                                              │
│           sources: [...]                                             │
│         }                                                            │
│       })                                                             │
│                                                                      │
│  ✅ DONE - Entry updated with research data                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Email Action Flow (SAVE_MAIL)

```
User: "Wyślij mail do szefa o spotkaniu"
    ↓
Intent Classification: SAVE_MAIL
    ↓
Database Save (entry created)
    ↓
Action Executor (Background)
    ↓
┌─────────────────────────────────────┐
│     EMAIL SERVICE (Nodemailer)      │
│                                     │
│  1. Create Email Template           │
│     → createEmailTemplate(content)  │
│                                     │
│  2. Send via SMTP                   │
│     → sendEmail({                   │
│         to: admin@example.com,      │
│         subject: "Neural Console",  │
│         html: template              │
│       })                            │
│                                     │
│  3. Get Message ID                  │
│     → messageId: "<abc@xyz>"        │
│                                     │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│      UPDATE DATABASE                │
│                                     │
│  updateEntry(entryId, {             │
│    "actionTools.email": {           │
│      completed: true,               │
│      sent: true,                    │
│      messageId: "<abc@xyz>",        │
│      timestamp: Date.now()          │
│    }                                │
│  })                                 │
│                                     │
└─────────────────────────────────────┘
```

---

## 3️⃣ Database Update Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                    ENTRY DOCUMENT                            │
│                                                              │
│  {                                                           │
│    _id: "67890...",                                          │
│    userId: "12345...",                                       │
│    rawText: "Znajdź informacje o AI",                        │
│    analysis: {                                               │
│      summary: "Research request about AI",                   │
│      tags: ["research", "AI", "technology"],                 │
│      strength: 8,                                            │
│      category: "Research"                                    │
│    },                                                        │
│                                                              │
│    // ═══ TO JEST AKTUALIZOWANE PRZEZ ACTION TOOLS ═══      │
│    actionTools: {                                            │
│      search: {                                               │
│        completed: true,          ← ✅                        │
│        facts: [                                              │
│          "AI models in 2024 have reached...",                │
│          "GPT-5 was announced..."                            │
│        ],                                                    │
│        searchResults: "🔍 Wyniki researchu:\n...",           │
│        sources: [                                            │
│          "https://example.com/ai-news",                      │
│          "https://techcrunch.com/gpt5"                       │
│        ],                                                    │
│        timestamp: ISODate("2024-02-24T12:34:56Z")            │
│      },                                                      │
│      email: null  // nie użyte w tym przypadku               │
│    },                                                        │
│                                                              │
│    createdAt: ISODate("2024-02-24T12:30:00Z"),               │
│    updatedAt: ISODate("2024-02-24T12:34:56Z")  ← aktualizuje│
│  }                                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ Monitoring Flow

```
Frontend Dashboard
    ↓
GET /api/actions/list
    ↓
┌─────────────────────────────────────────────────────────┐
│            ACTIONS CONTROLLER                           │
│                                                         │
│  getEntriesWithActionTools(userId)                      │
│    ↓                                                    │
│  Entry.find({                                           │
│    userId: userId,                                      │
│    $or: [                                               │
│      { "actionTools.search.completed": true },          │
│      { "actionTools.email.completed": true }            │
│    ]                                                    │
│  })                                                     │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│               RESPONSE                                  │
│                                                         │
│  {                                                      │
│    count: 5,                                            │
│    entries: [                                           │
│      {                                                  │
│        id: "...",                                       │
│        text: "Znajdź informacje o AI",                  │
│        analysis: {...},                                 │
│        actionTools: {                                   │
│          search: {                                      │
│            completed: true,                             │
│            facts: [...],                                │
│            sources: [...]                               │
│          }                                              │
│        }                                                │
│      },                                                 │
│      // ... więcej wpisów                               │
│    ]                                                    │
│  }                                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5️⃣ Error Handling Flow

```
Action Executor (Background)
    ↓
Try {
  searchWithTavily(query)
    ↓
  ❌ Error: "Tavily API rate limit exceeded"
}
    ↓
Catch {
  console.error("Search failed")
    ↓
  updateEntryWithError(entryId, {
    action: "SAVE_SEARCH",
    error: "Tavily API rate limit exceeded"
  })
}
    ↓
Database Updated:
{
  actionTools: {
    search: {
      completed: false,  ← ❌
      error: "Tavily API rate limit exceeded",
      timestamp: Date.now()
    }
  }
}
    ↓
Frontend może sprawdzić status:
GET /api/actions/status/:entryId
    ↓
Wyświetl użytkownikowi:
"⚠️ Research nie powiódł się: Rate limit exceeded"
```

---

## 6️⃣ Timeline Comparison (Synchronous vs Asynchronous)

### ❌ Synchronous (STARY sposób):
```
Request → Intent (500ms) → AI Analysis (2s) → DB Save (100ms) 
  → Tavily Search (3s) → DB Update (100ms) → Response
  
Total: ~6 sekund czekania! 😱
```

### ✅ Asynchronous (NOWY sposób):
```
Request → Intent (500ms) → AI Analysis (2s) → DB Save (100ms) → Response
  
Total: ~2.6 sekundy! ⚡
  
                                                    (w tle)
                                                       ↓
                                            Tavily Search (3s)
                                                       ↓
                                            DB Update (100ms)
```

**Rezultat:** User dostaje odpowiedź **3 sekundy szybciej**! 🎉

---

## 7️⃣ Component Interaction Diagram

```
┌─────────────────┐
│  NeuralConsole  │ (Frontend)
│     (React)     │
└────────┬────────┘
         │
         │ POST /api/intent/stream
         │
         ↓
┌─────────────────────────────────────────────────────┐
│            INTENT ROUTER                            │
│                                                     │
│  POST /stream → intentControllerWithActions         │
│                                                     │
└────────┬────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│         INTENT CONTROLLER                           │
│                                                     │
│  1. classifyIntent() ────────► Intent Service      │
│  2. aiQueue.enqueue() ───────► Queue Service       │
│  3. executeActionInBackground() ──┐                │
│                                    │                │
└────────────────────────────────────┼────────────────┘
                                     │
         ┌───────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│        ACTION EXECUTOR SERVICE                      │
│                                                     │
│  switch(action) {                                   │
│    case SAVE_SEARCH:                                │
│      → executeSearchAction() ──► Tavily Service    │
│    case SAVE_MAIL:                                  │
│      → executeEmailAction() ───► Email Service     │
│  }                                                  │
│                                                     │
└────────┬────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│           ENTRY SERVICE                             │
│                                                     │
│  updateEntry(entryId, { actionTools: {...} })       │
│                                                     │
└────────┬────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│              MONGODB                                │
│                                                     │
│  Entry document updated with search results/email   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

1. **Asynchroniczny = Szybszy UX** - user nie czeka na długie operacje
2. **Akcje w tle** - Tavily i Email działają po zwróceniu response
3. **Aktualizacja bazy** - wyniki zapisywane do `actionTools` field
4. **Monitoring** - `/api/actions/status/:id` do sprawdzania postępu
5. **Error handling** - błędy również zapisywane do bazy

---

## 📊 Metryki (przykładowe)

| Akcja             | Czas wykonania | Blokuje response? |
|-------------------|----------------|-------------------|
| Intent Class.     | ~500ms         | ✅ TAK            |
| AI Analysis       | ~2s            | ✅ TAK            |
| DB Save           | ~100ms         | ✅ TAK            |
| Tavily Search     | ~3s            | ❌ NIE (async)    |
| Email Send        | ~1s            | ❌ NIE (async)    |
| DB Update (tools) | ~100ms         | ❌ NIE (async)    |

**Total response time:** ~2.6s (vs ~6.6s synchroniczny)
