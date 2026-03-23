import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { brain } from "../core/brain.instance.js";
import { runNightlyRoutine } from "../jobs/nightly-routine.job.js";

async function execute() {
  try {
    await connectDB();
    await runNightlyRoutine(brain);
    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd:", error);
    process.exit(1);
  }
}

execute();