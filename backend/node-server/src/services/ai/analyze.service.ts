import { ILLMAdapter, cleanAndParseJSON } from "./ai.service.js";
import { ANALYZE_PROMPT } from "./prompts/analyzePrompt.js";
import { LLM } from "../../config/constants.js";

export interface AIAnalysis {
  summary: string;
  tags: string[];
  strength: number;
  category: string;
  isProcessed: boolean;
}

const FALLBACK_ANALYSIS = (text: string): AIAnalysis => ({
  summary: text.substring(0, 100) + '...',
  tags: ['unprocessed'],
  strength: 5,
  category: 'Uncategorized',
  isProcessed: false,
});

export const analyzeTextWithAI = async (text: string, llm: ILLMAdapter): Promise<AIAnalysis> => {
  const content = await llm.complete({
    systemPrompt: 'You are a technical assistant that analyzes text and returns structured JSON data. Always respond with valid JSON only.',
    userPrompt: ANALYZE_PROMPT(text),
    temperature: LLM.TEXT_ANALYZE_TEMPERATURE,
    maxTokens: LLM.TEXT_ANALYZE_MAX_TOKENS,
  });

  if (!content) {
    console.error('Failed to get AI response');
    return FALLBACK_ANALYSIS(text);
  }

  const parsed = cleanAndParseJSON(content);
  if (!parsed) {
    console.error('Failed to parse AI response:', content);
    return FALLBACK_ANALYSIS(text);
  }

  return {
    summary: parsed.summary || text.substring(0, 50),
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    strength: Number(parsed.strength) || 0,
    category: parsed.category || 'Other',
    isProcessed: true,
  };
};
