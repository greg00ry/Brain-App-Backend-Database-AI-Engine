// run-brain.ts
import { connectDB } from "../config/db.js";
import { runVaultProcessorNow } from "../jobs/brain.orchestrator.js"; // Dostosuj ścieżkę
import dotenv from "dotenv";

dotenv.config();

async function execute() {
  try {
    console.log("🔋 Inicjalizacja środowiska testowego...");
    await connectDB();
    
    // To jest metoda z Twojego pliku orchestrator.ts
    await runVaultProcessorNow();
    
    console.log("✅ Skrypt zakończył działanie pomyślnie.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd podczas ręcznego uruchamiania procesora:", error);
    process.exit(1);
  }
}

execute();