import * as fs from "node:fs";
import * as path from "node:path";
import type {
  IStorageAdapter,
  ActionInfo,
  CategoryInfo,
  EntryAnalysisData,
  IVaultEntry,
  ILongTermMemory,
  ICategory,
  TopicAnalysis,
  LongTermMemoryData,
} from "@the-brain/core";

// ═══════════════════════════════════════════════════════════════════════════════
// FILE STORAGE ADAPTER
// Stores data in JSON files under .brain/ directory (CWD by default).
// Trade-offs: Simple, git-friendly, portable. No embeddings, synapses, or graph.
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredVaultEntry {
  _id: string;
  userId: string;
  rawText: string;
  analysis?: {
    summary: string;
    tags: string[];
    strength: number;
    category: string;
    isProcessed: boolean;
  };
  isAnalyzed: boolean;
  isConsolidated: boolean;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredAction {
  name: string;
  description: string;
  isBuiltIn: boolean;
  isActive: boolean;
}

interface StoredChatHistory {
  userId: string;
  messages: { role: "user" | "assistant"; content: string; createdAt: string }[];
  updatedAt: string;
}

function toVaultEntry(e: StoredVaultEntry): IVaultEntry {
  return {
    _id: { toString: () => e._id },
    userId: e.userId,
    rawText: e.rawText,
    analysis: e.analysis,
    isAnalyzed: e.isAnalyzed,
    isConsolidated: e.isConsolidated,
    lastActivityAt: new Date(e.lastActivityAt),
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt),
  };
}

export class FileStorageAdapter implements IStorageAdapter {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? path.join(process.cwd(), ".brain");
    this.ensureDir();
  }

  // ─── File helpers ─────────────────────────────────────────────────────────

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private filePath(name: string): string {
    return path.join(this.dataDir, `${name}.json`);
  }

  private readJSON<T>(name: string, fallback: T): T {
    const file = this.filePath(name);
    if (!fs.existsSync(file)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
    } catch {
      return fallback;
    }
  }

  private writeJSON<T>(name: string, data: T): void {
    fs.writeFileSync(this.filePath(name), JSON.stringify(data, null, 2), "utf-8");
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ─── Entry CRUD ───────────────────────────────────────────────────────────

  async createEntry(userId: string, rawText: string, analysis: EntryAnalysisData): Promise<IVaultEntry> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    const now = new Date().toISOString();
    const entry: StoredVaultEntry = {
      _id: this.generateId(),
      userId,
      rawText,
      analysis,
      isAnalyzed: false,
      isConsolidated: false,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };
    entries.push(entry);
    this.writeJSON("vault", entries);
    return toVaultEntry(entry);
  }

  async getEntryById(entryId: string): Promise<IVaultEntry | null> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    const found = entries.find(e => e._id === entryId);
    return found ? toVaultEntry(found) : null;
  }

  // ─── Vault ────────────────────────────────────────────────────────────────

  async getVaultData(userId: string): Promise<{
    entries: IVaultEntry[];
    memories: ILongTermMemory[];
    categories: ICategory[];
  }> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e => e.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toVaultEntry);

    return { entries, memories: [], categories: [] };
  }

  async deleteVaultEntry(entryId: string, userId: string): Promise<IVaultEntry | null> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    const idx = entries.findIndex(e => e._id === entryId && e.userId === userId);
    if (idx === -1) return null;
    const [removed] = entries.splice(idx, 1);
    this.writeJSON("vault", entries);
    return toVaultEntry(removed);
  }

  // ─── Shared ───────────────────────────────────────────────────────────────

  async getCategories(): Promise<CategoryInfo[]> {
    return this.readJSON<CategoryInfo[]>("categories", []);
  }

  async getUniqueUserIds(): Promise<string[]> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    return [...new Set(entries.map(e => e.userId))];
  }

  async getActions(): Promise<ActionInfo[]> {
    const actions = this.readJSON<StoredAction[]>("actions", []);
    return actions.filter(a => a.isActive).map(a => ({ name: a.name, description: a.description }));
  }

  async upsertAction(name: string, description: string, isBuiltIn = false): Promise<void> {
    const actions = this.readJSON<StoredAction[]>("actions", []);
    const idx = actions.findIndex(a => a.name === name);
    if (idx !== -1) {
      actions[idx] = { name, description, isBuiltIn, isActive: true };
    } else {
      actions.push({ name, description, isBuiltIn, isActive: true });
    }
    this.writeJSON("actions", actions);
  }

  // ─── Chat History ─────────────────────────────────────────────────────────

  async getChatHistory(userId: string): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const histories = this.readJSON<StoredChatHistory[]>("chat-history", []);
    const hist = histories.find(h => h.userId === userId);
    if (!hist) return [];
    return hist.messages.map(m => ({ role: m.role, content: m.content }));
  }

  async appendChatMessage(userId: string, role: "user" | "assistant", content: string, maxMessages: number): Promise<void> {
    const histories = this.readJSON<StoredChatHistory[]>("chat-history", []);
    let hist = histories.find(h => h.userId === userId);
    if (!hist) {
      hist = { userId, messages: [], updatedAt: new Date().toISOString() };
      histories.push(hist);
    }
    hist.messages.push({ role, content, createdAt: new Date().toISOString() });
    if (hist.messages.length > maxMessages) {
      hist.messages = hist.messages.slice(-maxMessages);
    }
    hist.updatedAt = new Date().toISOString();
    this.writeJSON("chat-history", histories);
  }

  // ─── Intent Context ───────────────────────────────────────────────────────

  async findRelevantEntries(userId: string, keywords: string[]): Promise<IVaultEntry[]> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e => {
        if (e.userId !== userId) return false;
        const haystack = [
          e.rawText,
          e.analysis?.summary ?? "",
          ...(e.analysis?.tags ?? []),
        ].join(" ").toLowerCase();
        return keywords.some(kw => haystack.includes(kw.toLowerCase()));
      })
      .sort((a, b) => (b.analysis?.strength ?? 0) - (a.analysis?.strength ?? 0))
      .slice(0, 3);

    return entries.map(toVaultEntry);
  }

  async findSimilarEntries(_userId: string, _embedding: number[], _topK = 3): Promise<IVaultEntry[]> {
    // Embeddings not supported in file storage
    return [];
  }

  async updateEntryEmbedding(_entryId: string, _embedding: number[]): Promise<void> {
    // No-op: embeddings not stored in file storage
  }

  // ─── Synapse Queries ──────────────────────────────────────────────────────

  async getSynapsesBySource(_entryId: string, _limit: number): Promise<{
    targetId: string;
    weight: number;
    reason: string;
    targetSummary?: string;
    targetRawText?: string;
  }[]> {
    // Synapses not supported in file storage
    return [];
  }

  async processSynapseLinks(
    _synapses: { sourceId: string; targetId: string; reason: string; strength: number }[],
    _deltaEntryIds: Set<string>
  ): Promise<number> {
    // Synapses not supported in file storage
    return 0;
  }

  // ─── Conscious Processor ──────────────────────────────────────────────────

  async findDeltaEntries(userId: string, since: Date): Promise<IVaultEntry[]> {
    return this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e => e.userId === userId && (
        !e.isAnalyzed || new Date(e.lastActivityAt) >= since
      ))
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
      .slice(0, 50)
      .map(toVaultEntry);
  }

  async findContextEntries(userId: string, excludeIds: string[]): Promise<IVaultEntry[]> {
    const excludeSet = new Set(excludeIds);
    return this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e =>
        e.userId === userId &&
        !excludeSet.has(e._id) &&
        e.isAnalyzed &&
        (e.analysis?.strength ?? 0) >= 3
      )
      .sort((a, b) => (b.analysis?.strength ?? 0) - (a.analysis?.strength ?? 0))
      .slice(0, 20)
      .map(toVaultEntry);
  }

  async applyTopicAnalysis(topic: TopicAnalysis): Promise<number> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    let count = 0;
    for (const id of topic.entryIds) {
      const entry = entries.find(e => e._id === id);
      if (entry) {
        if (!entry.analysis) {
          entry.analysis = { summary: "", tags: [], strength: 0, category: topic.category, isProcessed: true };
        }
        entry.analysis.category = topic.category;
        entry.analysis.tags = [...new Set([...entry.analysis.tags, ...topic.tags])];
        entry.analysis.strength = Math.min(10, (entry.analysis.strength ?? 0) + (topic.importance || 1));
        entry.isAnalyzed = true;
        entry.updatedAt = new Date().toISOString();
        count++;
      }
    }
    this.writeJSON("vault", entries);
    return count;
  }

  async findStrongEntries(userId: string): Promise<IVaultEntry[]> {
    return this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e =>
        e.userId === userId &&
        !e.isConsolidated &&
        (e.analysis?.strength ?? 0) >= 10
      )
      .map(toVaultEntry);
  }

  async upsertLTM(
    _userId: string,
    _topic: string,
    _category: string,
    _memoryData: LongTermMemoryData,
    _entries: IVaultEntry[]
  ): Promise<void> {
    // Long-term memory consolidation not fully supported in file storage
  }

  async markConsolidated(entries: IVaultEntry[]): Promise<void> {
    const storedEntries = this.readJSON<StoredVaultEntry[]>("vault", []);
    const ids = new Set(entries.map(e => e._id.toString()));
    for (const entry of storedEntries) {
      if (ids.has(entry._id)) {
        entry.isConsolidated = true;
        entry.updatedAt = new Date().toISOString();
      }
    }
    this.writeJSON("vault", storedEntries);
  }

  // ─── Subconscious Routine ─────────────────────────────────────────────────

  async getConsolidatedEntryIds(): Promise<string[]> {
    return this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e => e.isConsolidated)
      .map(e => e._id);
  }

  async findEntriesToDecay(since: Date): Promise<IVaultEntry[]> {
    return this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e =>
        !e.isConsolidated &&
        new Date(e.lastActivityAt) < since &&
        (e.analysis?.strength ?? 0) > 0
      )
      .map(toVaultEntry);
  }

  async decayEntries(entryIds: { toString(): string }[]): Promise<number> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    const ids = new Set(entryIds.map(id => id.toString()));
    let count = 0;
    for (const entry of entries) {
      if (ids.has(entry._id) && entry.analysis) {
        entry.analysis.strength = Math.max(0, entry.analysis.strength - 1);
        entry.updatedAt = new Date().toISOString();
        count++;
      }
    }
    this.writeJSON("vault", entries);
    return count;
  }

  async pruneDeadEntries(): Promise<number> {
    const entries = this.readJSON<StoredVaultEntry[]>("vault", []);
    const before = entries.length;
    const surviving = entries.filter(e => e.isConsolidated || (e.analysis?.strength ?? 1) > 0);
    this.writeJSON("vault", surviving);
    return before - surviving.length;
  }

  async pruneDeadSynapses(): Promise<number> {
    // Synapses not supported in file storage
    return 0;
  }

  async findEntriesReadyForLTM(): Promise<IVaultEntry[]> {
    return this.readJSON<StoredVaultEntry[]>("vault", [])
      .filter(e => !e.isConsolidated && (e.analysis?.strength ?? 0) >= 10)
      .map(toVaultEntry);
  }

  async countEntries(): Promise<number> {
    return this.readJSON<StoredVaultEntry[]>("vault", []).length;
  }
}
