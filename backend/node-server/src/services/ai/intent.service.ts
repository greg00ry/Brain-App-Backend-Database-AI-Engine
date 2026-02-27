import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";
import { cleanAndParseJSON } from "./ai.service.js";
import { getBrainContext } from "./intent.context.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT SERVICE - Optimized for Small Models (Qwen 7B)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClassifyIntentParams {
  userText: string;
  userId: string;
  chatHistory?: ChatMessage[];
}

const LLM_API_URL = process.env.LLM_API_URL ?? "http://localhost:1234/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL ?? "local-model";
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT ?? 20_000);

// ─── Compact System Prompt (Optimized for 7B models) ────────────────────────

function buildCompactPrompt(
  userText: string,
  brainContext: string,
  chatHistory?: ChatMessage[]
): string {
  // Historia: tylko ostatnie 3 (oszczędzamy tokeny)
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-3);
    history = recent.map(m => `${m.role === 'user' ? 'U' : 'A'}: ${m.content}`).join('\n');
  }

  return `Jarvis AI. Zwrot: "mordo". TYLKO JSON, bez markdown.

${history ? `LAST:\n${history}\n` : ''}
${brainContext !== '💭 Brak relevantnych wspomnień w bazie danych.\n' ? `MEMORY:\n${brainContext.substring(0, 300)}...\n` : ''}

USER: ${userText}

ACTIONS:
- SAVE_SEARCH = internet (weather, news, prices)
- RESEARCH_BRAIN = own database (past notes, "co mówiłeś o X?")
- SAVE_MAIL = send email (generate full body!)
- CREATE_EVENT = reminder/calendar (ISO date!)
- SAVE_ONLY = chat

JSON:
{
  "action": "SAVE_SEARCH",
  "reasoning": "short why",
  "answer": "mordo response"
}

EXAMPLES:
{"action":"SAVE_SEARCH","reasoning":"weather query","answer":"Sprawdzam pogodę, mordo."}
{"action":"RESEARCH_BRAIN","reasoning":"user asks about past","answer":"Zaraz sprawdzę, mordo."}
{"action":"SAVE_ONLY","reasoning":"greeting","answer":"Hej, mordo."}

NOW RESPOND:`;
}

// ─── Keyword Fallback ────────────────────────────────────────────────────────

const PATTERNS = {
  SEARCH: /pogoda|cena|aktualne|weather|price|current/i,
  RESEARCH: /co (mi |)mówił|pamiętasz|znajdź w notatkach/i,
  MAIL: /wyślij (e-?mail|mail)|send (e-?mail|mail)/i,
  EVENT: /przypomnij|jutro|dziś|spotkanie|remind|tomorrow|today|meeting/i,
};

function keywordFallback(text: string): IntentResult {
  if (PATTERNS.RESEARCH.test(text)) {
    return { action: "RESEARCH_BRAIN", reasoning: "keyword: memory", answer: "Zaraz sprawdzę, mordo." };
  }
  if (PATTERNS.EVENT.test(text)) {
    return { 
      action: "CREATE_EVENT", 
      reasoning: "keyword: date",
      answer: "Ustawiam, mordo.",
      eventData: { title: text.substring(0, 50), startDate: new Date(Date.now() + 86400000).toISOString(), category: 'reminder' }
    };
  }
  if (PATTERNS.MAIL.test(text)) {
    return { action: "SAVE_MAIL", reasoning: "keyword: mail", answer: "Wysyłam, mordo." };
  }
  if (PATTERNS.SEARCH.test(text)) {
    return { action: "SAVE_SEARCH", reasoning: "keyword: search", answer: "Sprawdzam, mordo." };
  }
  return { action: "SAVE_ONLY", reasoning: "general", answer: "Łap, mordo." };
}

// ─── JSON Parser ─────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set<IntentAction>([
  "SAVE_ONLY", "SAVE_SEARCH", "RESEARCH_BRAIN", "SAVE_MAIL", "CREATE_EVENT"
]);

function parseIntentJSON(raw: string): IntentResult | null {
  const parsed = cleanAndParseJSON(raw);
  if (!parsed) return null;

  try {
    const action = parsed["action"];
    const reasoning = parsed["reasoning"] || "no reason";
    const answer = parsed["answer"] || "Okej, mordo.";

    if (typeof action === "string" && VALID_ACTIONS.has(action as IntentAction)) {
      const result: IntentResult = { action: action as IntentAction, reasoning, answer };
      
      if (action === "CREATE_EVENT" && parsed["eventData"]) {
        result.eventData = parsed["eventData"];
      }
      if (action === "SAVE_MAIL" && parsed["emailData"]) {
        result.emailData = parsed["emailData"];
      }
      
      return result;
    }
  } catch (err) {
    console.error("[IntentService] Parse failed:", err);
  }
  return null;
}

// ─── Main Service ────────────────────────────────────────────────────────────

export async function classifyIntent(params: ClassifyIntentParams): Promise<IntentResult> {
  const { userText, userId, chatHistory = [] } = params;
  
  console.log('[IntentService] Classifying:', userText);

  try {
    // 1. Pobierz kontekst (ograniczony dla małych modeli)
    const brainContext = await getBrainContext(userId, userText);
    console.log('[IntentService] Context:', brainContext.hasContext);

    // 2. Kompaktowy prompt
    const prompt = buildCompactPrompt(userText, brainContext.synapticTree, chatHistory);
    
    console.log('[IntentService] Prompt length:', prompt.length, 'chars');

    // 3. Wywołaj LLM
    const response = await axios.post<LLMResponse>(
      LLM_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0.1,
        max_tokens: 150, // Krótsze odpowiedzi
        messages: [
          { role: "user", content: prompt }
        ],
      },
      { timeout: LLM_TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    console.log("[IntentService] Raw output:", rawContent.substring(0, 100));

    const llmResult = parseIntentJSON(rawContent);
    
    if (llmResult) {
      console.log("[IntentService] ✓ Parsed:", llmResult.action);
      return llmResult;
    }

    console.warn("[IntentService] ⚠️ Parse failed → fallback");
  } catch (err) {
    console.error(`[IntentService] ❌ Error:`, err instanceof Error ? err.message : String(err));
  }

  return keywordFallback(userText);
}

export function validateEventData(eventData?: IntentResult["eventData"]): {
  isValid: boolean;
  normalized?: IntentResult["eventData"];
  error?: string;
} {
  if (!eventData || !eventData.title || !eventData.startDate) {
    return { isValid: false, error: "Missing data" };
  }

  const startDate = new Date(eventData.startDate);
  if (isNaN(startDate.getTime())) {
    return { isValid: false, error: "Invalid date" };
  }

  return {
    isValid: true,
    normalized: {
      title: eventData.title.trim(),
      description: eventData.description?.trim(),
      startDate: startDate.toISOString(),
      endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : undefined,
      category: eventData.category || 'other',
    },
  };
}
