import { Router, Request, Response } from 'express';
import { 
  runVaultProcessorNow, 
  runSubconsciousNow, 
  runConsciousNow 
} from '../jobs/vaultProcessor.js';
import { triggerDreamingMode, getDreamingStats } from '../jobs/dreamingMode.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Manually trigger vault processing (for testing/admin)
router.post('/process-vault', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    
    // Optional: Check if user is admin
    // if (user.email !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    console.log(`🔧 Manual vault processing triggered by user: ${user.email}`);
    
    // Run async - don't wait for completion
    runVaultProcessorNow().catch(err => {
      console.error('Vault processor error:', err);
    });

    res.json({ 
      message: 'Vault processing started',
      note: 'This process runs in the background. Check server logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering vault processor:', error);
    res.status(500).json({ error: 'Failed to start vault processing' });
  }
});

// Manually trigger dreaming mode (synapse pruning/decay)
router.post('/dreaming-mode', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    console.log(`🌙 Manual dreaming mode triggered by user: ${user.email}`);

    // Run async
    triggerDreamingMode().catch(err => {
      console.error('Dreaming mode error:', err);
    });

    res.json({
      message: 'Dreaming mode started',
      note: 'This process prunes and decays synapses. Check server logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering dreaming mode:', error);
    res.status(500).json({ error: 'Failed to start dreaming mode' });
  }
});

// Get job status
router.get('/status', async (_req: Request, res: Response) => {
  const dreamingStats = getDreamingStats();
  
  res.json({
    vaultProcessor: {
      schedule: '0 0 * * * (daily at midnight)',
      lastRun: null,
      status: 'scheduled'
    },
    dreamingMode: {
      schedule: '0 3 * * * (daily at 3:00 AM)',
      lastRun: dreamingStats.lastRun,
      lastStats: dreamingStats.lastRun ? {
        prunedCount: dreamingStats.prunedCount,
        decayedCount: dreamingStats.decayedCount,
        totalSynapses: dreamingStats.totalSynapses,
        duration: dreamingStats.endTime 
          ? `${((dreamingStats.endTime.getTime() - dreamingStats.startTime.getTime()) / 1000).toFixed(2)}s`
          : null
      } : null,
      status: 'scheduled'
    }
  });
});

// Manually trigger ONLY subconscious routine (no AI)
router.post('/subconscious', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    console.log(`🌘 Manual subconscious routine triggered by user: ${user.email}`);

    // Run and wait for stats
    const stats = await runSubconsciousNow();

    res.json({
      message: 'Subconscious routine completed',
      stats: {
        decayed: stats.decayed,
        pruned: stats.pruned,
        readyForLTM: stats.readyForLTM,
        totalProcessed: stats.totalProcessed,
      }
    });
  } catch (error) {
    console.error('Error in subconscious routine:', error);
    res.status(500).json({ error: 'Failed to run subconscious routine' });
  }
});

// Manually trigger ONLY conscious processor (AI-driven)
router.post('/conscious', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    console.log(`👁️ Manual conscious processor triggered by user: ${user.email}`);

    // Run async - can take longer due to AI
    runConsciousNow().catch(err => {
      console.error('Conscious processor error:', err);
    });

    res.json({
      message: 'Conscious processor started',
      note: 'This process runs in the background. Check server logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering conscious processor:', error);
    res.status(500).json({ error: 'Failed to start conscious processor' });
  }
});

export default router;
