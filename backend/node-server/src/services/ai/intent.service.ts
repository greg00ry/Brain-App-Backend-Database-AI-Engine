import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";
import { cleanAndParseJSON } from "./ai.service.js";
import { getBrainContext } from "./intent.context.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT SERVICE - Stabilized with Few-Shot & Recursive Context (3x3)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClassifyIntentParams {
  userText: string;
  userId: string;
  chatHistory?: ChatMessage[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const LLM_API_URL = process.env.LLM_API_URL ?? "http://localhost:1234/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL ?? "local-model";
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT ?? 30_000);

// ─── System Prompt with Few-Shot Examples ────────────────────────────────────

function buildJarvisSystemPrompt(
  brainContext: string,
  chatHistory?: ChatMessage[]
): string {
  // Historia rozmowy (ostatnie 5)
  let historySection = '';
  if (chatHistory && chatHistory.length > 0) {
    historySection = '\n<CHAT_HISTORY>\n';
    const recentHistory = chatHistory.slice(-5);
    recentHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Jarvis';
      historySection += `${role}: ${msg.content}\n`;
    });
    historySection += '</CHAT_HISTORY>\n';
  }

  return `You are JARVIS - AI assistant. Style: konkretny, pragmatyczny, pomocny. Zwrot: "mordo".

CURRENT DATE: ${new Date().toISOString()}

${historySection}

<BRAIN_CONTEXT>
${brainContext}
</BRAIN_CONTEXT>

CRITICAL: Respond ONLY with valid JSON - NO markdown, NO backticks, NO extra text.

JSON Format:
{
  "action": "SAVE_ONLY" | "SAVE_SEARCH" | "SAVE_MAIL" | "CREATE_EVENT",
  "reasoning": "short technical explanation",
  "answer": "natural Polish response with 'mordo' style",
  "eventData": {...}  // ONLY if CREATE_EVENT
  "emailData": {...}  // ONLY if SAVE_MAIL
}

CLASSIFICATION RULES:
1. CREATE_EVENT → date/time or reminder mentioned
   Extract: title, startDate (ISO 8601), category
   
2. SAVE_MAIL → email sending request
   Extract recipient if found

3. SAVE_SEARCH → web search or current info request

4. SAVE_ONLY → general conversation, questions, notes

FEW-SHOT EXAMPLES (Learn the pattern!):

Example 1:
User: "Jak się masz?"
{
  "action": "SAVE_ONLY",
  "reasoning": "Greeting, no action needed",
  "answer": "Wszystko git, mordo. Gotowy do roboty."
}

Example 2:
User: "Przypomnij mi jutro o 10 o spotkaniu"
{
  "action": "CREATE_EVENT",
  "reasoning": "Reminder request with specific time",
  "answer": "Jasne, mordo. Ustawiam przypomnienie na jutro o 10:00. Dasz znać jak trzeba.",
  "eventData": {
    "title": "Spotkanie",
    "startDate": "2024-12-26T10:00:00Z",
    "category": "reminder"
  }
}

Example 3:
User: "Wyślij mail do john@example.com o projekcie"
{
  "action": "SAVE_MAIL",
  "reasoning": "Email request with recipient",
  "answer": "Okej, mordo. Wysyłam do john@example.com. Potwierdzę jak pójdzie.",
  "emailData": {
    "recipient": "john@example.com",
    "subject": "o projekcie"
  }
}

Example 4:
User: "Znajdź info o AI w 2024"
{
  "action": "SAVE_SEARCH",
  "reasoning": "Web search request for current info",
  "answer": "Sprawdzam w necie, mordo. Chwila."
}

Example 5 (using brain context):
User: "Co tam z tym projektem?"
Brain: "Projekt AI na UW" connected to "Deep Learning kurs"
{
  "action": "SAVE_ONLY",
  "reasoning": "Question about existing project in memory",
  "answer": "No pamiętam, mordo - pracowałeś nad projektem AI na UW. To było powiązane z kursem Deep Learning. Potrzebujesz szczegółów?"
}

JARVIS STYLE:
- Use brain context when relevant
- Be concise (2-3 sentences)
- "mordo" instead of "sir"
- Polish language
- Pragmatic, no bullshit

DATE PARSING:
- "jutro o 10" → tomorrow 10:00
- "w piątek" → next Friday 09:00
- "za tydzień" → +7 days
- "15 grudnia" → Dec 15 this year

REMEMBER: 
- ONLY valid JSON output
- NO markdown, NO backticks
- "answer" field = where Jarvis talks to user
- Use brain synapses to make connections`;
}

// ─── Keyword Fallback ────────────────────────────────────────────────────────

const SEARCH_KEYWORDS = [
  /wyszukaj/i, /znajdź w sieci/i, /sprawdź online/i, /szukaj/i,
  /search/i, /look up/i, /find online/i,
];

const MAIL_KEYWORDS = [
  /wyślij (e-?mail|wiadomość|mail)/i, /napisz (do|mail)/i,
  /send (an? )?(e-?mail|message)/i,
];

const EVENT_KEYWORDS = [
  /przypomnij/i, /przypomnienie/i, /spotkanie/i, /kalendarz/i,
  /jutro/i, /dziś/i, /dzisiaj/i, /w piątek/i,
  /remind/i, /reminder/i, /meeting/i, /tomorrow/i, /today/i,
];

function keywordFallback(text: string): IntentResult {
  if (EVENT_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "CREATE_EVENT", 
      reasoning: "Keyword match: date/reminder",
      answer: "Jasne, mordo. Ustawiam przypomnienie.",
      eventData: {
        title: text.substring(0, 100),
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        category: 'reminder'
      }
    };
  }
  
  if (MAIL_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "SAVE_MAIL", 
      reasoning: "Keyword match: send/mail",
      answer: "Okej, mordo. Przygotowuję maila."
    };
  }
  
  if (SEARCH_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "SAVE_SEARCH", 
      reasoning: "Keyword match: search/web",
      answer: "Sprawdzam w necie, mordo."
    };
  }
  
  return { 
    action: "SAVE_ONLY", 
    reasoning: "General conversation",
    answer: "Łap, mordo. Jestem jak coś."
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
  // Używamy cleanAndParseJSON jako bezpiecznik
  const parsed = cleanAndParseJSON(raw);
  
  if (!parsed) {
    console.warn('[IntentService] cleanAndParseJSON returned null');
    return null;
  }

  try {
    const action = parsed["action"];
    const reasoning = typeof parsed["reasoning"] === "string" 
      ? parsed["reasoning"] 
      : "No reasoning provided";
    const answer = typeof parsed["answer"] === "string"
      ? parsed["answer"]
      : "Okej, mordo."; // Default fallback

    if (typeof action === "string" && VALID_ACTIONS.has(action as IntentAction)) {
      const result: IntentResult = { 
        action: action as IntentAction, 
        reasoning,
        answer
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

// ─── Main Service ────────────────────────────────────────────────────────────

/**
 * Klasyfikuje intencję z dostępem do rekurencyjnego drzewa synaps (3x3)
 * Stabilizacja: temperature 0.1, Few-Shot examples, cleanAndParseJSON
 */
export async function classifyIntent(params: ClassifyIntentParams): Promise<IntentResult> {
  const { userText, userId, chatHistory = [] } = params;
  
  console.log('[IntentService] ═══ Classifying intent ═══');
  console.log('[IntentService] User:', userId);
  console.log('[IntentService] Text:', userText);

  try {
    // 1. Pobierz kontekst mózgu (recursive 3x3)
    console.log('[IntentService] Fetching brain context (3x3 tree)...');
    const brainContext = await getBrainContext(userId, userText);
    console.log('[IntentService] Brain context retrieved:', brainContext.hasContext);

    // 2. Zbuduj System Prompt z Few-Shot
    const systemPrompt = buildJarvisSystemPrompt(
      brainContext.synapticTree,
      chatHistory
    );

    // 3. Wywołaj LLM z NISKĄ temperature (stabilizacja!)
    console.log('[IntentService] Calling LLM with temperature=0.1...');
    
    const response = await axios.post<LLMResponse>(
      LLM_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0.1, // ← KRYTYCZNE: Niska temp = mniej śmieci!
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
      },
      { timeout: LLM_TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    console.log("[IntentService] LLM raw output length:", rawContent.length);
    console.debug("[IntentService] LLM raw output:", rawContent);

    // 4. Parsuj przez cleanAndParseJSON (bezpiecznik!)
    const llmResult = parseIntentJSON(rawContent);
    
    if (llmResult) {
      console.log("[IntentService] ✓ Successfully parsed:", {
        action: llmResult.action,
        hasAnswer: !!llmResult.answer,
        answerLength: llmResult.answer?.length
      });
      return llmResult;
    }

    console.warn("[IntentService] ⚠️ LLM output not parseable → keyword fallback");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[IntentService] ❌ Error: ${message}`);
    console.warn('[IntentService] Falling back to keyword matching');
  }

  // 5. Keyword fallback (bezpieczny)
  const kwResult = keywordFallback(userText);
  console.log("[IntentService] Keyword fallback result:", kwResult.action);
  return kwResult;
}

// ─── Helper: Validate Event Data ────────────────────────────────────────────

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

  const startDate = new Date(eventData.startDate);
  if (isNaN(startDate.getTime())) {
    return { isValid: false, error: "Invalid startDate format" };
  }

  if (eventData.endDate) {
    const endDate = new Date(eventData.endDate);
    if (isNaN(endDate.getTime())) {
      return { isValid: false, error: "Invalid endDate format" };
    }
    
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
