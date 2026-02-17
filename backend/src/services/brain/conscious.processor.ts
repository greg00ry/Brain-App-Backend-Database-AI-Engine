import mongoose from "mongoose";
import { IVaultEntry, VaultEntry } from "../../models/VaultEntry.js";
import { Category } from "../../models/Category.js";
import { LongTermMemory } from "../../models/LongTermMemory.js";
import { SynapseLink, processSynapseLinks } from "../synapses/synapse.service.js";
import { callLMStudio, cleanAndParseJSON } from "../ai/ai.service.js";
import { getCategoriesForAI } from "../../models/Category.js";


// ============================================================================
// 👁️ ŚWIADOMOŚĆ (CONSCIOUS PROCESSOR) - AI-DRIVEN, DELTA ONLY
// ============================================================================


interface CategoryInfo {
  name: string;
  description: string;
  keywords: string[];
}

interface TopicAnalysis {
  topic: string;
  category: string;
  entryIds: string[];
  tags: string[];
  importance: number; // 1-10
}

interface AnalysisResult {
  topics: TopicAnalysis[];
  synapses: SynapseLink[];
}

interface LongTermMemoryData {
  summary: string;
  tags: string[];
}

export interface ConsciousStats {
  analyzed: number;
  consolidated: number;
  synapsesCreated: number;
}

/**
 * Get only the "delta" - entries that need AI attention.
 * This minimizes the context window sent to LM Studio.
 */
async function getDeltaEntries(userId: string): Promise<IVaultEntry[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Only get entries that:
  // 1. Have NOT been analyzed yet, OR
  // 2. Had activity in the last 24 hours
  const deltaEntries = await VaultEntry.find({
    userId,
    $or: [
      { isAnalyzed: false },
      { lastActivityAt: { $gte: twentyFourHoursAgo } },
    ],
  })
    .sort({ lastActivityAt: -1 })
    .limit(50); // Hard limit to prevent context explosion

  return deltaEntries;
}

/**
 * Get existing entries for context (not in delta, but recently relevant).
 * Used to find connections between new and existing entries.
 */
async function getContextEntries(userId: string, excludeIds: string[]): Promise<IVaultEntry[]> {
  // Get top 20 strongest entries not in delta for context
  const contextEntries = await VaultEntry.find({
    userId,
    _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) },
    isAnalyzed: true,
    strength: { $gte: 3 }, // Only consider entries with some strength
  })
    .sort({ strength: -1, lastActivityAt: -1 })
    .limit(20)
    .select('_id summary rawText tags category');

  return contextEntries;
}

/**
 * Analyze delta entries AND find connections to existing entries.
 * Returns both topic analysis and synapse recommendations.
 */



async function analyzeWithSynapses(
  deltaEntries: IVaultEntry[],
  contextEntries: IVaultEntry[],
  categories: CategoryInfo[]
): Promise<AnalysisResult> {
  if (deltaEntries.length === 0) return { topics: [], synapses: [] };

  // Prepare delta entries (new/recently active)
  const deltaSummaries = deltaEntries.map(e => ({
    id: e._id.toString(),
    text: e.summary || e.rawText.substring(0, 150),
    tags: e.tags.slice(0, 5),
    isNew: true,
  }));

  // Prepare context entries (existing, for connection finding)
  const contextSummaries = contextEntries.map(e => ({
    id: e._id.toString(),
    text: e.summary || e.rawText.substring(0, 100),
    tags: e.tags.slice(0, 3),
    category: e.category,
    isNew: false,
  }));

  const categoryList = categories
    .slice(0, 10)
    .map(c => `${c.name}: ${c.description}`)
    .join('\n');

  const prompt = `Analyze new entries (isNew=true) and find connections to existing ones.

CATEGORIES:
${categoryList}

NEW ENTRIES (analyze these):
${JSON.stringify(deltaSummaries, null, 1)}

EXISTING ENTRIES (for context/connections):
${JSON.stringify(contextSummaries, null, 1)}

Return JSON with TWO arrays:
{
  "topics": [{"topic":"name","category":"category","entryIds":["id1"],"tags":["tag"],"importance":1-10}],
  "synapses": [{"sourceId":"newEntryId","targetId":"anyEntryId","reason":"semantic reason why connected","strength":1-10}]
}

RULES for synapses:
- sourceId MUST be from NEW entries (isNew=true)
- targetId can be any entry (new or existing)
- reason should explain the semantic connection (e.g., "Both discuss investment strategies")
- strength: 1-3 weak, 4-6 moderate, 7-10 strong connection
- Max 3 synapses per new entry
- Only create meaningful connections, not everything

Only valid JSON, no text.`;

  try {
    console.log('👁️ [Świadomość]    Wysyłam do AI:', deltaEntries.length, 'nowych +', contextEntries.length, 'kontekstowych');
    
    const response = await callLMStudio({
        prompt: prompt,
        content: "You analyze entries and find semantic connections. Return ONLY valid JSON with topics and synapses arrays. Be selective with connections - only meaningful ones.",
        temperature: 0.2,
        max_tokens: 1500
    })

    

    if (!response.ok) {
      console.error('👁️ [Świadomość] ⚠️ LM Studio niedostępne');
      return { topics: [], synapses: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    
    
    
    const parsed = cleanAndParseJSON(content)
    
    return parsed || { topics: [], synapses: [] };
    
  } catch (error) {
    console.error('👁️ [Świadomość] ❌ Błąd analizy:', error);
    return { topics: [], synapses: [] };
  }
}

/**
 * Create LTM summary - called ONLY when subconscious marks entries as strength >= 10.
 */
async function createLongTermMemorySummary(
  entries: IVaultEntry[],
  topic: string,
  categoryName: string
): Promise<LongTermMemoryData | null> {
  // Take only essential data
  const entriesContent = entries.slice(0, 10).map(e => ({
    summary: e.summary?.substring(0, 200) || e.rawText.substring(0, 200),
    tags: e.tags.slice(0, 3),
  }));

  const prompt = `Consolidate these memories about "${topic}" (${categoryName}) into one summary.

Entries:
${JSON.stringify(entriesContent)}

Return JSON: {"summary":"max 300 words","tags":["tag1","tag2"]}

Only valid JSON.`;

  try {

    const response = await callLMStudio({
      prompt: prompt,
      content: 'Consolidate memories into concise summary. JSON only.',
      temperature: 0.3,
      max_tokens: 800
    })

    

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('👁️ [Świadomość] ❌ Błąd tworzenia LTM:', error);
    return null;
  }
}

/**
 * Conscious processor - AI-driven, processes only DELTA entries.
 */
export async function runConsciousProcessor(): Promise<ConsciousStats> {
  console.log('\n👁️ [Świadomość] Uruchamiam świadomy procesor...');
  const startTime = Date.now();

  const stats: ConsciousStats = {
    analyzed: 0,
    consolidated: 0,
    synapsesCreated: 0,
  };

  try {
    // Load categories
    const categories = await getCategoriesForAI();
    if (categories.length === 0) {
      console.log('👁️ [Świadomość] ⚠️ Brak kategorii. Uruchom: npm run seed:categories');
      return stats;
    }

    // Get unique users
    const userIds = await VaultEntry.distinct('userId');
    console.log(`👁️ [Świadomość] Przetwarzam ${userIds.length} użytkowników`);

    for (const userId of userIds) {
      console.log(`\n👁️ [Świadomość] 👤 Użytkownik: ${userId.substring(0, 8)}...`);

      // ========================================
      // STEP 1: ANALYZE DELTA + FIND SYNAPSES
      // ========================================
      const deltaEntries = await getDeltaEntries(userId);
      
      if (deltaEntries.length === 0) {
        console.log('👁️ [Świadomość]    Brak nowych wpisów do analizy');
      } else {
        console.log(`👁️ [Świadomość]    Delta: ${deltaEntries.length} wpisów do analizy`);

        // Get context entries for synapse discovery
        const deltaIds = deltaEntries.map(e => e._id.toString());
        const contextEntries = await getContextEntries(userId, deltaIds);
        console.log(`👁️ [Świadomość]    Kontekst: ${contextEntries.length} istniejących wpisów`);

        // Analyze with AI - get both topics and synapses
        const analysisResult = await analyzeWithSynapses(deltaEntries, contextEntries, categories);
        const { topics, synapses } = analysisResult;
        
        console.log(`👁️ [Świadomość]    Zidentyfikowano ${topics.length} tematów, ${synapses.length} połączeń`);

        // Update entries with analysis results
        for (const topic of topics) {
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

          if (updateOps.length > 0) {
            await VaultEntry.bulkWrite(updateOps);
            stats.analyzed += updateOps.length;
          }
        }

        // Process AI-discovered synapses (with max limit per entry)
        if (synapses.length > 0) {
          console.log(`👁️ [Świadomość]    🔗 Przetwarzam ${synapses.length} synaps od AI...`);
          const deltaIdSet = new Set(deltaIds);
          const synapsesCreated = await processSynapseLinks(synapses, deltaIdSet);
          stats.synapsesCreated += synapsesCreated;
        }
      }

      // ========================================
      // STEP 2: CONSOLIDATE STRONG MEMORIES INTO LTM
      // Only process entries marked by subconscious (strength >= 10)
      // ========================================
      const strongEntries = await VaultEntry.find({
        userId,
        strength: { $gte: 10 },
        isConsolidated: false,
      });

      if (strongEntries.length > 0) {
        console.log(`👁️ [Świadomość]    Konsolidacja: ${strongEntries.length} silnych wspomnień`);

        // Group by category for consolidation
        const entriesByCategory = new Map<string, IVaultEntry[]>();
        for (const entry of strongEntries) {
          const cat = entry.category || 'Uncategorized';
          if (!entriesByCategory.has(cat)) {
            entriesByCategory.set(cat, []);
          }
          entriesByCategory.get(cat)!.push(entry);
        }

        for (const [category, entries] of entriesByCategory) {
          // Create topic name from common tags
          const allTags = entries.flatMap(e => e.tags);
          const tagCounts = new Map<string, number>();
          allTags.forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
          const topTags = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);
          
          const topic = topTags.join(' + ') || category;

          console.log(`👁️ [Świadomość]    🧠 Tworzę LTM: "${topic}" [${category}]`);

          const memoryData = await createLongTermMemorySummary(entries, topic, category);

          if (memoryData) {
            const categoryDoc = await Category.findOne({ name: category, isActive: true });

            // Check for existing memory
            const existingMemory = await LongTermMemory.findOne({
              userId,
              topic,
            });

            if (existingMemory) {
              existingMemory.summary = memoryData.summary;
              existingMemory.tags = [...new Set([...existingMemory.tags, ...memoryData.tags])];
              existingMemory.sourceEntryIds = entries.map(e => e._id);
              await existingMemory.save();
              console.log(`👁️ [Świadomość]    ✅ Zaktualizowano istniejące LTM`);
            } else {
              await LongTermMemory.create({
                userId,
                summary: memoryData.summary,
                tags: memoryData.tags,
                categoryId: categoryDoc?._id || null,
                categoryName: category,
                topic,
                sourceEntryIds: entries.map(e => e._id),
                strength: 10,
              });
              console.log(`👁️ [Świadomość]    ✅ Utworzono nowe LTM`);
            }

            // Mark entries as consolidated
            await VaultEntry.updateMany(
              { _id: { $in: entries.map(e => e._id) } },
              { $set: { isConsolidated: true } }
            );

            stats.consolidated += entries.length;
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n👁️ [Świadomość] ✅ Zakończono w ${duration}s`);
    console.log(`👁️ [Świadomość] 📊 Statystyki:`);
    console.log(`   - Przeanalizowane: ${stats.analyzed}`);
    console.log(`   - Skonsolidowane: ${stats.consolidated}`);
    console.log(`   - Utworzone synapsy: ${stats.synapsesCreated}`);

  } catch (error) {
    console.error('👁️ [Świadomość] ❌ Błąd:', error);
  }

  return stats;
}
