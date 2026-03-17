import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { brain } from "../core/brain.instance.js";

export const intentController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { text } = req.body as { text: string };
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await brain.process(userId.toString(), text.trim());

    res.json(result);
  }
);

export default intentController;
