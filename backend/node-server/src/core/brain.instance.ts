import { Brain } from "./Brain.js";
import { llmAdapter } from "../services/ai/ai.service.js";
import { storageAdapter } from "../services/db/storage.js";

export const brain = new Brain(llmAdapter, storageAdapter);
