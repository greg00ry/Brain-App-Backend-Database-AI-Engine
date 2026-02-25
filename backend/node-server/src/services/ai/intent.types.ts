// ═══════════════════════════════════════════════════════════════════════════════
// INTENT TYPES - Extended with Calendar Support
// ═══════════════════════════════════════════════════════════════════════════════

export type IntentAction = 
  | "SAVE_ONLY"       // Tylko zapis, bez akcji
  | "SAVE_SEARCH"     // Research w internecie
  | "SAVE_MAIL"       // Wysłanie emaila
  | "CREATE_EVENT";   // Utworzenie wydarzenia w kalendarzu (NEW!)

export interface IntentResult {
  action: IntentAction;
  reasoning: string;
  answer: string;
  
  // ─── Event Data (tylko dla CREATE_EVENT) ────────────────────────────────────
  eventData?: {
    title: string;
    description?: string;
    startDate: string;      // ISO 8601 format (np. "2024-12-25T10:00:00Z")
    endDate?: string;       // ISO 8601 format (opcjonalnie)
    category: 'work' | 'health' | 'personal' | 'meeting' | 'reminder' | 'other';
  };
  
  // ─── Email Data (tylko dla SAVE_MAIL) ───────────────────────────────────────
  emailData?: {
    recipient?: string;     // Jeśli wykryty w tekście
    subject?: string;       // Sugerowany temat
  };
}

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
