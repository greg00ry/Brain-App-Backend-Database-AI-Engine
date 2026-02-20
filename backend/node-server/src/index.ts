import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import cron from "node-cron"
import { connectDB } from "./config/db.js";

//Routery
import entriesRouter from "./routes/entries.js"
import analyzeRouter from "./routes/analyze.js"
import authRouter from "./routes/auth.js"
import brainChatRouter from "./routes/brainChat.js"


//Jobs
import { runNightlyRoutine } from "./jobs/nightlyRoutine.job.js";
import { timeStamp } from "console";

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001 

//Middleware
app.use(cors())
app.use(express.json())

//Routes
app.use("/api/entries", entriesRouter)
app.use("/api/analyze", analyzeRouter)
app.use("/api/auth", authRouter)
app.use("/api/chat", brainChatRouter)

//Health check
app.get("/api/health", (_req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString(), system: "The Brain App"})
})



//Start server
async function start() {
  try {
    await connectDB()
    console.log("📦 Połączono z MongoDB")

    app.listen(PORT, () => {
      console.log(`
        🚀 SYSTEM "THE BRAIN" GOTOWY
----------------------------------
📍 Port: ${PORT}
⚙️ Auth: /api/auth
🧠 Analiza: /api/analyze
⚙️ Health:  /api/health
🌙 Cron:    03:00 rano
----------------------------------
        `)
    })
  } catch (error) {
    console.error("❌ Błąd krytyczny startu:", error)
    process.exit(1)
  }
}

//Harmonogram - Nocna Rutyna
cron.schedule("0 3 * * *", async () => {
  console.log("🌙 [CRON] Rozpoczynam nocne przetwarzanie...")
  await runNightlyRoutine()
})

start()
