import unifiedMfService from './UnifiedMfService.js';
import fundScoringService from './FundScoringService.js';
import cacheService from './CacheService.js';

class ScreenerService {
  async screenFunds(filters = {}) {
    const cacheKey = `screener_funds_${JSON.stringify(filters)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    // Retrieve global and Indian popular/curated funds to screen
    const allFunds = await unifiedMfService.getPopularFunds('all');
    
    const results = [];
    for (const fund of allFunds) {
      const navHistory = await unifiedMfService.getFundNavHistory(fund.id, fund.region, '1y');
      const score = await fundScoringService.scoreFund(navHistory, fund.id, fund.region);

      const matched = {
        ...fund,
        ...score
      };

      // Apply filters
      let passes = true;
      if (filters.region && filters.region !== 'all' && fund.region !== filters.region) passes = false;
      if (filters.minScore && score.overallScore < parseInt(filters.minScore)) passes = false;
      if (filters.minSipScore && score.sipScore < parseInt(filters.minSipScore)) passes = false;

      if (passes) {
        results.push(matched);
      }
    }

    cacheService.set(cacheKey, results, 'STANDARD');
    return results;
  }
}

export default new ScreenerService();
