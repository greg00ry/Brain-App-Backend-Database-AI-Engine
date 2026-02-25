import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";
import { cleanAndParseJSON } from "./ai.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION SERVICE - Extended with Calendar & Dynamic Email
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Config ──────────────────────────────────────────────────────────────────

const LLM_API_URL = process.env.LLM_API_URL ?? "http://localhost:1234/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL ?? "local-model";
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT ?? 15_000);

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an intent classification engine for a personal assistant (Jarvis-like system).
Analyze the user message and respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

CURRENT DATE: ${new Date().toISOString()}

Rules:
1. If user mentions DATE/TIME or asks for REMINDER/APPOINTMENT → action = "CREATE_EVENT"
   - Extract: title, description, startDate (ISO 8601), endDate (optional), category
   - Normalize dates to ISO 8601 format
   - Categories: work, health, personal, meeting, reminder, other

2. If user wants to send EMAIL/MESSAGE → action = "SAVE_MAIL"
   - Try to extract recipient email from text
   - Suggest subject line if possible

3. If user wants WEB SEARCH or CURRENT INFO → action = "SAVE_SEARCH"

4. Otherwise → action = "SAVE_ONLY"

Required output format (strict JSON, nothing else):

For CREATE_EVENT:
{
  "action": "CREATE_EVENT",
  "reasoning": "User requested appointment/reminder",
  "eventData": {
    "title": "Meeting title",
    "description": "Optional description",
    "startDate": "2024-12-25T10:00:00Z",
    "endDate": "2024-12-25T11:00:00Z",
    "category": "work"
  }
}

For SAVE_MAIL:
{
  "action": "SAVE_MAIL",
  "reasoning": "User wants to send email",
  "emailData": {
    "recipient": "john@example.com",
    "subject": "Meeting follow-up"
  }
}

For SAVE_SEARCH:
{
  "action": "SAVE_SEARCH",
  "reasoning": "User needs current information"
}

For SAVE_ONLY:
{
  "action": "SAVE_ONLY",
  "reasoning": "Simple note/thought"
}

IMPORTANT DATE PARSING EXAMPLES:
- "jutro o 10" → tomorrow at 10:00
- "w piątek" → next Friday
- "za tydzień" → 7 days from now
- "15 grudnia" → December 15th current year
- "za 2 godziny" → 2 hours from now

Always use the user's language in reasoning.`;
}

// ─── Keyword Fallback ────────────────────────────────────────────────────────

const SEARCH_KEYWORDS = [
  /wyszukaj/i, /znajdź w sieci/i, /sprawdź online/i, /pobierz dane/i,
  /aktualne informacje/i, /szukaj/i,
  /search/i, /look up/i, /find online/i, /web search/i, /fetch data/i,
];

const MAIL_KEYWORDS = [
  /wyślij (e-?mail|wiadomość|mail)/i, /prześlij mailem/i, /napisz (do|mail)/i,
  /send (an? )?(e-?mail|message|mail)/i, /email (this|that|to)/i,
];

const EVENT_KEYWORDS = [
  /przypomnij/i, /przypomnienie/i, /spotkanie/i, /wydarzenie/i, /kalendarz/i,
  /jutro/i, /dziś/i, /dzisiaj/i, /w piątek/i, /w poniedziałek/i,
  /za (tydzień|godzinę|miesiąc)/i, /o godzinie/i,
  /remind/i, /reminder/i, /appointment/i, /meeting/i, /schedule/i, /calendar/i,
  /tomorrow/i, /today/i, /next (week|month|friday)/i, /at \d{1,2}(am|pm|:\d{2})/i,
];

function keywordFallback(text: string): IntentResult {
  // Najpierw sprawdź EVENT (najwyższy priorytet dla dat)
  if (EVENT_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "CREATE_EVENT", 
      reasoning: "Keyword match: date/reminder detected",
      eventData: {
        title: text.substring(0, 100),
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        category: 'reminder'
      }
    };
  }
  
  if (MAIL_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "SAVE_MAIL", 
      reasoning: "Keyword match: send/mail detected" 
    };
  }
  
  if (SEARCH_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "SAVE_SEARCH", 
      reasoning: "Keyword match: search/web detected" 
    };
  }
  
  return { 
    action: "SAVE_ONLY", 
    reasoning: "No matching keywords — defaulting to SAVE_ONLY" 
  };
}

// ─── JSON Parser ─────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set<IntentAction>([
  "SAVE_ONLY", 
  "SAVE_SEARCH", 
  "SAVE_MAIL", 
  "CREATE_EVENT"
]);

function parseIntentJSON(raw: string): IntentResult | null {
  
  const parsed = cleanAndParseJSON(raw)


  if (!parsed) return null;

  try {
    
    const action = parsed["action"];
    const reasoning = typeof parsed["reasoning"] === "string" 
      ? parsed["reasoning"] 
      : "No reasoning provided";

    if (typeof action === "string" && VALID_ACTIONS.has(action as IntentAction)) {
      const result: IntentResult = { 
        action: action as IntentAction, 
        reasoning 
      };
      
      // Dodaj eventData jeśli CREATE_EVENT
      if (action === "CREATE_EVENT" && parsed["eventData"]) {
        result.eventData = parsed["eventData"] as IntentResult["eventData"];
      }
      
      // Dodaj emailData jeśli SAVE_MAIL
      if (action === "SAVE_MAIL" && parsed["emailData"]) {
        result.emailData = parsed["emailData"] as IntentResult["emailData"];
      }
      
      return result;
    }
  } catch (err) {
    console.error("[IntentService] JSON parse failed:", err);
  }

  return null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Klasyfikuje intencję użytkownika przez LLM (Qwen).
 * Fallback: keyword matching → SAVE_ONLY.
 */
export async function classifyIntent(userText: string): Promise<IntentResult> {
  // 1. Próba przez LLM
  try {
    const response = await axios.post<LLMResponse>(
      LLM_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userText },
        ],
      },
      { timeout: LLM_TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    console.debug("[IntentService] LLM raw output:", rawContent);

    const llmResult = parseIntentJSON(rawContent);
    if (llmResult) {
      console.debug("[IntentService] LLM result:", llmResult);
      return llmResult;
    }

    console.warn("[IntentService] Nieparseable JSON od LLM — keyword fallback");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[IntentService] Błąd LLM (${LLM_API_URL}): ${message} — keyword fallback`);
  }

  // 2. Keyword fallback
  const kwResult = keywordFallback(userText);
  console.debug("[IntentService] Keyword fallback:", kwResult);
  return kwResult;
}

// ─── Helper: Validate Event Data ────────────────────────────────────────────

/**
 * Waliduje i normalizuje dane wydarzenia z LLM
 */
export function validateEventData(eventData?: IntentResult["eventData"]): {
  isValid: boolean;
  normalized?: IntentResult["eventData"];
  error?: string;
} {
  if (!eventData) {
    return { isValid: false, error: "Missing eventData" };
  }

  if (!eventData.title || !eventData.startDate) {
    return { isValid: false, error: "Missing title or startDate" };
  }

  // Sprawdź czy startDate jest valid ISO date
  const startDate = new Date(eventData.startDate);
  if (isNaN(startDate.getTime())) {
    return { isValid: false, error: "Invalid startDate format" };
  }

  // Sprawdź czy endDate jest valid (jeśli podany)
  if (eventData.endDate) {
    const endDate = new Date(eventData.endDate);
    if (isNaN(endDate.getTime())) {
      return { isValid: false, error: "Invalid endDate format" };
    }
    
    // endDate musi być po startDate
    if (endDate <= startDate) {
      return { isValid: false, error: "endDate must be after startDate" };
    }
  }

  return {
    isValid: true,
    normalized: {
      title: eventData.title.trim(),
      description: eventData.description?.trim() || undefined,
      startDate: startDate.toISOString(),
      endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : undefined,
      category: eventData.category || 'other',
    },
  };
}
