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

// ─── Entry Creation ───────────────────────────────────────────────────────────

export interface EntryAnalysisData {
  summary: string;
  tags: string[];
  strength: number;
  category: string;
  isProcessed: boolean;
}

// ─── Action Tools ─────────────────────────────────────────────────────────────

export type ActionTool = 'search' | 'email' | 'calendar';
export type ActionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SearchResultData {
  facts: string[];
  searchResults: string;
  sources: string[];
  uiHint: string;
}

export interface EmailResultData {
  sent: boolean;
  recipient: string;
  messageId?: string;
  uiHint: string;
}

export interface CalendarResultData {
  eventId: mongoose.Types.ObjectId;
  eventTitle: string;
  eventDate: Date;
  uiHint: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IStorageAdapter {
  // ─── Entry CRUD ───────────────────────────────────────────────────────────
  createEntry(userId: string, rawText: string, analysis: EntryAnalysisData): Promise<IVaultEntry>;
  getEntryById(entryId: string): Promise<IVaultEntry | null>;
  getEntriesWithActionTools(userId: string): Promise<IVaultEntry[]>;

  // ─── Vault Controller ─────────────────────────────────────────────────────
  getVaultData(userId: string | mongoose.Types.ObjectId): Promise<{
    entries: IVaultEntry[];
    memories: ILongTermMemory[];
    categories: ICategory[];
  }>;
  deleteVaultEntry(entryId: string, userId: string | mongoose.Types.ObjectId): Promise<IVaultEntry | null>;

  // ─── Action Tools ─────────────────────────────────────────────────────────
  updateEntryActionStatus(entryId: string, tool: ActionTool, status: ActionStatus): Promise<void>;
  updateEntrySearchResult(entryId: string, data: SearchResultData): Promise<void>;
  updateEntryEmailResult(entryId: string, data: EmailResultData): Promise<void>;
  updateEntryCalendarResult(entryId: string, data: CalendarResultData): Promise<void>;
  updateEntryActionError(entryId: string, tool: ActionTool, data: { error: string; uiHint: string }): Promise<void>;
  /** Returns search action result for SSE polling. Null if entry not found. */
  pollEntrySearchResult(entryId: string): Promise<{ completed: boolean; facts?: string[]; sources?: string[] } | null>;

  // ─── Shared ───────────────────────────────────────────────────────────────
  getCategories(): Promise<CategoryInfo[]>;
  getUniqueUserIds(): Promise<mongoose.Types.ObjectId[]>;

  // ─── Intent Context ───────────────────────────────────────────────────────
  /** Full-text + tag search for intent context retrieval. Returns top N entries by strength. */
  findRelevantEntries(userId: string | mongoose.Types.ObjectId, keywords: string[]): Promise<IVaultEntry[]>;

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
