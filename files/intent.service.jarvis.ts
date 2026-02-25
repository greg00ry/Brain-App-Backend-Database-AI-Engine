import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";
import { cleanAndParseJSON } from "./ai.service.js";
import { getConversationContext } from "./intent.context.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION SERVICE - Jarvis Edition with Memory Access
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
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT ?? 25_000); // Zwiększony timeout

// ─── System Prompt (Jarvis Personality) ─────────────────────────────────────

function buildJarvisSystemPrompt(
  memoryContext: string,
  chatHistory?: ChatMessage[]
): string {
  // Historia rozmowy (ostatnie 5 wiadomości)
  let historySection = '';
  if (chatHistory && chatHistory.length > 0) {
    historySection = '\n\n═══ HISTORIA ROZMOWY ═══\n';
    const recentHistory = chatHistory.slice(-5); // Ostatnie 5 wiadomości
    recentHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'Sir' : 'Jarvis';
      historySection += `${role}: ${msg.content}\n`;
    });
    historySection += '═══════════════════════════\n';
  }

  return `You are JARVIS - an advanced AI assistant serving your user (referred to as "sir").

PERSONALITY & STYLE:
- Konkretny, pragmatyczny, pomocny
- Używaj zwrotów: "sir", "dobrze, sir", "zrobione, sir", "oczywiście, sir"
- Mów w pierwszej osobie: "Sprawdzam, sir", "Wykonuję zadanie, sir"
- Język: POLSKI (z wyjątkiem zwrotów jak "sir")
- Ton: profesjonalny, ale ciepły - jak Alfred dla Bruce'a Wayne'a

CURRENT DATE & TIME: ${new Date().toISOString()}

${historySection}

═══ DOSTĘPNA PAMIĘĆ I WIEDZA ═══
${memoryContext}

CRITICAL: Respond with ONLY valid JSON - no markdown, no backticks, no extra text.

Required JSON format:
{
  "action": "SAVE_ONLY" | "SAVE_SEARCH" | "SAVE_MAIL" | "CREATE_EVENT",
  "reasoning": "short technical explanation in Polish",
  "answer": "natural conversational response to user in JARVIS style",
  "eventData": { ... }  // ONLY if action is CREATE_EVENT
  "emailData": { ... }  // ONLY if action is SAVE_MAIL
}

RULES FOR CLASSIFICATION:
1. CREATE_EVENT → user mentions DATE/TIME or asks for REMINDER/APPOINTMENT
   - Extract: title, description, startDate (ISO 8601), endDate (optional), category
   - Categories: work, health, personal, meeting, reminder, other
   - Answer example: "Oczywiście, sir. Ustawiam przypomnienie na jutro o 10:00. Powiadomię pana odpowiednio wcześniej."

2. SAVE_MAIL → user wants to send EMAIL/MESSAGE
   - Try to extract recipient email from text
   - Answer example: "Dobrze, sir. Wysyłam wiadomość do john@example.com. Potwierdzę gdy będzie wysłana."

3. SAVE_SEARCH → user wants WEB SEARCH or CURRENT INFO
   - Answer example: "Sprawdzam w internecie, sir. Zajmie mi to chwilę."

4. SAVE_ONLY → general conversation, notes, thoughts
   - Use this for questions, greetings, casual talk
   - Answer should be HELPFUL and CONVERSATIONAL
   - Use memory context to provide informed responses
   - Answer example: "Rozumiem, sir. Zapamiętałem to."

JARVIS ANSWER GUIDELINES:
- Always acknowledge the request with "sir"
- Reference memory when relevant: "Pamiętam, że sir wspominał o..."
- Be proactive: suggest related actions or information
- If memory is empty, still be helpful but don't pretend to remember
- Keep answers concise but warm (2-4 sentences max)
- Use memory synapses to make connections: "To powiązane z pana wcześniejszym projektem o..."

EXAMPLES OF GOOD JARVIS ANSWERS:

User: "Jak się masz?"
Answer: "Wszystkie systemy działają poprawnie, sir. Gotowy do pomocy."

User: "Co robiłem wczoraj?"
Answer: "Według moich danych, sir wczoraj pracował nad projektem AI. Czy chce pan więcej szczegółów?"

User: "Przypomnij mi jutro o spotkaniu"
Answer: "Oczywiście, sir. Ustawiam przypomnienie na jutro o godzinie, którą sir preferuje. Powiadomię pana z wyprzedzeniem."

User: "Znajdź info o nowych technologiach AI"
Answer: "Zaraz sprawdzam najnowsze informacje, sir. Przeanalizuję aktualne źródła i przedstawię podsumowanie."

DATE PARSING EXAMPLES (for CREATE_EVENT):
- "jutro o 10" → tomorrow at 10:00
- "w piątek" → next Friday at 09:00
- "za tydzień" → 7 days from now
- "15 grudnia" → December 15th this year
- "za 2 godziny" → 2 hours from now

REMEMBER: 
- JSON only, no extra text
- "answer" field is WHERE JARVIS TALKS to the user
- Use memory context to personalize responses
- Be helpful even when memory is empty`;
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
  // Event ma najwyższy priorytet
  if (EVENT_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "CREATE_EVENT", 
      reasoning: "Keyword match: date/reminder detected",
      answer: "Oczywiście, sir. Ustawiam przypomnienie. Powiadomię pana o czasie.",
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
      reasoning: "Keyword match: send/mail detected",
      answer: "Dobrze, sir. Przygotowuję wiadomość do wysłania."
    };
  }
  
  if (SEARCH_KEYWORDS.some((re) => re.test(text))) {
    return { 
      action: "SAVE_SEARCH", 
      reasoning: "Keyword match: search/web detected",
      answer: "Sprawdzam w internecie, sir. Zajmie mi to chwilę."
    };
  }
  
  return { 
    action: "SAVE_ONLY", 
    reasoning: "No matching keywords — general conversation",
    answer: "Rozumiem, sir. Jestem do dyspozycji jeśli będzie pan czegoś potrzebował."
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
  const parsed = cleanAndParseJSON(raw);
  
  if (!parsed) return null;

  try {
    const action = parsed["action"];
    const reasoning = typeof parsed["reasoning"] === "string" 
      ? parsed["reasoning"] 
      : "No reasoning provided";
    const answer = typeof parsed["answer"] === "string"
      ? parsed["answer"]
      : "Dobrze, sir."; // Default Jarvis response

    if (typeof action === "string" && VALID_ACTIONS.has(action as IntentAction)) {
      const result: IntentResult = { 
        action: action as IntentAction, 
        reasoning,
        answer // ← NOWE POLE!
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

// ─── Main Service Function ───────────────────────────────────────────────────

/**
 * Klasyfikuje intencję użytkownika przez LLM z dostępem do pamięci
 * Jarvis Edition - z naturalną konwersacją
 */
export async function classifyIntent(params: ClassifyIntentParams): Promise<IntentResult> {
  const { userText, userId, chatHistory = [] } = params;
  
  console.log('[IntentService] Classifying intent for user:', userId);

  try {
    // 1. Pobierz kontekst z pamięci
    const memoryContext = await getConversationContext(userId, userText);
    console.log('[IntentService] Memory context retrieved:', memoryContext.hasContext);

    // 2. Zbuduj System Prompt z pamięcią i historią
    const systemPrompt = buildJarvisSystemPrompt(
      memoryContext.formattedContext,
      chatHistory
    );

    // 3. Przygotuj wiadomości dla LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      // Dodaj historię rozmowy (już jest w system prompt jako kontekst)
      { role: 'user', content: userText },
    ];

    // 4. Wywołaj LLM
    const response = await axios.post<LLMResponse>(
      LLM_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0.3, // Lekko kreatywny dla naturalnej konwersacji
        max_tokens: 500,  // Więcej dla "answer" field
        messages,
      },
      { timeout: LLM_TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    console.debug("[IntentService] LLM raw output:", rawContent);

    // 5. Parsuj odpowiedź
    const llmResult = parseIntentJSON(rawContent);
    if (llmResult) {
      console.log("[IntentService] ✓ LLM result:", {
        action: llmResult.action,
        hasAnswer: !!llmResult.answer
      });
      return llmResult;
    }

    console.warn("[IntentService] Nieparseable JSON od LLM — keyword fallback");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[IntentService] Błąd LLM (${LLM_API_URL}): ${message} — keyword fallback`);
  }

  // 6. Keyword fallback
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
