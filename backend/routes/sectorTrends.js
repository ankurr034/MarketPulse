// backend/routes/sectorTrends.js

import express from 'express';
import sectorTrendsService from '../services/SectorTrendsService.js';

const router = express.Router();

// GET /api/sector-trends/compare
router.get('/compare', async (req, res) => {
  const sectorsParam = req.query.sectors || '';
  const range = req.query.range || '1y';
  if (!sectorsParam) return res.json([]);
  
  const sectors = sectorsParam.split(',').map(s => s.trim()).filter(Boolean);
  try {
    const results = await sectorTrendsService.compareSectors(sectors, range);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sector-trends/:sector
router.get('/:sector', async (req, res) => {
  const { sector } = req.params;
  const range = req.query.range || '1y';
  try {
    const results = await sectorTrendsService.getSectorTrends(sector, range);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
