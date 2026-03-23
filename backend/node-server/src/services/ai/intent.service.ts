import { IntentAction, IntentResult } from "./intent.types.js";
import { ILLMAdapter, cleanAndParseJSON } from "./ai.service.js";
import { getBrainContext } from "./intent.context.service.js";
import { matchRules } from "./rule-engine.js";
import { IStorageAdapter } from "../../adapters/storage/IStorageAdapter.js";
import { LLM, CHAT, MEMORY, ROUTING } from "../../config/constants.js";

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

  const context = brainContext !== '💭 Brak relevantnych wspomnień w bazie.\n'
    ? `\nMEMORY:\n${brainContext.substring(0, MEMORY.BRAIN_CONTEXT_MAX_CHARS)}\n`
    : '';

  return `### ROLE
You are a deterministic routing engine for a Cognitive Agent.
Return ONLY JSON. No conversation, no explanations.

### ACTIONS
- "RESEARCH_BRAIN": user asks about past notes, memory, projects, knowledge
- "SAVE_ONLY": user states a fact, shares info, or stores something

### JSON STRUCTURE
{
  "action": "RESEARCH_BRAIN" | "SAVE_ONLY",
  "confidence": <integer 0-100>,
  "reasoning": "one short sentence",
  "answer": "Short response in Polish, must include 'mordo'"
}

### CONFIDENCE GUIDE
- 90-100: very clear intent
- 75-89: likely correct
- 50-74: uncertain
- 0-49: just guessing${history}${context}

USER: ${userText}`;
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set<IntentAction>(["SAVE_ONLY", "RESEARCH_BRAIN"]);

function parseIntentJSON(raw: string): IntentResult | null {
  const parsed = cleanAndParseJSON(raw);
  if (!parsed) return null;

  const action = parsed["action"];
  if (typeof action !== "string" || !VALID_ACTIONS.has(action as IntentAction)) return null;

  const confidence = typeof parsed["confidence"] === "number"
    ? Math.min(100, Math.max(0, parsed["confidence"]))
    : 50;

  return {
    action: action as IntentAction,
    reasoning: parsed["reasoning"] || "no reason",
    answer: parsed["answer"] || "Okej, mordo.",
    confidence,
    source: "llm",
  };
}

// ─── Hybrid Routing ───────────────────────────────────────────────────────────

export async function classifyIntent(
  params: ClassifyIntentParams,
  llm: ILLMAdapter,
  storage: IStorageAdapter
): Promise<IntentResult> {
  const { userText, userId, chatHistory = [] } = params;

  // Step 1: Rule engine — high confidence rules skip LLM entirely
  const ruleMatch = matchRules(userText);
  if (ruleMatch && ruleMatch.confidence >= ROUTING.RULE_HIGH_CONFIDENCE) {
    return {
      action: ruleMatch.action,
      reasoning: ruleMatch.reasoning,
      answer: ruleMatch.action === "RESEARCH_BRAIN"
        ? "Już szperam w mojej pamięci, mordo."
        : "Zapisuję, mordo.",
      confidence: ruleMatch.confidence,
      source: "rule",
    };
  }

  // Step 2: LLM classification
  try {
    const { synapticTree } = await getBrainContext(userId, userText, storage);
    const prompt = buildPrompt(userText, synapticTree, chatHistory);

    const rawContent = await llm.complete({
      userPrompt: prompt,
      temperature: LLM.INTENT_TEMPERATURE,
      maxTokens: LLM.INTENT_MAX_TOKENS,
    });

    const llmResult = rawContent ? parseIntentJSON(rawContent) : null;

    // Step 3: LLM confidence high enough — trust it
    if (llmResult && llmResult.confidence >= ROUTING.LLM_MIN_CONFIDENCE) {
      return llmResult;
    }

    // Step 4: LLM uncertain — prefer rule match over low-confidence LLM
    if (ruleMatch) {
      return {
        action: ruleMatch.action,
        reasoning: `Rule fallback (LLM confidence: ${llmResult?.confidence ?? 0}): ${ruleMatch.reasoning}`,
        answer: ruleMatch.action === "RESEARCH_BRAIN"
          ? "Już szperam w mojej pamięci, mordo."
          : "Zapisuję, mordo.",
        confidence: ruleMatch.confidence,
        source: "rule",
      };
    }

    // Step 5: Take LLM result even if confidence is low
    if (llmResult) return llmResult;

  } catch (err) {
    console.error(`[IntentService] Error:`, err instanceof Error ? err.message : String(err));
  }

  // Step 6: Default fallback
  return {
    action: "SAVE_ONLY",
    reasoning: "Fallback",
    answer: "Okej, mordo.",
    confidence: 0,
    source: "fallback",
  };
}
