import mongoose from "mongoose";
import { IVaultEntry } from "../../models/VaultEntry.js";
import { TopicAnalysis, LongTermMemoryData } from "../../types/brain.js";

export interface CategoryInfo {
  name: string;
  description: string;
  keywords: string[];
}

export interface IStorageAdapter {
  // ─── Shared ───────────────────────────────────────────────────────────────
  getCategories(): Promise<CategoryInfo[]>;
  getUniqueUserIds(): Promise<mongoose.Types.ObjectId[]>;

  // ─── Conscious Processor ──────────────────────────────────────────────────
  findDeltaEntries(userId: mongoose.Types.ObjectId, since: Date): Promise<IVaultEntry[]>;
  findContextEntries(userId: mongoose.Types.ObjectId, excludeIds: string[]): Promise<IVaultEntry[]>;
  /** Applies topic analysis to all entryIds in the topic. Returns the count of updated entries. */
  applyTopicAnalysis(topic: TopicAnalysis): Promise<number>;
  findStrongEntries(userId: mongoose.Types.ObjectId): Promise<IVaultEntry[]>;
  upsertLTM(
    userId: mongoose.Types.ObjectId,
    topic: string,
    category: string,
    memoryData: LongTermMemoryData,
    entries: IVaultEntry[]
  ): Promise<void>;
  markConsolidated(entries: IVaultEntry[]): Promise<void>;

  // ─── Intent Context ───────────────────────────────────────────────────────
  /** Full-text + tag search for intent context retrieval. Returns top N entries by strength. */
  findRelevantEntries(userId: string | mongoose.Types.ObjectId, keywords: string[]): Promise<IVaultEntry[]>;

  // ─── Subconscious Routine ─────────────────────────────────────────────────
  getConsolidatedEntryIds(): Promise<string[]>;
  findEntriesToDecay(since: Date): Promise<IVaultEntry[]>;
  /** Decrements analysis.strength by 1 for the given entry IDs. Returns modifiedCount. */
  decayEntries(entryIds: mongoose.Types.ObjectId[]): Promise<number>;
  pruneDeadEntries(): Promise<number>;
  pruneDeadSynapses(): Promise<number>;
  findEntriesReadyForLTM(): Promise<IVaultEntry[]>;
  countEntries(): Promise<number>;
}
