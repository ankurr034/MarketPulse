import express from 'express';
import geminiAIService from '../services/GeminiAIService.js';
import simulatorService from '../services/SimulatorService.js';

const router = express.Router();

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const marketState = {
      indices: simulatorService.getIndices(),
      stocks: simulatorService.getStocks()?.slice(0, 5)
    };
    const insights = await geminiAIService.generateMarketInsights(marketState);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

import growthPredictionService from '../services/GrowthPredictionService.js';

router.get('/predict/fund/:region/:id', async (req, res) => {
  try {
    const { region, id } = req.params;
    const { years } = req.query;
    const predictions = await growthPredictionService.predictFundGrowth(id, region, parseInt(years || 5));
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
