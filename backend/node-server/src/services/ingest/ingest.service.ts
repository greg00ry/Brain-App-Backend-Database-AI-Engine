import { analyzeTextWithAI } from "../ai/analyze.service.js";
import { ILLMAdapter } from "../../adapters/llm/ILLMAdapter.js";
import { IStorageAdapter } from "../../adapters/storage/IStorageAdapter.js";
import { IEmbeddingAdapter } from "../../adapters/embedding/IEmbeddingAdapter.js";

export const proccessAndStore = async (
  userId: string,
  text: string,
  llm: ILLMAdapter,
  storage: IStorageAdapter,
  embedding?: IEmbeddingAdapter,
) => {
  const analysis = await analyzeTextWithAI(text, llm);
  const entry = await storage.createEntry(userId, text, analysis);

  if (embedding) {
    try {
      const vector = await embedding.embed(text);
      await storage.updateEntryEmbedding(entry._id.toString(), vector);
    } catch (err) {
      console.warn('[Ingest] Embedding generation failed (non-fatal):', err);
    }
  }

  return entry;
};
