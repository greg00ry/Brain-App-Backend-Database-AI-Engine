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

## Quick Start

```bash
npm install @the-brain/core @the-brain/adapter-files
```

```typescript
import { Brain, OpenAICompatibleAdapter, OpenAICompatibleEmbeddingAdapter } from "@the-brain/core";
import { FileStorageAdapter } from "@the-brain/adapter-files";

const brain = new Brain(
  new OpenAICompatibleAdapter("http://localhost:11434/v1/chat/completions", "llama3.2"),
  new FileStorageAdapter("./.brain"),
  new OpenAICompatibleEmbeddingAdapter("http://localhost:11434/v1/embeddings", "nomic-embed-text"),
);

await brain.loadActions();

const result = await brain.process("user-1", "I prefer functional programming");
console.log(result.answer);
```

Zero config. No MongoDB. No cloud. Works with Ollama.

> **Note:** Embeddings require `nomic-embed-text` in Ollama (`ollama pull nomic-embed-text`). Without them, recall falls back to keyword search. For full Graph RAG and synapses, use `@the-brain/adapter-mongo`.

---

## Packages

| Package | Description | npm |
|---|---|---|
| `@the-brain/core` | Core framework — Brain class, intent routing, memory, adapters | [![npm](https://img.shields.io/npm/v/@the-brain/core)](https://www.npmjs.com/package/@the-brain/core) |
| `@the-brain/adapter-mongo` | MongoDB storage adapter (enables Graph RAG, synapses) | [![npm](https://img.shields.io/npm/v/@the-brain/adapter-mongo)](https://www.npmjs.com/package/@the-brain/adapter-mongo) |
| `@the-brain/adapter-files` | File-based storage adapter (zero config, no DB needed) | [![npm](https://img.shields.io/npm/v/@the-brain/adapter-files)](https://www.npmjs.com/package/@the-brain/adapter-files) |
| `@the-brain/cli` | Interactive CLI — chat with your Brain from terminal | [![npm](https://img.shields.io/npm/v/@the-brain/cli)](https://www.npmjs.com/package/@the-brain/cli) |

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
- **Semantic search** — embeddings via any OpenAI-compatible API

### 3. Dynamic Action Registry
Actions stored in DB, not hardcoded. Add a new action without editing prompts.

```typescript
await brain.registerAction(
  "TRADING_SIGNAL",
  "user asks about trading signals or market analysis",
  async (userId, text, { synapticTree, hasContext }, llm) => {
    const context = hasContext ? `\nRelevant memory:\n${synapticTree}` : "";
    const answer = await llm.complete({
      userPrompt: `Analyze trading signal: "${text}"${context}`,
      temperature: 0.3,
      maxTokens: 200,
    });
    return answer ?? "Could not analyze.";
  }
);
```

Prompt rebuilds automatically from registered actions.

### 4. LLM Agnostic
One adapter works with everything that speaks OpenAI-compatible API:

```typescript
// Ollama (local, recommended)
new OpenAICompatibleAdapter("http://localhost:11434/v1/chat/completions", "llama3")

// LM Studio (local)
new OpenAICompatibleAdapter("http://localhost:1234/v1/chat/completions", "local-model")

// OpenAI (cloud)
new OpenAICompatibleAdapter("https://api.openai.com/v1/chat/completions", "gpt-4o", apiKey)
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│           @the-brain/core               │
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
 Any OpenAI  Files /   Any OpenAI
 compatible  MongoDB /  compatible
    API      SQLite *      API

* coming soon
```

---

## Storage Adapters

| Adapter | Setup | Features |
|---|---|---|
| `FileStorageAdapter` | Zero config | Basic memory, keyword search, chat history |
| `MongoStorageAdapter` | MongoDB required | + Graph RAG, synapses, semantic search, consolidation |

```typescript
// Zero config
import { FileStorageAdapter } from "@the-brain/adapter-files";
new FileStorageAdapter("./.brain")

// Full features
import { MongoStorageAdapter } from "@the-brain/adapter-mongo";
new MongoStorageAdapter() // reads MONGODB_URI from env
```

---

## With MongoDB (Full Features)

```bash
npm install @the-brain/core @the-brain/adapter-mongo mongoose
```

```typescript
import { Brain, OpenAICompatibleAdapter, OpenAICompatibleEmbeddingAdapter } from "@the-brain/core";
import { MongoStorageAdapter, connectDB } from "@the-brain/adapter-mongo";

await connectDB(); // MONGODB_URI env var

const brain = new Brain(
  new OpenAICompatibleAdapter("http://localhost:11434/v1/chat/completions", "llama3"),
  new MongoStorageAdapter(),
  new OpenAICompatibleEmbeddingAdapter("http://localhost:11434/v1/embeddings", "nomic-embed-text"),
);

await brain.loadActions();
```

---

## CLI

```bash
npm install -g @the-brain/cli
```

```bash
# Interactive chat (default)
brain

# Single commands
brain process "What do I know about TypeScript?"
brain save "I prefer functional programming"
brain recall "programming preferences"
brain maintenance
```

Configure via `.env`:

```bash
MONGODB_URI=mongodb://localhost:27017/the-brain
LLM_API_URL=http://localhost:11434/v1/chat/completions
LLM_MODEL=llama3
EMBEDDING_API_URL=http://localhost:11434/v1/embeddings
EMBEDDING_MODEL=nomic-embed-text
```

---

## Example App

See [`example-app/`](./example-app) for a minimal working example:
- FileStorageAdapter (no MongoDB)
- Custom `TRADING_SIGNAL` action
- Ollama as LLM backend
- 40 lines of code

---

## Known Limitations

- **Custom action handlers** — `registerAction` works but handlers don't survive restarts (re-register on startup)
- **FileAdapter** — no Graph RAG, no synapses; semantic search requires embedding adapter
- **No SQLite adapter** — coming next

---

## Roadmap

### Now
- [x] `@the-brain/core` on npm
- [x] `@the-brain/adapter-mongo` on npm
- [x] `@the-brain/adapter-files` on npm
- [x] `@the-brain/cli` on npm
- [x] Hybrid intent routing (rules + LLM + confidence)
- [x] Biologically-inspired memory (decay, consolidation, Graph RAG)
- [x] Dynamic action registry
- [x] Ollama-only setup (one local LLM service)
- [x] 26 passing tests, CI on GitHub Actions

### Next
- [x] MCP server (`@the-brain/mcp`) — Claude Code / Cursor integration
- [ ] Semantic search in FileStorageAdapter (cosine similarity without MongoDB)
- [ ] SQLite adapter
- [ ] Persistent action handlers
- [ ] API documentation

### Later
- [ ] PostgreSQL adapter
- [ ] Shell integration (`brain-do`, `brain-explain`)
- [ ] Additional LLM adapters (Anthropic native, Gemini)

---

## Why AGPL-3.0?

Prevents corporate capture. Network copyleft means cloud services built on The Brain must share source. Aligns with the mission — this is infrastructure that should stay open.

---

## Author

**Grzegorz Trzaskoma** — Warsaw, Poland

Building privacy-first AI infrastructure. Local LLMs should be competitive with cloud. Users should own their AI.
