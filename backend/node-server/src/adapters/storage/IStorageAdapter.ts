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
  getVaultData(userId: string | mongoose.Types.ObjectId): Promise<{
    entries: IVaultEntry[];
    memories: ILongTermMemory[];
    categories: ICategory[];
  }>;
  deleteVaultEntry(entryId: string, userId: string | mongoose.Types.ObjectId): Promise<IVaultEntry | null>;

  // ─── Shared ───────────────────────────────────────────────────────────────
  getCategories(): Promise<CategoryInfo[]>;
  getUniqueUserIds(): Promise<mongoose.Types.ObjectId[]>;

  // ─── Intent Context ───────────────────────────────────────────────────────
  findRelevantEntries(userId: string | mongoose.Types.ObjectId, keywords: string[]): Promise<IVaultEntry[]>;

  // ─── Conscious Processor ──────────────────────────────────────────────────
  findDeltaEntries(userId: mongoose.Types.ObjectId, since: Date): Promise<IVaultEntry[]>;
  findContextEntries(userId: mongoose.Types.ObjectId, excludeIds: string[]): Promise<IVaultEntry[]>;
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

  // ─── Subconscious Routine ─────────────────────────────────────────────────
  getConsolidatedEntryIds(): Promise<string[]>;
  findEntriesToDecay(since: Date): Promise<IVaultEntry[]>;
  decayEntries(entryIds: mongoose.Types.ObjectId[]): Promise<number>;
  pruneDeadEntries(): Promise<number>;
  pruneDeadSynapses(): Promise<number>;
  findEntriesReadyForLTM(): Promise<IVaultEntry[]>;
  countEntries(): Promise<number>;
}
