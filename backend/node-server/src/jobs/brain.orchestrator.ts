import cron from 'node-cron';
import { runSubconsciousRoutine, SubconsciousStats } from '../services/brain/subconscious.routine.js';
import { runConsciousProcessor, ConsciousStats } from '../services/brain/conscious.processor.js';

//NA DOLE MAMY TESTY

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
