import express from 'express';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import unifiedMfService from '../services/UnifiedMfService.js';
import macroDataService from '../services/MacroDataService.js';

const router = express.Router();

// GET /api/risk/fund/:region/:id
router.get('/fund/:region/:id', async (req, res) => {
  try {
    const { region, id } = req.params;
    const { range } = req.query;

    const navHistoryRes = await unifiedMfService.getFundNavHistory(id, region, range || 'all');
    const navHistory = navHistoryRes && navHistoryRes.data ? navHistoryRes.data : (Array.isArray(navHistoryRes) ? navHistoryRes : []);
    const rfObj = await macroDataService.getRiskFreeRate();
    const rfVal = (rfObj && typeof rfObj.value === 'number') ? rfObj.value : 0.0625;

    let metrics;
    const rangeLower = String(range || '').toLowerCase();
    if (rangeLower === '3y') {
      metrics = riskAnalyticsService.getRiskMetrics3YMonthly(navHistory, [], rfVal);
    } else if (rangeLower === '5y') {
      metrics = riskAnalyticsService.getRiskMetrics5YMonthly(navHistory, [], rfVal);
    } else {
      metrics = riskAnalyticsService.getRiskMetrics(navHistory, [], rfVal);
    }
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
