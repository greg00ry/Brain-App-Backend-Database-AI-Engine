// run-brain.ts
import { connectDB } from "../config/db.js";
import { runNightlyRoutine } from "../jobs/nightly-routine.job.js";
import dotenv from "dotenv";

dotenv.config();

async function execute() {
  try {
    console.log("🔋 Inicjalizacja środowiska testowego...");
    await connectDB();
    await runNightlyRoutine();
    console.log("✅ Skrypt zakończył działanie pomyślnie.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd podczas ręcznego uruchamiania procesora:", error);
    process.exit(1);
  }
}

execute();