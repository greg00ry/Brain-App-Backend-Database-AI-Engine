import { Router, Request, Response } from 'express';
import { NeuralNetwork } from '../models/NeuralNetwork.js';
import { VaultEntry } from '../models/VaultEntry.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all neural connections for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connections = await NeuralNetwork.find({ userId: user._id.toString() })
      .sort({ createdAt: -1 });
    res.json(connections);
  } catch (error) {
    console.error('Error fetching neural connections:', error);
    res.status(500).json({ error: 'Failed to fetch neural connections' });
  }
});

// Get a single neural connection with populated entries
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connection = await NeuralNetwork.findOne({ 
      _id: req.params.id, 
      userId: user._id.toString() 
    });

    if (!connection) {
      return res.status(404).json({ error: 'Neural connection not found' });
    }

    // Get the connected entries
    const connectedEntries = await VaultEntry.find({
      _id: { $in: connection.connection },
      userId: user._id.toString()
    });

    res.json({
      ...connection.toObject(),
      connectedEntries
    });
  } catch (error) {
    console.error('Error fetching neural connection:', error);
    res.status(500).json({ error: 'Failed to fetch neural connection' });
  }
});

// Create a new neural connection between entries
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { connection, summary, matchingTags, strength, category } = req.body;

    if (!connection || !Array.isArray(connection) || connection.length < 2) {
      return res.status(400).json({ error: 'connection array with at least 2 entry IDs is required' });
    }

    // Verify all entries belong to the user
    const entries = await VaultEntry.find({
      _id: { $in: connection },
      userId: user._id.toString()
    });

    if (entries.length !== connection.length) {
      return res.status(400).json({ error: 'Some entries were not found or do not belong to you' });
    }

    const neuralConnection = new NeuralNetwork({
      userId: user._id.toString(),
      connection,
      summary,
      matchingTags: matchingTags || [],
      strength,
      category,
    });

    await neuralConnection.save();
    res.status(201).json(neuralConnection);
  } catch (error) {
    console.error('Error creating neural connection:', error);
    res.status(500).json({ error: 'Failed to create neural connection' });
  }
});

// Update a neural connection
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { connection, summary, matchingTags, strength, category } = req.body;

    // If connection is being updated, verify entries
    if (connection) {
      const entries = await VaultEntry.find({
        _id: { $in: connection },
        userId: user._id.toString()
      });

      if (entries.length !== connection.length) {
        return res.status(400).json({ error: 'Some entries were not found or do not belong to you' });
      }
    }

    const neuralConnection = await NeuralNetwork.findOneAndUpdate(
      { _id: req.params.id, userId: user._id.toString() },
      { connection, summary, matchingTags, strength, category },
      { new: true }
    );

    if (!neuralConnection) {
      return res.status(404).json({ error: 'Neural connection not found' });
    }

    res.json(neuralConnection);
  } catch (error) {
    console.error('Error updating neural connection:', error);
    res.status(500).json({ error: 'Failed to update neural connection' });
  }
});

// Delete a neural connection
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connection = await NeuralNetwork.findOneAndDelete({ 
      _id: req.params.id, 
      userId: user._id.toString() 
    });

    if (!connection) {
      return res.status(404).json({ error: 'Neural connection not found' });
    }

    res.json({ message: 'Neural connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting neural connection:', error);
    res.status(500).json({ error: 'Failed to delete neural connection' });
  }
});

// Find connections for a specific entry
router.get('/entry/:entryId', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connections = await NeuralNetwork.find({
      userId: user._id.toString(),
      connection: req.params.entryId
    }).sort({ createdAt: -1 });

    res.json(connections);
  } catch (error) {
    console.error('Error finding connections for entry:', error);
    res.status(500).json({ error: 'Failed to find connections' });
  }
});

// Auto-discover connections based on matching tags
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { minMatchingTags = 2 } = req.body;

    // Get all user entries
    const entries = await VaultEntry.find({ userId: user._id.toString() });

    const potentialConnections: Array<{
      entries: string[];
      matchingTags: string[];
      score: number;
    }> = [];

    // Compare each pair of entries
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        const matchingTags = (entry1.tags || []).filter(tag => 
          (entry2.tags || []).includes(tag)
        );

        if (matchingTags.length >= minMatchingTags) {
          potentialConnections.push({
            entries: [entry1._id.toString(), entry2._id.toString()],
            matchingTags,
            score: matchingTags.length
          });
        }
      }
    }

    // Sort by score (most matching tags first)
    potentialConnections.sort((a, b) => b.score - a.score);

    res.json({
      discovered: potentialConnections.length,
      connections: potentialConnections.slice(0, 20) // Return top 20
    });
  } catch (error) {
    console.error('Error discovering connections:', error);
    res.status(500).json({ error: 'Failed to discover connections' });
  }
});

export default router;
