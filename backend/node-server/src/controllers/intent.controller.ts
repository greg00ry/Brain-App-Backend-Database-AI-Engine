import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { classifyIntent } from "../services/ai/intent.service.js";
import { proccessAndStore } from "../services/ingest/ingest.service.js";

export const intentController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { text } = req.body as { text: string };
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [intentResult, entry] = await Promise.all([
      classifyIntent({ userText: text.trim(), userId: userId.toString() }),
      proccessAndStore(userId.toString(), text.trim()),
    ]);

    res.json({
      action: intentResult.action,
      answer: intentResult.answer,
      entryId: entry._id,
    });
  }
);

export default intentController;
