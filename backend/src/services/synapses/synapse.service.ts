import { Types } from 'mongoose';
import { Synapse, ISynapse } from '../../models/Synapse.js';
import { VaultEntry } from '../../models/VaultEntry.js';

// ============================================================================
// 🔗 SYNAPSE MANAGEMENT
// ============================================================================

//FOR FUTURE
const INITIAL_SYNAPSE_WEIGHT = 0.3;
const INITIAL_SYNAPSE_STABILITY = 0.1;
const WEIGHT_INCREMENT = 0.15;


/**
 * Fire a synapse between two neurons (VaultEntries).
 * Creates the synapse if it doesn't exist, strengthens it if it does.
 * 
 * @param id1 - First neuron ObjectId
 * @param id2 - Second neuron ObjectId
 * @returns The updated or created synapse
 */

export interface SynapseLink {
  sourceId: string;
  targetId: string;
  reason: string;
  strength: number; // 1-10 how strong the connection is
}


export interface FireSynapseResult {
  synapse: ISynapse
  created: boolean
}

export async function fireSynapse(
  id1: Types.ObjectId | string,
  id2: Types.ObjectId | string,
  reason: string = "Manual connection"
): Promise<FireSynapseResult> {
  const fromId = new Types.ObjectId(id1);
  const toId = new Types.ObjectId(id2);

  // Ensure consistent ordering (smaller ID is always 'from')
  const [from, to] = fromId.toString() < toId.toString() 
    ? [fromId, toId] 
    : [toId, fromId];

  // Try to find existing synapse
  let synapse = await Synapse.findOne({ from, to });
  const isNew = !synapse

  if (synapse) {
    // Strengthen existing synapse
    synapse.weight = Math.min(1.0, synapse.weight + 0.1);
    synapse.lastFired = new Date();
    synapse.reason = reason
    
    // Increase stability slightly when fired (gets harder to forget)
    synapse.stability = Math.min(1.0, synapse.stability + 0.05);
    
    await synapse.save();
    console.log(`🔗 Synapse strengthened: ${from} <-> ${to}, weight: ${synapse.weight.toFixed(2)}`);
  } else {
    // Create new synapse
    synapse = new Synapse({
      from,
      to,
      weight: 0.3,
      stability: 0.5,
      lastFired: new Date(),
      reason
    });
    await synapse.save();
    console.log(`🆕 Synapse created: ${from} <-> ${to}`);
  }

  return { synapse, created: isNew};
}

/**
 * Fire multiple synapses at once (batch operation).
 * Useful when processing related entries together.
 * 
 * @param ids - Array of neuron ObjectIds to connect
 */
export async function fireMultipleSynapses(ids: (Types.ObjectId | string)[]): Promise<void> {
  if (ids.length < 2) return;

  const promises: Promise<FireSynapseResult>[] = [];
  
  // Create synapses between all pairs
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      promises.push(fireSynapse(ids[i], ids[j]));
    }
  }

  await Promise.all(promises);
  console.log(`⚡ Fired ${promises.length} synapses between ${ids.length} neurons`);
}

/**
 * Get all connected neurons sorted by synapse weight.
 * Imitates human associative memory - stronger connections come first.
 * 
 * @param neuronId - The neuron to find connections for
 * @param limit - Maximum number of connections to return
 * @returns Array of connected VaultEntries with synapse info
 */
export async function getConnectedContext(
  neuronId: Types.ObjectId | string,
  limit: number = 20
): Promise<{
  entry: typeof VaultEntry.prototype;
  synapse: ISynapse;
  direction: 'from' | 'to';
}[]> {
  const id = new Types.ObjectId(neuronId);

  // Find all synapses where this neuron is involved
  const synapses = await Synapse.find({
    $or: [{ from: id }, { to: id }],
  })
    .sort({ weight: -1 })
    .limit(limit);

  // Get connected entry IDs
  const connectedIds = synapses.map(s => 
    s.from.equals(id) ? s.to : s.from
  );

  // Fetch the actual entries
  const entries = await VaultEntry.find({
    _id: { $in: connectedIds },
  });

  // Create a map for quick lookup
  const entryMap = new Map(entries.map(e => [e._id.toString(), e]));

  // Combine entries with synapse info
  const result = synapses
    .map(synapse => {
      const connectedId = synapse.from.equals(id) ? synapse.to : synapse.from;
      const entry = entryMap.get(connectedId.toString());
      
      if (!entry) return null;

      return {
        entry,
        synapse,
        direction: synapse.from.equals(id) ? 'to' as const : 'from' as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return result;
}

/**
 * Get the strongest synapses in the entire network.
 * Useful for discovering the most established connections.
 * 
 * @param limit - Maximum number of synapses to return
 */
export async function getStrongestSynapses(limit: number = 50): Promise<ISynapse[]> {
  return Synapse.find({ weight: { $gte: 0.5 } })
    .sort({ weight: -1 })
    .limit(limit)
    .populate('from', 'summary tags category')
    .populate('to', 'summary tags category');
}

/**
 * Get synapse statistics for a user's brain.
 * 
 * @param userId - User ID to get stats for
 */
export async function getSynapseStats(userId: string): Promise<{
  totalSynapses: number;
  averageWeight: number;
  strongConnections: number;
  weakConnections: number;
  recentlyFired: number;
}> {
  const userEntries = await VaultEntry.find({ userId }).select('_id');
  const entryIds = userEntries.map(e => e._id);

  const synapses = await Synapse.find({
    $or: [
      { from: { $in: entryIds } },
      { to: { $in: entryIds } },
    ],
  });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const totalWeight = synapses.reduce((sum, s) => sum + s.weight, 0);

  return {
    totalSynapses: synapses.length,
    averageWeight: synapses.length > 0 ? totalWeight / synapses.length : 0,
    strongConnections: synapses.filter(s => s.weight >= 0.7).length,
    weakConnections: synapses.filter(s => s.weight < 0.3).length,
    recentlyFired: synapses.filter(s => s.lastFired >= oneDayAgo).length,
  };
}

/**
 * Manually weaken a synapse (for user-controlled forgetting).
 * 
 * @param id1 - First neuron ObjectId
 * @param id2 - Second neuron ObjectId
 * @param amount - Amount to weaken (default 0.2)
 */
export async function weakenSynapse(
  id1: Types.ObjectId | string,
  id2: Types.ObjectId | string,
  amount: number = 0.2
): Promise<ISynapse | null> {
  const fromId = new Types.ObjectId(id1);
  const toId = new Types.ObjectId(id2);

  const [from, to] = fromId.toString() < toId.toString() 
    ? [fromId, toId] 
    : [toId, fromId];

  const synapse = await Synapse.findOne({ from, to });

  if (synapse) {
    synapse.weight = Math.max(0, synapse.weight - amount);
    
    // If weight drops to 0, delete the synapse
    if (synapse.weight === 0) {
      await synapse.deleteOne();
      console.log(`🗑️ Synapse deleted: ${from} <-> ${to}`);
      return null;
    }

    await synapse.save();
    console.log(`📉 Synapse weakened: ${from} <-> ${to}, weight: ${synapse.weight.toFixed(2)}`);
  }

  return synapse;
}

/**
 * Process synapses from AI analysis, respecting the max limit per entry.
 */

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