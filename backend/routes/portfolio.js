import express from 'express';
import portfolioService from '../services/UserPortfolioService.js';

const router = express.Router();

// Mock user for now since auth is out of scope
const DEFAULT_USER_ID = 'default-user';

// GET /api/portfolio/mf
router.get('/mf', async (req, res) => {
  try {
    const holdings = await portfolioService.getHoldings(DEFAULT_USER_ID);
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/mf/analytics
router.get('/mf/analytics', async (req, res) => {
  try {
    const analytics = await portfolioService.getPortfolioAnalytics(DEFAULT_USER_ID);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/mf
router.post('/mf', async (req, res) => {
  try {
    const data = { ...req.body, userId: DEFAULT_USER_ID };
    const holding = await portfolioService.addHolding(data);
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/mf/sync-upstox
router.post('/mf/sync-upstox', async (req, res) => {
  try {
    const holdings = await portfolioService.syncUpstoxHoldings(DEFAULT_USER_ID);
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/mf/:id
router.delete('/mf/:id', async (req, res) => {
  try {
    await portfolioService.deleteHolding(req.params.id, DEFAULT_USER_ID);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
