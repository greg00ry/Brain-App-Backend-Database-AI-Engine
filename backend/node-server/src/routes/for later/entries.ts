import { Router, Request, Response } from 'express';
import { VaultEntry } from '../../models/VaultEntry.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all entries for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const entries = await VaultEntry.find({ userId: user._id.toString() })
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Create a new entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { rawText, summary, tags, strength, category } = req.body;

    if (!rawText) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    const entry = new VaultEntry({
      userId: user._id.toString(),
      rawText,
      summary,
      tags,
      strength,
      category,
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Delete an entry
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const entry = await VaultEntry.findByIdAndDelete(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Update an entry
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { rawText, summary, tags, strength, category } = req.body;
    
    const entry = await VaultEntry.findByIdAndUpdate(
      req.params.id,
      { rawText, summary, tags, strength, category },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

export default router;
