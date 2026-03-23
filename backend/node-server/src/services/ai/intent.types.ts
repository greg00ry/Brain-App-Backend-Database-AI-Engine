export type IntentAction =
  | "SAVE_ONLY"        // Save to vault, no action
  | "RESEARCH_BRAIN";  // Query internal memory

export type IntentSource = "rule" | "llm" | "fallback";

export interface IntentResult {
  action: IntentAction;
  reasoning: string;
  answer: string;
  confidence: number;   // 0–100
  source: IntentSource; // what produced this result
}
