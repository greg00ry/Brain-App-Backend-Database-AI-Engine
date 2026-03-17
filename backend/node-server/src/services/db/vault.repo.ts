import mongoose from "mongoose";
import { VaultEntry, IVaultEntry } from "../../models/VaultEntry.js"
import { Category, ICategory } from "../../models/Category.js";
import { TopicAnalysis, LongTermMemoryData } from "../brain/conscious.processor.js";
import { ILongTermMemory, LongTermMemory } from "../../models/LongTermMemory.js";
import { Synapse } from "../../models/Synapse.js";
import { BRAIN, MEMORY } from "../../config/constants.js";

type DecayOp = {
  updateOne: {
    filter: { _id: mongoose.Types.ObjectId };
    update: { $inc: { 'analysis.strength': number } };
  };
};

type ConsciousUpdateOp = {
  updateOne: {
    filter: { _id: mongoose.Types.ObjectId };
    update: {
      $set: { 'analysis.category': string; isAnalyzed: boolean };
      $addToSet: { 'analysis.tags': { $each: string[] } };
      $inc: { 'analysis.strength': number };
    };
  };
};

export const VaultRepo = {
  async getCategoriesForAI(): Promise<{ name: string; description: string; keywords: string[] }[]> {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    return categories.map((cat: ICategory) => ({
      name: cat.name,
      description: cat.description,
      keywords: cat.keywords,
    }));
  },

  async findVaultEntryForDeltaEntries(
    userId: mongoose.Types.ObjectId,
    twentyFourHoursAgo: Date
  ): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      userId,
      $or: [
        { isAnalyzed: false },
        { lastActivityAt: { $gte: twentyFourHoursAgo } },
      ],
    })
      .sort({ lastActivityAt: -1 })
      .limit(MEMORY.DELTA_ENTRIES_LIMIT);
  },

  async findContextEntries(
    userId: mongoose.Types.ObjectId,
    excludeIds: string[]
  ): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      userId,
      _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) },
      isAnalyzed: true,
      'analysis.strength': { $gte: BRAIN.STRENGTH_CONTEXT_MIN },
    })
      .sort({ 'analysis.strength': -1, lastActivityAt: -1 })
      .limit(MEMORY.CONTEXT_ENTRIES_LIMIT)
      .select('_id rawText analysis');
  },

  async getUniqueUser(): Promise<mongoose.Types.ObjectId[]> {
    return VaultEntry.distinct('userId');
  },

  mapEntryIds(topic: TopicAnalysis): ConsciousUpdateOp[] {
    return topic.entryIds.map(id => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: {
          $set: {
            'analysis.category': topic.category,
            isAnalyzed: true,
          },
          $addToSet: { 'analysis.tags': { $each: topic.tags } },
          $inc: { 'analysis.strength': topic.importance || 1 },
        },
      },
    }));
  },

  async bulkWriteVaultEntriesForConscious(updateOps: ConsciousUpdateOp[]) {
    return VaultEntry.bulkWrite(updateOps);
  },

  async findStrongEntries(userId: mongoose.Types.ObjectId): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      userId,
      'analysis.strength': { $gte: BRAIN.STRENGTH_LTM_THRESHOLD },
      isConsolidated: false,
    });
  },

  async findCategoryDoc(category: string): Promise<ICategory | null> {
    return Category.findOne({ name: category, isActive: true });
  },

  async findExistingMemory(
    userId: mongoose.Types.ObjectId,
    topic: string
  ): Promise<ILongTermMemory | null> {
    return LongTermMemory.findOne({ userId, topic });
  },

  async saveExistingMemory(existingMemory: ILongTermMemory) {
    return existingMemory.save();
  },

  async createNewLongTermMemory(
    userId: mongoose.Types.ObjectId,
    memoryData: LongTermMemoryData,
    categoryDoc: ICategory | null,
    category: string,
    entries: IVaultEntry[],
    topic: string
  ) {
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
  },

  async updateManyVaultEntries(entries: IVaultEntry[]) {
    return VaultEntry.updateMany(
      { _id: { $in: entries.map(e => e._id) } },
      { $set: { isConsolidated: true } }
    );
  },

  // ─── Subconscious ────────────────────────────────────────────────────────────

  async findEntriesToDecay(oneDayAgo: Date): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      isConsolidated: false,
      lastActivityAt: { $lt: oneDayAgo },
      'analysis.strength': { $gt: 0 },
    }).select('_id analysis.strength');
  },

  async bulkWriteDecayOps(decayOps: DecayOp[]) {
    return VaultEntry.bulkWrite(decayOps);
  },

  async pruneResults() {
    const deadEntries = await VaultEntry.deleteMany({
      'analysis.strength': { $lte: BRAIN.STRENGTH_DECAY_PRUNE },
      isConsolidated: false,
    });

    const deadSynapses = await Synapse.deleteMany({
      weight: { $lte: BRAIN.SYNAPSE_PRUNE_WEIGHT },
    });

    console.log(`🧹 [Podświadomość] Deep Clean:
        - Wpisy: ${deadEntries.deletedCount}
        - Synapsy: ${deadSynapses.deletedCount}`);

    return { deadEntries, deadSynapses };
  },

  async markStrongEntries(): Promise<IVaultEntry[]> {
    return VaultEntry.find({
      'analysis.strength': { $gte: BRAIN.STRENGTH_LTM_THRESHOLD },
      isConsolidated: false,
    }).select('_id');
  },

  async getTotalProcessedCount(): Promise<number> {
    return VaultEntry.countDocuments();
  },
};
