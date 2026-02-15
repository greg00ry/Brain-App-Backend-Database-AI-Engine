import { Router, Request, Response } from 'express';
import { analyzeController } from '../controllers/analyzeController.js';
import { validateText } from '../middleware/validateText.js'; 

const router = Router();

router.post("/", validateText, analyzeController)

export default router



