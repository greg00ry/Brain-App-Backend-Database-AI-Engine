# 💬 Chat History - Instrukcja Wdrożenia

## 📋 Przegląd

System zapamiętuje historię rozmowy i przekazuje ją do Intent Service, dzięki czemu Jarvis ma kontekst poprzednich wiadomości.

---

## 📁 Struktura Plików

```
src/
├── models/
│   └── ChatHistory.ts                           ← NOWY MODEL
│
├── services/
│   ├── chat/
│   │   └── chat.history.service.ts              ← NOWY SERWIS
│   └── ai/
│       └── intent.service.ts                    (używa chatHistory)
│
└── controllers/
    └── intent.controller.ts                     ← ZAKTUALIZOWANY
```

---

## 🚀 Instalacja

### **KROK 1: Dodaj Model ChatHistory**

**Lokalizacja:** `src/models/ChatHistory.ts`

```bash
cp ChatHistory.model.ts src/models/ChatHistory.ts
```

**Co zawiera:**
- Schema MongoDB z tablicą wiadomości
- Methods: `addMessage()`, `getRecentMessages()`, `trimHistory()`
- Static: `findOrCreateSession()`

---

### **KROK 2: Dodaj Chat History Service**

**Lokalizacja:** `src/services/chat/chat.history.service.ts`

```bash
mkdir -p src/services/chat
cp chat.history.service.ts src/services/chat/
```

**Funkcje:**
- `getChatHistory(userId, limit, sessionId?)` - pobiera ostatnie N wiadomości
- `addChatMessage(userId, role, content, sessionId?)` - dodaje wiadomość
- `clearChatHistory(userId, sessionId?)` - czyści historię
- `createNewSession(userId)` - tworzy nową sesję

---

### **KROK 3: Zaktualizuj Intent Controller**

**Lokalizacja:** `src/controllers/intent.controller.ts`

**PRZED:**
```typescript
import { classifyIntent } from "../services/ai/intent.service.js";

export const intentController = asyncHandler(async (req, res) => {
  const { text } = req.body;
  
  const intentResult = await classifyIntent(text); // ← Stary sposób
  // ...
});
```

**PO:**
```typescript
import { classifyIntent } from "../services/ai/intent.service.js";
import { getChatHistory, addChatMessage } from "../services/chat/chat.history.service.js";

export const intentController = asyncHandler(async (req, res) => {
  const { text, sessionId } = req.body; // ← Dodaj sessionId
  const userId = req.user?._id;
  
  // 1. Pobierz historię
  const chatHistory = await getChatHistory(userId, 10, sessionId);
  
  // 2. Przekaż historię do Intent Service
  const intentResult = await classifyIntent({
    userText: text.trim(),
    userId: userId.toString(),
    chatHistory: chatHistory, // ← TUTAJ!
  });
  
  // 3. Zapisz wiadomość użytkownika
  await addChatMessage(userId, 'user', text.trim(), sessionId);
  
  // 4. Zapisz odpowiedź Jarvisa
  if (intentResult.answer) {
    await addChatMessage(userId, 'assistant', intentResult.answer, sessionId);
  }
  
  // ... reszta kodu
});
```

**Lub użyj gotowego pliku:**
```bash
cp intent.controller.with-chat-history.ts src/controllers/intent.controller.ts
```

---

## 🧪 Testowanie

### **Test 1: Zapisywanie Historii**

```bash
# Wyślij pierwszą wiadomość
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Jak się masz?"}'

# Wyślij drugą wiadomość
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Co robiłem wczoraj?"}'
```

**Sprawdź w bazie:**
```javascript
db.chathistories.findOne({ userId: ObjectId("...") })
```

**Oczekiwany wynik:**
```json
{
  "userId": "...",
  "sessionId": "session_1234567890_abc",
  "messages": [
    {
      "role": "user",
      "content": "Jak się masz?",
      "timestamp": "2024-12-25T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Wszystko git, mordo.",
      "timestamp": "2024-12-25T10:00:01Z"
    },
    {
      "role": "user",
      "content": "Co robiłem wczoraj?",
      "timestamp": "2024-12-25T10:01:00Z"
    }
  ]
}
```

---

### **Test 2: Kontekst w Odpowiedziach**

```bash
# Pierwsza wiadomość
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer TOKEN" \
  -d '{"text": "Mam spotkanie jutro o 10"}'

# Response: "Jasne, mordo. Ustawiam przypomnienie na jutro o 10:00."

# Druga wiadomość (referencja do poprzedniej)
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer TOKEN" \
  -d '{"text": "A może jednak o 11?"}'

# Response: "Okej, mordo. Przesuwam spotkanie z 10:00 na 11:00."
```

**✅ Sukces jeśli:** Jarvis rozumie że "A może jednak o 11?" odnosi się do wcześniejszego spotkania.

---

### **Test 3: Sesje**

```bash
# Sesja 1
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer TOKEN" \
  -d '{"text": "Witaj", "sessionId": "session_abc"}'

# Sesja 2 (niezależna)
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer TOKEN" \
  -d '{"text": "Witaj", "sessionId": "session_xyz"}'
```

**Sprawdź:**
```javascript
db.chathistories.find({ userId: ObjectId("...") }).count()
// Powinno być 2 dokumenty (2 sesje)
```

---

## 🎨 Frontend Integration

### **React - Przekazywanie sessionId**

```tsx
// hooks/useChat.ts
import { useState, useEffect } from 'react';

export function useChat() {
  const [sessionId, setSessionId] = useState<string>(() => {
    // Pobierz z localStorage lub utwórz nowy
    const stored = localStorage.getItem('chatSessionId');
    if (stored) return stored;
    
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatSessionId', newId);
    return newId;
  });

  const sendMessage = async (text: string) => {
    const response = await fetch('/api/intent/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        sessionId, // ← Przekaż sessionId!
      }),
    });
    
    // Handle SSE stream...
  };

  const startNewSession = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newId);
    localStorage.setItem('chatSessionId', newId);
  };

  return { sessionId, sendMessage, startNewSession };
}
```

### **UI - New Chat Button**

```tsx
// components/ChatHeader.tsx
import { useChat } from '../hooks/useChat';

export const ChatHeader = () => {
  const { startNewSession } = useChat();

  return (
    <header className="chat-header">
      <h1>Jarvis Chat</h1>
      <button onClick={startNewSession}>
        🔄 New Chat
      </button>
    </header>
  );
};
```

---

## 🔧 Opcje Konfiguracji

### **Zmiana Limitu Wiadomości**

W `intent.controller.ts`:

```typescript
// Domyślnie: ostatnie 10 wiadomości
const chatHistory = await getChatHistory(userId, 10, sessionId);

// Zwiększ do 20 dla lepszego kontekstu
const chatHistory = await getChatHistory(userId, 20, sessionId);

// Zmniejsz do 5 dla oszczędności tokenów
const chatHistory = await getChatHistory(userId, 5, sessionId);
```

---

### **Auto-Trimming Historii**

W `ChatHistory.model.ts` - metoda `trimHistory()`:

```typescript
// Domyślnie: pozostaw 50 ostatnich wiadomości
session.trimHistory(50);

// Zwiększ do 100
session.trimHistory(100);

// Zmniejsz do 20
session.trimHistory(20);
```

---

### **Automatyczne Czyszczenie Starych Sesji**

Dodaj cron job:

```typescript
// services/cron/cleanup.service.ts
import cron from 'node-cron';
import { ChatHistory } from '../../models/ChatHistory.js';

// Uruchom codziennie o 3:00
cron.schedule('0 3 * * *', async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Usuń sesje starsze niż 30 dni
  const result = await ChatHistory.deleteMany({
    updatedAt: { $lt: thirtyDaysAgo },
  });

  console.log(`[Cleanup] Deleted ${result.deletedCount} old chat sessions`);
});
```

---

## 📊 Monitoring

### **Sprawdź Historię w Bazie**

```javascript
// Ile sesji ma użytkownik?
db.chathistories.count({ userId: ObjectId("...") })

// Ile wiadomości w sesji?
db.chathistories.findOne(
  { userId: ObjectId("..."), sessionId: "session_abc" },
  { "messages": { $slice: -5 } } // Ostatnie 5
)

// Najdłuższa sesja?
db.chathistories.aggregate([
  { $project: { sessionId: 1, messageCount: { $size: "$messages" } } },
  { $sort: { messageCount: -1 } },
  { $limit: 1 }
])
```

---

### **Logowanie Performance**

```typescript
// W getChatHistory:
const startTime = Date.now();
const chatHistory = await getChatHistory(userId, 10, sessionId);
console.log(`[Perf] Chat history fetch: ${Date.now() - startTime}ms`);
```

---

## 🐛 Troubleshooting

### **Problem: "Historia jest pusta mimo wcześniejszych wiadomości"**

**Debug:**
```typescript
// W intent.controller.ts:
console.log('[DEBUG] UserId:', userId);
console.log('[DEBUG] SessionId:', sessionId);
const chatHistory = await getChatHistory(userId, 10, sessionId);
console.log('[DEBUG] Chat history length:', chatHistory.length);
```

**Możliwe przyczyny:**
1. SessionId się zmienia między requestami
   - Fix: Zapisuj sessionId w localStorage (frontend)
2. UserId niepoprawne
   - Fix: Sprawdź middleware auth
3. Historia nie jest zapisywana
   - Fix: Sprawdź czy `addChatMessage()` jest wywoływany

---

### **Problem: "Jarvis nie używa kontekstu z historii"**

**Debug:**
```typescript
// W intent.service.ts - buildJarvisSystemPrompt():
console.log('[DEBUG] Chat history in prompt:', chatHistory?.length);
console.log('[DEBUG] History section:', historySection);
```

**Możliwe przyczyny:**
1. History nie jest przekazywana do promptu
   - Fix: Sprawdź `buildJarvisSystemPrompt(brainContext, chatHistory)`
2. LLM ignoruje <CHAT_HISTORY>
   - Fix: Dodaj Few-Shot przykład używający historii
3. Historia za długa (> 10 messages)
   - Fix: Zmniejsz limit do 5

---

## ✅ Checklist Wdrożenia

- [ ] Dodano model ChatHistory.ts
- [ ] Dodano chat.history.service.ts
- [ ] Zaktualizowano intent.controller.ts (+ getChatHistory)
- [ ] Dodano `sessionId` do request body
- [ ] Zapisywanie wiadomości użytkownika (`addChatMessage`)
- [ ] Zapisywanie odpowiedzi Jarvisa (`addChatMessage`)
- [ ] Frontend przekazuje sessionId
- [ ] Przetestowano zapisywanie historii
- [ ] Przetestowano kontekst w odpowiedziach
- [ ] Przetestowano różne sesje
- [ ] Dodano button "New Chat" w UI

---

## 🎉 Rezultat

**Jarvis teraz:**
- ✅ Pamięta ostatnie 10 wiadomości
- ✅ Rozumie referencje ("A może jednak o 11?")
- ✅ Wspiera różne sesje
- ✅ Auto-trimuje historię (ostatnie 50)
- ✅ Zapisuje rozmowy w MongoDB

**Historia w akcji:**
```
User: "Jak się masz?"
Jarvis: "Wszystko git, mordo."

User: "A ty?"  // ← Kontekst z poprzedniej wiadomości!
Jarvis: "Pytałeś już, mordo. Wszystko działa."
```

**Ready! 🚀**
