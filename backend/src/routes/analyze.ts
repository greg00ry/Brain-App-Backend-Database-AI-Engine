import { Router, Request, Response } from 'express';
import { analyzeTextWithAI } from '../services/analyzeTextWithAI.js';


const router = Router();





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
