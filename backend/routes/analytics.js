import express from 'express';
import mfAnalyticsService from '../services/MfAnalyticsService.js';

const router = express.Router();

// Helper to extract schemeCodes from query
const getSchemeCodes = (req) => {
  if (req.query.schemes) {
    return req.query.schemes.split(',').filter(Boolean);
  }
  return [];
};

// GET /api/analytics/mf/sector-growth
// Query params: sector (required), range (optional: 1y|3y|5y|max), schemes (optional: comma-separated)
router.get('/mf/sector-growth', async (req, res) => {
  try {
    const { sector, range } = req.query;
    if (!sector) {
      return res.status(400).json({ error: 'sector query parameter is required' });
    }
    const schemes = getSchemeCodes(req);
    const data = await mfAnalyticsService.getSectorGrowth(sector, range || '1y', schemes);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sector growth:', error);
    res.status(500).json({ error: 'Failed to fetch sector growth analytics' });
  }
});

// GET /api/analytics/mf/sector-allocation
// Query params: schemes (optional: comma-separated)
router.get('/mf/sector-allocation', async (req, res) => {
  try {
    const schemes = getSchemeCodes(req);
    const data = await mfAnalyticsService.getSectorAllocation(schemes);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sector allocation:', error);
    res.status(500).json({ error: 'Failed to fetch sector allocation' });
  }
});

// GET /api/analytics/mf/fund-houses
// Query params: range (optional: 1y|3y|5y|max), schemes (optional: comma-separated)
router.get('/mf/fund-houses', async (req, res) => {
  try {
    const { range } = req.query;
    const schemes = getSchemeCodes(req);
    const data = await mfAnalyticsService.getFundHouseLeaderboard(range || '1y', schemes);
    res.json(data);
  } catch (error) {
    console.error('Error fetching fund house leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch fund house leaderboard' });
  }
});

export default router;
