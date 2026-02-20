import { runSubconsciousRoutine } from "../services/brain/subconscious.routine.js";
import { runConsciousProcessor } from "../services/brain/conscious.processor.js";

/**
 * Główny punkt wejścia dla nocnego cyklu "The Brain".
 * Łączy fazę czyszczenia (Podświadomość) z fazą analizy AI (Świadomość).
 */
export const runNightlyRoutine = async () => {
    const startTime = Date.now();
    console.log('\n🌙 [Nocna Rutyna] Rozpoczynam pełny cykl przetwarzania...');

    try {
        // 1. FAZA PODŚWIADOMOŚCI (Cleanup & Decay)
        // Tutaj dzieje się matematyka: osłabianie synaps i usuwanie śmieci.
        console.log('🌘 [Krok 1/2] Uruchamiam procesy podświadome...');
        const subStats = await runSubconsciousRoutine();
        console.log(`✅ Podświadomość zakończona: -${subStats.pruned} usuniętych, -${subStats.decayed} osłabionych.`);

        // 2. FAZA ŚWIADOMOŚCI (AI Analysis & Synapse Discovery)
        // Tutaj AI buduje nowe połączenia na podstawie tego, co przeżyło czystkę.
        console.log('👁️ [Krok 2/2] Uruchamiam procesy świadome (AI)...');
        const consciousStats = await runConsciousProcessor();
        console.log(`✅ Świadomość zakończona: +${consciousStats.synapsesCreated} nowych synaps.`);

        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🏆 [Nocna Rutyna] Cykl zakończony sukcesem w ${totalDuration}s.`);

    } catch (error) {
        console.error('🚨 [Nocna Rutyna] KRYTYCZNY BŁĄD CYKLU:', error);
        // Tutaj można dodać powiadomienie (np. webhook do Discorda/Slacka),
        // bo jeśli to padnie, Twój cyfrowy mózg przestanie się rozwijać.
    }
}