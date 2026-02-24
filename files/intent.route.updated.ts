import { Router } from "express";
import { validateText } from "../middleware/validateText.js";
import { intentController } from "../controllers/intent.controller.js";
import { intentControllerStreaming } from "../controllers/intent.controller.streaming.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * POST /intent
 * Wersja klasyczna - zwraca JSON po zakończeniu
 */
router.post("/", requireAuth, validateText, intentController);

/**
 * POST /intent/stream
 * Wersja ze streamingiem - wysyła progresywne update'y
 */
router.post("/stream", requireAuth, validateText, intentControllerStreaming);

export default router;
