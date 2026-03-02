import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";
import { cleanAndParseJSON } from "./ai.service.js";
import { getBrainContext } from "./intent.context.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT SERVICE - Optimized for DeepSeek Coder V2 Lite (16B)
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
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT ?? 30_000);

// ─── System Prompt for DeepSeek Coder ───────────────────────────────────────

function buildDeepSeekPrompt(
  userText: string,
  brainContext: string,
  chatHistory?: ChatMessage[]
): string {
  // Historia (ostatnie 3)
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-3);
    history = '\nCONVERSATION:\n';
    recent.forEach(msg => {
      history += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    });
  }

  // Context (max 400 chars)
  const context = brainContext !== '💭 Brak relevantnych wspomnień w bazie danych.\n' 
    ? `\nMEMORY:\n${brainContext.substring(0, 400)}\n`
    : '';

  return `Classify user intent. Return JSON only.

${history}${context}
USER: "${userText}"

ACTIONS:
- SAVE_SEARCH: internet search (weather, news, current info)
- RESEARCH_BRAIN: search own memory (past notes)
- SAVE_MAIL: send email (needs recipient, generate body)
- CREATE_EVENT: calendar/reminder (needs date)
- SAVE_ONLY: general chat

RULES:
- SAVE_SEARCH: "jaka", "gdzie", "kiedy", "podaj informacje", questions
- SAVE_MAIL: "wyślij email", has @email
- CREATE_EVENT: "przypomnij", "jutro", time mentioned
- RESEARCH_BRAIN: "co mówiłeś", "znajdź w notatkach"
- SAVE_ONLY: greetings, general talk

JSON FORMAT:
{
  "action": "ACTION_NAME",
  "reasoning": "why",
  "answer": "Polish response with 'mordo'",
  "emailData": {
    "recipient": "email@example.com",
    "subject": "Subject",
    "body": "Generated body"
  },
  "eventData": {
    "title": "Title",
    "startDate": "ISO date",
    "category": "reminder"
  }
}

EXAMPLES:

User: "Jaka pogoda?"
{"action":"SAVE_SEARCH","reasoning":"weather query","answer":"Sprawdzam pogodę, mordo."}

User: "Wyślij email do john@example.com że projekt opóźniony"
{"action":"SAVE_MAIL","reasoning":"email request","answer":"Wysyłam email, mordo.","emailData":{"recipient":"john@example.com","subject":"Projekt","body":"Projekt jest opóźniony."}}

User: "Przypomnij jutro o 10"
{"action":"CREATE_EVENT","reasoning":"reminder","answer":"Ustawiam, mordo.","eventData":{"title":"Przypomnienie","startDate":"2024-12-26T10:00:00Z","category":"reminder"}}

User: "Co mówiłeś o AI?"
{"action":"RESEARCH_BRAIN","reasoning":"memory query","answer":"Sprawdzam w pamięci, mordo."}

User: "Hej"
{"action":"SAVE_ONLY","reasoning":"greeting","answer":"Cześć, mordo."}

RESPOND NOW:`;
}

// ─── Keyword Fallback ────────────────────────────────────────────────────────

const PATTERNS = {
  MAIL: /wyślij|wyslij|email|mail|napisz do|send\s+email/i,
  EVENT: /przypomnij|kalendarz|jutro|dziś|spotkanie|remind|tomorrow/i,
  SEARCH: /pogoda|cena|jaka|gdzie|kiedy|podaj|info|atak|news|sprawdź/i,
  RESEARCH: /co (mi |)mówił|pamiętasz|znajdź|pokazał/i,
};

function keywordFallback(text: string): IntentResult {
  const lower = text.toLowerCase();
  
  if ((PATTERNS.MAIL.test(lower) && /@/.test(text)) || 
      (/wyślij|wyslij/.test(lower) && /@/.test(text))) {
    const email = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    return { 
      action: "SAVE_MAIL", 
      reasoning: "Email pattern",
      answer: `Wysyłam do ${email?.[0] || 'odbiorcy'}, mordo.`,
      emailData: { recipient: email?.[0], subject: "Wiadomość", body: text }
    };
  }
  
  if (PATTERNS.EVENT.test(lower)) {
    return { 
      action: "CREATE_EVENT", 
      reasoning: "Time keyword",
      answer: "Ustawiam, mordo.",
      eventData: {
        title: text.substring(0, 50),
        startDate: new Date(Date.now() + 86400000).toISOString(),
        category: 'reminder'
      }
    };
  }
  
  if (PATTERNS.RESEARCH.test(lower)) {
    return { 
      action: "RESEARCH_BRAIN", 
      reasoning: "Memory query",
      answer: "Sprawdzam w pamięci, mordo."
    };
  }
  
  if (PATTERNS.SEARCH.test(lower) || /\?$/.test(text)) {
    return { 
      action: "SAVE_SEARCH", 
      reasoning: "Search pattern",
      answer: "Sprawdzam, mordo."
    };
  }
  
  return { 
    action: "SAVE_ONLY", 
    reasoning: "General chat",
    answer: "Okej, mordo."
  };
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
    const { synapticTree } = await getBrainContext(userId, userText);
    const prompt = buildDeepSeekPrompt(userText, synapticTree, chatHistory);
    
    console.log('[IntentService] Prompt length:', prompt.length, 'chars');

    const response = await axios.post<LLMResponse>(
      LLM_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0.2,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: LLM_TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    console.log("[IntentService] Raw:", rawContent.substring(0, 150));

    const llmResult = parseIntentJSON(rawContent);
    
    if (llmResult) {
      console.log("[IntentService] ✓ Parsed:", llmResult.action);
      return llmResult;
    }

    console.warn("[IntentService] Parse failed → fallback");
  } catch (err) {
    console.error(`[IntentService] Error:`, err instanceof Error ? err.message : String(err));
  }

  const kwResult = keywordFallback(userText);
  console.log("[IntentService] Fallback:", kwResult.action);
  return kwResult;
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