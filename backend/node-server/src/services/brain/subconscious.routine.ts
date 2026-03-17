import { LongTermMemory } from "../../models/LongTermMemory.js";
import { VaultEntry } from "../../models/VaultEntry.js";
import { VaultRepo } from "../db/vault.repo.js";
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
    // Get IDs of entries already consolidated into LongTermMemory
    const consolidatedEntryIds = await LongTermMemory.distinct('sourceEntryIds');
    const consolidatedIdSet = new Set(consolidatedEntryIds.map(id => id.toString()));

    console.log('🌘 [Podświadomość] Znaleziono', consolidatedIdSet.size, 'wpisów już w pamięci długotrwałej');

    // ========================================
    // PHASE 1: DECAY (Zanikanie)
    // Reduce strength by 1 for entries NOT in LTM and not recently active
    // ========================================
    console.log('🌘 [Podświadomość] Faza 1: DECAY (zanikanie wspomnień)...');
    
    const oneDayAgo = new Date(Date.now() - MISC.ONE_DAY_MS);
    
    // Find entries to decay: not consolidated, not recently active, strength > 0
    const entriesToDecay = await VaultRepo.findEntriesToDecay(oneDayAgo)

    if (entriesToDecay.length > 0) {
      // Filter out entries that are in LTM
      const decayOps = entriesToDecay
        .filter(e => !consolidatedIdSet.has(e._id.toString()))
        .map(entry => ({
          updateOne: {
            filter: { _id: entry._id },
            update: { $inc: { 'analysis.strength': -1 } },
          },
        }));

      if (decayOps.length > 0) {
        const result = await VaultRepo.bulkWriteDecayOps(decayOps)
        stats.decayed = result.modifiedCount;
        console.log(`🌘 [Podświadomość]    ↳ Osłabiono ${stats.decayed} wspomnień (strength -1)`);
      }
    }

    // ========================================
    // PHASE 2: PRUNING (Przycinanie)
    // Delete entries with strength = 0
    // ========================================
    console.log('🌘 [Podświadomość] Faza 2: PRUNING (usuwanie zapomnianych)...');
    
    const pruneResult = await VaultRepo.pruneResults()
    
    stats.pruned  = (pruneResult.deadEntries?.deletedCount || 0) + (pruneResult.deadSynapses?.deletedCount || 0);
    if (stats.pruned > 0) {
  console.log(`🌘 [Podświadomość]    ↳ Usunięto ${stats.pruned} elementów (wpisy + synapsy)`);
  
  
}

    // ========================================
    // PHASE 3: MARK FOR CONSOLIDATION
    // Mark entries with strength >= 10 as ready for LTM
    // ========================================
    console.log('🌘 [Podświadomość] Faza 3: Oznaczanie silnych wspomnień...');
    
    const strongEntries = await VaultRepo.markStrongEntries()

    if (strongEntries.length > 0) {
      stats.readyForLTM = strongEntries.length;
      console.log(`🌘 [Podświadomość]    ↳ ${stats.readyForLTM} wspomnień gotowych do konsolidacji w LTM`);
    }

    // Get total count
    // DO POPRAWY PRZY IMPLEMENTACJI LOGOWANIA
    stats.totalProcessed = await VaultRepo.getTotalProcessedCount()

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