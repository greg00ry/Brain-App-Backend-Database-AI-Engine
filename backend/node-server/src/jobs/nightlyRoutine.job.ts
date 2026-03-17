import { brain } from "../core/brain.instance.js";

/**
 * Główny punkt wejścia dla nocnego cyklu "The Brain".
 * Łączy fazę czyszczenia (Podświadomość) z fazą analizy AI (Świadomość).
 */
export const runNightlyRoutine = async () => {
    const startTime = Date.now();
    console.log('\n🌙 [Nocna Rutyna] Rozpoczynam pełny cykl przetwarzania...');

    try {
        const { subStats, consciousStats } = await brain.runMaintenance();

        console.log(`✅ Podświadomość zakończona: -${subStats.pruned} usuniętych, -${subStats.decayed} osłabionych.`);
        console.log(`✅ Świadomość zakończona: +${consciousStats.synapsesCreated} nowych synaps.`);

        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🏆 [Nocna Rutyna] Cykl zakończony sukcesem w ${totalDuration}s.`);

    } catch (error) {
        console.error('🚨 [Nocna Rutyna] KRYTYCZNY BŁĄD CYKLU:', error);
    }
}