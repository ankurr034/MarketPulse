import express from 'express';
import geminiAIService from '../services/GeminiAIService.js';
import marketDataGateway from '../services/MarketDataGateway.js';
import growthPredictionService from '../services/GrowthPredictionService.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const isTest = process.env.NODE_ENV === 'test';

// Cost and resource protection for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'AI request limit reached. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});

router.use(aiLimiter);

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
