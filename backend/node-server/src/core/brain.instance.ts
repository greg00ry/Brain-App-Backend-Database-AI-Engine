import { Brain } from "./Brain.js";
import { llmAdapter } from "../services/ai/ai.service.js";
import { storageAdapter } from "../services/db/storage.js";
import { OllamaEmbeddingAdapter } from "../adapters/embedding/OllamaEmbeddingAdapter.js";

const embeddingAdapter = new OllamaEmbeddingAdapter();

export const brain = new Brain(llmAdapter, storageAdapter, embeddingAdapter);
