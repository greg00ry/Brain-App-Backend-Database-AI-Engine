import mongoose, { Types } from "mongoose";
import { VaultEntry, IVaultEntry } from "../../models/VaultEntry.js"
import { Category, ICategory } from "../../models/Category.js";
import { TopicAnalysis, LongTermMemoryData } from "../brain/conscious.processor.js";
import { LongTermMemory } from "../../models/LongTermMemory.js";
import { ISynapse, Synapse } from "../../models/Synapse.js";
import { BRAIN, MEMORY } from "../../config/constants.js";

export const VaultRepo = {
     async getCategoriesForAI(): Promise<{ name: string; description: string; keywords: string[] }[]> {
      const categories = await Category.find({ isActive: true }).sort({ order: 1 });
      return categories.map((cat: ICategory) => ({
        name: cat.name,
        description: cat.description,
        keywords: cat.keywords,
      }));
    },
    async findVaultEntryForDeltaEntries(userId: mongoose.Types.ObjectId, twentyFourHoursAgo: Date) {
        const entries = await VaultEntry.find({
    userId,
    $or: [
      { isAnalyzed: false },
      { lastActivityAt: { $gte: twentyFourHoursAgo } },
    ],
  })
    .sort({ lastActivityAt: -1 })
    .limit(MEMORY.DELTA_ENTRIES_LIMIT);
    
    return entries
    },
    async findContextEntries(userId: mongoose.Types.ObjectId, excludeIds: string[]) {
        const contextEntries = await VaultEntry.find({
            userId,
            _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) },
            isAnalyzed: true,
            strength: { $gte: BRAIN.STRENGTH_CONTEXT_MIN },
          })
            .sort({ strength: -1, lastActivityAt: -1 })
            .limit(MEMORY.CONTEXT_ENTRIES_LIMIT)
            .select('_id summary rawText tags category');
        
          return contextEntries;
    },
    async getUniqueUser() {
        const res = await VaultEntry.distinct('userId');
        return res
    },
    mapEntryIds(topic: TopicAnalysis) {
        const updateOps = topic.entryIds.map(id => ({
                    updateOne: {
                      filter: { _id: new mongoose.Types.ObjectId(id) },
                      update: {
                        $set: {
                          category: topic.category,
                          isAnalyzed: true,
                        },
                        $addToSet: { tags: { $each: topic.tags } },
                        $inc: { strength: topic.importance || 1, accessCount: 1 },
                      },
                    },
                  }));
                  return updateOps
    },
    async bulkWriteVaultEntriesForConscious(updateOps: any) {
        return await VaultEntry.bulkWrite(updateOps);
    },
    async findStrongEntries(userId: mongoose.Types.ObjectId) {
        const strongEntries = await VaultEntry.find({
            userId,
            strength: { $gte: BRAIN.STRENGTH_LTM_THRESHOLD },
            isConsolidated: false,
        });
        return strongEntries
    },
    async findCategoryDoc(category: string) {
        const categoryDoc = await Category.findOne({ name: category, isActive: true });
        return categoryDoc
    },
    async findExistingMemory(userId: mongoose.Types.ObjectId, topic: any) {
        const existingMemory = await LongTermMemory.findOne({
                      userId,
                      topic,
                    });
                return existingMemory
    },
    async saveExistingMemory(existingMemory: any) {
        return await existingMemory.save();
    },
    async createNewLongTermMemory(
        userId: mongoose.Types.ObjectId, 
        memoryData: LongTermMemoryData, 
        categoryDoc: any, 
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
        return await VaultEntry.updateMany(
              { _id: { $in: entries.map(e => e._id) } },
              { $set: { isConsolidated: true } }
            );
    },
    //-------------------------------------
    //Subconscious
    //------------------------------------
    async findEntriesToDecay(oneDayAgo: Date) {
        const entriesToDecay = await VaultEntry.find({
      isConsolidated: false,
      lastActivityAt: { $lt: oneDayAgo },
      strength: { $gt: 0 },
    }).select('_id strength');
    return entriesToDecay
    },
    async bulkWriteDecayOps(decayOps: any) {
        return await VaultEntry.bulkWrite(decayOps);
    },
    async pruneResults() {
        // 1. Usuwamy martwe wpisy z Vaulta (to już masz)
    const deadEntries = await VaultEntry.deleteMany({
        strength: { $lte: 0 },
        isConsolidated: false, 
    });

    // 2. USUWANIE SYNAPS (Tego brakowało!)
    // Usuwamy synapsy, których waga/siła spadła do zera
    const deadSynapses = await Synapse.deleteMany({
        weight: { $lte: BRAIN.SYNAPSE_PRUNE_WEIGHT }
    });

    
    

    console.log(`🧹 [Podświadomość] Deep Clean: 
        - Wpisy: ${deadEntries.deletedCount}
        - Synapsy: ${deadSynapses.deletedCount}`);
    
    return { deadEntries, deadSynapses };

    },
    async markStrongEntries() {
        return await VaultEntry.find({
            strength: { $gte: BRAIN.STRENGTH_LTM_THRESHOLD },
            isConsolidated: false,
        }).select('_id');
    },
   async getTotalProcessedCount(){
        return await VaultEntry.countDocuments();
    }       
}