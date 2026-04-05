# @the-brain/core

LLM-agnostic cognitive memory framework with biologically-inspired decay, synapses, and Graph RAG.

## What it does

- **Memory that forgets** — entries decay over time, strong ones get consolidated to long-term memory
- **Synaptic connections** — weighted links between related entries, traversed like a graph
- **Hybrid intent routing** — AI classification with rule-based fallback (works with local or cloud LLMs)
- **User profile adaptation** — Brain learns your communication style and adapts responses
- **PDF ingest** — feed documents as permanent memory (`isPermanent=true`, never decays)

## Install

```bash
npm install @the-brain/core
# plus a storage adapter:
npm install @the-brain/adapter-mongo   # MongoDB (recommended)
npm install @the-brain/adapter-sqlite  # SQLite (zero-config)
```

## Quick start

```typescript
import { Brain, OpenAICompatibleAdapter } from "@the-brain/core";
import { SQLiteStorageAdapter } from "@the-brain/adapter-sqlite";

const brain = new Brain(
  new OpenAICompatibleAdapter(
    "http://localhost:11434/v1/chat/completions", // any OpenAI-compatible endpoint
    "llama3.2"
  ),
  new SQLiteStorageAdapter("./.brain")
);

await brain.loadActions();

// Save a fact
await brain.save("user-1", "I prefer TypeScript over JavaScript");

// Ask a question — Brain routes intent and searches memory
const result = await brain.process("user-1", "What do I prefer for coding?");
console.log(result.answer);

// Direct memory recall
const context = await brain.recall("user-1", "TypeScript preferences");
console.log(context.synapticTree);
```

## Works with any LLM

```typescript
// Local (Ollama, LM Studio)
new OpenAICompatibleAdapter("http://localhost:11434/v1/chat/completions", "llama3.2")

// Groq (free, fast)
new OpenAICompatibleAdapter(
  "https://api.groq.com/openai/v1/chat/completions",
  "llama-3.3-70b-versatile",
  process.env.GROQ_API_KEY
)

// OpenAI
new OpenAICompatibleAdapter(
  "https://api.openai.com/v1/chat/completions",
  "gpt-4o",
  process.env.OPENAI_API_KEY
)
```

## Custom actions

```typescript
await brain.registerAction(
  "TRADING_SIGNAL",
  "user asks about trading signals or market analysis",
  async (userId, text, { synapticTree }, llm) => {
    // your handler logic
    return "Signal: BUY BTC — confidence 72%";
  }
);
```

## Memory lifecycle

```
Save entry (strength=5)
  → Conscious processor: analyze, build synapses, consolidate strong entries to LTM
  → Subconscious routine: decay inactive entries, prune dead ones
  → Long-term memory: strength ≥ 10 → permanent summary created
```

Run maintenance manually or let Brain trigger it automatically every N saves:

```typescript
const { subStats, consciousStats } = await brain.runMaintenance();
```

## License

AGPL-3.0 — [github.com/greg00ry/the-brain](https://github.com/greg00ry/the-brain)
