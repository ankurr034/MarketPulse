import express from 'express';
import etfService from '../services/ETFService.js';

const router = express.Router();

// GET /api/etf/categories
router.get('/categories', (req, res) => {
  try {
    const cats = etfService.getETFCategories();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/etf/list
router.get('/list', async (req, res) => {
  try {
    const { category } = req.query;
    const list = await etfService.getETFsByCategory(category || 'index');
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/etf/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const detail = await etfService.getETFDetail(req.params.symbol.toUpperCase());
    if (!detail) return res.status(404).json({ error: 'ETF not found' });
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
