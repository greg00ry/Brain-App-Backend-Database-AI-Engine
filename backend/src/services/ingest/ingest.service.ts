import { analyzeTextWithAI } from "../ai/analyze.service.js";
import { saveAnalyzedEntry } from "../db/entry.service.js";

export const proccessAndStore = async (userId: string, text: string) => {
    //Analiza
    const analysis = await analyzeTextWithAI(text)

    //Zapis
    const savedEntry = await saveAnalyzedEntry(userId, text, analysis)

    return savedEntry
}