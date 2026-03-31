import { Brain, OpenAICompatibleAdapter, OpenAICompatibleEmbeddingAdapter } from "@the-brain/core";
import { SQLiteStorageAdapter } from "@the-brain/adapter-sqlite";

// ─── Setup ────────────────────────────────────────────────────────────────────

const llm = new OpenAICompatibleAdapter(
  "http://localhost:11434/v1/chat/completions",
  "llama3",
);

const embedding = new OpenAICompatibleEmbeddingAdapter(
  "http://localhost:11434/v1/embeddings",
  "nomic-embed-text",
);

const storage = new SQLiteStorageAdapter("./.brain");

const brain = new Brain(llm, storage, embedding);

// ─── Custom action ────────────────────────────────────────────────────────────

await brain.loadActions();

await brain.registerAction(
  "TRADING_SIGNAL",
  "user asks about trading signals, market analysis, or investment ideas",
  async (_userId, text, { synapticTree, hasContext }) => {
    const context = hasContext ? `\nRelevant memory:\n${synapticTree}` : "";
    const answer = await llm.complete({
      userPrompt: `You are a trading assistant. Analyze: "${text}"${context}\nProvide a concise trading insight.`,
      temperature: 0.3,
      maxTokens: 200,
    });
    return answer ?? "Could not analyze.";
  }
);

// ─── Run ──────────────────────────────────────────────────────────────────────

const result = await brain.process("user-1", "Bitcoin is looking bullish above 50k");
console.log(`[${result.action}] ${result.answer}`);

const result2 = await brain.process("user-1", "what do I know about Bitcoin?");
console.log(`[${result2.action}] ${result2.answer}`);
