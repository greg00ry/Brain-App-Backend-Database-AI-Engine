import { Router } from "express";
import { validateText } from "../middleware/validateText.js";
import { intentController } from "../controllers/intent.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * POST /intent
 * Wersja klasyczna - zwraca JSON po zakończeniu
 */
router.post("/", requireAuth, validateText, intentController);


export default router;