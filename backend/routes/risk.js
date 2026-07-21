import express from 'express';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import unifiedMfService from '../services/UnifiedMfService.js';

const router = express.Router();

// GET /api/risk/fund/:region/:id
router.get('/fund/:region/:id', async (req, res) => {
  try {
    const { region, id } = req.params;
    const { range } = req.query;

    const navHistory = await unifiedMfService.getFundNavHistory(id, region, range || '1y');
    // Using a default fallback benchmark history or empty array
    const metrics = riskAnalyticsService.getRiskMetrics(navHistory);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
