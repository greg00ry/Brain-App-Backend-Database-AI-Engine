import { Types } from "mongoose";
import { searchWithTavily, formatTavilyResults, extractKeyFacts } from "./tavily.service.js";
import { sendEmail, createEmailTemplate } from "./email.service.js";
import { createEvent } from "./calendar.service.js";
import { VaultEntry } from "../../models/VaultEntry.js";
import { IntentAction } from "./intent.types.js";
import type { IntentResult } from "./intent.types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXECUTOR - Fixed with Type Safety & RESEARCH_BRAIN
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionContext {
  userId: string;
  entryId: string;
  text: string;
  action: IntentAction;
  intentResult?: IntentResult;
}

export interface ActionResult {
  action: IntentAction;
  status: "pending" | "completed" | "failed";
  data?: any;
  error?: string;
  timestamp: number;
  uiHint?: string;
}

// ─── Action Executor ─────────────────────────────────────────────────────────

/**
 * Wykonuje akcje w tle (asynchronicznie)
 */
export async function executeActionInBackground(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 🚀 Starting background action: ${context.action}`);
  console.log(`[ActionExecutor] Entry ID: ${context.entryId}`);

  switch (context.action) {
    case "SAVE_SEARCH":
      executeSearchAction(context).catch((error) => {
        console.error(`[ActionExecutor] ✗ Search action failed:`, error);
      });
      break;

    case "RESEARCH_BRAIN":
      executeResearchBrainAction(context).catch((error) => {
        console.error(`[ActionExecutor] ✗ Research brain action failed:`, error);
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

    // 4. Aktualizuj entry (z type safety!)
    await updateEntryWithSearchResults(context.entryId, {
      facts,
      searchResults: formattedResults,
      sources: tavilyResponse.results.map((r) => r.url),
      uiHint: 'search_complete',
    });

    console.log(`[ActionExecutor] ✓ Entry ${context.entryId} updated`);
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Search action failed:`, error);
    
    await updateEntryWithError(context.entryId, 'search', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Research Brain Action (NEW!) ────────────────────────────────────────────

async function executeResearchBrainAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 🧠 Executing brain research for: "${context.text}"`);

  try {
    // 1. Update status to processing
    await updateEntryStatus(context.entryId, 'search', 'processing');

    // 2. Przeszukaj bazę MongoDB (głębsze wyszukiwanie)
    // TODO: Implementacja głębokiego wyszukiwania w bazie
    // Na razie podstawowe wyszukiwanie po keywords
    
    const keywords = extractKeywords(context.text);
    console.log(`[ActionExecutor] Keywords for research:`, keywords);

    const results = await VaultEntry.find({
      userId: new Types.ObjectId(context.userId),
      $or: [
        { 'analysis.tags': { $in: keywords } },
        { 'analysis.summary': { $regex: keywords.join('|'), $options: 'i' } },
        { rawText: { $regex: keywords.join('|'), $options: 'i' } },
      ],
    })
      .sort({ 'analysis.strength': -1 })
      .limit(10)
      .lean();

    console.log(`[ActionExecutor] ✓ Found ${results.length} relevant entries`);

    // 3. Formatuj wyniki
    const facts = results.map(entry => 
      entry.analysis?.summary || entry.rawText.substring(0, 200)
    );

    const formattedResults = results.map((entry, idx) => {
      const summary = entry.analysis?.summary || entry.rawText.substring(0, 100);
      const tags = entry.analysis?.tags?.join(', ') || 'brak tagów';
      return `${idx + 1}. ${summary} (Tags: ${tags})`;
    }).join('\n');

    // 4. Aktualizuj entry
    await updateEntryWithSearchResults(context.entryId, {
      facts,
      searchResults: formattedResults,
      sources: [], // Brak zewnętrznych źródeł (własna baza)
      uiHint: 'search_complete',
    });

    console.log(`[ActionExecutor] ✓ Brain research completed`);
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Brain research failed:`, error);
    
    await updateEntryWithError(context.entryId, 'search', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Email Action (FIXED!) ───────────────────────────────────────────────────

async function executeEmailAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 📧 Executing email action`);

  try {
    // 1. Update status to processing
    await updateEntryStatus(context.entryId, 'email', 'processing');

    // 2. FIXED: Priorytet dla emailData z intentResult!
    const emailData = context.intentResult?.emailData;
    
    // Recipient: z emailData lub fallback na ekstrakcję z tekstu
    const recipient = emailData?.recipient || extractRecipient(context.text);
    
    // Subject: z emailData lub fallback
    const subject = emailData?.subject || "Message from Jarvis";
    
    // Body: PRIORYTET dla emailData.body! Nie wysyłaj surowego tekstu!
    const body = emailData?.body || context.text;

    console.log(`[ActionExecutor] 📧 Recipient: ${recipient || 'default'}`);
    console.log(`[ActionExecutor] 📧 Subject: ${subject}`);
    console.log(`[ActionExecutor] 📧 Body source: ${emailData?.body ? 'AI generated' : 'raw text'}`);

    // 3. Wyślij email
    const result = await sendEmail(
      {
        to: recipient || undefined,
        subject: subject,
        html: createEmailTemplate(body), // Używamy body z AI lub fallback
      },
      context.text // Kontekst dla ekstrakcji odbiorcy (fallback)
    );

    if (result.success) {
      console.log(`[ActionExecutor] ✓ Email sent: ${result.messageId}`);
      
      // 4. Aktualizuj entry (z type safety!)
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

// ─── Calendar Action ─────────────────────────────────────────────────────────

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

    // 3. Utworz wydarzenie
    const result = await createEvent({
      userId: context.userId,
      title: eventData.title,
      description: eventData.description,
      startDate: new Date(eventData.startDate),
      endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
      category: eventData.category || 'reminder',
      sourceEntryId: new Types.ObjectId(context.entryId), // ← Type safety!
    });

    if (result.success && result.event) {
      console.log(`[ActionExecutor] ✓ Event created: ${result.event._id}`);
      
      // 4. Aktualizuj entry (z type safety!)
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

// ─── Database Update Functions (WITH TYPE SAFETY!) ───────────────────────────

async function updateEntryStatus(
  entryId: string,
  tool: 'search' | 'email' | 'calendar',
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  await VaultEntry.findByIdAndUpdate(
    new Types.ObjectId(entryId), // ← Type safety!
    {
      [`actionTools.${tool}.status`]: status,
      "actionTools.uiHint": status === 'processing' ? 'thinking' : 'pulse',
    }
  );
}

async function updateEntryWithSearchResults(
  entryId: string,
  data: { facts: string[]; searchResults: string; sources: string[]; uiHint: string }
): Promise<void> {
  await VaultEntry.findByIdAndUpdate(
    new Types.ObjectId(entryId), // ← Type safety!
    {
      "actionTools.search": {
        status: 'completed',
        completed: true,
        facts: data.facts,
        searchResults: data.searchResults,
        sources: data.sources,
        timestamp: new Date(),
      },
      "actionTools.uiHint": data.uiHint,
    }
  );
}

async function updateEntryWithEmailStatus(
  entryId: string,
  data: { sent: boolean; recipient: string; messageId?: string; uiHint: string }
): Promise<void> {
  await VaultEntry.findByIdAndUpdate(
    new Types.ObjectId(entryId), // ← Type safety!
    {
      "actionTools.email": {
        status: 'completed',
        completed: true,
        sent: data.sent,
        recipient: data.recipient,
        messageId: data.messageId,
        timestamp: new Date(),
      },
      "actionTools.uiHint": data.uiHint,
    }
  );
}

async function updateEntryWithCalendarStatus(
  entryId: string,
  data: { eventId: Types.ObjectId; eventTitle: string; eventDate: Date; uiHint: string }
): Promise<void> {
  await VaultEntry.findByIdAndUpdate(
    new Types.ObjectId(entryId), // ← Type safety!
    {
      "actionTools.calendar": {
        status: 'completed',
        completed: true,
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        eventDate: data.eventDate,
        timestamp: new Date(),
      },
      "actionTools.uiHint": data.uiHint,
    }
  );
}

async function updateEntryWithError(
  entryId: string,
  tool: 'search' | 'email' | 'calendar',
  data: { error: string; uiHint: string }
): Promise<void> {
  await VaultEntry.findByIdAndUpdate(
    new Types.ObjectId(entryId), // ← Type safety!
    {
      [`actionTools.${tool}`]: {
        status: 'failed',
        completed: false,
        error: data.error,
        timestamp: new Date(),
      },
      "actionTools.uiHint": data.uiHint,
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ekstraktuje słowa kluczowe z tekstu (dla RESEARCH_BRAIN)
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'i', 'a', 'o', 'w', 'z', 'na', 'do', 'po', 'że', 'się', 'od',
    'the', 'is', 'at', 'which', 'on', 'was', 'for',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Ekstraktuje email z tekstu (fallback dla SAVE_MAIL)
 */
function extractRecipient(text: string): string | null {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
}
