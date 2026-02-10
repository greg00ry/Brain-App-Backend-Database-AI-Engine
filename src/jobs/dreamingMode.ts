import cron from 'node-cron';
import { Synapse } from '../models/Synapse.js';

const PRUNING_AGE_DAYS = 30;
const PRUNING_WEIGHT_THRESHOLD = 0.2;
const DECAY_RATE = 0.05; // 5% decay
const INACTIVITY_DAYS = 7; // Start decay after 7 days of inactivity

interface DreamingStats {
  prunedCount: number;
  decayedCount: number;
  totalSynapses: number;
  startTime: Date;
  endTime: Date | null;
  lastRun: Date | null;
}

let dreamingStats: DreamingStats = {
  prunedCount: 0,
  decayedCount: 0,
  totalSynapses: 0,
  startTime: new Date(),
  endTime: null,
  lastRun: null,
};

/**
 * Pruning - Remove old, weak synapses.
 * Simulates the brain's synaptic pruning during sleep.
 * 
 * Criteria: lastFired > 30 days AND weight < 0.2
 */
async function pruneSynapses(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - PRUNING_AGE_DAYS);

  const result = await Synapse.deleteMany({
    lastFired: { $lt: cutoffDate },
    weight: { $lt: PRUNING_WEIGHT_THRESHOLD },
  });

  return result.deletedCount;
}

/**
 * Decay - Gradually weaken inactive synapses.
 * Simulates the natural forgetting curve.
 * 
 * For synapses not fired in INACTIVITY_DAYS, reduce weight by DECAY_RATE.
 * Stability affects decay rate - higher stability = slower decay.
 */
async function decaySynapses(): Promise<number> {
  const inactivityCutoff = new Date();
  inactivityCutoff.setDate(inactivityCutoff.getDate() - INACTIVITY_DAYS);

  // Find inactive synapses
  const inactiveSynapses = await Synapse.find({
    lastFired: { $lt: inactivityCutoff },
    weight: { $gt: 0 },
  });

  let decayedCount = 0;

  for (const synapse of inactiveSynapses) {
    // Calculate decay based on stability
    // Higher stability = lower decay rate
    const effectiveDecay = DECAY_RATE * (1 - synapse.stability * 0.8);
    const newWeight = Math.max(0, synapse.weight - effectiveDecay);

    if (newWeight !== synapse.weight) {
      synapse.weight = newWeight;
      await synapse.save();
      decayedCount++;
    }
  }

  return decayedCount;
}

/**
 * Strengthen stable, frequently used synapses.
 * Simulates memory consolidation during sleep.
 */
async function consolidateSynapses(): Promise<number> {
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 7);

  // Find recently active, strong synapses
  const activeSynapses = await Synapse.find({
    lastFired: { $gte: recentCutoff },
    weight: { $gte: 0.5 },
  });

  let consolidatedCount = 0;

  for (const synapse of activeSynapses) {
    // Slightly increase stability for frequently used connections
    const newStability = Math.min(1.0, synapse.stability + 0.02);
    
    if (newStability !== synapse.stability) {
      synapse.stability = newStability;
      await synapse.save();
      consolidatedCount++;
    }
  }

  return consolidatedCount;
}

/**
 * Main dreaming mode process.
 * Runs all maintenance tasks on the synapse network.
 */
export async function runDreamingMode(): Promise<DreamingStats> {
  console.log('\n💤 [DreamingMode] Brain entering sleep mode...');
  const startTime = new Date();

  dreamingStats = {
    prunedCount: 0,
    decayedCount: 0,
    totalSynapses: 0,
    startTime,
    endTime: null,
    lastRun: new Date(),
  };

  try {
    // Get initial count
    dreamingStats.totalSynapses = await Synapse.countDocuments();
    console.log(`🧠 Total synapses in network: ${dreamingStats.totalSynapses}`);

    // Phase 1: Pruning (remove old weak connections)
    console.log('✂️  Phase 1: Pruning weak connections...');
    dreamingStats.prunedCount = await pruneSynapses();
    console.log(`   Pruned ${dreamingStats.prunedCount} synapses`);

    // Phase 2: Decay (weaken inactive connections)
    console.log('📉 Phase 2: Applying decay to inactive synapses...');
    dreamingStats.decayedCount = await decaySynapses();
    console.log(`   Decayed ${dreamingStats.decayedCount} synapses`);

    // Phase 3: Consolidation (strengthen active connections)
    console.log('💪 Phase 3: Consolidating strong memories...');
    const consolidatedCount = await consolidateSynapses();
    console.log(`   Consolidated ${consolidatedCount} synapses`);

    dreamingStats.endTime = new Date();
    const duration = (dreamingStats.endTime.getTime() - startTime.getTime()) / 1000;

    console.log(`\n✅ [DreamingMode] Completed in ${duration.toFixed(2)}s`);
    console.log(`   📊 Summary:`);
    console.log(`      - Pruned: ${dreamingStats.prunedCount}`);
    console.log(`      - Decayed: ${dreamingStats.decayedCount}`);
    console.log(`      - Consolidated: ${consolidatedCount}`);
    console.log(`      - Remaining synapses: ${dreamingStats.totalSynapses - dreamingStats.prunedCount}`);

  } catch (error) {
    console.error('❌ [DreamingMode] Error:', error);
    dreamingStats.endTime = new Date();
  }

  return dreamingStats;
}

/**
 * Schedule the dreaming mode to run nightly.
 * Default: 3:00 AM (when brain activity is typically lowest)
 */
export function scheduleDreamingMode(): void {
  // Run at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    console.log('\n🌙 [CRON] Night cycle trigger - starting dreaming mode');
    await runDreamingMode();
  });

  console.log('🌙 Dreaming mode scheduled to run daily at 3:00 AM');
}

/**
 * Get the stats from the last dreaming mode run.
 */
export function getDreamingStats(): DreamingStats {
  return { ...dreamingStats };
}

/**
 * Manually trigger dreaming mode (for testing).
 */
export async function triggerDreamingMode(): Promise<DreamingStats> {
  console.log('🔧 [MANUAL] Triggering dreaming mode...');
  return runDreamingMode();
}
