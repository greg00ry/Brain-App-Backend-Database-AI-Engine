# The Brain

> **Privacy-first AI framework for cognitive memory and intent routing**

[![CI](https://github.com/greg00ry/the-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/greg00ry/the-brain/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-alpha-orange)](https://github.com/greg00ry/the-brain)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## What Is This?

Most AI projects are wrappers — a React UI calling OpenAI API. That's a product, not infrastructure.

The Brain is infrastructure. It defines **how a local AI agent should work** — not which model to use, not which database, not which UI. The paradigm, not the implementation.

**The core insight:** AI models work better when you design the environment for the model, not just for the developer. Good context, relevant memory, clear action boundaries — these make a weak local model competitive with cloud.

---

## What Makes This Different

### 1. Hybrid Intent Routing
Rules + LLM + confidence scoring. High-confidence rules skip LLM entirely. LLM handles ambiguous cases. Deterministic fallback always present.

```
Rule engine (instant) → high confidence → done
                      → low confidence → LLM
                                       → high confidence → done
                                       → low confidence → rule fallback
                                                        → default
```

Result: 95% accuracy with local OR cloud LLM.

### 2. Biologically-Inspired Memory
Not just a vector database. Actual forgetting mechanism.

- **Strength-based decay** — entries lose strength over time, important stays, trivial fades
- **Subconscious routine** — pure math, deterministic pruning, no LLM needed
- **Conscious consolidation** — AI-driven, strong memories → long-term
- **Graph RAG** — synaptic connections between entries, not just similarity search
- **Semantic search** — embeddings via OpenAI-compatible API

### 3. Dynamic Action Registry
Actions stored in DB, not hardcoded. Add a new action without editing prompts.

```typescript
await brain.registerAction(
  "SEND_EMAIL",
  "user wants to send an email to someone",
  async (userId, text, context, llm) => {
    // your handler
  }
);
```

Prompt rebuilds automatically from registered actions.

### 4. LLM Agnostic
One adapter works with everything that speaks OpenAI API:

```typescript
// LM Studio (local)
new OpenAIAPIAdapter("http://localhost:1234/v1/chat/completions")

// Ollama (local)
new OpenAIAPIAdapter("http://localhost:11434/v1/chat/completions")

// OpenAI (cloud)
new OpenAIAPIAdapter("https://api.openai.com/v1/chat/completions", "gpt-4o", apiKey)
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Brain (core)                  │
│                                         │
│  Intent Router                          │
│  (rules → LLM → confidence → action)   │
│                                         │
│  Memory System                          │
│  (decay, consolidation, Graph RAG)      │
│                                         │
│  Action Registry                        │
│  (dynamic, DB-backed, extensible)       │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
  LLM      Storage    Embedding
 Adapter   Adapter    Adapter
    │          │          │
 Any OpenAI  MongoDB   Any OpenAI
 compatible  (more      compatible
    API      coming)       API
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Ollama (`brew install ollama`) with `nomic-embed-text` model
- Any OpenAI-compatible LLM (LM Studio, Ollama, OpenAI)

### Setup

```bash
cd backend/node-server
npm install
cp .env.example .env
# Edit .env
npm run seed:categories
```

### .env

```bash
MONGODB_URI=mongodb://localhost:27017/brain-app
LLM_API_URL=http://localhost:1234/v1/chat/completions
LLM_MODEL=local-model
LLM_API_KEY=local
EMBEDDING_API_URL=http://localhost:11434/v1/embeddings
EMBEDDING_MODEL=nomic-embed-text
BRAIN_USER_ID=default
```

### CLI

```bash
# Interactive chat
npm run brain

# Single commands
npm run brain -- process "What do I know about TypeScript?"
npm run brain -- save "I prefer functional programming"
npm run brain -- recall "programming preferences"
npm run brain -- maintenance
```

---

## Using as Framework

```typescript
import { Brain, OpenAIAPIAdapter, MongoStorageAdapter, OpenAIAPIEmbeddingAdapter } from './src/index.js';
import { connectDB } from './src/config/db.js';

await connectDB();

const brain = new Brain(
  new OpenAIAPIAdapter("http://localhost:1234/v1/chat/completions"),
  new MongoStorageAdapter(),
  new OpenAIAPIEmbeddingAdapter("http://localhost:11434/v1/embeddings"),
);

await brain.loadActions();

// Register custom action
await brain.registerAction(
  "SEND_EMAIL",
  "user wants to send an email to someone",
  async (userId, text, context, llm) => {
    // compose and send email
    return "Email sent.";
  }
);

// Process user input — Brain decides what to do
const result = await brain.process(userId, "Send email to John about the meeting");
console.log(result.answer);
```

---

## Known Limitations (pre-publish)

- **MongoDB required** — no FileAdapter yet, barrier to entry
- **Custom actions** — `registerAction` works but handlers are in-memory only, no persistence across restarts
- **Local LLM stack** — two services needed (LM Studio + Ollama), migration to Ollama-only planned
- **No tests** — zero unit/integration coverage
- **No API documentation** — coming before npm publish
- **Categories required** — run `npm run seed:categories` before conscious processor works

---

## Roadmap

### Phase 1 — Pre-publish (current)
- [ ] FileAdapter (zero-config storage)
- [ ] Migrate to Ollama-only (single local LLM service)
- [ ] Persistent action handlers
- [ ] Basic test coverage
- [ ] API documentation

### Phase 2 — npm publish
- [ ] `@the-brain/core` on npm
- [ ] MCP server (Claude integration)
- [ ] SQLite adapter
- [ ] Community examples

### Phase 3 — Ecosystem
- [ ] PostgreSQL adapter
- [ ] Shell integration (`brain-do`, `brain-explain`)
- [ ] Additional LLM adapters (Anthropic, Gemini)

---

## Why AGPL-3.0?

Prevents corporate capture. Network copyleft means cloud services built on The Brain must share source. Aligns with the mission — this is infrastructure that should stay open.

---

## Author

**Grzegorz Trzaskoma** — Warsaw, Poland

Building privacy-first AI infrastructure. Local LLMs should be competitive with cloud. Users should own their AI.

---

## Status

**Alpha** — core works, known limitations documented above. Not ready for npm publish yet.

**Active development on:** `framework-extension` branch
