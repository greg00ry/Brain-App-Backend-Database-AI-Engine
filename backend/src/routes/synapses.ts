import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { Synapse } from '../models/Synapse.js';
import { VaultEntry } from '../models/VaultEntry.js';
import {
  fireSynapse,
  fireMultipleSynapses,
  getConnectedContext,
  getSynapseStats,
  weakenSynapse,
  getStrongestSynapses,
} from '../services/synapses/synapse.service.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all synapses for user's entries
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    
    // Get user's entry IDs
    const userEntries = await VaultEntry.find({ userId: user._id.toString() }).select('_id');
    const entryIds = userEntries.map(e => e._id);

    const synapses = await Synapse.find({
      $or: [
        { from: { $in: entryIds } },
        { to: { $in: entryIds } },
      ],
    })
      .populate('from', 'summary tags category')
      .populate('to', 'summary tags category')
      .sort({ weight: -1 });

    res.json(synapses);
  } catch (error) {
    console.error('Error fetching synapses:', error);
    res.status(500).json({ error: 'Failed to fetch synapses' });
  }
});

// Get synapse stats for the user
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const stats = await getSynapseStats(user._id.toString());
    res.json(stats);
  } catch (error) {
    console.error('Error fetching synapse stats:', error);
    res.status(500).json({ error: 'Failed to fetch synapse stats' });
  }
});

// Get strongest synapses across the network
router.get('/strongest', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get user's entry IDs
    const userEntries = await VaultEntry.find({ userId: user._id.toString() }).select('_id');
    const entryIds = userEntries.map(e => e._id);

    const synapses = await Synapse.find({
      $and: [
        { from: { $in: entryIds } },
        { to: { $in: entryIds } },
        { weight: { $gte: 0.5 } },
      ],
    })
      .populate('from', 'summary tags category')
      .populate('to', 'summary tags category')
      .sort({ weight: -1 })
      .limit(limit);

    res.json(synapses);
  } catch (error) {
    console.error('Error fetching strongest synapses:', error);
    res.status(500).json({ error: 'Failed to fetch strongest synapses' });
  }
});

// Get connected context for a neuron (associative navigation)
router.get('/context/:entryId', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { entryId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    // Verify the entry belongs to the user
    const entry = await VaultEntry.findOne({
      _id: entryId,
      userId: user._id.toString(),
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const connections = await getConnectedContext(entryId, limit);

    // Filter to only include user's entries
    const userConnections = connections.filter(
      c => c.entry.userId === user._id.toString()
    );

    res.json({
      sourceEntry: entry,
      connections: userConnections.map(c => ({
        entry: {
          _id: c.entry._id,
          summary: c.entry.summary,
          tags: c.entry.tags,
          category: c.entry.category,
          createdAt: c.entry.createdAt,
        },
        weight: c.synapse.weight,
        stability: c.synapse.stability,
        lastFired: c.synapse.lastFired,
        direction: c.direction,
      })),
    });
  } catch (error) {
    console.error('Error fetching connected context:', error);
    res.status(500).json({ error: 'Failed to fetch connected context' });
  }
});

// Fire a synapse between two entries
router.post('/fire', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { entryId1, entryId2 } = req.body;

    if (!entryId1 || !entryId2) {
      return res.status(400).json({ error: 'entryId1 and entryId2 are required' });
    }

    // Verify both entries belong to the user
    const entries = await VaultEntry.find({
      _id: { $in: [entryId1, entryId2] },
      userId: user._id.toString(),
    });

    if (entries.length !== 2) {
      return res.status(404).json({ error: 'One or both entries not found' });
    }

    const synapse = await fireSynapse(entryId1, entryId2);
    res.json(synapse);
  } catch (error) {
    console.error('Error firing synapse:', error);
    res.status(500).json({ error: 'Failed to fire synapse' });
  }
});

// Fire multiple synapses at once
router.post('/fire-multiple', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { entryIds } = req.body;

    if (!Array.isArray(entryIds) || entryIds.length < 2) {
      return res.status(400).json({ error: 'entryIds must be an array with at least 2 entries' });
    }

    // Verify all entries belong to the user
    const entries = await VaultEntry.find({
      _id: { $in: entryIds },
      userId: user._id.toString(),
    });

    if (entries.length !== entryIds.length) {
      return res.status(404).json({ error: 'Some entries not found' });
    }

    await fireMultipleSynapses(entryIds);
    res.json({ success: true, message: `Fired synapses between ${entryIds.length} entries` });
  } catch (error) {
    console.error('Error firing multiple synapses:', error);
    res.status(500).json({ error: 'Failed to fire synapses' });
  }
});

// Weaken a synapse (user-controlled forgetting)
router.post('/weaken', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { entryId1, entryId2, amount } = req.body;

    if (!entryId1 || !entryId2) {
      return res.status(400).json({ error: 'entryId1 and entryId2 are required' });
    }

    // Verify both entries belong to the user
    const entries = await VaultEntry.find({
      _id: { $in: [entryId1, entryId2] },
      userId: user._id.toString(),
    });

    if (entries.length !== 2) {
      return res.status(404).json({ error: 'One or both entries not found' });
    }

    const synapse = await weakenSynapse(entryId1, entryId2, amount);
    
    if (synapse) {
      res.json(synapse);
    } else {
      res.json({ message: 'Synapse was deleted (weight reached 0)' });
    }
  } catch (error) {
    console.error('Error weakening synapse:', error);
    res.status(500).json({ error: 'Failed to weaken synapse' });
  }
});

// Delete a synapse manually
router.delete('/:fromId/:toId', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { fromId, toId } = req.params;

    // Verify both entries belong to the user
    const entries = await VaultEntry.find({
      _id: { $in: [fromId, toId] },
      userId: user._id.toString(),
    });

    if (entries.length !== 2) {
      return res.status(404).json({ error: 'One or both entries not found' });
    }

    // Ensure consistent ordering
    const [from, to] = fromId < toId ? [fromId, toId] : [toId, fromId];

    const result = await Synapse.findOneAndDelete({ from, to });

    if (!result) {
      return res.status(404).json({ error: 'Synapse not found' });
    }

    res.json({ message: 'Synapse deleted' });
  } catch (error) {
    console.error('Error deleting synapse:', error);
    res.status(500).json({ error: 'Failed to delete synapse' });
  }
});

export default router;
