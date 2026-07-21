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

    // Simulate 12% average annual return (drift) with 15% volatility
    const annualDrift = 0.12;
    const annualVol = 0.15;
    const dt = 1 / 12; // monthly steps

    const now = new Date();
    for (let i = 1; i <= years * 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const drift = current * annualDrift * dt;
      const shock = current * annualVol * (Math.random() - 0.5) * Math.sqrt(dt);
      current = current + drift + shock;

      predictions.push({
        date: monthDate.toISOString().split('T')[0],
        value: parseFloat(current.toFixed(2)),
        low: parseFloat((current * 0.85).toFixed(2)),
        high: parseFloat((current * 1.15).toFixed(2))
      });
    }

    const result = { predictions };
    cacheService.set(cacheKey, result, 'STANDARD');
    return result;
  }
}

export default new GrowthPredictionService();
