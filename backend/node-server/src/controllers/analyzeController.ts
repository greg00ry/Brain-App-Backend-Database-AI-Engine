
import { AuthRequest } from "../middleware/auth.js";
import { Request, Response } from "express";
import { proccessAndStore } from "../services/ingest/ingest.service.js";


export const analyzeController = async (req: Request, res: Response) => {

    try {
        const user = (req as AuthRequest).user!
        const { text } = req.body

        console.log(user)

        if (!text || typeof text !== "string") {
            return res.status(400).json({error: "invalid input"})
        }

        //Analiza AI
        const analysis = await proccessAndStore(user._id.toString(), text)

        return res.status(200).json(analysis)

    } catch (error) {
        // Handle unexpected errors
        console.error('Error analyzing text:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }


}