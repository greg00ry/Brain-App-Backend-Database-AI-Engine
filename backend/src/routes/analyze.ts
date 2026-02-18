import { Router, Request, Response } from 'express';
import { analyzeController } from '../controllers/analyzeController.js';
import { validateText } from '../middleware/validateText.js'; 
import { requireAuth } from '../middleware/auth.js';

const router = Router();


//dodac middleware require auth
router.post("/",requireAuth, validateText, analyzeController)

export default router



