
import { analyzeTextWithAI } from "../services/analyzeTextWithAI.js"
import { Request, Response } from "express";


export const analyzeController = async (req: Request, res: Response) => {

    try {
        const { text } = req.body

        if (!text || typeof text !== "string") {
            return res.status(400).json({error: "invalid input"})
        }

        //Analiza AI
        const analysis = await analyzeTextWithAI(text)

        return res.status(200).json(analysis)

    } catch (error) {
        // Handle unexpected errors
        console.error('Error analyzing text:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }


}