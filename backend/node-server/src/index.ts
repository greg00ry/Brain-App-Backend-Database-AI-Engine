// ═══════════════════════════════════════════════════════════════════════════════
// @the-brain/core — Public API
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Core ─────────────────────────────────────────────────────────────────────

export { Brain } from "./core/Brain.js";

// ─── Adapter Interfaces ───────────────────────────────────────────────────────

export type { ILLMAdapter, LLMRequest } from "./adapters/llm/ILLMAdapter.js";
export type { IStorageAdapter, CategoryInfo, EntryAnalysisData } from "./adapters/storage/IStorageAdapter.js";
export type { IEmbeddingAdapter } from "./adapters/embedding/IEmbeddingAdapter.js";

// ─── Adapter Implementations ──────────────────────────────────────────────────

export { OpenAIAPIAdapter } from "./adapters/llm/OpenAIAPIAdapter.js";
export { MongoStorageAdapter } from "./adapters/storage/MongoStorageAdapter.js";
export { OpenAIAPIEmbeddingAdapter } from "./adapters/embedding/OpenAIAPIEmbeddingAdapter.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { IntentResult, IntentSource } from "./services/ai/intent.types.js";
export type { AIAnalysis } from "./services/ai/analyze.service.js";
export type { ConsciousStats } from "./services/brain/conscious.processor.js";
export type { SubconsciousStats } from "./services/brain/subconscious.routine.js";
export type { TopicAnalysis, LongTermMemoryData } from "./types/brain.js";

// ─── DB ───────────────────────────────────────────────────────────────────────

export { connectDB } from "./config/db.js";
