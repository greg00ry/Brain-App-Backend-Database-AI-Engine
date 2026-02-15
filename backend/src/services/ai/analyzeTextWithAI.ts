
import { ANALYZE_PROMPT } from "./prompts/analyzePrompt.js";

interface AIAnalysis {
  summary: string;
  tags: string[];
  strength: number;
  category: string;
  isProcessed: boolean;
}


export const analyzeTextWithAI = async (text: string): Promise<AIAnalysis> => {
    
    

    

    const prompt = ANALYZE_PROMPT(text);

          const aiResponse = await fetch('http://localhost:1234/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'local-model',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a technical assistant that analyzes text and returns structured JSON data. Always respond with valid JSON only.',
                  },
                  {
                    role: 'user',
                    content: prompt,
                  },
                ],
                temperature: 0.7,
                max_tokens: 500,
              }),
            });

            if (!aiResponse.ok) {
              throw new Error("AI service unavailable")
            }

            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || '';

            // Parse JSON from AI response
            
            
            try {
              // Try to extract JSON from the response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (!jsonMatch) throw new Error("No JSON found")
              
              const parsed = JSON.parse(jsonMatch[0])

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
