# 🧠 The Brain - Quick Reference

## 📚 Przykłady Użycia dla Developerów

---

## 1️⃣ Intent Detection Examples

### **Calendar Events (CREATE_EVENT)**

```typescript
// Input texts that trigger CREATE_EVENT:

"Przypomnij mi jutro o 10:00 o spotkaniu"
→ action: "CREATE_EVENT"
→ eventData: {
    title: "spotkanie",
    startDate: "2024-12-26T10:00:00Z",
    category: "reminder"
  }

"Mam wizytę u lekarza w piątek o 14:30"
→ action: "CREATE_EVENT"
→ eventData: {
    title: "wizyta u lekarza",
    startDate: "2024-12-29T14:30:00Z",
    category: "health"
  }

"Zebranie zespołu za 2 godziny"
→ action: "CREATE_EVENT"
→ eventData: {
    title: "zebranie zespołu",
    startDate: "2024-12-25T12:00:00Z",  // 2h od teraz
    category: "meeting"
  }
```

### **Dynamic Email (SAVE_MAIL)**

```typescript
// With recipient extracted:

"Wyślij mail do john@example.com o projekcie"
→ action: "SAVE_MAIL"
→ emailData: {
    recipient: "john@example.com",
    subject: "o projekcie"
  }

// Without recipient (uses DEFAULT_EMAIL_RECIPIENT):

"Wyślij mi przypomnienie o meeting"
→ action: "SAVE_MAIL"
→ emailData: {
    recipient: undefined,  // uses .env default
    subject: "przypomnienie o meeting"
  }
```

### **Web Search (SAVE_SEARCH)**

```typescript
"Znajdź najnowsze informacje o AI"
→ action: "SAVE_SEARCH"

"Sprawdź online pogodę w Warszawie"
→ action: "SAVE_SEARCH"
```

---

## 2️⃣ Calendar Service API

### **Create Event**

```typescript
import { createEvent } from './services/calendar/calendar.service.js';

const result = await createEvent({
  userId: '507f1f77bcf86cd799439011',
  title: 'Team Meeting',
  description: 'Quarterly review',
  startDate: new Date('2024-12-26T10:00:00Z'),
  endDate: new Date('2024-12-26T11:30:00Z'),
  category: 'meeting',
  sourceEntryId: entryId,  // Optional - links to VaultEntry
});

if (result.success) {
  console.log('Event created:', result.event._id);
} else {
  console.error('Error:', result.error);
}
```

### **Get Upcoming Events**

```typescript
import { getUpcomingEvents } from './services/calendar/calendar.service.js';

const events = await getUpcomingEvents(userId, 10);
console.log(`Found ${events.length} upcoming events`);

events.forEach(event => {
  console.log(`${event.title} - ${event.startDate}`);
});
```

### **Get Today's Events**

```typescript
import { getTodayEvents } from './services/calendar/calendar.service.js';

const todayEvents = await getTodayEvents(userId);
console.log(`Today you have ${todayEvents.length} events`);
```

### **Mark as Done**

```typescript
import { markEventAsDone } from './services/calendar/calendar.service.js';

const result = await markEventAsDone(eventId);
if (result.success) {
  console.log('Event completed!');
}
```

### **Calendar Stats**

```typescript
import { getCalendarStats } from './services/calendar/calendar.service.js';

const stats = await getCalendarStats(userId);
console.log(`
  Total: ${stats.totalEvents}
  Upcoming: ${stats.upcomingEvents}
  Overdue: ${stats.overdueEvents}
  Completed Today: ${stats.completedToday}
  
  By Category:
  - Work: ${stats.eventsByCategory.work}
  - Meeting: ${stats.eventsByCategory.meeting}
  - Health: ${stats.eventsByCategory.health}
`);
```

---

## 3️⃣ Email Service API

### **Send with Extracted Recipient**

```typescript
import { sendEmail, extractRecipient } from './services/actions/email.service.js';

const userText = "Wyślij mail do john@example.com o projekcie";
const recipient = extractRecipient(userText);

const result = await sendEmail(
  {
    to: recipient,
    subject: "Project Update",
    text: "Here's the latest update...",
  },
  userText  // Context for fallback extraction
);

if (result.success) {
  console.log(`Email sent to ${result.recipient}: ${result.messageId}`);
}
```

### **Send to Default Recipient**

```typescript
const result = await sendEmail({
  subject: "Reminder",
  text: "Don't forget the meeting!",
  // No 'to' - will use DEFAULT_EMAIL_RECIPIENT from .env
});
```

### **With HTML Template**

```typescript
import { sendEmail, createEmailTemplate } from './services/actions/email.service.js';

const result = await sendEmail({
  to: "admin@example.com",
  subject: "System Alert",
  html: createEmailTemplate(
    "The Brain detected an important pattern",
    "AI Analysis Complete"
  ),
});
```

---

## 4️⃣ Action Executor API

### **Execute Calendar Action**

```typescript
import { executeActionInBackground } from './services/actions/action.executor.service.js';

await executeActionInBackground({
  userId: '507f1f77bcf86cd799439011',
  entryId: '507f1f77bcf86cd799439022',
  text: "Przypomnij mi jutro o 10:00",
  action: "CREATE_EVENT",
  intentResult: {
    action: "CREATE_EVENT",
    reasoning: "User requested reminder",
    eventData: {
      title: "przypomnienie",
      startDate: "2024-12-26T10:00:00Z",
      category: "reminder"
    }
  }
});

// Function returns immediately
// Calendar event is created in background
// VaultEntry is updated with eventId and uiHint
```

### **Check Action Status**

```typescript
import { VaultEntry } from './models/VaultEntry.js';

const entry = await VaultEntry.findById(entryId);

if (entry.actionTools?.calendar?.status === 'completed') {
  console.log('Event created:', entry.actionTools.calendar.eventId);
  console.log('UI Hint:', entry.actionTools.uiHint);  // 'calendar_entry'
}

if (entry.actionTools?.email?.status === 'completed') {
  console.log('Email sent to:', entry.actionTools.email.recipient);
  console.log('UI Hint:', entry.actionTools.uiHint);  // 'mail_sent'
}
```

---

## 5️⃣ UI Hints for Jarvis HUD

### **Frontend Integration (React Example)**

```tsx
// components/JarvisHUD.tsx

interface EntryWithHint {
  actionTools?: {
    uiHint?: 'pulse' | 'calendar_entry' | 'mail_sent' | 'search_complete' | 'thinking' | 'error' | 'success';
  };
}

const JarvisHUD: React.FC<{ entry: EntryWithHint }> = ({ entry }) => {
  const hint = entry.actionTools?.uiHint || 'pulse';
  
  return (
    <div className={`jarvis-orb ${hint}`}>
      {hint === 'calendar_entry' && <CalendarIcon />}
      {hint === 'mail_sent' && <MailIcon />}
      {hint === 'search_complete' && <SearchIcon />}
      {hint === 'thinking' && <LoadingSpinner />}
    </div>
  );
};
```

### **CSS Animations**

```css
/* styles/jarvis-hud.css */

.jarvis-orb {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, #6366f1, #4f46e5);
  transition: all 0.3s ease;
}

.jarvis-orb.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.jarvis-orb.calendar_entry {
  animation: calendar-pop 0.5s ease;
  background: radial-gradient(circle, #10b981, #059669);
}

@keyframes calendar-pop {
  0% { transform: scale(0.8) rotate(0deg); }
  50% { transform: scale(1.2) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.jarvis-orb.mail_sent {
  animation: mail-fly 0.8s ease;
  background: radial-gradient(circle, #3b82f6, #2563eb);
}

@keyframes mail-fly {
  0% { transform: translateX(0) translateY(0); }
  50% { transform: translateX(20px) translateY(-20px); }
  100% { transform: translateX(0) translateY(0); }
}

.jarvis-orb.search_complete {
  animation: search-glow 0.6s ease;
  background: radial-gradient(circle, #f59e0b, #d97706);
}

@keyframes search-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
  50% { box-shadow: 0 0 30px rgba(245, 158, 11, 1); }
}

.jarvis-orb.thinking {
  animation: thinking-rotate 1s linear infinite;
  background: radial-gradient(circle, #8b5cf6, #7c3aed);
}

@keyframes thinking-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.jarvis-orb.error {
  animation: error-shake 0.5s ease;
  background: radial-gradient(circle, #ef4444, #dc2626);
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
```

---

## 6️⃣ REST API Endpoints

### **Calendar Endpoints**

```bash
# Create Event
POST /api/calendar
Body: {
  "title": "Team Meeting",
  "description": "Quarterly review",
  "startDate": "2024-12-26T10:00:00Z",
  "endDate": "2024-12-26T11:30:00Z",
  "category": "meeting"
}

# Get Upcoming Events
GET /api/calendar/upcoming?limit=10

# Get Today's Events
GET /api/calendar/today

# Get Overdue Events
GET /api/calendar/overdue

# Get Events in Range
GET /api/calendar/range?start=2024-12-01&end=2024-12-31

# Get Calendar Stats
GET /api/calendar/stats

# Mark Event as Done
PATCH /api/calendar/:eventId/done

# Reschedule Event
PATCH /api/calendar/:eventId/reschedule
Body: {
  "startDate": "2024-12-27T10:00:00Z",
  "endDate": "2024-12-27T11:00:00Z"
}

# Delete Event
DELETE /api/calendar/:eventId
```

### **Action Tools Endpoints**

```bash
# Check Action Status
GET /api/actions/status/:entryId

# List All Actions for User
GET /api/actions/list

# Health Check (Tavily + Email)
GET /api/actions/health
```

---

## 7️⃣ Environment Variables Reference

```bash
# ─── Required ─────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/the-brain
JWT_SECRET=your-secret-key

# ─── LLM (Qwen) ───────────────────────────────────────────────────
LLM_API_URL=http://localhost:1234/v1/chat/completions
LLM_MODEL=qwen
LLM_TIMEOUT=15000

# ─── Email (Nodemailer) ───────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=The Brain <your-email@gmail.com>
DEFAULT_EMAIL_RECIPIENT=admin@example.com  # ← NOWE!

# ─── Tavily (Web Search) ──────────────────────────────────────────
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxx

# ─── Server ───────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
```

---

## 8️⃣ Common Patterns

### **Pattern 1: User Creates Event via Chat**

```
User Input: "Przypomnij mi jutro o 10:00 o spotkaniu"
    ↓
Intent Service: classifyIntent()
    → action: "CREATE_EVENT"
    → eventData: { title: "spotkanie", startDate: "2024-12-26T10:00:00Z" }
    ↓
Queue Service: aiQueue.enqueue()
    → Analyze text
    → Save to VaultEntry
    ↓
Action Executor: executeCalendarAction()
    → Create CalendarEvent in DB
    → Update VaultEntry with eventId
    → Set uiHint: "calendar_entry"
    ↓
Frontend: Receives SSE
    → Jarvis orb animates (calendar-pop)
    → Shows notification: "📅 Event created for tomorrow at 10:00"
```

### **Pattern 2: Dynamic Email Recipient**

```
User Input: "Wyślij mail do john@example.com o projekcie"
    ↓
Intent Service:
    → action: "SAVE_MAIL"
    → emailData: { recipient: "john@example.com" }
    ↓
Action Executor: executeEmailAction()
    → extractRecipient(text) → "john@example.com"
    → sendEmail({ to: "john@example.com", ... })
    → Set uiHint: "mail_sent"
    ↓
Frontend:
    → Jarvis orb animates (mail-fly)
    → Shows: "📧 Email sent to john@example.com"
```

### **Pattern 3: Fallback to Default Recipient**

```
User Input: "Wyślij sobie przypomnienie"
    ↓
Intent Service:
    → action: "SAVE_MAIL"
    → emailData: { recipient: undefined }
    ↓
Action Executor:
    → extractRecipient(text) → null
    → sendEmail({ to: undefined, ... }, text)
        → Uses DEFAULT_EMAIL_RECIPIENT from .env
    → Set uiHint: "mail_sent"
```

---

## 💡 Pro Tips

### **Tip 1: Date Parsing**

LLM (Qwen) should normalize dates to ISO 8601:
- "jutro o 10" → "2024-12-26T10:00:00Z"
- "w piątek" → "2024-12-29T09:00:00Z"
- "za tydzień" → "2025-01-01T09:00:00Z"

If LLM fails, use `validateEventData()` to catch errors.

### **Tip 2: Email Regex**

Current regex: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g`

Handles:
- ✅ john@example.com
- ✅ jane.doe@company.co.uk
- ✅ user+tag@domain.com

Does NOT handle:
- ❌ john at example dot com (spelled out)
- ❌ Partial emails (john@)

### **Tip 3: UI Hints Best Practices**

Always set `uiHint` in action executor:
```typescript
await updateEntry(entryId, {
  "actionTools.calendar.eventId": eventId,
  "actionTools.uiHint": "calendar_entry",  // ← Frontend reads this!
});
```

Frontend should fallback to 'pulse' if undefined.

---

## 🎯 Summary

**The Brain now has:**
- 📅 Offline calendar with full CRUD
- 📧 Dynamic email recipient extraction
- 🎨 UI hints for Jarvis HUD animations
- 🧠 Extended intent detection (CREATE_EVENT)
- ⚡ Async action tools with status tracking

**All changes maintain:**
- ✅ Lean Architecture
- ✅ ES Modules compatibility (.js extensions)
- ✅ Nested `analysis: {...}` structure
- ✅ Backward compatibility

**Ready for production! 🚀**
