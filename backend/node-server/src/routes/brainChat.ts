// src/routes/brainChat.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { streamBrainResponse } from '../controllers/brainChatController.js';
import { asyncHandler } from '../utils/typeHelper.js';
const router = Router();

// Używamy wrappera, żeby router i kontroler się dogadały
router.post('/stream', requireAuth, asyncHandler(streamBrainResponse));

export default router;