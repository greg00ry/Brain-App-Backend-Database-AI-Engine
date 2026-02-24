import { searchWithTavily, formatTavilyResults, extractKeyFacts } from "./tavily.service.js";
import { sendEmail, createEmailTemplate } from "./email.service.js";
import { IntentAction } from "../ai/intent.types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionContext {
  userId: string;
  entryId: string; // ID synapse w bazie danych
  text: string;
  action: IntentAction;
}

export interface ActionResult {
  action: IntentAction;
  status: "pending" | "completed" | "failed";
  data?: any;
  error?: string;
  timestamp: number;
}

// ─── Action Executor ──────────────────────────────────────────────────────────

/**
 * Wykonuje akcje w tle (asynchronicznie) na podstawie intent action
 * @param context - Kontekst akcji (userId, entryId, text, action)
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

    case "SAVE_ONLY":
      // Nie robimy nic - tylko zapis do bazy (już wykonany)
      console.log(`[ActionExecutor] ℹ️  SAVE_ONLY - no action needed`);
      break;

    default:
      console.warn(`[ActionExecutor] ⚠️  Unknown action: ${context.action}`);
  }
}

// ─── Search Action ────────────────────────────────────────────────────────────

/**
 * Wykonuje research w sieci i aktualizuje synapsę o znalezione fakty
 */
async function executeSearchAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 🔍 Executing search for: "${context.text}"`);

  try {
    // 1. Wykonaj research przez Tavily
    const tavilyResponse = await searchWithTavily({
      query: context.text,
      search_depth: "basic",
      max_results: 5,
    });

    // 2. Ekstraktuj fakty
    const facts = extractKeyFacts(tavilyResponse.results);
    const formattedResults = formatTavilyResults(tavilyResponse.results);

    console.log(`[ActionExecutor] ✓ Found ${facts.length} facts`);

    // 3. Aktualizuj synapsę w bazie danych
    await updateEntryWithFacts(context.entryId, {
      facts,
      searchResults: formattedResults,
      sources: tavilyResponse.results.map((r) => r.url),
    });

    console.log(`[ActionExecutor] ✓ Entry ${context.entryId} updated with search results`);
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Search action failed:`, error);
    
    // Aktualizuj synapsę o błędzie
    await updateEntryWithError(context.entryId, {
      action: "SAVE_SEARCH",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── Email Action ─────────────────────────────────────────────────────────────

/**
 * Wysyła email na podstawie intencji użytkownika
 */
async function executeEmailAction(context: ActionContext): Promise<void> {
  console.log(`[ActionExecutor] 📧 Executing email action`);

  try {
    // TODO: Tutaj możesz dodać logikę ekstraktowania odbiorcy z tekstu
    // Na razie wysyłamy do admina jako notyfikację
    
    const result = await sendEmail({
      to: process.env.ADMIN_EMAIL || "admin@example.com",
      subject: "Neural Console - Nowa intencja MAIL",
      html: createEmailTemplate(
        context.text,
        `Użytkownik ${context.userId} chce wysłać wiadomość`
      ),
    });

    if (result.success) {
      console.log(`[ActionExecutor] ✓ Email sent: ${result.messageId}`);
      
      // Aktualizuj synapsę o informację o wysłanym mailu
      await updateEntryWithEmailStatus(context.entryId, {
        sent: true,
        messageId: result.messageId,
      });
    } else {
      throw new Error(result.error || "Unknown email error");
    }
  } catch (error) {
    console.error(`[ActionExecutor] ✗ Email action failed:`, error);
    
    await updateEntryWithError(context.entryId, {
      action: "SAVE_MAIL",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── Database Update Functions ────────────────────────────────────────────────

/**
 * Aktualizuje entry o fakty znalezione w internecie
 */
async function updateEntryWithFacts(
  entryId: string,
  data: { facts: string[]; searchResults: string; sources: string[] }
): Promise<void> {
  // Dynamiczny import aby uniknąć circular dependency
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    "actionTools.search": {
      completed: true,
      facts: data.facts,
      searchResults: data.searchResults,
      sources: data.sources,
      timestamp: new Date(),
    },
  });
}

/**
 * Aktualizuje entry o status wysłanego emaila
 */
async function updateEntryWithEmailStatus(
  entryId: string,
  data: { sent: boolean; messageId?: string }
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    "actionTools.email": {
      completed: true,
      sent: data.sent,
      messageId: data.messageId,
      timestamp: new Date(),
    },
  });
}

/**
 * Aktualizuje entry o błąd podczas wykonywania akcji
 */
async function updateEntryWithError(
  entryId: string,
  data: { action: string; error: string }
): Promise<void> {
  const { updateEntry } = await import("../db/entry.service.js");
  
  await updateEntry(entryId, {
    [`actionTools.${data.action.toLowerCase()}`]: {
      completed: false,
      error: data.error,
      timestamp: new Date(),
    },
  });
}
