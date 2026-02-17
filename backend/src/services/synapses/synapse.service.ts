import { fireSynapse } from "./synapseService.js";


// ============================================================================
// 🔗 SYNAPSE MANAGEMENT
// ============================================================================

//FOR FUTURE
const INITIAL_SYNAPSE_WEIGHT = 0.3;
const INITIAL_SYNAPSE_STABILITY = 0.1;
const WEIGHT_INCREMENT = 0.15;


/**
 * Process synapses from AI analysis, respecting the max limit per entry.
 */



export interface SynapseLink {
  sourceId: string;
  targetId: string;
  reason: string;
  strength: number; // 1-10 how strong the connection is
}


const MAX_SYNAPSES_PER_ENTRY = 3;

export async function processSynapseLinks(
  synapses: SynapseLink[],
  deltaEntryIds: Set<string>
): Promise<number> {
  let createdCount = 0;

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
        const { created } = await fireSynapse(link.sourceId, link.targetId, link.reason);
        if (created) createdCount++;
      } catch (error) {
        console.error(`👁️ [Świadomość] ❌ Błąd tworzenia synapsy:`, error);
      }
    }
  }

  return createdCount;
}