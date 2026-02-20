
import { callLMStudio, cleanAndParseJSON } from "./ai.service.js";
import { ANALYZE_PROMPT } from "./prompts/analyzePrompt.js";

export interface AIAnalysis {
  summary: string;
  tags: string[];
  strength: number;
  category: string;
  isProcessed: boolean;
}


export const analyzeTextWithAI = async (text: string): Promise<AIAnalysis> => {
    
    

    

    const prompt = ANALYZE_PROMPT(text);
          const aiResponse = await callLMStudio({
            prompt: prompt,
            content: 'You are a technical assistant that analyzes text and returns structured JSON data. Always respond with valid JSON only.',
            temperature: 0.7,
            max_tokens: 500
          })
          

            if (!aiResponse.ok) {
              throw new Error("AI service unavailable")
            }

            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || '';

            // Parse JSON from AI response
            
            
            try {
              // Try to extract JSON from the response
              const parsed = cleanAndParseJSON(content)
              if (!parsed) throw new Error("No JSON found")
              
              

              return {
                summary: parsed.summary || text.substring(0, 50),
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                strength: Number(parsed.strength) || 0,
                category: parsed.category || 'Other',
                isProcessed: true
              }
            } catch {
              console.error('Failed to parse AI response:', content);
              return {
                summary: text.substring(0, 100) + '...',
                tags: ['unprocessed'],
                strength: 5,
                category: 'Uncategorized',
                isProcessed: false
              };
            }
}
