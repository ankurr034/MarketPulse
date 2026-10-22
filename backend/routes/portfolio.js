import express from 'express';
import portfolioService from '../services/UserPortfolioService.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

// Require authentication for all user portfolio operations to enforce resource ownership and prevent IDOR / BOLA
router.use(authenticateToken);

// GET /api/portfolio/mf
router.get('/mf', async (req, res) => {
  try {
    const holdings = await portfolioService.getHoldings(req.user.id);
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/mf/analytics
router.get('/mf/analytics', async (req, res) => {
  try {
    const analytics = await portfolioService.getPortfolioAnalytics(req.user.id);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/mf
router.post('/mf', async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const holding = await portfolioService.addHolding(data);
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/mf/sync-upstox
router.post('/mf/sync-upstox', async (req, res) => {
  try {
    const holdings = await portfolioService.syncUpstoxHoldings(req.user.id);
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/mf/:id
router.delete('/mf/:id', async (req, res) => {
  try {
    await portfolioService.deleteHolding(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
