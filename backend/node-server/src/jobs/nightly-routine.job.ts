import { Brain } from "../core/Brain.js";

export const runNightlyRoutine = async (brain: Brain): Promise<void> => {
  const startTime = Date.now();
  console.log('\n🌙 [Nocna Rutyna] Rozpoczynam pełny cykl przetwarzania...');

  try {
    const { subStats, consciousStats } = await brain.runMaintenance();

    console.log(`✅ Podświadomość: -${subStats.pruned} usuniętych, -${subStats.decayed} osłabionych.`);
    console.log(`✅ Świadomość: +${consciousStats.synapsesCreated} nowych synaps, ${consciousStats.consolidated} skonsolidowanych.`);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🏆 [Nocna Rutyna] Zakończono w ${totalDuration}s.`);

  } catch (error) {
    console.error('🚨 [Nocna Rutyna] BŁĄD:', error);
  }
};