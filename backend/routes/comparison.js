import express from 'express';
import comparisonService from '../services/ComparisonService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { items, range = '1y' } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required in request body' });
    }

    if (items.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 items allowed for comparison' });
    }

    const data = await comparisonService.getComparisonData(items, range);
    res.json(data);
  } catch (err) {
    console.error('Error in /api/comparison:', err);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

export default router;
