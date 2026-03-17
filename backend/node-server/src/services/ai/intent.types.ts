export type IntentAction =
  | "SAVE_ONLY"        // Save to vault, no action
  | "RESEARCH_BRAIN";  // Query internal memory

export interface IntentResult {
  action: IntentAction;
  reasoning: string;
  answer: string;
}
