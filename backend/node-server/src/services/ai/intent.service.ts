import { IntentAction, IntentResult } from "./intent.types.js";
import { llmAdapter, cleanAndParseJSON } from "./ai.service.js";
import { getBrainContext } from "./intent.context.service.js";
import { LLM, CHAT, MEMORY } from "../../config/constants.js";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClassifyIntentParams {
  userText: string;
  userId: string;
  chatHistory?: ChatMessage[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(
  userText: string,
  brainContext: string,
  chatHistory?: ChatMessage[]
): string {
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-CHAT.HISTORY_RECENT_FOR_PROMPT);
    history = '\nCONVERSATION:\n';
    recent.forEach(msg => {
      history += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    });
  }

  const context = brainContext !== '💭 Brak relevantnych wspomnień w bazie danych.\n'
    ? `\nMEMORY:\n${brainContext.substring(0, MEMORY.BRAIN_CONTEXT_MAX_CHARS)}\n`
    : '';

  return `### ROLE
You are a deterministic routing engine for a Cognitive Agent.
Return ONLY JSON. No conversation, no explanations.

### PRIORITY RULES
1. IF input asks about AI, past notes, projects, or memory -> "action": "RESEARCH_BRAIN".
2. DEFAULT -> "action": "SAVE_ONLY".

### JSON STRUCTURE
{
  "action": "RESEARCH_BRAIN" | "SAVE_ONLY",
  "reasoning": "short explanation",
  "answer": "Short response in Polish, mordo"
}

### CRITICAL
- DO NOT default to SAVE_ONLY if keywords like 'AI', 'notatki', or 'pamięć' are present.
- Polish response must ALWAYS include the word 'mordo'.${history}${context}

USER: ${userText}`;
}

// ─── Keyword Fallback ─────────────────────────────────────────────────────────

function keywordFallback(text: string): IntentResult | null {
  const lower = text.toLowerCase();

  const brainKeywords = ['notatki', 'mówiłeś', 'pamięć', 'projekt', 'wspominałeś', 'wiedza'];
  if (brainKeywords.some(key => lower.includes(key))) {
    return {
      action: "RESEARCH_BRAIN",
      reasoning: "Keyword match",
      answer: "Już szperam w mojej pamięci, mordo.",
    };
  }

  return null;
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set<IntentAction>(["SAVE_ONLY", "RESEARCH_BRAIN"]);

function parseIntentJSON(raw: string): IntentResult | null {
  const parsed = cleanAndParseJSON(raw);
  if (!parsed) return null;

  const action = parsed["action"];
  const reasoning = parsed["reasoning"] || "no reason";
  const answer = parsed["answer"] || "Okej, mordo.";

  if (typeof action === "string" && VALID_ACTIONS.has(action as IntentAction)) {
    return { action: action as IntentAction, reasoning, answer };
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function classifyIntent(params: ClassifyIntentParams): Promise<IntentResult> {
  const { userText, userId, chatHistory = [] } = params;

  const quickResult = keywordFallback(userText);
  if (quickResult !== null) return quickResult;

  try {
    const { synapticTree } = await getBrainContext(userId, userText);
    const prompt = buildPrompt(userText, synapticTree, chatHistory);

    const rawContent = await llmAdapter.complete({
      userPrompt: prompt,
      temperature: LLM.INTENT_TEMPERATURE,
      maxTokens: LLM.INTENT_MAX_TOKENS,
    });

    const llmResult = rawContent ? parseIntentJSON(rawContent) : null;
    if (llmResult) return llmResult;
  } catch (err) {
    console.error(`[IntentService] Error:`, err instanceof Error ? err.message : String(err));
  }

  return { action: "SAVE_ONLY", reasoning: "Fallback", answer: "Okej mordo." };
}
