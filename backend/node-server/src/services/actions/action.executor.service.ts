import { Types } from "mongoose";
import { searchWithTavily, formatTavilyResults, extractKeyFacts } from "./tavily.service.js";
import { sendEmail, createEmailTemplate } from "./email.service.js";
import { createEvent } from "./calendar.service.js";
import { storageAdapter } from "../db/storage.js";
import { IntentAction } from "../ai/intent.types.js";
import type { IntentResult } from "../ai/intent.types.js";

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
  data?: unknown;
  error?: string;
  timestamp: number;
  uiHint?: string;
}

// ─── Action Executor ─────────────────────────────────────────────────────────

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
    await storageAdapter.updateEntryActionStatus(context.entryId, 'search', 'processing');

    const tavilyResponse = await searchWithTavily({
      query: context.text,
      search_depth: "basic",
      max_results: 5,
    });

    const facts = extractKeyFacts(tavilyResponse.results);
    const formattedResults = formatTavilyResults(tavilyResponse.results);
    console.log(`[ActionExecutor] ✓ Found ${facts.length} facts`);

    await storageAdapter.updateEntrySearchResult(context.entryId, {
      facts,
      searchResults: formattedResults,
      sources: tavilyResponse.results.map((r) => r.url),
      uiHint: 'search_complete',
    });

    console.log(`[ActionExecutor] ✓ Entry ${context.entryId} updated`);
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Search action failed:`, error);
    await storageAdapter.updateEntryActionError(context.entryId, 'search', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Research Brain Action ────────────────────────────────────────────────────

async function executeResearchBrainAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 🧠 Executing brain research for: "${context.text}"`);

  try {
    await storageAdapter.updateEntryActionStatus(context.entryId, 'search', 'processing');

    const keywords = extractKeywords(context.text);
    console.log(`[ActionExecutor] Keywords for research:`, keywords);

    const results = await storageAdapter.findRelevantEntries(context.userId, keywords);
    console.log(`[ActionExecutor] ✓ Found ${results.length} relevant entries`);

    const facts = results.map(entry =>
      entry.analysis?.summary || entry.rawText.substring(0, 200)
    );

    const formattedResults = results.map((entry, idx) => {
      const summary = entry.analysis?.summary || entry.rawText.substring(0, 100);
      const tags = entry.analysis?.tags?.join(', ') || 'brak tagów';
      return `${idx + 1}. ${summary} (Tags: ${tags})`;
    }).join('\n');

    await storageAdapter.updateEntrySearchResult(context.entryId, {
      facts,
      searchResults: formattedResults,
      sources: [],
      uiHint: 'search_complete',
    });

    console.log(`[ActionExecutor] ✓ Brain research completed`);
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Brain research failed:`, error);
    await storageAdapter.updateEntryActionError(context.entryId, 'search', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Email Action ─────────────────────────────────────────────────────────────

async function executeEmailAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 📧 Executing email action`);

  try {
    await storageAdapter.updateEntryActionStatus(context.entryId, 'email', 'processing');

    const emailData = context.intentResult?.emailData;
    const recipient = emailData?.recipient || extractRecipient(context.text);
    const subject = emailData?.subject || "Message from Jarvis";
    const body = emailData?.body || context.text;

    console.log(`[ActionExecutor] 📧 Recipient: ${recipient || 'default'}`);
    console.log(`[ActionExecutor] 📧 Subject: ${subject}`);
    console.log(`[ActionExecutor] 📧 Body source: ${emailData?.body ? 'AI generated' : 'raw text'}`);

    const result = await sendEmail(
      { to: recipient || undefined, subject, html: createEmailTemplate(body) },
      context.text
    );

    if (result.success) {
      console.log(`[ActionExecutor] ✓ Email sent: ${result.messageId}`);
      await storageAdapter.updateEntryEmailResult(context.entryId, {
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
    await storageAdapter.updateEntryActionError(context.entryId, 'email', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Calendar Action ──────────────────────────────────────────────────────────

async function executeCalendarAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 📅 Executing calendar action`);

  try {
    await storageAdapter.updateEntryActionStatus(context.entryId, 'calendar', 'processing');

    const eventData = context.intentResult?.eventData;
    if (!eventData || !eventData.title || !eventData.startDate) {
      throw new Error("Missing event data (title or startDate)");
    }

    console.log(`[ActionExecutor] 📅 Creating event: "${eventData.title}" at ${eventData.startDate}`);

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
      await storageAdapter.updateEntryCalendarResult(context.entryId, {
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
    await storageAdapter.updateEntryActionError(context.entryId, 'calendar', {
      error: error instanceof Error ? error.message : String(error),
      uiHint: 'error',
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function extractRecipient(text: string): string | null {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
}
