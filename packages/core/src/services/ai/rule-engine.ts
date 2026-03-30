
// ═══════════════════════════════════════════════════════════════════════════════
// RULE ENGINE - Deterministic intent matching (Polish + English)
// High-confidence rules skip LLM entirely. Low-confidence rules act as fallback.
// ═══════════════════════════════════════════════════════════════════════════════

export interface RuleMatch {
  action: string;
  confidence: number;
  reasoning: string;
}

interface Rule {
  patterns: RegExp[];
  action: string;
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

  // ─── SAVE_ONLY — declarative statements (high confidence signals) ─────────
  {
    patterns: [
      /\bi\s+prefer\b/i,
      /\bi\s+like\b/i,
      /\bi\s+hate\b/i,
      /\bi\s+love\b/i,
      /\bi\s+always\b/i,
      /\bi\s+never\b/i,
      /\bi\s+work\s+best\b/i,
      /^my\s+goal\b/i,
      /^my\s+goals?\s+for\b/i,
      /\bi\s+think\s+that\b/i,
      /\bi\s+believe\b/i,
      /\bi\s+learned\b/i,
      /\bi\s+realized\b/i,
      /\bi\s+(don't|do\s+not)\s+(like|enjoy|use)\b/i,
    ],
    action: "SAVE_ONLY",
    confidence: 85,
    reasoning: "Declarative personal statement",
  },
  {
    patterns: [
      /\bwolę\b/i,
      /\blubię\b/i,
      /\bnienawidzę\b/i,
      /\bmoim\s+celem\b/i,
      /\bmój\s+cel\b/i,
      /\buważam,?\s+że\b/i,
      /\bstwierdziłem\b/i,
      /\bnauczyłem\s+się\b/i,
      /\bpracuję\s+najlepiej\b/i,
      /\bzauważyłem\b/i,
    ],
    action: "SAVE_ONLY",
    confidence: 85,
    reasoning: "Declarative personal statement (Polish)",
  },
];

const QUESTION_PATTERN = /^\s*(when|what|where|who|how|why|did|do|does|can|could|would|should|is|are|have|had|kiedy|co|gdzie|kto|jak|dlaczego|czy)\b|\?$/i;

export function matchRules(text: string): RuleMatch | null {
  const isQuestion = QUESTION_PATTERN.test(text);

  for (const rule of RULES) {
    // Skip declarative save rules if input looks like a question
    if (isQuestion && rule.action === "SAVE_ONLY" && rule.confidence < 95) {
      continue;
    }
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
