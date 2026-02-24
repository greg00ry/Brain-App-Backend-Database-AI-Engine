import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { classifyIntent } from "../services/ai/intent.service.js";
import { IntentResult } from "../services/ai/intent.types.js";

/**
 * POST /intent
 * Zakłada że:
 *  - requireAuth już zweryfikował JWT i ustawił req.user
 *  - validateText już sprawdził pole 'text'
 */
export const intentController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { text } = req.body as { text: string };

  // req.user dostępny dzięki AuthRequest — można np. logować kto wysłał zapytanie
  console.debug(`[IntentController] Zapytanie od użytkownika: ${req.user?._id}`);

  const result = await classifyIntent(text.trim());
  res.json(result);
});
