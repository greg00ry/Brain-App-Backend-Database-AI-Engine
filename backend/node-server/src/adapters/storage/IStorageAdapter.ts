import mongoose from "mongoose";
import { IVaultEntry } from "../../models/VaultEntry.js";
import { ILongTermMemory } from "../../models/LongTermMemory.js";
import { ICategory } from "../../models/Category.js";
import { TopicAnalysis, LongTermMemoryData } from "../../types/brain.js";

export interface CategoryInfo {
  name: string;
  description: string;
  keywords: string[];
}

export interface EntryAnalysisData {
  summary: string;
  tags: string[];
  strength: number;
  category: string;
  isProcessed: boolean;
}

export interface IStorageAdapter {
  // ─── Entry CRUD ───────────────────────────────────────────────────────────
  createEntry(userId: string, rawText: string, analysis: EntryAnalysisData): Promise<IVaultEntry>;
  getEntryById(entryId: string): Promise<IVaultEntry | null>;

  // ─── Vault ────────────────────────────────────────────────────────────────
  getVaultData(userId: string): Promise<{
    entries: IVaultEntry[];
    memories: ILongTermMemory[];
    categories: ICategory[];
  }>;
  deleteVaultEntry(entryId: string, userId: string): Promise<IVaultEntry | null>;

  // ─── Shared ───────────────────────────────────────────────────────────────
  getCategories(): Promise<CategoryInfo[]>;
  getUniqueUserIds(): Promise<string[]>;

  // ─── Intent Context ───────────────────────────────────────────────────────
  findRelevantEntries(userId: string, keywords: string[]): Promise<IVaultEntry[]>;
  findSimilarEntries(userId: string, embedding: number[], topK?: number): Promise<IVaultEntry[]>;
  updateEntryEmbedding(entryId: string, embedding: number[]): Promise<void>;

  // ─── Conscious Processor ──────────────────────────────────────────────────
  findDeltaEntries(userId: string, since: Date): Promise<IVaultEntry[]>;
  findContextEntries(userId: string, excludeIds: string[]): Promise<IVaultEntry[]>;
  applyTopicAnalysis(topic: TopicAnalysis): Promise<number>;
  findStrongEntries(userId: string): Promise<IVaultEntry[]>;
  upsertLTM(
    userId: string,
    topic: string,
    category: string,
    memoryData: LongTermMemoryData,
    entries: IVaultEntry[]
  ): Promise<void>;
  markConsolidated(entries: IVaultEntry[]): Promise<void>;

  // ─── Subconscious Routine ─────────────────────────────────────────────────
  getConsolidatedEntryIds(): Promise<string[]>;
  findEntriesToDecay(since: Date): Promise<IVaultEntry[]>;
  decayEntries(entryIds: mongoose.Types.ObjectId[]): Promise<number>;
  pruneDeadEntries(): Promise<number>;
  pruneDeadSynapses(): Promise<number>;
  findEntriesReadyForLTM(): Promise<IVaultEntry[]>;
  countEntries(): Promise<number>;
}
