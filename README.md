# The Brain

> **Privacy-first AI framework for reliable intent routing and memory**

[![Status](https://img.shields.io/badge/status-active-green)](https://github.com/greg00ry/Brain-App-Backend-Database-AI-Engine)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## What Is This

The Brain is a framework that gives your application a persistent, biologically-inspired memory layer and a reliable intent routing engine — without locking you into any specific LLM or database.

You bring your own LLM (local, cloud, or hybrid) and your own storage backend. The Brain handles the hard parts: understanding what a user wants, storing it intelligently, and finding it again later.

---

## What Makes This Different

### 1. Hybrid Intent Routing

Local LLMs are fast and private but inconsistent. Cloud LLMs are accurate but expensive. The Brain's hybrid router combines both with a deterministic rule engine and confidence scoring — achieving ~95% routing accuracy regardless of which model you use.

```
Input → Rule Engine (deterministic, instant)
      → LLM Classification + confidence score
      → Rule fallback if LLM uncertain
      → Safe default
```

### 2. Biologically-Inspired Memory

Memories decay. Important ones survive. The Brain implements a two-phase processing cycle modelled loosely on how biological memory works:

- **Subconscious** (pure math, no AI) — entries lose strength over time, dead ones are pruned, strong ones are flagged for consolidation
- **Conscious** (AI-driven) — strong memories are analyzed, connected via synapses, and consolidated into long-term memory

```
New entry → strength: 5
Accessed often → strength: 8 → 10 → long-term memory
Ignored → strength: 4 → 3 → 2 → 1 → 0 → pruned
```

### 3. Graph-Based Retrieval

> **Work in progress** — the data layer connecting facts and finding them is actively being developed.

Rather than simple vector similarity search, The Brain builds a weighted synapse graph between related entries. When you query your memory, it traverses this graph — finding not just direct matches but conceptually connected information. The goal is retrieval that works the way associative memory does: one fact leads to another.

This is the hardest part of the system and the one we're still refining.

### 4. LLM and Storage Agnostic

```typescript
const brain = new Brain(
  new LocalLLMAdapter(),       // or OpenAIAdapter, or your own
  new MongoStorageAdapter()    // or FileAdapter, or your own
);
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- LM Studio (or any OpenAI-compatible local LLM endpoint)

### Setup

```bash
cd backend/node-server
npm install
cp .env.example .env
# Set MONGODB_URI and LM_STUDIO_URL in .env
```

### CLI Usage

```bash
npm run brain save "Learned that hybrid routing improves local LLM accuracy significantly"
npm run brain process "what do I know about LLM routing?"
npm run brain recall "local models"
npm run brain maintenance
```

### Use as a Framework

```typescript
import { Brain, LocalLLMAdapter, MongoStorageAdapter, connectDB } from './src/index.js';

await connectDB();

const brain = new Brain(
  new LocalLLMAdapter(),
  new MongoStorageAdapter()
);

await brain.save(userId, 'some information');
const result = await brain.process(userId, 'what do I know about X?');
```

---

## Architecture

```
┌──────────────────────────────────────┐
│           Brain class                │
│                                      │
│  process()  save()  recall()         │
│  runMaintenance()                    │
└──────────┬───────────────┬───────────┘
           │               │
    ┌──────▼──────┐  ┌─────▼──────┐
    │ ILLMAdapter │  │ IStorage   │
    │             │  │ Adapter    │
    ├─────────────┤  ├────────────┤
    │ Local LLM   │  │ MongoDB    │
    │ OpenAI      │  │ (more      │
    │ (your own)  │  │  coming)   │
    └─────────────┘  └────────────┘
```

---

## Roadmap

### Done
- [x] Brain class with dependency injection
- [x] LLM adapters: `LocalLLMAdapter`, `OpenAIAdapter`
- [x] Storage adapter: `MongoStorageAdapter`
- [x] Hybrid routing: rule engine + LLM + confidence scoring
- [x] Biologically-inspired memory (decay, pruning, consolidation)
- [x] CLI: `brain process/save/recall/maintenance`
- [x] Public API: `src/index.ts`

### In Progress
- [ ] Graph-based fact retrieval — how the brain connects and searches stored knowledge
- [ ] FileAdapter (zero-config storage)

### Next
- [ ] npm publish (`@the-brain/core`)
- [ ] SQLite adapter
- [ ] MCP server (Claude integration)
- [ ] Additional LLM adapters

---

## License

AGPL-3.0 — deliberately protective. Prevents corporate capture while keeping the source open.

---

## Author

**Grzegorz Trzaskoma** — Warsaw, Poland
