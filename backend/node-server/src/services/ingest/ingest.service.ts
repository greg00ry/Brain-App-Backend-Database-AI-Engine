import { analyzeTextWithAI } from "../ai/analyze.service.js";
import { storageAdapter } from "../db/storage.js";

export const proccessAndStore = async (userId: string, text: string) => {
  const analysis = await analyzeTextWithAI(text);
  return storageAdapter.createEntry(userId, text, analysis);
};
