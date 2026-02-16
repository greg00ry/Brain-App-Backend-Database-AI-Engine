import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import passport from './config/passport.js';
import entriesRouter from './routes/entries.js';
import analyzeRouter from './routes/analyze.js';
import authRouter from './routes/auth.js';
import openaiRouter from './routes/openai.js';
import longTermMemoryRouter from './routes/longTermMemory.js';
import categoriesRouter from './routes/categories.js';
import jobsRouter from './routes/jobs.js';
import synapsesRouter from './routes/synapses.js';
import { 
  scheduleVaultProcessorJob, 
  runSubconsciousNow, 
  runConsciousNow, 
  runVaultProcessorNow 
} from './services/vaultProcessor.js';
//import { scheduleDreamingMode, triggerDreamingMode } from './jobs/dreamingMode.js';

dotenv.config();

// Test mode flags
const TEST_DREAMING_MODE = process.env.TEST_DREAMING_MODE === 'true';
const TEST_SUBCONSCIOUS = process.env.TEST_SUBCONSCIOUS === 'true';
const TEST_CONSCIOUS = process.env.TEST_CONSCIOUS === 'true';
const TEST_FULL_PROCESSOR = process.env.TEST_FULL_PROCESSOR === 'true';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/memory', longTermMemoryRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/synapses', synapsesRouter);
app.use('/api/jobs', jobsRouter);
app.use('/v1', openaiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
//caly server do poprawy
async function start() {
  await connectDB();
  
  // Start scheduled jobs
  scheduleVaultProcessorJob();
 // scheduleDreamingMode();
  
  // Run test modes on startup
  if (TEST_DREAMING_MODE) {
    console.log('🧪 TEST MODE: Running dreaming mode on startup...');
    setTimeout(() => {
   //   triggerDreamingMode().catch((err: unknown) => console.error('Dreaming mode error:', err));
    }, 2000);
  }
  
  if (TEST_SUBCONSCIOUS) {
    console.log('🧪 TEST MODE: Running SUBCONSCIOUS routine on startup...');
    setTimeout(() => {
      runSubconsciousNow().catch((err: unknown) => console.error('Subconscious error:', err));
    }, 2000);
  }
  
  if (TEST_CONSCIOUS) {
    console.log('🧪 TEST MODE: Running CONSCIOUS processor on startup...');
    setTimeout(() => {
      runConsciousNow().catch((err: unknown) => console.error('Conscious error:', err));
    }, 2000);
  }
  
  if (TEST_FULL_PROCESSOR) {
    console.log('🧪 TEST MODE: Running FULL vault processor on startup...');
    setTimeout(() => {
      runVaultProcessorNow().catch((err: unknown) => console.error('Vault processor error:', err));
    }, 2000);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/auth/me`);
    console.log(`   GET    /api/entries`);
    console.log(`   POST   /api/entries`);
    console.log(`   PUT    /api/entries/:id`);
    console.log(`   DELETE /api/entries/:id`);
    console.log(`   POST   /api/analyze`);
    console.log(`   GET    /api/health`);
    console.log(`🧠 Long-term Memory:`);
    console.log(`   GET    /api/memory`);
    console.log(`   GET    /api/memory/by-category`);
    console.log(`   POST   /api/memory`);
    console.log(`   PUT    /api/memory/:id`);
    console.log(`   DELETE /api/memory/:id`);
    console.log(`📂 Categories (read-only):`);
    console.log(`   GET    /api/categories`);
    console.log(`   GET    /api/categories/:id`);
    console.log(`⚡ Synapses:`);
    console.log(`   GET    /api/synapses`);
    console.log(`   GET    /api/synapses/stats`);
    console.log(`   GET    /api/synapses/strongest`);
    console.log(`   GET    /api/synapses/context/:entryId`);
    console.log(`   POST   /api/synapses/fire`);
    console.log(`   POST   /api/synapses/fire-multiple`);
    console.log(`   POST   /api/synapses/weaken`);
    console.log(`🤖 OpenAI-compatible endpoints (LM Studio proxy):`);
    console.log(`   GET    /v1/models`);
    console.log(`   POST   /v1/chat/completions`);
    console.log(`   POST   /v1/completions`);
    console.log(`   POST   /v1/embeddings`);
    console.log(`   POST   /v1/responses`);
    console.log(`⏰ Scheduled Jobs:`);
    console.log(`   POST   /api/jobs/process-vault (manual)`);
    console.log(`   POST   /api/jobs/subconscious (manual, no AI)`);
    console.log(`   POST   /api/jobs/conscious (manual, AI-driven)`);
    console.log(`   POST   /api/jobs/dreaming-mode (manual)`);
    console.log(`   GET    /api/jobs/status`);
    console.log(`   📅 Vault processor: daily at midnight`);
    console.log(`   🌙 Dreaming mode: daily at 3:00 AM`);
  });
}

start();
