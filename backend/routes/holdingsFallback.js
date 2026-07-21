import express from 'express';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';

const router = express.Router();

// GET /api/:ticker/holdings
router.get('/:ticker/holdings', async (req, res) => {
  const { ticker } = req.params;
  const { scheme_name } = req.query;
  
  try {
    const result = await holdingsFallbackService.getHoldings(ticker, scheme_name);
    res.json(result);
  } catch (error) {
    console.error('Holdings error:', error);
    res.status(500).json({ available: false, reason: error.message });
  }
});

// GET /api/:ticker/nav
router.get('/:ticker/nav', async (req, res) => {
  const { ticker } = req.params;
  
  try {
    const result = await holdingsFallbackService.getNav(ticker);
    res.json(result);
  } catch (error) {
    console.error('NAV error:', error);
    res.status(500).json({ available: false, reason: error.message });
  }
});

export default router;
