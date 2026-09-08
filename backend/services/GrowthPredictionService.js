import unifiedMfService from './UnifiedMfService.js';
import cacheService from './CacheService.js';

class GrowthPredictionService {
  async predictFundGrowth(fundId, region = 'india', years = 5) {
    const cacheKey = `growth_pred_${region}_${fundId}_${years}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const navHistory = await unifiedMfService.getFundNavHistory(fundId, region, '1y');
    if (!navHistory || navHistory.length === 0) {
      return { predictions: [] };
    }

    const latestValue = navHistory[navHistory.length - 1].value;
    const predictions = [];
    let current = latestValue;

    // Deterministic compound growth projection at standard 12% baseline (8% conservative, 15% optimistic)
    const annualDrift = 0.12;
    const lowDrift = 0.08;
    const highDrift = 0.15;

    const now = new Date();
    for (let i = 1; i <= years * 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const t = i / 12;
      const baseVal = latestValue * Math.pow(1 + annualDrift, t);
      const lowVal = latestValue * Math.pow(1 + lowDrift, t);
      const highVal = latestValue * Math.pow(1 + highDrift, t);

      predictions.push({
        date: monthDate.toISOString().split('T')[0],
        value: parseFloat(baseVal.toFixed(2)),
        low: parseFloat(lowVal.toFixed(2)),
        high: parseFloat(highVal.toFixed(2))
      });
    }

    const result = { predictions };
    cacheService.set(cacheKey, result, 'STANDARD');
    return result;
  }
}

export default new GrowthPredictionService();
