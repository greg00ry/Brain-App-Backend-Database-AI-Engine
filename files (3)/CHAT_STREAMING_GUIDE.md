# 💬 Command Center with Full Chat - Implementation Guide

## 🎯 What's New

**Added full chat window with SSE streaming:**
- ✅ Real chat window (left side, resizable)
- ✅ SSE streaming from intent.controller.ts
- ✅ Live brain state updates during processing
- ✅ Research results display (facts + sources)
- ✅ Expandable chat (normal/wide view)
- ✅ Brain logo still reactive (right side)
- ✅ Quick action buttons (bottom)

---

## 📐 Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header: The Brain v1.0 | Status: Neural Engine Online       │
├──────────────────────┬───────────────────────────────────────┤
│ CHAT WINDOW          │                                       │
│ (resizable)          │         BRAIN LOGO                   │
│                      │         (reactive)                    │
│ Messages:            │                                       │
│ User: Hey            │           🧠                          │
│ AI: Hi mordo         │         [Ready]                       │
│                      │                                       │
│ [Facts + Sources]    │                                       │
│                      │                                       │
│ ─────────────────    │                                       │
│ [Input...      ] [▶] │                                       │
├──────────────────────┴───────────────────────────────────────┤
│ [Console] [Training] [Memory] [Map] [Status] [Settings]     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### **Step 1: Replace Component**

```bash
cp CommandCenter.with-chat.tsx src/components/CommandCenter.tsx
```

### **Step 2: Verify Backend**

Make sure your backend has the SSE endpoint:

**File:** `src/routes/intent.route.ts`

```typescript
import { Router } from 'express';
import { intentController } from '../controllers/intent.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/stream', authenticate, intentController);

export default router;
```

**File:** `src/index.ts`

```typescript
import intentRouter from './routes/intent.route.js';

app.use('/api/intent', intentRouter);
```

### **Step 3: Test Endpoint**

```bash
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}'
```

Expected output (SSE format):
```
data: {"stage":"intent","status":"processing","content":"🧠 Analizuję..."}

data: {"stage":"answer","content":"📝 Response here"}

data: {"stage":"complete","done":true}
```

---

## 🎬 SSE Flow

### **Frontend → Backend:**

```typescript
// 1. User sends message
fetch("/api/intent/stream", {
  method: "POST",
  body: JSON.stringify({ text: "jaka pogoda?" })
});

// 2. Open SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

// 3. Read chunks
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const data = JSON.parse(line.substring(6));
  
  // Handle different stages...
}
```

### **Backend → Frontend:**

```typescript
// intent.controller.ts sends stages:

sendSSE({ stage: "intent", status: "processing" });
// → Frontend: setBrainState('thinking')

sendSSE({ stage: "processing", status: "working" });
// → Frontend: setBrainState('processing')

sendSSE({ stage: "action", content: "🚀 SAVE_SEARCH..." });
// → Frontend: setBrainState('searching')

sendSSE({ stage: "answer", content: "📝 Sprawdzam, mordo." });
// → Frontend: Update AI message text

sendSSE({ stage: "results", data: { facts: [...], sources: [...] } });
// → Frontend: Add research results to message

sendSSE({ stage: "complete", done: true });
// → Frontend: setBrainState('idle'), setIsLoading(false)
```

---

## 🎨 Features

### **1. Expandable Chat Window**

**Normal view:** `w-96` (384px)  
**Expanded view:** `w-2/3` (66%)

```tsx
const [chatExpanded, setChatExpanded] = useState(false);

// Toggle button:
<button onClick={() => setChatExpanded(!chatExpanded)}>
  {chatExpanded ? <Minimize2 /> : <Maximize2 />}
</button>
```

---

### **2. SSE Streaming Message**

**Streaming indicator:**
```tsx
{msg.isStreaming && (
  <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse" />
)}
```

**Shows blinking cursor while AI is typing.**

---

### **3. Research Results Display**

**Automatically shows when `stage === 'results'`:**

```tsx
if (data.stage === 'results' && data.data?.facts) {
  currentAIMessage = {
    ...currentAIMessage,
    facts: data.data.facts,
    sources: data.data.sources
  };
}
```

**UI:**
```
┌─────────────────────────────────────┐
│ 🗄️  Research Results                │
├─────────────────────────────────────┤
│ • Temperatura: 5°C                  │
│ • Zachmurzenie: 80%                 │
│ • Wiatr: 15 km/h                    │
│                                      │
│ SOURCES:                             │
│ weather.com | meteo.pl              │
└─────────────────────────────────────┘
```

---

### **4. Brain State Synchronization**

**Maps SSE stages to brain states:**

| SSE Stage | Brain State | Color | Animation |
|-----------|-------------|-------|-----------|
| `intent` (processing) | `thinking` | Purple | Pulse |
| `processing` | `processing` | Blue | Pulse |
| `action` | `searching` | Cyan | Spin (searching) |
| `answer` | `success` | Green | Scale up |
| `complete` | `idle` | Purple/80% | Static |
| `error` | `error` | Red | Scale down |

---

## 🧪 Testing

### **Test 1: Basic Message**

**Input:** "Jak się masz?"

**Expected SSE flow:**
```
1. data: {"stage":"intent","status":"processing"}
   → Brain: thinking (purple pulse)

2. data: {"stage":"processing","status":"working"}
   → Brain: processing (blue pulse)

3. data: {"stage":"answer","content":"📝 Wszystko git, mordo."}
   → AI message updated
   → Brain: success (green)

4. data: {"stage":"complete","done":true}
   → Brain: idle
   → isLoading: false
```

---

### **Test 2: Research with Results**

**Input:** "Jaka pogoda?"

**Expected SSE flow:**
```
1. data: {"stage":"intent","status":"processing"}
   → Brain: thinking

2. data: {"stage":"action","content":"🚀 SAVE_SEARCH..."}
   → Brain: searching (cyan spin)

3. data: {"stage":"answer","content":"📝 Sprawdzam, mordo."}
   → AI message: "Sprawdzam, mordo."

4. data: {"stage":"results","data":{"facts":[...],"sources":[...]}}
   → AI message updated with research results box

5. data: {"stage":"complete"}
   → Brain: idle
```

**Expected UI:**
```
AI: Sprawdzam, mordo.

┌───────────────────────────────┐
│ 🗄️  Research Results          │
├───────────────────────────────┤
│ • Temperatura: 5°C            │
│ • Wiatr: 15 km/h              │
│                                │
│ SOURCES:                       │
│ weather.com                   │
└───────────────────────────────┘
```

---

### **Test 3: Chat Expand/Collapse**

**Click maximize button:**
- Chat width: 384px → 66%
- Brain logo stays visible
- Smooth transition (300ms)

**Click minimize button:**
- Chat width: 66% → 384px

---

### **Test 4: Quick Actions**

**Click "Memory" button:**
1. Input filled: "Przeszukaj pamięć"
2. Input focused
3. User can edit before sending

---

## 🎨 Customization

### **Change Chat Width**

```tsx
// Normal width (default: w-96 = 384px)
<div className="w-96">

// Wider:
<div className="w-[32rem]">  // 512px

// Narrower:
<div className="w-80">  // 320px
```

---

### **Adjust Brain Logo Size**

```tsx
// Default: 320px
<BrainLogo state={brainState} size={320} />

// Larger:
<BrainLogo state={brainState} size={400} />

// Smaller:
<BrainLogo state={brainState} size={256} />
```

---

### **Change Streaming Indicator**

```tsx
// Current: blinking purple bar
{msg.isStreaming && (
  <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse" />
)}

// Alternative: "..." dots
{msg.isStreaming && (
  <span className="ml-1 text-purple-400 animate-pulse">...</span>
)}

// Alternative: spinning loader
{msg.isStreaming && (
  <Loader2 size={12} className="inline-block ml-2 animate-spin" />
)}
```

---

## 🐛 Troubleshooting

### **Problem: No SSE events received**

**Check:**
1. Backend is running on correct port
2. `/api/intent/stream` endpoint exists
3. Token in localStorage is valid

**Debug:**
```typescript
// Add logging in SSE reader:
const data = JSON.parse(trimmedLine.substring(6));
console.log('[SSE] Received:', data);
```

---

### **Problem: Brain doesn't change state**

**Check:**
1. Verify `setBrainState` is called:
```typescript
if (data.stage === 'intent') {
  console.log('[Brain] Setting state: thinking');
  setBrainState('thinking');
}
```

2. Check CSS classes are applied

---

### **Problem: Research results not showing**

**Check:**
1. Backend sends `stage: 'results'`:
```typescript
sendSSE({
  stage: "results",
  status: "complete",
  data: {
    facts: ["fact1", "fact2"],
    sources: ["url1", "url2"]
  }
});
```

2. Frontend receives and processes:
```typescript
if (data.stage === 'results') {
  console.log('[Results] Facts:', data.data?.facts);
}
```

---

### **Problem: Chat doesn't scroll to bottom**

**Check:**
1. messagesEndRef is attached:
```tsx
<div ref={messagesEndRef} />
```

2. useEffect triggers on messages change:
```typescript
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```

---

## ✅ Checklist

- [ ] Replaced CommandCenter.tsx
- [ ] Backend has /api/intent/stream endpoint
- [ ] Tested SSE connection (curl)
- [ ] Verified token authentication works
- [ ] Tested basic message flow
- [ ] Tested research results display
- [ ] Tested brain state changes
- [ ] Tested chat expand/collapse
- [ ] Tested quick action buttons
- [ ] Verified auto-scroll works
- [ ] Checked streaming indicator shows

---

## 🎉 Result

**You now have:**
- ✅ Full chat window with messages
- ✅ Real-time SSE streaming
- ✅ Brain state sync with backend stages
- ✅ Research results with facts + sources
- ✅ Expandable chat (normal/wide)
- ✅ Streaming indicator (blinking cursor)
- ✅ Quick action buttons
- ✅ Professional command center design

**Perfect! 🚀**
