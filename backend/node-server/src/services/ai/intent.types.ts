export type IntentAction = "SAVE_ONLY" | "SAVE_SEARCH" | "SAVE_MAIL";

export interface IntentResult {
  action: IntentAction;
  reasoning: string;
}

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
