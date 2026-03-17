import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cron from "node-cron";
import { connectDB } from "./config/db.js";
import entriesRouter from "./routes/entries.js";
import analyzeRouter from "./routes/analyze.js";
import authRouter from "./routes/auth.js";
import intentRouter from "./routes/intent.route.js";
import { runNightlyRoutine } from "./jobs/nightlyRoutine.job.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/entries", entriesRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/auth", authRouter);
app.use("/api/intent", intentRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`The Brain running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

cron.schedule("0 3 * * *", () => {
  runNightlyRoutine().catch(err => console.error("[CRON] Error:", err));
});

start();
