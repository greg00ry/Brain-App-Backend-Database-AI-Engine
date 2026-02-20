// src/routes/vaultRoutes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUnifiedVault, deleteVaultEntry } from '../controllers/vaultController.js';
import { asyncHandler } from '../utils/typeHelper.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(getUnifiedVault));
router.delete('/:id', requireAuth, asyncHandler(deleteVaultEntry));

export default router;