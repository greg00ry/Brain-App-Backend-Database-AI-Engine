import { IVaultEntry } from "../../models/VaultEntry.js";
import { SynapseLink, processSynapseLinks } from "../synapses/synapse.service.js";
import { ILLMAdapter, cleanAndParseJSON } from "../ai/ai.service.js";
import { IStorageAdapter, CategoryInfo } from "../db/storage.js";
import { TopicAnalysis, LongTermMemoryData } from "../../types/brain.js";
import { LONG_TERM_MEMORY_SUMMARY_PROMPT } from "../ai/prompts/longTermMemorySummaryPrompt.js";
import { ANALYZE_WITH_SYNAPSES_PROMPT } from "../ai/prompts/analyzeWithSynapsesPrompt.js";
import { BRAIN, LLM } from "../../config/constants.js";


// ============================================================================
// 👁️ ŚWIADOMOŚĆ (CONSCIOUS PROCESSOR) - AI-DRIVEN, DELTA ONLY
// ============================================================================


interface AnalysisResult {
  topics: TopicAnalysis[];
  synapses: SynapseLink[];
}

export interface ConsciousStats {
  analyzed: number;
  consolidated: number;
  synapsesCreated: number;
}

/**
 * Analyze delta entries AND find connections to existing entries.
 * Returns both topic analysis and synapse recommendations.
 */
async function analyzeWithSynapses(
  deltaEntries: IVaultEntry[],
  contextEntries: IVaultEntry[],
  categories: CategoryInfo[],
  llm: ILLMAdapter
): Promise<AnalysisResult> {
  if (deltaEntries.length === 0) return { topics: [], synapses: [] };

  const deltaSummaries = deltaEntries.map(e => ({
    id: e._id.toString(),
    text: e.analysis?.summary || e.rawText.substring(0, 150),
    tags: e.analysis?.tags?.slice(0, 5) || [],
    isNew: true,
  }));

  const contextSummaries = contextEntries.map(e => ({
    id: e._id.toString(),
    text: e.analysis?.summary || e.rawText.substring(0, 100),
    tags: e.analysis?.tags?.slice(0, 3) || [],
    category: e.analysis?.category,
    isNew: false,
  }));

  const categoryList = categories
    .slice(0, 10)
    .map(c => `${c.name}: ${c.description}`)
    .join('\n');

  const prompt = ANALYZE_WITH_SYNAPSES_PROMPT(
    categoryList,
    JSON.stringify(deltaSummaries, null, 1),
    JSON.stringify(contextSummaries, null, 1)
  );

  try {
    console.log('👁️ [Świadomość]    Wysyłam do AI:', deltaEntries.length, 'nowych +', contextEntries.length, 'kontekstowych');

    const content = await llm.complete({
      systemPrompt: "You analyze entries and find semantic connections. Return ONLY valid JSON with topics and synapses arrays. Be selective with connections - only meaningful ones.",
      userPrompt: prompt,
      temperature: LLM.ANALYSIS_TEMPERATURE,
      maxTokens: LLM.ANALYSIS_MAX_TOKENS,
    });

    if (!content) {
      console.error('👁️ [Świadomość] ⚠️ LM Studio niedostępne');
      return { topics: [], synapses: [] };
    }

    return cleanAndParseJSON(content) || { topics: [], synapses: [] };

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
  categoryName: string,
  llm: ILLMAdapter
): Promise<LongTermMemoryData | null> {
  const entriesContent = entries.slice(0, BRAIN.LTM_MAX_SOURCE_ENTRIES).map(e => ({
    summary: e.analysis?.summary?.substring(0, 200) || e.rawText.substring(0, 200),
    tags: e.analysis?.tags?.slice(0, 3) || [],
  }));

  const prompt = LONG_TERM_MEMORY_SUMMARY_PROMPT(topic, categoryName, JSON.stringify(entriesContent));

  try {
    const content = await llm.complete({
      systemPrompt: 'Consolidate memories into concise summary. JSON only.',
      userPrompt: prompt,
      temperature: LLM.LTM_TEMPERATURE,
      maxTokens: LLM.LTM_MAX_TOKENS,
    });

    if (!content) return null;

    const jsonMatch = cleanAndParseJSON(content);
    if (!jsonMatch) {
      console.error("👁️ [Świadomość] ❌ Błąd parsowania LTM");
      return null;
    }
    return jsonMatch;
  } catch (error) {
    console.error('👁️ [Świadomość] ❌ Błąd tworzenia LTM:', error);
    return null;
  }
}

/**
 * Conscious processor - AI-driven, processes only DELTA entries.
 */
export async function runConsciousProcessor(llm: ILLMAdapter, storage: IStorageAdapter): Promise<ConsciousStats> {
  console.log('\n👁️ [Świadomość] Uruchamiam świadomy procesor...');
  const startTime = Date.now();

  const stats: ConsciousStats = {
    analyzed: 0,
    consolidated: 0,
    synapsesCreated: 0,
  };

  try {
    const categories = await storage.getCategories();
    if (categories.length === 0) {
      console.log('👁️ [Świadomość] ⚠️ Brak kategorii. Uruchom: npm run seed:categories');
      return stats;
    }

    const userIds = await storage.getUniqueUserIds();
    console.log(`👁️ [Świadomość] Przetwarzam ${userIds.length} użytkowników`);

    for (const userId of userIds) {
      console.log(`\n👁️ [Świadomość] 👤 Użytkownik: ${userId.toString().substring(0, 8)}...`);

      // ========================================
      // STEP 1: ANALYZE DELTA + FIND SYNAPSES
      // ========================================
      const since = new Date(Date.now() - BRAIN.DELTA_WINDOW_MS);
      const deltaEntries = await storage.findDeltaEntries(userId, since);

      if (deltaEntries.length === 0) {
        console.log('👁️ [Świadomość]    Brak nowych wpisów do analizy');
      } else {
        console.log(`👁️ [Świadomość]    Delta: ${deltaEntries.length} wpisów do analizy`);

        for (let i = 0; i < deltaEntries.length; i += BRAIN.BATCH_SIZE) {
          const currentBatch = deltaEntries.slice(i, i + BRAIN.BATCH_SIZE);
          console.log(`🧠 [Batch] Przetwarzam paczkę ${Math.floor(i / BRAIN.BATCH_SIZE) + 1} (${currentBatch.length} wpisów)...`);

          const deltaIds = currentBatch.map(e => e._id.toString());
          const contextEntries = await storage.findContextEntries(userId, deltaIds);

          const { topics, synapses } = await analyzeWithSynapses(currentBatch, contextEntries, categories, llm);
          console.log(`👁️ [Batch] Zidentyfikowano ${topics.length} tematów, ${synapses.length} połączeń`);

          for (const topic of topics) {
            const count = await storage.applyTopicAnalysis(topic);
            stats.analyzed += count;
          }

          if (synapses.length > 0) {
            const deltaIdSet = new Set(deltaIds);
            const synapsesCreated = await processSynapseLinks(synapses, deltaIdSet);
            stats.synapsesCreated += synapsesCreated;
          }
        }
      }

      // ========================================
      // STEP 2: CONSOLIDATE STRONG MEMORIES INTO LTM
      // Only process entries marked by subconscious (strength >= 10)
      // ========================================
      const strongEntries = await storage.findStrongEntries(userId);

      if (strongEntries.length > 0) {
        console.log(`👁️ [Świadomość]    Konsolidacja: ${strongEntries.length} silnych wspomnień`);

        const entriesByCategory = new Map<string, IVaultEntry[]>();
        for (const entry of strongEntries) {
          const cat = entry.analysis?.category || 'Uncategorized';
          if (!entriesByCategory.has(cat)) entriesByCategory.set(cat, []);
          entriesByCategory.get(cat)!.push(entry);
        }

        for (const [category, entries] of entriesByCategory) {
          const allTags = entries.flatMap(e => e.analysis?.tags || []);
          const tagCounts = new Map<string, number>();
          allTags.forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
          const topTags = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);

          const topic = topTags.join(' + ') || category;
          console.log(`👁️ [Świadomość]    🧠 Tworzę LTM: "${topic}" [${category}]`);

          const memoryData = await createLongTermMemorySummary(entries, topic, category, llm);

          if (memoryData) {
            await storage.upsertLTM(userId, topic, category, memoryData, entries);
            console.log(`👁️ [Świadomość]    ✅ LTM zapisane`);

            await storage.markConsolidated(entries);
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
