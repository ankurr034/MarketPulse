import express from 'express';
import screenerService from '../services/ScreenerService.js';
import sectorDataService from '../services/SectorDataService.js';

const router = express.Router();

// GET /api/screener/stocks
router.get('/stocks', async (req, res) => {
  try {
    const results = await screenerService.screenStocks(req.query);
    res.json(results);
  } catch (error) {
    console.error('Stock screener error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/screener/stocks
router.post('/stocks', async (req, res) => {
  try {
    const filters = { ...(req.query || {}), ...(req.body || {}) };
    const results = await screenerService.screenStocks(filters);
    res.json(results);
  } catch (error) {
    console.error('Stock screener POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/screener/funds
router.get('/funds', async (req, res) => {
  try {
    const results = await screenerService.screenFunds(req.query);
    res.json(results);
  } catch (error) {
    console.error('MF screener error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/screener/funds
router.post('/funds', async (req, res) => {
  try {
    const filters = { ...(req.query || {}), ...(req.body || {}) };
    const results = await screenerService.screenFunds(filters);
    res.json(results);
  } catch (error) {
    console.error('MF screener POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/screener/filters
router.get('/filters', (req, res) => {
  const stockSectors = sectorDataService.getSectorDefinitions().map(s => ({
    id: s.id,
    name: s.name,
    region: s.region
  }));

  res.json({
    stocks: {
      sectors: stockSectors,
      exchanges: ['NSE', 'BSE'],
      metrics: [
        'marketCapCr', 'pe', 'pb', 'roe', 'roce', 'debtToEquity',
        'revenueYoY', 'netProfitYoY', 'dividendYield', 'pctFromATH', 'pctFrom52WLow'
      ]
    },
    funds: {
      categories: ['Equity', 'Debt', 'Hybrid', 'Solution Oriented', 'Other'],
      plans: ['Direct', 'Regular'],
      options: ['Growth', 'IDCW'],
      metrics: ['aumCr', 'expenseRatio', '1Y', '3Y', '5Y', 'sharpe', 'sortino', 'volatility']
    }
  });
});

export default router;
