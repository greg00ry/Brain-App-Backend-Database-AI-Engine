import { Router, Request, Response } from 'express';
import { LongTermMemory } from '../models/LongTermMemory.js';
import { Category } from '../models/Category.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all long-term memories for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { categoryId } = req.query;

    const query: Record<string, unknown> = { userId: user._id.toString() };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const memories = await LongTermMemory.find(query)
      .populate('categoryId', 'name icon color')
      .sort({ createdAt: -1 });
    res.json(memories);
  } catch (error) {
    console.error('Error fetching long-term memories:', error);
    res.status(500).json({ error: 'Failed to fetch long-term memories' });
  }
});

// Get memories grouped by category
router.get('/by-category', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    
    const memories = await LongTermMemory.aggregate([
      { $match: { userId: user._id.toString() } },
      {
        $group: {
          _id: '$categoryName',
          memories: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories by category:', error);
    res.status(500).json({ error: 'Failed to fetch memories by category' });
  }
});

// Get a single long-term memory by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const memory = await LongTermMemory.findOne({ 
      _id: req.params.id, 
      userId: user._id.toString() 
    }).populate('categoryId', 'name icon color description');

    if (!memory) {
      return res.status(404).json({ error: 'Long-term memory not found' });
    }

    res.json(memory);
  } catch (error) {
    console.error('Error fetching long-term memory:', error);
    res.status(500).json({ error: 'Failed to fetch long-term memory' });
  }
});

// Create a new long-term memory
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { summary, tags, categoryName, topic } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'summary is required' });
    }

    // Find category by name
    let categoryDoc = null;
    if (categoryName) {
      categoryDoc = await Category.findOne({ name: categoryName, isActive: true });
    }

    const memory = new LongTermMemory({
      userId: user._id.toString(),
      summary,
      tags: tags || [],
      categoryId: categoryDoc?._id || null,
      categoryName: categoryName || null,
      topic: topic || null,
    });

    await memory.save();
    res.status(201).json(memory);
  } catch (error) {
    console.error('Error creating long-term memory:', error);
    res.status(500).json({ error: 'Failed to create long-term memory' });
  }
});

// Update a long-term memory
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { summary, tags, categoryName, topic } = req.body;

    // Find category by name if provided
    let categoryDoc = null;
    if (categoryName) {
      categoryDoc = await Category.findOne({ name: categoryName, isActive: true });
    }

    const memory = await LongTermMemory.findOneAndUpdate(
      { _id: req.params.id, userId: user._id.toString() },
      { 
        summary, 
        tags, 
        categoryId: categoryDoc?._id || null,
        categoryName: categoryName || null,
        topic,
      },
      { new: true }
    ).populate('categoryId', 'name icon color');

    if (!memory) {
      return res.status(404).json({ error: 'Long-term memory not found' });
    }

    res.json(memory);
  } catch (error) {
    console.error('Error updating long-term memory:', error);
    res.status(500).json({ error: 'Failed to update long-term memory' });
  }
});

// Delete a long-term memory
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const memory = await LongTermMemory.findOneAndDelete({ 
      _id: req.params.id, 
      userId: user._id.toString() 
    });

    if (!memory) {
      return res.status(404).json({ error: 'Long-term memory not found' });
    }

    res.json({ message: 'Long-term memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting long-term memory:', error);
    res.status(500).json({ error: 'Failed to delete long-term memory' });
  }
});

// Search long-term memories by tags
router.get('/search/tags', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { tags } = req.query;

    if (!tags) {
      return res.status(400).json({ error: 'tags query parameter is required' });
    }

    const tagArray = (tags as string).split(',').map(t => t.trim());

    const memories = await LongTermMemory.find({
      userId: user._id.toString(),
      tags: { $in: tagArray }
    }).sort({ createdAt: -1 });

    res.json(memories);
  } catch (error) {
    console.error('Error searching long-term memories:', error);
    res.status(500).json({ error: 'Failed to search long-term memories' });
  }
});

export default router;
