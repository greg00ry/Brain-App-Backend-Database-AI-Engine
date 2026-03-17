import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";
import { cleanAndParseJSON } from "./ai.service.js";
import { getBrainContext } from "./intent.context.service.js";
import { LLM, CHAT, MEMORY, MISC } from "../../config/constants.js";

// ═══════════════════════════════════════════════════════════════════════════════=
// INTENT SERVICE - Optimized for DeepSeek Coder V2 Lite (16B)
// ═══════════════════════════════════════════════════════════════════════════════=

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClassifyIntentParams {
  userText: string;
  userId: string;
  chatHistory?: ChatMessage[];
}


// ─── System Prompt for DeepSeek Coder ───────────────────────────────────────

function buildDeepSeekPrompt(
  userText: string,
  brainContext: string,
  chatHistory?: ChatMessage[]
): string {
  // Historia (ostatnie 3)
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-CHAT.HISTORY_RECENT_FOR_PROMPT);
    history = '\nCONVERSATION:\n';
    recent.forEach(msg => {
      history += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    });
  }

  

  // Context (max 400 chars)
  const context = brainContext !== '💭 Brak relevantnych wspomnień w bazie danych.\n'
    ? `\nMEMORY:\n${brainContext.substring(0, MEMORY.BRAIN_CONTEXT_MAX_CHARS)}\n`
    : '';

  return `### ROLE
You are a deterministic routing engine for a Cognitive Agent. 
Return ONLY JSON. No conversation, no explanations.

### PRIORITY RULES
1. IF input contains '@' OR 'wyślij' OR 'mail' -> ALWAYS "action": "SAVE_MAIL".
2. IF input asks about AI, past projects, or your own notes -> ALWAYS "action": "RESEARCH_BRAIN".
3. IF input asks about current weather, news, or general web data -> "action": "SAVE_SEARCH".
4. IF input mentions time, date, reminder, calendar, 'jutro', 'spotkanie' -> "action": "CREATE_EVENT".
5. DEFAULT -> "action": "SAVE_ONLY".

### JSON STRUCTURE
{
  "action": "SAVE_SEARCH" | "RESEARCH_BRAIN" | "SAVE_MAIL" | "CREATE_EVENT" | "SAVE_ONLY",
  "reasoning": "short explanation",
  "answer": "Krótka odpowiedź po polsku, mordo",
  "emailData": { "recipient": "", "subject": "", "body": "" },
  "eventData": { "title": "", "startDate": "", "category": "reminder" }
}

### CRITICAL
- If "action" is "SAVE_MAIL", you MUST extract the email address to "emailData.recipient".
- DO NOT default to weather if keywords like 'AI', 'notatki', or 'pamięć' are present.
- Polish response must ALWAYS include the word 'mordo'.`;
}

// ─── Keyword Fallback ────────────────────────────────────────────────────────

function keywordFallback(text: string): IntentResult | null {
  const lower = text.toLowerCase();
  
  // 1. NAJWYŻSZY PRIORYTET: RESEARCH_BRAIN (Twoje notatki i AI)
  const brainKeywords = ['notatki', 'mówiłeś', 'pamięć', 'projekt', 'wspominałeś', 'wiedza'];
  if (brainKeywords.some(key => lower.includes(key))) {
    return { 
      action: "RESEARCH_BRAIN", 
      reasoning: "Hardcoded keyword match (Memory)", 
      answer: "Już szperam w mojej pamięci, mordo. Zaraz powiem Ci wszystko o tym projekcie." 
    };
  }
  
  // 2. MAIL (Wymaga znaku @ i słowa kluczowego)
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.exec(text);
  if (hasEmail && (/wyślij|wyslij|mail|email/.test(lower))) {
    return { 
      action: "SAVE_MAIL", 
      reasoning: "Hardcoded Email pattern",
      answer: `Jasne mordo, przygotowuję maila do ${hasEmail[0]}.`,
      emailData: { 
        recipient: hasEmail[0], 
        subject: "Wiadomość od Jarvisa", 
        body: text 
      }
    };
  }
  
  // 3. KALENDARZ / PRZYPOMNIENIA
  const eventKeywords = ['przypomnij', 'ustaw', 'kalendarz', 'jutro', 'godzinie'];
  if (eventKeywords.some(key => lower.includes(key))) {
    return { 
      action: "CREATE_EVENT", 
      reasoning: "Hardcoded Time keyword",
      answer: "Ustawiam przypomnienie, mordo. Nie pozwolę Ci o tym zapomnieć.",
      eventData: {
        title: text.length > 50 ? text.substring(0, 47) + "..." : text,
        startDate: new Date(Date.now() + MISC.EVENT_DEFAULT_OFFSET_MS).toISOString(),
        category: 'reminder'
      }
    };
  }

  // 4. SEARCH (Pogoda i pytania ogólne z pytajnikiem)
  const searchKeywords = ['pogoda', 'news', 'wiadomości', 'kto', 'co to', 'gdzie'];
  if (searchKeywords.some(key => lower.includes(key)) || /\?$/.test(text.trim())) {
    return { 
      action: "SAVE_SEARCH", 
      reasoning: "Hardcoded Search pattern",
      answer: "Czekaj mordo, sprawdzę to w sieci, żebyś miał świeże info."
    };
  }
  
  // Jeśli żadne słowo kluczowe nie pasuje, zwróć null -> wtedy uderzamy do LLM
  return null
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

  // 1. NAJPIERW KEYWORD FALLBACK (Szybka ścieżka, zero halucynacji)
  const quickResult = keywordFallback(userText);
  
  // Jeśli to nie jest domyślny chat, tylko konkretna akcja - zwróć od razu
  if (quickResult !== null) {
    console.log("[IntentService] ✓ Quick Match:", quickResult.action);
    return quickResult;
  }

  try {
    const { synapticTree } = await getBrainContext(userId, userText);
    const prompt = buildDeepSeekPrompt(userText, synapticTree, chatHistory);
    
    const response = await axios.post<LLMResponse>(
      LLM.API_URL,
      {
        model: LLM.MODEL,
        temperature: LLM.INTENT_TEMPERATURE,
        max_tokens: LLM.INTENT_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: LLM.TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    const llmResult = parseIntentJSON(rawContent);
    
    if (llmResult) {
      return llmResult;
    }
  } catch (err) {
    console.error(`[IntentService] Error:`, err instanceof Error ? err.message : String(err));
  }

  // Jeśli wszystko inne zawiedzie, zwróć SAVE_ONLY
  return { action: "SAVE_ONLY", reasoning: "Fallback", answer: "Okej mordo." };
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