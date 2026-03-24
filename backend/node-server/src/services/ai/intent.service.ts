import { IntentAction, IntentResult } from "./intent.types.js";
import { ILLMAdapter } from "../../adapters/llm/ILLMAdapter.js";
import { cleanAndParseJSON } from "../../utils/json.js";
import { matchRules } from "./rule-engine.js";
import { LLM, ROUTING } from "../../config/constants.js";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClassifyIntentParams {
  userText: string;
  chatHistory?: ChatMessage[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(userText: string, chatHistory?: ChatMessage[]): string {
  let history = '';
  if (chatHistory && chatHistory.length > 0) {
    history = '\nCONVERSATION:\n';
    chatHistory.slice(-3).forEach(msg => {
      history += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    });
  }

  return `### ROLE
You are a deterministic routing engine. Return ONLY JSON.

### ACTIONS
- "RESEARCH_BRAIN": user asks a question about past notes, memory, or stored knowledge
- "SAVE_ONLY": user states a fact, shares info, or wants to store something

### JSON STRUCTURE
{
  "action": "RESEARCH_BRAIN" | "SAVE_ONLY",
  "confidence": <integer 0-100>,
  "reasoning": "one short sentence"
}${history}

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
    confidence,
    source: "llm",
  };
}

// ─── Hybrid Routing ───────────────────────────────────────────────────────────

export async function classifyIntent(
  params: ClassifyIntentParams,
  llm: ILLMAdapter,
): Promise<IntentResult> {
  const { userText, chatHistory = [] } = params;

  // Step 1: Rule engine — high confidence rules skip LLM entirely
  const ruleMatch = matchRules(userText);
  if (ruleMatch && ruleMatch.confidence >= ROUTING.RULE_HIGH_CONFIDENCE) {
    return {
      action: ruleMatch.action,
      reasoning: ruleMatch.reasoning,
      confidence: ruleMatch.confidence,
      source: "rule",
    };
  }

  // Step 2: LLM classification
  try {
    const prompt = buildPrompt(userText, chatHistory);

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

    // Step 4: LLM uncertain — prefer rule match
    if (ruleMatch) {
      return {
        action: ruleMatch.action,
        reasoning: `Rule fallback (LLM confidence: ${llmResult?.confidence ?? 0}): ${ruleMatch.reasoning}`,
        confidence: ruleMatch.confidence,
        source: "rule",
      };
    }

    // Step 5: Take LLM result even if low confidence
    if (llmResult) return llmResult;

  } catch (err) {
    console.error(`[IntentService] Error:`, err instanceof Error ? err.message : String(err));
  }

  // Step 6: Default fallback
  return {
    action: "SAVE_ONLY",
    reasoning: "Fallback",
    confidence: 0,
    source: "fallback",
  };
}
