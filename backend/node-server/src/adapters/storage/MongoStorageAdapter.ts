import mongoose from "mongoose";
import { VaultEntry, IVaultEntry } from "../../models/VaultEntry.js";
import { Category, ICategory } from "../../models/Category.js";
import { LongTermMemory, ILongTermMemory } from "../../models/LongTermMemory.js";
import { Synapse } from "../../models/Synapse.js";
import { TopicAnalysis, LongTermMemoryData } from "../../types/brain.js";
import { IStorageAdapter, CategoryInfo, EntryAnalysisData } from "./IStorageAdapter.js";
import { BRAIN, MEMORY } from "../../config/constants.js";

export class MongoStorageAdapter implements IStorageAdapter {

  // ─── Entry CRUD ───────────────────────────────────────────────────────────

  async createEntry(userId: string, rawText: string, analysis: EntryAnalysisData): Promise<IVaultEntry> {
    const entry = new VaultEntry({ userId, rawText, analysis });
    return entry.save();
  }

  async getEntryById(entryId: string): Promise<IVaultEntry | null> {
    return VaultEntry.findById(entryId);
  }

  // ─── Vault ────────────────────────────────────────────────────────────────

  async getVaultData(userId: string | mongoose.Types.ObjectId): Promise<{
    entries: IVaultEntry[];
    memories: ILongTermMemory[];
    categories: ICategory[];
  }> {
    const [entries, memories, categories] = await Promise.all([
      VaultEntry.find({ userId }).sort({ createdAt: -1 }),
      LongTermMemory.find({ userId }).populate('categoryId').sort({ createdAt: -1 }),
      Category.find({ isActive: true }).sort({ order: 1 }),
    ]);
    return { entries, memories, categories };
  }

  async deleteVaultEntry(entryId: string, userId: string | mongoose.Types.ObjectId): Promise<IVaultEntry | null> {
    return VaultEntry.findOneAndDelete({ _id: entryId, userId });
  }

  // ─── Shared ───────────────────────────────────────────────────────────────

  async getCategories(): Promise<CategoryInfo[]> {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    return categories.map((cat: ICategory) => ({
      name: cat.name,
      description: cat.description,
      keywords: cat.keywords,
    }));
  }

  async getUniqueUserIds(): Promise<mongoose.Types.ObjectId[]> {
    return VaultEntry.distinct('userId');
  }

  // ─── Intent Context ───────────────────────────────────────────────────────

  async findRelevantEntries(userId: string | mongoose.Types.ObjectId, keywords: string[]): Promise<IVaultEntry[]> {
    const pattern = keywords.join('|');
    return VaultEntry.find({
      userId,
      $or: [
        { 'analysis.tags': { $in: keywords } },
        { 'analysis.summary': { $regex: pattern, $options: 'i' } },
        { rawText: { $regex: pattern, $options: 'i' } },
      ],
    })
      .sort({ 'analysis.strength': -1, lastActivityAt: -1 })
      .limit(MEMORY.CONTEXT_TOP_ENTRIES)
      .lean() as unknown as IVaultEntry[];
  }

  // ─── Conscious Processor ──────────────────────────────────────────────────

  async findDeltaEntries(userId: mongoose.Types.ObjectId, since: Date): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      userId,
      $or: [
        { isAnalyzed: false },
        { lastActivityAt: { $gte: since } },
      ],
    })
      .sort({ lastActivityAt: -1 })
      .limit(MEMORY.DELTA_ENTRIES_LIMIT);
  }

  async findContextEntries(userId: mongoose.Types.ObjectId, excludeIds: string[]): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      userId,
      _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) },
      isAnalyzed: true,
      'analysis.strength': { $gte: BRAIN.STRENGTH_CONTEXT_MIN },
    })
      .sort({ 'analysis.strength': -1, lastActivityAt: -1 })
      .limit(MEMORY.CONTEXT_ENTRIES_LIMIT)
      .select('_id rawText analysis');
  }

  async applyTopicAnalysis(topic: TopicAnalysis): Promise<number> {
    const ops = topic.entryIds.map(id => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: {
          $set: { 'analysis.category': topic.category, isAnalyzed: true },
          $addToSet: { 'analysis.tags': { $each: topic.tags } },
          $inc: { 'analysis.strength': topic.importance || 1 },
        },
      },
    }));
    if (ops.length === 0) return 0;
    await VaultEntry.bulkWrite(ops);
    return ops.length;
  }

  async findStrongEntries(userId: mongoose.Types.ObjectId): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      userId,
      'analysis.strength': { $gte: BRAIN.STRENGTH_LTM_THRESHOLD },
      isConsolidated: false,
    });
  }

  async upsertLTM(
    userId: mongoose.Types.ObjectId,
    topic: string,
    category: string,
    memoryData: LongTermMemoryData,
    entries: IVaultEntry[]
  ): Promise<void> {
    const categoryDoc = await Category.findOne({ name: category, isActive: true });
    const existing = await LongTermMemory.findOne({ userId, topic });
    if (existing) {
      existing.summary = memoryData.summary;
      existing.tags = [...new Set([...existing.tags, ...memoryData.tags])];
      existing.sourceEntryIds = entries.map(e => e._id);
      await existing.save();
    } else {
      await LongTermMemory.create({
        userId,
        summary: memoryData.summary,
        tags: memoryData.tags,
        categoryId: categoryDoc?._id || null,
        categoryName: category,
        topic,
        sourceEntryIds: entries.map(e => e._id),
        strength: BRAIN.LTM_INITIAL_STRENGTH,
      });
    }
  }

  async markConsolidated(entries: IVaultEntry[]): Promise<void> {
    await VaultEntry.updateMany(
      { _id: { $in: entries.map(e => e._id) } },
      { $set: { isConsolidated: true } }
    );
  }

  // ─── Subconscious Routine ─────────────────────────────────────────────────

  async getConsolidatedEntryIds(): Promise<string[]> {
    const ids = await LongTermMemory.distinct('sourceEntryIds');
    return ids.map((id: mongoose.Types.ObjectId) => id.toString());
  }

  async findEntriesToDecay(since: Date): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      isConsolidated: false,
      lastActivityAt: { $lt: since },
      'analysis.strength': { $gt: 0 },
    }).select('_id analysis.strength');
  }

  async decayEntries(entryIds: mongoose.Types.ObjectId[]): Promise<number> {
    if (entryIds.length === 0) return 0;
    const ops = entryIds.map(id => ({
      updateOne: {
        filter: { _id: id },
        update: { $inc: { 'analysis.strength': -1 } },
      },
    }));
    const result = await VaultEntry.bulkWrite(ops);
    return result.modifiedCount;
  }

  async pruneDeadEntries(): Promise<number> {
    const result = await VaultEntry.deleteMany({
      'analysis.strength': { $lte: BRAIN.STRENGTH_DECAY_PRUNE },
      isConsolidated: false,
    });
    return result.deletedCount;
  }

  async pruneDeadSynapses(): Promise<number> {
    const result = await Synapse.deleteMany({
      weight: { $lte: BRAIN.SYNAPSE_PRUNE_WEIGHT },
    });
    return result.deletedCount;
  }

  async findEntriesReadyForLTM(): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      'analysis.strength': { $gte: BRAIN.STRENGTH_LTM_THRESHOLD },
      isConsolidated: false,
    }).select('_id');
  }

  async countEntries(): Promise<number> {
    return VaultEntry.countDocuments();
  }
}
