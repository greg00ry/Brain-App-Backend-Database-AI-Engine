// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - Single source of truth for all magic numbers
// ═══════════════════════════════════════════════════════════════════════════════

// ─── LLM ─────────────────────────────────────────────────────────────────────

export const LLM = {
  API_URL: process.env.LLM_API_URL ?? "http://localhost:1234/v1/chat/completions",
  MODEL: process.env.LLM_MODEL ?? "local-model",
  TIMEOUT: Number(process.env.LLM_TIMEOUT ?? 30_000),

  // Intent classification
  INTENT_TEMPERATURE: 0.2,
  INTENT_MAX_TOKENS: 500,

  // Brain analysis (conscious processor)
  ANALYSIS_TEMPERATURE: 0.1,
  ANALYSIS_MAX_TOKENS: 3000,

  // LTM consolidation
  LTM_TEMPERATURE: 0.3,
  LTM_MAX_TOKENS: 800,
} as const;

// ─── Brain Processing ─────────────────────────────────────────────────────────

export const BRAIN = {
  // Conscious processor
  BATCH_SIZE: 5,
  DELTA_WINDOW_MS: 24 * 60 * 60 * 1000, // 24h

  // Long-term memory
  LTM_MAX_SOURCE_ENTRIES: 10,
  LTM_INITIAL_STRENGTH: 10,

  // Strength thresholds
  STRENGTH_LTM_THRESHOLD: 10,      // entries >= this get consolidated to LTM
  STRENGTH_CONTEXT_MIN: 3,         // min strength for context entries
  STRENGTH_DECAY_PRUNE: 0,         // entries at this are pruned

  // Synapse thresholds
  SYNAPSE_PRUNE_WEIGHT: 0.1,       // synapses below this are pruned
} as const;

// ─── Memory / Retrieval ───────────────────────────────────────────────────────

export const MEMORY = {
  // Synaptic tree (intent.context.service)
  SYNAPSE_TREE_DEPTH: 3,
  SYNAPSE_BRANCH_FACTOR: 3,
  CONTEXT_TOP_ENTRIES: 3,
  RAW_TEXT_PREVIEW_LENGTH: 80,

  // Vault repo limits
  DELTA_ENTRIES_LIMIT: 50,
  CONTEXT_ENTRIES_LIMIT: 20,

  // Context prompt
  BRAIN_CONTEXT_MAX_CHARS: 400,
} as const;

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const CHAT = {
  HISTORY_LIMIT_FOR_LLM: 5,        // messages sent to LLM
  HISTORY_RECENT_FOR_PROMPT: 3,    // messages included in prompt
} as const;

// ─── Intent Controller (SSE polling) ─────────────────────────────────────────

export const SSE = {
  POLL_TIMEOUT_MS: 30_000,
  POLL_INTERVAL_MS: 1_000,
} as const;

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const MISC = {
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  EVENT_DEFAULT_OFFSET_MS: 86_400_000, // tomorrow
} as const;
