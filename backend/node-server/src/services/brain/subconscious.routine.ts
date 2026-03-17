import { storageAdapter } from "../db/storage.js";
import { MISC } from "../../config/constants.js";


// ============================================================================
// 🌘 PODŚWIADOMOŚĆ (SUBCONSCIOUS ENGINE) - MATH/LOGIC ONLY, NO AI
// ============================================================================


export interface SubconsciousStats {
  decayed: number;
  pruned: number;
  readyForLTM: number;
  totalProcessed: number;
}


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
    const consolidatedIds = await storageAdapter.getConsolidatedEntryIds();
    const consolidatedIdSet = new Set(consolidatedIds);
    console.log('🌘 [Podświadomość] Znaleziono', consolidatedIdSet.size, 'wpisów już w pamięci długotrwałej');

    // ========================================
    // PHASE 1: DECAY (Zanikanie)
    // Reduce strength by 1 for entries NOT in LTM and not recently active
    // ========================================
    console.log('🌘 [Podświadomość] Faza 1: DECAY (zanikanie wspomnień)...');

    const oneDayAgo = new Date(Date.now() - MISC.ONE_DAY_MS);
    const entriesToDecay = await storageAdapter.findEntriesToDecay(oneDayAgo);

    if (entriesToDecay.length > 0) {
      const idsToDecay = entriesToDecay
        .filter(e => !consolidatedIdSet.has(e._id.toString()))
        .map(e => e._id);

      if (idsToDecay.length > 0) {
        stats.decayed = await storageAdapter.decayEntries(idsToDecay);
        console.log(`🌘 [Podświadomość]    ↳ Osłabiono ${stats.decayed} wspomnień (strength -1)`);
      }
    }

    // ========================================
    // PHASE 2: PRUNING (Przycinanie)
    // Delete entries with strength = 0
    // ========================================
    console.log('🌘 [Podświadomość] Faza 2: PRUNING (usuwanie zapomnianych)...');

    const prunedEntries = await storageAdapter.pruneDeadEntries();
    const prunedSynapses = await storageAdapter.pruneDeadSynapses();
    stats.pruned = prunedEntries + prunedSynapses;

    if (stats.pruned > 0) {
      console.log(`🌘 [Podświadomość]    ↳ Usunięto ${stats.pruned} elementów (wpisy + synapsy)`);
    }

    // ========================================
    // PHASE 3: MARK FOR CONSOLIDATION
    // Mark entries with strength >= 10 as ready for LTM
    // ========================================
    console.log('🌘 [Podświadomość] Faza 3: Oznaczanie silnych wspomnień...');

    const strongEntries = await storageAdapter.findEntriesReadyForLTM();
    if (strongEntries.length > 0) {
      stats.readyForLTM = strongEntries.length;
      console.log(`🌘 [Podświadomość]    ↳ ${stats.readyForLTM} wspomnień gotowych do konsolidacji w LTM`);
    }

    stats.totalProcessed = await storageAdapter.countEntries();

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
