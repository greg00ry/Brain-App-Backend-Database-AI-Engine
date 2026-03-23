import { IntentAction } from "./intent.types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// RULE ENGINE - Deterministic intent matching (Polish + English)
// High-confidence rules skip LLM entirely. Low-confidence rules act as fallback.
// ═══════════════════════════════════════════════════════════════════════════════

export interface RuleMatch {
  action: IntentAction;
  confidence: number;
  reasoning: string;
}

interface Rule {
  patterns: RegExp[];
  action: IntentAction;
  confidence: number;
  reasoning: string;
}

const RULES: Rule[] = [
  // ─── RESEARCH_BRAIN — explicit memory search ─────────────────────────────
  {
    patterns: [
      /co\s+wiem\s+o/i,
      /what\s+do\s+i\s+know\s+(about|on)/i,
      /szukaj\s+(w\s+)?(pamięci|notatk)/i,
      /przeszukaj\s+pamięć/i,
      /search\s+(my\s+)?(memory|notes|brain)/i,
    ],
    action: "RESEARCH_BRAIN",
    confidence: 95,
    reasoning: "Explicit memory search",
  },
  {
    patterns: [
      /czy\s+(wspominałem|mówiłem|pisałem|notowałem)/i,
      /did\s+i\s+(mention|say|write|note)/i,
      /przypomnij\s+mi/i,
      /remind\s+me/i,
      /co\s+(mówiłem|pisałem|notowałem)\s+o/i,
    ],
    action: "RESEARCH_BRAIN",
    confidence: 92,
    reasoning: "Recall from memory",
  },
  {
    patterns: [
      /jakie\s+(mam\s+)?(notatki|informacje|dane)\s+(o|na\s+temat)/i,
      /what\s+(notes|info|data)\s+do\s+i\s+have/i,
      /powiedz\s+mi\s+co\s+wiem/i,
      /tell\s+me\s+what\s+i\s+know/i,
    ],
    action: "RESEARCH_BRAIN",
    confidence: 90,
    reasoning: "Knowledge retrieval",
  },
  {
    // Soft signals — question words + memory keywords
    patterns: [
      /\b(notatki|pamięć|wspomnienia|wiedza|notes|memory)\b.*\?/i,
      /\?(.*)\b(notatki|pamięć|wspomnienia|wiedza|notes|memory)\b/i,
    ],
    action: "RESEARCH_BRAIN",
    confidence: 78,
    reasoning: "Question with memory keywords",
  },

  // ─── SAVE_ONLY — explicit save commands ──────────────────────────────────
  {
    patterns: [
      /^zapamiętaj[,:\s]/i,
      /^zapisz[,:\s]/i,
      /^zanotuj[,:\s]/i,
      /^save[,:\s]/i,
      /^remember[,:\s]/i,
      /^note[,:\s]/i,
    ],
    action: "SAVE_ONLY",
    confidence: 95,
    reasoning: "Explicit save command",
  },
];

export function matchRules(text: string): RuleMatch | null {
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      return {
        action: rule.action,
        confidence: rule.confidence,
        reasoning: rule.reasoning,
      };
    }
  }
  return null;
}
