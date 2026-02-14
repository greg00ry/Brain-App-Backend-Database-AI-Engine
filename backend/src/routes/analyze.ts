import { Router, Request, Response } from 'express';

const router = Router();

interface AIAnalysis {
  summary: string;
  tags: string[];
  strength: number;
  category: string;
  isProcessed: boolean;
}

let isProcessed = false
export const analyzeTextWithAI = async (text: string): Promise<AIAnalysis> => {
  

    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for anylisis")
    }

    const prompt = `Analyze the following text and return a JSON object with these exact fields:
- summary: A concise summary (max 100 words)
- tags: An array of 3-5 relevant tags
- strength: A number from 1-10 indicating how important/memorable this information is (1=trivial, 10=critical)
- category: A single category name (e.g., "Work", "Personal", "Health", "Finance", "Learning", "Ideas")

Text to analyze:
"""
${text}
"""

Return ONLY valid JSON, no additional text.`;

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
    let analysis: AIAnalysis
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch){
        analysis = JSON.parse(jsonMatch[0])
        isProcessed = true
      } else {
        throw new Error("No JSON found in response")
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
    return {...analysis, isProcessed}

  
}




// Analyze text using LM Studio
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text } = req.body
  
    const analysis = await analyzeTextWithAI(text)
  
    res.json(analysis)
  } catch (error: any) {
    console.error("Error in analyze router:", error)
    if (error.message === "AI service unavailable") {
      return res.status(503).json({error: error.message})
    }
    res.status(500).json({error: "Failed to analyze text"})
  }
});

export default router;
