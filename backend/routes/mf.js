import express from 'express';
import unifiedMfService from '../services/UnifiedMfService.js';
import { AMC_LIST, CATEGORY_GROUPS } from '../config/mfTaxonomy.js';

const router = express.Router();

// GET /api/mf/amcs
router.get('/amcs', (req, res) => {
  res.json(AMC_LIST);
});

// GET /api/mf/categories
router.get('/categories', (req, res) => {
  res.json(CATEGORY_GROUPS);
});

// GET /api/mf/filter
router.get('/filter', async (req, res) => {
  const { amc = '', category = '', risk = '', duration = '', region = 'india' } = req.query;
  try {
    const results = await unifiedMfService.getFilteredFunds(amc, category, risk, duration, region);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/search?q=&region=india|global|all
router.get('/search', async (req, res) => {
  const query = req.query.q || '';
  const region = req.query.region || 'all';
  if (!query) return res.json([]);
  
  try {
    const results = await unifiedMfService.searchFunds(query, region);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/popular?region=india|global|all
router.get('/popular', async (req, res) => {
  const region = req.query.region || 'all';
  try {
    const results = await unifiedMfService.getPopularFunds(region);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/sectors
router.get('/sectors', (req, res) => {
  try {
    const sectors = unifiedMfService.getSectors();
    res.json(sectors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/sectors/:sectorId?region=india|global|all
router.get('/sectors/:sectorId', (req, res) => {
  const region = req.query.region || 'all';
  try {
    const funds = unifiedMfService.getFundsBySector(req.params.sectorId, region);
    res.json(funds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/:region/:id/profile?timeframe=1y|3y|5y|max
router.get('/:region/:id/profile', async (req, res) => {
  const timeframe = req.query.timeframe || req.query.range || '1y';
  try {
    const profile = await unifiedMfService.getFundProfile(req.params.id, req.params.region, timeframe);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// THIN ALIAS for backward compatibility with old frontend components
// GET /api/mf/:schemeCode/holdings
router.get('/:schemeCode/holdings', async (req, res) => {
  const timeframe = req.query.timeframe || req.query.range || '1y';
  try {
    const profile = await unifiedMfService.getFundProfile(req.params.schemeCode, 'india', timeframe);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/:region/:id/nav?range=1y|3y|5y|max
router.get('/:region/:id/nav', async (req, res) => {
  const range = req.query.range || req.query.timeframe || '1y';
  try {
    const navHistory = await unifiedMfService.getFundNavHistory(req.params.id, req.params.region, range);
    if (navHistory && navHistory.earliestDate) {
      res.setHeader('X-Earliest-Date', navHistory.earliestDate);
    }
    res.json(navHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// THIN ALIAS for backward compatibility
// GET /api/mf/:schemeCode/nav?range=1y|3y|5y|max
router.get('/:schemeCode/nav', async (req, res) => {
  const range = req.query.range || req.query.timeframe || '1y';
  try {
    const navHistory = await unifiedMfService.getFundNavHistory(req.params.schemeCode, 'india', range);
    if (navHistory && navHistory.earliestDate) {
      res.setHeader('X-Earliest-Date', navHistory.earliestDate);
    }
    res.json(navHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
