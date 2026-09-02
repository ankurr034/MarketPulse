import riskAnalyticsService from './RiskAnalyticsService.js';

class AiRankingEngineService {
  /**
   * Universal Risk & Performance Engine
   * Works on any price time series (Mutual Fund NAVs, Stock Prices, ETF Prices, Global Asset Prices)
   */
  evaluateAssetRiskAndPerformance(navHistory, benchmarkHistory = [], timeframe = '1y') {
    if (!navHistory || navHistory.length < 2) {
      return {
        timeframe,
        metricsAvailable: false,
        reason: 'Insufficient historical price/NAV data for selected timeframe',
        cagr: null,
        cumulativeReturn: null,
        sinceInceptionReturn: null,
        displayReturn: null,
        sharpeRatio: null,
        sortinoRatio: null,
        alpha: null,
        beta: 1.0,
        volatility: null,
        maxDrawdown: null,
        riskScore: null,
        performanceScore: null,
        overallScore: null,
        ratingGrade: 'Unrated'
      };
    }

    const riskMetrics = riskAnalyticsService.getRiskMetrics(navHistory, benchmarkHistory);

    // Calculate CAGR and Cumulative Absolute Return for the given timeframe
    const prices = navHistory.map(item => item.value);
    const startVal = prices[0];
    const endVal = prices[prices.length - 1];
    
    const totalDays = Math.max(1, (navHistory[navHistory.length - 1].time - navHistory[0].time) / (1000 * 60 * 60 * 24));
    const years = totalDays / 365.25;

    let cagr = 0;
    let cumulative = 0;

    if (startVal > 0 && endVal > 0) {
      cumulative = (endVal - startVal) / startVal;
      if (years >= 1) {
        cagr = Math.pow(endVal / startVal, 1 / years) - 1;
      } else {
        cagr = cumulative;
      }
    }

    const cagrPct = parseFloat((cagr * 100).toFixed(2));
    const cumulativePct = parseFloat((cumulative * 100).toFixed(2));

    // Rule 2 Enforced:
    // ALL/Max timeframe MUST represent Since Inception Absolute Return.
    // Never display CAGR as ALL Return.
    const isMax = timeframe === 'max' || timeframe === 'all';
    const displayReturn = isMax ? cumulativePct : (years >= 1 ? cagrPct : cumulativePct);

    // AI Scoring Model (0 to 100 Scale)
    const perfScore = Math.min(100, Math.max(0, (cagrPct + 10) * 2.5));
    
    const sharpeVal = riskMetrics.sharpeRatio !== null ? riskMetrics.sharpeRatio : 0;
    const sortinoVal = riskMetrics.sortinoRatio !== null ? riskMetrics.sortinoRatio : 0;

    const sharpeNormalized = Math.min(100, Math.max(0, (sharpeVal + 0.5) * 33.3));
    const sortinoNormalized = Math.min(100, Math.max(0, (sortinoVal + 0.5) * 25.0));
    const riskAdjustedScore = (sharpeNormalized * 0.5) + (sortinoNormalized * 0.5);

    const drawdownPenalty = Math.min(50, riskMetrics.maxDrawdown || 0);
    const preservationScore = Math.max(0, 100 - drawdownPenalty - ((riskMetrics.volatility || 0) * 0.5));

    const overallScore = Math.round((perfScore * 0.35) + (riskAdjustedScore * 0.45) + (preservationScore * 0.20));

    let ratingGrade = 'C';
    if (overallScore >= 85) ratingGrade = 'AAA';
    else if (overallScore >= 75) ratingGrade = 'AA';
    else if (overallScore >= 65) ratingGrade = 'A';
    else if (overallScore >= 55) ratingGrade = 'BBB';
    else if (overallScore >= 45) ratingGrade = 'BB';

    return {
      timeframe,
      metricsAvailable: true,
      cagr: cagrPct,
      cumulativeReturn: cumulativePct,
      sinceInceptionReturn: cumulativePct,
      displayReturn: displayReturn,
      sharpeRatio: riskMetrics.sharpeRatio,
      sortinoRatio: riskMetrics.sortinoRatio,
      alpha: riskMetrics.alpha,
      beta: riskMetrics.beta,
      volatility: riskMetrics.volatility,
      maxDrawdown: riskMetrics.maxDrawdown,
      riskRewardRatio: riskMetrics.riskRewardRatio,
      scores: {
        performance: Math.round(perfScore),
        riskAdjusted: Math.round(riskAdjustedScore),
        preservation: Math.round(preservationScore),
        overall: overallScore
      },
      ratingGrade
    };
  }

  /**
   * Compute Category Percentiles and Category Averages without mutating input order
   */
  computeCategoryMetrics(fundsList) {
    if (!Array.isArray(fundsList) || fundsList.length === 0) return [];

    const categoryGroups = new Map();
    fundsList.forEach(f => {
      const cat = f.category || f.sector || 'General';
      if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
      categoryGroups.get(cat).push(f);
    });

    const categoryStats = new Map();
    categoryGroups.forEach((group, catName) => {
      const groupCount = group.length;

      const validSharpe = group.map(g => g.sharpeRatio).filter(v => typeof v === 'number' && !isNaN(v));
      const validSortino = group.map(g => g.sortinoRatio).filter(v => typeof v === 'number' && !isNaN(v));
      const validReturn = group.map(g => g.oneYearChangePct || g.cagr).filter(v => typeof v === 'number' && !isNaN(v));

      const avgSharpe = validSharpe.length > 0 ? parseFloat((validSharpe.reduce((a, b) => a + b, 0) / validSharpe.length).toFixed(2)) : null;
      const avgSortino = validSortino.length > 0 ? parseFloat((validSortino.reduce((a, b) => a + b, 0) / validSortino.length).toFixed(2)) : null;
      const avgReturn = validReturn.length > 0 ? parseFloat((validReturn.reduce((a, b) => a + b, 0) / validReturn.length).toFixed(2)) : null;

      const sortedByReturn = [...group].sort((a, b) => {
        const rA = a.oneYearChangePct || a.cagr || -999;
        const rB = b.oneYearChangePct || b.cagr || -999;
        return rB - rA;
      });

      const fundRankMap = new Map();
      sortedByReturn.forEach((fund, index) => {
        const rank = index + 1;
        const percentile = parseFloat(((1 - (rank - 1) / Math.max(1, groupCount)) * 100).toFixed(1));
        const topPct = Math.max(1, Math.round((rank / groupCount) * 100));
        const percentileLabel = `Top ${topPct}% in ${catName}`;
        fundRankMap.set(fund.id || fund.schemeCode, {
          categoryRank: `${rank} of ${groupCount}`,
          categoryPercentile: percentile,
          percentileLabel
        });
      });

      categoryStats.set(catName, { avgSharpe, avgSortino, avgReturn, fundRankMap });
    });

    return fundsList.map(fund => {
      const catName = fund.category || fund.sector || 'General';
      const stats = categoryStats.get(catName);
      const catRankInfo = stats?.fundRankMap?.get(fund.id || fund.schemeCode) || {};

      return {
        ...fund,
        ...catRankInfo,
        categoryAverages: {
          avgSharpe: stats?.avgSharpe ?? null,
          avgSortino: stats?.avgSortino ?? null,
          avgReturn: stats?.avgReturn ?? null
        }
      };
    });
  }
}

export default new AiRankingEngineService();
