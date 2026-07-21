import express from 'express';
import countryIntelligenceService from '../services/CountryIntelligenceService.js';

const router = express.Router();

// GET /api/countries/heatmap
router.get('/heatmap', async (req, res) => {
  try {
    const data = await countryIntelligenceService.getGlobalHeatmapData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
