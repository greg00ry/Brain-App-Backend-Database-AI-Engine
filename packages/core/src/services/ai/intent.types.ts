export type IntentSource = "rule" | "llm" | "fallback";

export interface IntentResult {
  action: string;
  reasoning: string;
  confidence: number;
  source: IntentSource;
}
