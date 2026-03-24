import { Brain } from "./Brain.js";
import { llmAdapter } from "../services/ai/ai.service.js";
import { storageAdapter } from "../services/db/storage.js";
import { OpenAIAPIEmbeddingAdapter } from "../adapters/embedding/OpenAIAPIEmbeddingAdapter.js";

const embeddingAdapter = new OpenAIAPIEmbeddingAdapter(
  "http://localhost:11434/v1/embeddings",
  "nomic-embed-text",
);

export const brain = new Brain(llmAdapter, storageAdapter, embeddingAdapter);
