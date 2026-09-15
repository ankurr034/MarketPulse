// backend/routes/stockWeightage.js
import express from 'express';
import stockWeightageService from '../services/StockWeightageService.js';

const router = express.Router();

/**
 * GET /api/analytics/mutual-fund/stock-weightage
 * Returns screener results, dynamic KPIs, and pagination
 * Query params: search, sector, marketCap, category, amc, minFunds, minWeight, sortBy, sortOrder, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const results = await stockWeightageService.getScreenerResults(req.query);
    res.json(results);
  } catch (err) {
    console.error('Stock weightage screener error:', err);
    res.status(500).json({ error: 'Failed to generate stock weightage screener results', details: err.message });
  }
});

router.get('/screener', async (req, res) => {
  try {
    const results = await stockWeightageService.getScreenerResults(req.query);
    res.json(results);
  } catch (err) {
    console.error('Stock weightage screener error:', err);
    res.status(500).json({ error: 'Failed to generate stock weightage screener results', details: err.message });
  }
});

/**
 * GET /api/analytics/mutual-funds/coverage
 * GET /api/analytics/mutual-fund/stock-weightage/coverage
 * Returns diagnostic data quality, verified coverage ratio, and AMC distribution
 */
router.get('/coverage', async (req, res) => {
  try {
    const diagnostics = await stockWeightageService.getCoverageDiagnostics();
    res.json(diagnostics);
  } catch (err) {
    console.error('Coverage diagnostics error:', err);
    res.status(500).json({ error: 'Failed to fetch coverage diagnostics', details: err.message });
  }
});

/**
 * Alias: GET /api/analytics/mutual-funds/stocks
 */
router.get('/stocks', async (req, res) => {
  try {
    const results = await stockWeightageService.getScreenerResults(req.query);
    res.json(results);
  } catch (err) {
    console.error('Stock weightage screener error:', err);
    res.status(500).json({ error: 'Failed to generate stock weightage screener results', details: err.message });
  }
});

/**
 * Alias: GET /api/analytics/mutual-funds/stocks/:symbol
 */
router.get('/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const detail = await stockWeightageService.getStockDetail(symbol);
    if (!detail) {
      return res.status(404).json({ error: `Stock ${symbol} not found in verified mutual fund disclosures` });
    }
    res.json(detail);
  } catch (err) {
    console.error(`Error fetching stock detail for ${req.params.symbol}:`, err);
    res.status(500).json({ error: 'Failed to fetch stock detail', details: err.message });
  }
});

/**
 * Alias: GET /api/analytics/mutual-funds/stocks/:symbol/funds
 */
router.get('/stocks/:symbol/funds', async (req, res) => {
  try {
    const { symbol } = req.params;
    const results = await stockWeightageService.getFundsHoldingStock(symbol, req.query);
    res.json(results);
  } catch (err) {
    console.error(`Error fetching funds holding ${req.params.symbol}:`, err);
    res.status(500).json({ error: 'Failed to fetch holding mutual funds', details: err.message });
  }
});

/**
 * Alias: GET /api/analytics/mutual-funds/schemes/:schemeCode/holdings
 */
router.get('/schemes/:schemeCode/holdings', async (req, res) => {
  try {
    const { schemeCode } = req.params;
    const portfolio = await stockWeightageService.getFundCompletePortfolio(schemeCode);
    if (!portfolio.available) {
      return res.status(404).json(portfolio);
    }
    res.json(portfolio);
  } catch (err) {
    console.error(`Error fetching fund portfolio for ${req.params.schemeCode}:`, err);
    res.status(500).json({ error: 'Failed to fetch fund portfolio', details: err.message });
  }
});

/**
 * GET /api/analytics/mutual-fund/stock-weightage/fund/:schemeCode
 * Reverse lookup: returns the complete stock portfolio for the specified mutual fund scheme
 */
router.get('/fund/:schemeCode', async (req, res) => {
  try {
    const { schemeCode } = req.params;
    const portfolio = await stockWeightageService.getFundCompletePortfolio(schemeCode);
    if (!portfolio.available) {
      return res.status(404).json(portfolio);
    }
    res.json(portfolio);
  } catch (err) {
    console.error(`Error fetching fund portfolio for ${req.params.schemeCode}:`, err);
    res.status(500).json({ error: 'Failed to fetch fund portfolio', details: err.message });
  }
});

/**
 * GET /api/analytics/mutual-fund/stock-weightage/:symbol
 * Returns stock detail, ownership summary, distribution buckets, and takeaways
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const detail = await stockWeightageService.getStockDetail(symbol);
    if (!detail) {
      return res.status(404).json({ error: `Stock ${symbol} not found in verified mutual fund disclosures` });
    }
    res.json(detail);
  } catch (err) {
    console.error(`Error fetching stock detail for ${req.params.symbol}:`, err);
    res.status(500).json({ error: 'Failed to fetch stock detail', details: err.message });
  }
});

/**
 * GET /api/analytics/mutual-fund/stock-weightage/:symbol/funds
 * Returns paginated mutual funds holding the specified stock
 */
router.get('/:symbol/funds', async (req, res) => {
  try {
    const { symbol } = req.params;
    const results = await stockWeightageService.getFundsHoldingStock(symbol, req.query);
    res.json(results);
  } catch (err) {
    console.error(`Error fetching funds holding ${req.params.symbol}:`, err);
    res.status(500).json({ error: 'Failed to fetch holding mutual funds', details: err.message });
  }
});

export default router;
