// ═══════════════════════════════════════════════════════════════════════════════
// INTENT TYPES - Extended with Calendar Support
// ═══════════════════════════════════════════════════════════════════════════════

export type IntentAction = 
  | "SAVE_ONLY"       // Tylko zapis, bez akcji
  | "SAVE_SEARCH"     // Research w internecie (Google/Tavily)
  | "RESEARCH_BRAIN"  // Research w własnej bazie MongoDB (NEW!)
  | "SAVE_MAIL"       // Wysłanie emaila
  | "CREATE_EVENT";   // Utworzenie wydarzenia w kalendarzu

export interface IntentResult {
  action: IntentAction;
  reasoning: string;
  answer: string;  // ← NOWE: Naturalna odpowiedź Jarvisa do użytkownika
  
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
    body?: string;          // Treść emaila wygenerowana przez AI (NEW!)
  };
}

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
