import dotenv from "dotenv"
dotenv.config()

import express from "express";
import cors from "cors";
import cron from "node-cron"
import { connectDB } from "./config/db.js";

//Routery
import entriesRouter from "./routes/entries.js"
import analyzeRouter from "./routes/analyze.js"
import authRouter from "./routes/auth.js"
import intentRouter from "./routes/intent.route.js"
import actionRouter from "./routes/actions.route.js"
import calendarRouter from "./routes/calendar.route.js"


//Jobs
import { runNightlyRoutine } from "./jobs/nightlyRoutine.job.js";

console.log("----------------------------------");
console.log("📧 Konfiguracja SMTP:", process.env.SMTP_USER ? "Wczytana ✅" : "BRAK ❌");
console.log("----------------------------------");

const app = express()
const PORT = process.env.PORT || 3001 

//Middleware
app.use(cors())
app.use(express.json())

//Routes
app.use("/api/entries", entriesRouter)
app.use("/api/analyze", analyzeRouter)
app.use("/api/auth", authRouter)
app.use("/api/intent", intentRouter)
app.use("/api/actions", actionRouter)
app.use("/api/calendar", calendarRouter)

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
  ║   • POST   /api/intent/stream      - AI Processing               ║
  ║   • GET    /api/actions/status/:id - Action Tools Status         ║
  ║   • POST   /api/calendar           - Create Event                ║
  ║   • GET    /api/calendar/upcoming  - Get Upcoming Events         ║
  ║   • GET    /api/calendar/today     - Get Today Events            ║
  ║   • GET    /api/calendar/stats     - Calendar Stats 
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
