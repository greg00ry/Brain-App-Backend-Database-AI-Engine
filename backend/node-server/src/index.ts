// ═══════════════════════════════════════════════════════════════════════════════
// @the-brain/core — Public API
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Core ─────────────────────────────────────────────────────────────────────

export { Brain } from "./core/Brain.js";

// ─── Adapter Interfaces ───────────────────────────────────────────────────────

export type { ILLMAdapter, LLMRequest } from "./adapters/llm/ILLMAdapter.js";
export type { IStorageAdapter, CategoryInfo, EntryAnalysisData } from "./adapters/storage/IStorageAdapter.js";

// ─── Adapter Implementations ──────────────────────────────────────────────────

export { LocalLLMAdapter } from "./adapters/llm/LocalLLMAdapter.js";
export { OpenAIAdapter } from "./adapters/llm/OpenAIAdapter.js";
export { MongoStorageAdapter } from "./adapters/storage/MongoStorageAdapter.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { IntentAction, IntentResult, IntentSource } from "./services/ai/intent.types.js";
export type { AIAnalysis } from "./services/ai/analyze.service.js";
export type { ConsciousStats } from "./services/brain/conscious.processor.js";
export type { SubconsciousStats } from "./services/brain/subconscious.routine.js";
export type { TopicAnalysis, LongTermMemoryData } from "./types/brain.js";

// ─── DB ───────────────────────────────────────────────────────────────────────

export { connectDB } from "./config/db.js";
