import { analyzeTextWithAI } from "../ai/analyze.service.js";
import { ILLMAdapter } from "../../adapters/llm/ILLMAdapter.js";
import { IStorageAdapter } from "../../adapters/storage/IStorageAdapter.js";

export const proccessAndStore = async (
  userId: string,
  text: string,
  llm: ILLMAdapter,
  storage: IStorageAdapter
) => {
  const analysis = await analyzeTextWithAI(text, llm);
  return storage.createEntry(userId, text, analysis);
};
