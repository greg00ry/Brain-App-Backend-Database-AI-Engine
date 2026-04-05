# Why I Built a Memory Framework for Local LLMs (And Why Vector Databases Aren't Enough)

Everyone building AI agents hits the same wall: memory.

You add a vector database. You store embeddings. You retrieve the top-K similar chunks. And it kind of works — until it doesn't. The agent retrieves something from three months ago that's no longer relevant. It treats a passing thought the same as a core belief. It has no sense of what matters and what doesn't.

I spent months trying to fix this with better prompts, smarter retrieval, longer context windows. None of it solved the fundamental problem.

The problem isn't retrieval. It's that **AI agents don't forget**.

---

## How Human Memory Actually Works

Human memory isn't a database. It's a dynamic system with at least three properties that vector DBs completely ignore:

**1. Decay** — unused memories fade. You remember your best friend's birthday. You don't remember what you had for lunch two Tuesdays ago. Both were stored, but one was reinforced, the other wasn't.

**2. Consolidation** — important patterns move from short-term to long-term memory. You don't remember every JavaScript syntax error you've ever made. You remember the *principle* you learned from them.

**3. Association** — memories connect to each other. "Python" connects to "async", which connects to "event loop", which connects to that one bug you spent a week debugging. Similarity search gives you proximity. Associations give you context.

Vector databases give you none of this. They're very good filing cabinets. Human memory isn't a filing cabinet.

---

## What I Built Instead

I built [The Brain](https://github.com/greg00ry/the-brain) — a TypeScript framework for AI agents that implements all three properties.

Here's the core idea:

### Strength-based decay

Every memory entry has a `strength` field (0–10). Entries lose strength over time. When strength hits 0, the entry is pruned. Important entries get reinforced through access and consolidation — they stick around. Trivial ones disappear.

```
Important memory: strength 10 → 9 → 8 → 7 (slow decay, stays for months)
Trivial memory:   strength  3 → 2 → 1 → 0 (pruned in days)
```

This runs as a "subconscious routine" — pure math, no LLM needed, deterministic.

### Conscious consolidation

Strong entries (strength ≥ 10) get consolidated by an LLM into long-term memory groups. The LLM doesn't store raw text — it extracts principles, patterns, and summaries. Like human sleep consolidation.

### Graph RAG with synapses

Entries aren't just stored — they're connected. When the agent processes new information, it builds weighted connections (synapses) between related entries. Retrieval traverses this graph, not just similarity scores.

```
"Python async" → synapse → "event loop" → synapse → "concurrency bug March 2024"
```

This gives you *context*, not just proximity.

---

## The Other Problem: Local LLMs Are Unreliable

I wanted this to work with local models — DeepSeek, Llama, Mistral — not just GPT-4. But local models have ~70-80% accuracy on intent classification. That's not good enough for production.

The solution was a hybrid routing system:

```
User input
    ↓
Rule engine (deterministic, instant)
    → confidence ≥ 90? → done, skip LLM entirely
    → confidence < 90? → LLM classification
                            → confidence ≥ 75? → trust LLM
                            → confidence < 75? → rule fallback
                                                → default action
```

In my testing the accuracy improvement is significant — but I'm one person with one setup. This is still early and I need more people running it against different models and use cases to get real numbers.

This is the actual insight: **you don't need a better model, you need better infrastructure around the model**.

---

## How It Works in Practice

The framework is LLM-agnostic and storage-agnostic. You bring your own LLM and storage:

```typescript
import { Brain, OpenAICompatibleAdapter } from "@the-brain/core";
import { FileStorageAdapter } from "@the-brain/adapter-files";

// Works with Ollama, LM Studio, OpenAI — anything OpenAI-compatible
const brain = new Brain(
  new OpenAICompatibleAdapter("http://localhost:11434/v1/chat/completions", "llama3"),
  new FileStorageAdapter("./.brain"), // or MongoStorageAdapter for full features
);

await brain.loadActions();

// Brain decides what to do based on intent
const result = await brain.process("user-1", "I prefer functional programming");
// → saves to memory, responds with personality

const result2 = await brain.process("user-1", "what do you know about my preferences?");
// → retrieves from memory, answers in context
```

You can extend it with custom actions:

```typescript
await brain.registerAction(
  "TRADING_SIGNAL",
  "user asks about trading signals or market analysis",
  async (userId, text, { synapticTree, hasContext }, llm) => {
    const context = hasContext ? `\nRelevant memory:\n${synapticTree}` : "";
    const answer = await llm.complete({
      userPrompt: `Analyze: "${text}"${context}`,
      temperature: 0.3,
      maxTokens: 200,
    });
    return answer ?? "Could not analyze.";
  }
);
```

The prompt rebuilds automatically. You don't touch any prompt files.

---

## How It Compares

| | The Brain | LangChain | Mem0 |
|---|---|---|---|
| Focus | Cognitive memory | LLM pipelines | Memory as SaaS |
| Memory decay | ✅ strength-based | ❌ | ❌ |
| Graph RAG | ✅ synapses | ❌ | ❌ |
| Local-first | ✅ | ✅ | ❌ (cloud default) |
| Language | TypeScript | Python | Python |
| Storage | your choice | your choice | their servers |
| Cost | $0 | $0 | free tier → $$ |

**LangChain** solves a different problem — LLM pipelines, tool use, chains. It treats memory as an afterthought (`ConversationBufferMemory` is just a list of messages). You could use both: LangChain for orchestration, The Brain for memory.

**Mem0** is the closest competitor. Good product, but SaaS-first — your data goes to their servers, you pay for API calls, you're locked in. The Brain runs entirely on your machine.

---

## The Packages

```bash
# Minimal setup (no database needed)
npm install @the-brain/core @the-brain/adapter-files

# Full features (Graph RAG, synapses, semantic search)
npm install @the-brain/core @the-brain/adapter-mongo mongoose

# CLI
npm install -g @the-brain/cli
```

Four packages on npm: `@the-brain/core`, `@the-brain/adapter-mongo`, `@the-brain/adapter-files`, `@the-brain/cli`.

---

## What's Next

The immediate priority is an MCP server (`@the-brain/mcp`) — so The Brain can plug directly into Claude Code, Cursor, and Cline as a memory layer. Every AI coding session would have persistent, decaying, consolidating memory. You'd ask "what did I decide about this architecture last week?" and get a real answer.

After that: SQLite adapter, persistent action handlers, shell integration.

## This Is Still Early — I Need Your Help

I built this alone. That means I've tested it on my setup, with my models, with my use cases.

I don't know how it behaves with Mistral. I don't know if the decay constants make sense for someone using it daily vs weekly. I don't know which parts of the API feel wrong until someone else tries to use them.

If you try it and something breaks, doesn't make sense, or could work better — open an issue or leave a comment. The direction of this project will be shaped by who uses it and what they're trying to build.

That's not a disclaimer. It's a genuine invitation.

---

## The Bigger Picture

We're in an early period where local LLMs are genuinely competitive with cloud — if you build the right infrastructure around them. The gap isn't the model quality anymore. It's the tooling.

Most of the tooling being built right now is cloud-first, SaaS-first, subscription-first. There's a real opportunity for local-first infrastructure that gives developers the same capabilities without the lock-in.

That's what The Brain is trying to be.

---

GitHub: [github.com/greg00ry/the-brain](https://github.com/greg00ry/the-brain)

npm: [@the-brain/core](https://www.npmjs.com/package/@the-brain/core)

Feedback welcome — especially if you've hit the same memory problems and solved them differently.
