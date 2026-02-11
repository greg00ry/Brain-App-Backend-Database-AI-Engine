import { Router, Request, Response } from 'express';
import { Category } from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all active categories (read-only for users)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name description icon color order')
      .sort({ order: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get a single category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await Category.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).select('name description icon color keywords order');

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

export default router;
