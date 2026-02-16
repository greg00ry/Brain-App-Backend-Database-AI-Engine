import { VaultEntry } from "../../models/VaultEntry.js";
import { AIAnalysis } from "../ai/analyzeTextWithAI.js";

export const saveAnalyzedEntry = async (userId: string, rawText: string, analysis: AIAnalysis) => {
    const entry = new VaultEntry({
        userId,
        rawText,
        ...analysis
    })
    return await entry.save()
}