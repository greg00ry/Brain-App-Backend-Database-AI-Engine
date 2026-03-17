import { AuthRequest } from "../middleware/auth.js";
import { Request, Response } from "express";
import { brain } from "../core/brain.instance.js";

export const analyzeController = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "invalid input" });
    }

    const result = await brain.save(user._id.toString(), text);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error analyzing text:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
