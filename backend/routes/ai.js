import express from 'express';
import geminiAIService from '../services/GeminiAIService.js';
import marketDataGateway from '../services/MarketDataGateway.js';

const router = express.Router();

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const quotesRes = await marketDataGateway.getQuotes(['^NSEI', '^NSEBANK', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS']);
    const quotes = quotesRes.data || [];
    const marketState = {
      indices: quotes.filter(q => q.symbol.startsWith('^')),
      stocks: quotes.filter(q => !q.symbol.startsWith('^'))
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
