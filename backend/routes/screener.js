import express from 'express';
import screenerService from '../services/ScreenerService.js';

const router = express.Router();

// GET /api/screener/funds
router.get('/funds', async (req, res) => {
  try {
    const filters = {
      region: req.query.region || 'all',
      minScore: req.query.minScore || 0,
      minSipScore: req.query.minSipScore || 0
    };
    const results = await screenerService.screenFunds(filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
