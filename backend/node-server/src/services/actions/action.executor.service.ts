import { Types } from "mongoose";
import { searchWithTavily, formatTavilyResults, extractKeyFacts } from "./tavily.service.js";
import { sendEmail, createEmailTemplate, extractRecipient } from "./email.service.js";
import { createEvent } from "./calendar.service.js";
import { IntentAction } from "../ai/intent.types.js";
import type { IntentResult } from "../ai/intent.types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXECUTOR - Extended with Calendar & Dynamic Email
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionContext {
  userId: string;
  entryId: string;
  text: string;
  action: IntentAction;
  intentResult?: IntentResult; // Pełny wynik z intent service
}

export interface ActionResult {
  action: IntentAction;
  status: "pending" | "completed" | "failed";
  data?: any;
  error?: string;
  timestamp: number;
  uiHint?: string; // Dla Jarvis HUD
}

// ─── Action Executor ─────────────────────────────────────────────────────────

/**
 * Wykonuje akcje w tle (asynchronicznie) na podstawie intent action
 */
export async function executeActionInBackground(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 🚀 Starting background action: ${context.action}`);
  console.log(`[ActionExecutor] Entry ID: ${context.entryId}`);

  // Nie czekamy na wynik - wykonujemy w tle
  switch (context.action) {
    case "SAVE_SEARCH":
      executeSearchAction(context).catch((error) => {
        console.error(`[ActionExecutor] ✗ Search action failed:`, error);
      });
      break;

    case "SAVE_MAIL":
      executeEmailAction(context).catch((error) => {
        console.error(`[ActionExecutor] ✗ Email action failed:`, error);
      });
      break;

    case "CREATE_EVENT":
      executeCalendarAction(context).catch((error) => {
        console.error(`[ActionExecutor] ✗ Calendar action failed:`, error);
      });
      break;

    case "SAVE_ONLY":
      console.log(`[ActionExecutor] ℹ️  SAVE_ONLY - no action needed`);
      break;

    default:
      console.warn(`[ActionExecutor] ⚠️  Unknown action: ${context.action}`);
  }
}

// ─── Search Action ───────────────────────────────────────────────────────────

async function executeSearchAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 🔍 Executing search for: "${context.text}"`);

  try {
    // 1. Update status to processing
    await updateEntryStatus(context.entryId, 'search', 'processing');

    // 2. Wykonaj research przez Tavily
    const tavilyResponse = await searchWithTavily({
      query: context.text,
      search_depth: "basic",
      max_results: 5,
    });

    // 3. Ekstraktuj fakty
    const facts = extractKeyFacts(tavilyResponse.results);
    const formattedResults = formatTavilyResults(tavilyResponse.results);

    console.log(`[ActionExecutor] ✓ Found ${facts.length} facts`);

    // 4. Aktualizuj entry w bazie danych
    await updateEntryWithSearchResults(context.entryId, {
      facts,
      searchResults: formattedResults,
      sources: tavilyResponse.results.map((r) => r.url),
      uiHint: 'search_complete',
    });

    console.log(`[ActionExecutor] ✓ Entry ${context.entryId} updated with search results`);
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Search action failed:`, error);
    
    await updateEntryWithError(context.entryId, 'search', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Email Action (Dynamic Recipient) ────────────────────────────────────────

async function executeEmailAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 📧 Executing email action`);

  try {
    // 1. Update status to processing
    await updateEntryStatus(context.entryId, 'email', 'processing');

    // 2. Wyciągnij odbiorcę z intentResult lub z tekstu
    const recipient = context.intentResult?.emailData?.recipient || extractRecipient(context.text);
    const subject = context.intentResult?.emailData?.subject || "Message from The Brain";

    console.log(`[ActionExecutor] 📧 Recipient: ${recipient || 'default'}`);
    console.log(`[ActionExecutor] 📧 Subject: ${subject}`);

    // 3. Wyślij email
    const result = await sendEmail(
      {
        to: recipient || undefined,
        subject: subject,
        html: createEmailTemplate(context.text),
      },
      context.text // Kontekst dla ekstrakcji odbiorcy
    );

    if (result.success) {
      console.log(`[ActionExecutor] ✓ Email sent: ${result.messageId}`);
      
      // 4. Aktualizuj entry
      await updateEntryWithEmailStatus(context.entryId, {
        sent: true,
        recipient: result.recipient || 'default',
        messageId: result.messageId,
        uiHint: 'mail_sent',
      });
    } else {
      throw new Error(result.error || "Unknown email error");
    }
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Email action failed:`, error);
    
    await updateEntryWithError(context.entryId, 'email', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Calendar Action (NEW!) ──────────────────────────────────────────────────

async function executeCalendarAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 📅 Executing calendar action`);

  try {
    // 1. Update status to processing
    await updateEntryStatus(context.entryId, 'calendar', 'processing');

    // 2. Pobierz dane wydarzenia z intentResult
    const eventData = context.intentResult?.eventData;

    if (!eventData || !eventData.title || !eventData.startDate) {
      throw new Error("Missing event data (title or startDate)");
    }

    console.log(`[ActionExecutor] 📅 Creating event: "${eventData.title}" at ${eventData.startDate}`);

    // 3. Utworz wydarzenie w kalendarzu
    const result = await createEvent({
      userId: context.userId,
      title: eventData.title,
      description: eventData.description,
      startDate: new Date(eventData.startDate),
      endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
      category: eventData.category || 'reminder',
      sourceEntryId: new Types.ObjectId(context.entryId),
    });

    if (result.success && result.event) {
      console.log(`[ActionExecutor] ✓ Event created: ${result.event._id}`);
      
      // 4. Aktualizuj entry z info o wydarzeniu
      await updateEntryWithCalendarStatus(context.entryId, {
        eventId: result.event._id,
        eventTitle: result.event.title,
        eventDate: result.event.startDate,
        uiHint: 'calendar_entry',
      });
    } else {
      throw new Error(result.error || "Unknown calendar error");
    }
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Calendar action failed:`, error);
    
    await updateEntryWithError(context.entryId, 'calendar', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Database Update Functions ───────────────────────────────────────────────

async function updateEntryStatus(
  entryId: string,
  tool: 'search' | 'email' | 'calendar',
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    [`actionTools.${tool}.status`]: status,
    "actionTools.uiHint": status === 'processing' ? 'thinking' : 'pulse',
  });
}

async function updateEntryWithSearchResults(
  entryId: string,
  data: { facts: string[]; searchResults: string; sources: string[]; uiHint: string }
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    "actionTools.search": {
      status: 'completed',
      completed: true,
      facts: data.facts,
      searchResults: data.searchResults,
      sources: data.sources,
      timestamp: new Date(),
    },
    "actionTools.uiHint": data.uiHint,
  });
}

async function updateEntryWithEmailStatus(
  entryId: string,
  data: { sent: boolean; recipient: string; messageId?: string; uiHint: string }
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    "actionTools.email": {
      status: 'completed',
      completed: true,
      sent: data.sent,
      recipient: data.recipient,
      messageId: data.messageId,
      timestamp: new Date(),
    },
    "actionTools.uiHint": data.uiHint,
  });
}

async function updateEntryWithCalendarStatus(
  entryId: string,
  data: { eventId: Types.ObjectId; eventTitle: string; eventDate: Date; uiHint: string }
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    "actionTools.calendar": {
      status: 'completed',
      completed: true,
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      timestamp: new Date(),
    },
    "actionTools.uiHint": data.uiHint,
  });
}

async function updateEntryWithError(
  entryId: string,
  tool: 'search' | 'email' | 'calendar',
  data: { error: string; uiHint: string }
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    [`actionTools.${tool}`]: {
      status: 'failed',
      completed: false,
      error: data.error,
      timestamp: new Date(),
    },
    "actionTools.uiHint": data.uiHint,
  });
}
