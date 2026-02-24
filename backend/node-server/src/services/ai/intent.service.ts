import axios from "axios";
import { IntentAction, IntentResult, LLMResponse } from "./intent.types.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const LLM_API_URL = process.env.LLM_API_URL ?? "http://localhost:1234/v1/chat/completions";
const LLM_MODEL   = process.env.LLM_MODEL   ?? "local-model";
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT ?? 15_000);

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an intent classification engine.
Analyse the user message and respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

Rules:
- If the user wants to search the web, fetch online data, check current info → action = "SAVE_SEARCH"
- If the user wants to send an e-mail, message or notification → action = "SAVE_MAIL"
- Otherwise → action = "SAVE_ONLY"

Required output format (strict JSON, nothing else):
{"action":"SAVE_ONLY"|"SAVE_SEARCH"|"SAVE_MAIL","reasoning":"short explanation in the user's language"}`;
}

// ─── Keyword fallback ─────────────────────────────────────────────────────────

const SEARCH_KEYWORDS = [
  /wyszukaj/i, /znajdź w sieci/i, /sprawdź online/i, /pobierz dane/i,
  /aktualne informacje/i, /szukaj/i,
  /search/i, /look up/i, /find online/i, /web search/i, /fetch data/i,
];

const MAIL_KEYWORDS = [
  /wyślij (e-?mail|wiadomość|mail)/i, /prześlij mailem/i, /napisz (do|mail)/i,
  /send (an? )?(e-?mail|message|mail)/i, /email (this|that|to)/i,
];

function keywordFallback(text: string): IntentResult {
  if (MAIL_KEYWORDS.some((re) => re.test(text))) {
    return { action: "SAVE_MAIL", reasoning: "Keyword match: send/mail detected" };
  }
  if (SEARCH_KEYWORDS.some((re) => re.test(text))) {
    return { action: "SAVE_SEARCH", reasoning: "Keyword match: search/web detected" };
  }
  return { action: "SAVE_ONLY", reasoning: "No matching keywords — defaulting to SAVE_ONLY" };
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set<IntentAction>(["SAVE_ONLY", "SAVE_SEARCH", "SAVE_MAIL"]);

function parseIntentJSON(raw: string): IntentResult | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const action = parsed["action"];
    const reasoning =
      typeof parsed["reasoning"] === "string"
        ? parsed["reasoning"]
        : "No reasoning provided";

    if (typeof action === "string" && VALID_ACTIONS.has(action as IntentAction)) {
      return { action: action as IntentAction, reasoning };
    }
  } catch {
    // JSON.parse failed — fall through to return null
  }

  return null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Klasyfikuje intencję użytkownika przez LM Studio.
 * Fallback: keyword matching → SAVE_ONLY.
 */
export async function classifyIntent(userText: string): Promise<IntentResult> {
  // 1. Próba przez LM Studio
  try {
    const response = await axios.post<LLMResponse>(
      LLM_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0,
        max_tokens: 120,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user",   content: userText },
        ],
      },
      { timeout: LLM_TIMEOUT }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content ?? "";
    console.debug("[IntentService] LM Studio raw output:", rawContent);

    const llmResult = parseIntentJSON(rawContent);
    if (llmResult) return llmResult;

    console.warn("[IntentService] Nieparseable JSON od LLM — keyword fallback");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[IntentService] Błąd LM Studio (${LLM_API_URL}): ${message} — keyword fallback`);
  }

  // 2. Keyword fallback
  const kwResult = keywordFallback(userText);
  console.debug("[IntentService] Keyword fallback:", kwResult);
  return kwResult;
}
