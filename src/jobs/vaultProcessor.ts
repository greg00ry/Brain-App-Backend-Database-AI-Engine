import cron from 'node-cron';
import mongoose from 'mongoose';
import { VaultEntry, IVaultEntry } from '../models/VaultEntry.js';
import { LongTermMemory } from '../models/LongTermMemory.js';
import { Category, getCategoriesForAI } from '../models/Category.js';
import { Synapse } from '../models/Synapse.js';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

// Maximum synapses per entry to prevent "database explosion"
const MAX_SYNAPSES_PER_ENTRY = 3;
const INITIAL_SYNAPSE_WEIGHT = 0.3;
const INITIAL_SYNAPSE_STABILITY = 0.1;
const WEIGHT_INCREMENT = 0.15;

// ============================================================================
// TYPES & INTERFACES
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

interface SynapseLink {
  sourceId: string;
  targetId: string;
  reason: string;
  strength: number; // 1-10 how strong the connection is
}

interface AnalysisResult {
  topics: TopicAnalysis[];
  synapses: SynapseLink[];
}

interface LongTermMemoryData {
  summary: string;
  tags: string[];
}

interface SubconsciousStats {
  decayed: number;
  pruned: number;
  readyForLTM: number;
  totalProcessed: number;
}

interface ConsciousStats {
  analyzed: number;
  consolidated: number;
  synapsesCreated: number;
}

// ============================================================================
// 🔗 SYNAPSE MANAGEMENT
// ============================================================================

/**
 * Upsert a synapse between two entries.
 * If exists: increase weight (max 1.0) and update lastFired.
 * If not: create new with initial weight and stability.
 */
async function upsertSynapse(
  fromId: string,
  toId: string,
  reason: string
): Promise<{ created: boolean; weight: number }> {
  const fromObjectId = new mongoose.Types.ObjectId(fromId);
  const toObjectId = new mongoose.Types.ObjectId(toId);

  // Check if synapse already exists
  const existingSynapse = await Synapse.findOne({
    from: fromObjectId,
    to: toObjectId,
  });

  if (existingSynapse) {
    // Update existing synapse
    const newWeight = Math.min(existingSynapse.weight + WEIGHT_INCREMENT, 1.0);
    existingSynapse.weight = newWeight;
    existingSynapse.lastFired = new Date();
    // Update reason if new one is provided
    if (reason && reason.length > 0) {
      existingSynapse.reason = reason;
    }
    await existingSynapse.save();

    console.log(`👁️ [Świadomość] 🔗 Wzmocniono synapsę: weight ${existingSynapse.weight.toFixed(2)} → ${newWeight.toFixed(2)}`);
    return { created: false, weight: newWeight };
  } else {
    // Create new synapse
    await Synapse.create({
      from: fromObjectId,
      to: toObjectId,
      weight: INITIAL_SYNAPSE_WEIGHT,
      stability: INITIAL_SYNAPSE_STABILITY,
      reason,
      lastFired: new Date(),
    });

    // Get entry summaries for logging
    const [fromEntry, toEntry] = await Promise.all([
      VaultEntry.findById(fromObjectId).select('summary rawText'),
      VaultEntry.findById(toObjectId).select('summary rawText'),
    ]);

    const fromTitle = fromEntry?.summary?.substring(0, 30) || fromEntry?.rawText?.substring(0, 30) || fromId.substring(0, 8);
    const toTitle = toEntry?.summary?.substring(0, 30) || toEntry?.rawText?.substring(0, 30) || toId.substring(0, 8);

    console.log(`👁️ [Świadomość] 🔗 Utworzono nową synapsę: [${fromTitle}...] → [${toTitle}...]`);
    console.log(`   └─ Powód: ${reason.substring(0, 80)}${reason.length > 80 ? '...' : ''}`);

    return { created: true, weight: INITIAL_SYNAPSE_WEIGHT };
  }
}

/**
 * Process synapses from AI analysis, respecting the max limit per entry.
 */
async function processSynapseLinks(
  synapses: SynapseLink[],
  deltaEntryIds: Set<string>
): Promise<number> {
  let created = 0;

  // Group synapses by source entry
  const synapsesBySource = new Map<string, SynapseLink[]>();
  for (const synapse of synapses) {
    if (!synapsesBySource.has(synapse.sourceId)) {
      synapsesBySource.set(synapse.sourceId, []);
    }
    synapsesBySource.get(synapse.sourceId)!.push(synapse);
  }

  // Process each source entry
  for (const [sourceId, links] of synapsesBySource) {
    // Only process if source is in delta (new/recently active)
    if (!deltaEntryIds.has(sourceId)) continue;

    // Sort by strength and take top N
    const topLinks = links
      .sort((a, b) => b.strength - a.strength)
      .slice(0, MAX_SYNAPSES_PER_ENTRY);

    console.log(`👁️ [Świadomość]    📎 Wpis ${sourceId.substring(0, 8)}... → ${topLinks.length} synaps (max ${MAX_SYNAPSES_PER_ENTRY})`);

    for (const link of topLinks) {
      try {
        const result = await upsertSynapse(link.sourceId, link.targetId, link.reason);
        if (result.created) created++;
      } catch (error) {
        console.error(`👁️ [Świadomość] ❌ Błąd tworzenia synapsy:`, error);
      }
    }
  }

  return created;
}

// ============================================================================
// 🌘 PODŚWIADOMOŚĆ (SUBCONSCIOUS ENGINE) - MATH/LOGIC ONLY, NO AI
// ============================================================================

/**
 * Subconscious routine - runs WITHOUT AI, pure logic/math operations.
 * Handles: Decay, Pruning, and marking entries ready for consolidation.
 */
export async function runSubconsciousRoutine(): Promise<SubconsciousStats> {
  console.log('\n🌘 [Podświadomość] Uruchamiam rutynę podświadomości...');
  const startTime = Date.now();
  
  const stats: SubconsciousStats = {
    decayed: 0,
    pruned: 0,
    readyForLTM: 0,
    totalProcessed: 0,
  };

  try {
    // Get IDs of entries already consolidated into LongTermMemory
    const consolidatedEntryIds = await LongTermMemory.distinct('sourceEntryIds');
    const consolidatedIdSet = new Set(consolidatedEntryIds.map(id => id.toString()));

    console.log('🌘 [Podświadomość] Znaleziono', consolidatedIdSet.size, 'wpisów już w pamięci długotrwałej');

    // ========================================
    // PHASE 1: DECAY (Zanikanie)
    // Reduce strength by 1 for entries NOT in LTM and not recently active
    // ========================================
    console.log('🌘 [Podświadomość] Faza 1: DECAY (zanikanie wspomnień)...');
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find entries to decay: not consolidated, not recently active, strength > 0
    const entriesToDecay = await VaultEntry.find({
      isConsolidated: false,
      lastActivityAt: { $lt: oneDayAgo },
      strength: { $gt: 0 },
    }).select('_id strength');

    if (entriesToDecay.length > 0) {
      // Filter out entries that are in LTM
      const decayOps = entriesToDecay
        .filter(e => !consolidatedIdSet.has(e._id.toString()))
        .map(entry => ({
          updateOne: {
            filter: { _id: entry._id },
            update: { $inc: { strength: -1 } },
          },
        }));

      if (decayOps.length > 0) {
        const result = await VaultEntry.bulkWrite(decayOps);
        stats.decayed = result.modifiedCount;
        console.log(`🌘 [Podświadomość]    ↳ Osłabiono ${stats.decayed} wspomnień (strength -1)`);
      }
    }

    // ========================================
    // PHASE 2: PRUNING (Przycinanie)
    // Delete entries with strength = 0
    // ========================================
    console.log('🌘 [Podświadomość] Faza 2: PRUNING (usuwanie zapomnianych)...');
    
    const pruneResult = await VaultEntry.deleteMany({
      strength: { $lte: 0 },
      isConsolidated: false, // Never delete consolidated entries
    });
    
    stats.pruned = pruneResult.deletedCount;
    if (stats.pruned > 0) {
      console.log(`🌘 [Podświadomość]    ↳ Usunięto ${stats.pruned} zapomnianych wspomnień`);
    }

    // ========================================
    // PHASE 3: MARK FOR CONSOLIDATION
    // Mark entries with strength >= 10 as ready for LTM
    // ========================================
    console.log('🌘 [Podświadomość] Faza 3: Oznaczanie silnych wspomnień...');
    
    const strongEntries = await VaultEntry.find({
      strength: { $gte: 10 },
      isConsolidated: false,
    }).select('_id');

    if (strongEntries.length > 0) {
      stats.readyForLTM = strongEntries.length;
      console.log(`🌘 [Podświadomość]    ↳ ${stats.readyForLTM} wspomnień gotowych do konsolidacji w LTM`);
    }

    // Get total count
    stats.totalProcessed = await VaultEntry.countDocuments();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🌘 [Podświadomość] ✅ Zakończono w ${duration}s`);
    console.log(`🌘 [Podświadomość] 📊 Statystyki:`);
    console.log(`   - Osłabione: ${stats.decayed}`);
    console.log(`   - Usunięte: ${stats.pruned}`);
    console.log(`   - Gotowe do LTM: ${stats.readyForLTM}`);
    console.log(`   - Łącznie wpisów: ${stats.totalProcessed}`);

  } catch (error) {
    console.error('🌘 [Podświadomość] ❌ Błąd:', error);
  }

  return stats;
}

// ============================================================================
// 👁️ ŚWIADOMOŚĆ (CONSCIOUS PROCESSOR) - AI-DRIVEN, DELTA ONLY
// ============================================================================

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
    
    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        messages: [
          { 
            role: 'system', 
            content: 'You analyze entries and find semantic connections. Return ONLY valid JSON with topics and synapses arrays. Be selective with connections - only meaningful ones.' 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('👁️ [Świadomość] ⚠️ LM Studio niedostępne');
      return { topics: [], synapses: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse as object first
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        topics: parsed.topics || [],
        synapses: parsed.synapses || [],
      };
    }
    
    // Fallback: try to parse as array (old format)
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return {
        topics: JSON.parse(arrayMatch[0]),
        synapses: [],
      };
    }
    
    return { topics: [], synapses: [] };
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
    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        messages: [
          { role: 'system', content: 'Consolidate memories into concise summary. JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800, // Reduced
      }),
    });

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
                $inc: { strength: Math.ceil(topic.importance / 3) },
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

// ============================================================================
// 🌙 UNIFIED DAILY PROCESSOR (Both routines)
// ============================================================================

/**
 * Main daily job - runs both subconscious and conscious processing.
 */
export async function processVaultEntriesJob(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🌙 [VaultProcessor] Rozpoczynam nocne przetwarzanie...');
  console.log('='.repeat(60));

  const startTime = Date.now();

  // PHASE 1: Subconscious (fast, no AI)
  const subconsciousStats = await runSubconsciousRoutine();

  // PHASE 2: Conscious (AI-driven, delta only)
  const consciousStats = await runConsciousProcessor();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log(`🌙 [VaultProcessor] ✅ Całość zakończona w ${duration}s`);
  console.log('='.repeat(60));
  console.log('📊 Podsumowanie nocnego przetwarzania:');
  console.log('   🌘 Podświadomość:');
  console.log(`      - Osłabione: ${subconsciousStats.decayed}`);
  console.log(`      - Usunięte: ${subconsciousStats.pruned}`);
  console.log(`      - Gotowe do LTM: ${subconsciousStats.readyForLTM}`);
  console.log('   👁️ Świadomość:');
  console.log(`      - Przeanalizowane: ${consciousStats.analyzed}`);
  console.log(`      - Skonsolidowane: ${consciousStats.consolidated}`);
  console.log(`      - Synapsy: ${consciousStats.synapsesCreated}`);
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// SCHEDULING & MANUAL TRIGGERS
// ============================================================================

/**
 * Schedule the job to run daily at midnight.
 */
export function scheduleVaultProcessorJob(): void {
  // Run at 00:00 every day
  cron.schedule('0 0 * * *', async () => {
    console.log('\n⏰ [CRON] Północ - uruchamiam przetwarzanie...');
    await processVaultEntriesJob();
  });

  console.log('📅 Vault processor scheduled to run daily at midnight');
}

/**
 * Manual trigger for testing - runs both routines.
 */
export async function runVaultProcessorNow(): Promise<void> {
  console.log('🔧 [MANUAL] Ręczne uruchomienie procesora...');
  await processVaultEntriesJob();
}

/**
 * Run only subconscious routine (for testing).
 */
export async function runSubconsciousNow(): Promise<SubconsciousStats> {
  console.log('🔧 [MANUAL] Ręczne uruchomienie podświadomości...');
  return runSubconsciousRoutine();
}

/**
 * Run only conscious processor (for testing).
 */
export async function runConsciousNow(): Promise<ConsciousStats> {
  console.log('🔧 [MANUAL] Ręczne uruchomienie świadomości...');
  return runConsciousProcessor();
}
