import riskAnalyticsService from './RiskAnalyticsService.js';
import geminiAIService from './GeminiAIService.js';
import cacheService from './CacheService.js';

class FundScoringService {
  async scoreFund(navHistory, schemeCode, region = 'india') {
    const cacheKey = `fund_score_${region}_${schemeCode}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    if (!navHistory || navHistory.length < 2) {
      return {
        performanceScore: null,
        riskScore: null,
        growthScore: null,
        aiScore: null,
        sipScore: null,
        overallScore: null,
        suitability: 'Insufficient historical data to calculate scores.'
      };
    }

    const prices = navHistory.map(item => item.value);
    const returns = riskAnalyticsService.calculateReturns(prices);
    
    // Volatility and Drawdown
    const volatility = riskAnalyticsService.calculateVolatility(returns);
    const maxDrawdown = riskAnalyticsService.calculateMaxDrawdown(prices);
    
    // Performance CAGR estimate
    const years = navHistory.length / 252;
    const startVal = prices[0];
    const endVal = prices[prices.length - 1];
    let cagr = null;
    if (startVal > 0 && endVal > 0 && years > 0) {
      cagr = Math.pow(endVal / startVal, 1 / Math.max(0.1, years)) - 1;
    }

    // 1. Performance Score (0-100)
    // Map CAGR from -10% to +30% into a 0-100 range
    let performanceScore = null;
    if (cagr !== null) {
      performanceScore = Math.round(((cagr + 0.1) / 0.4) * 100);
      performanceScore = Math.max(0, Math.min(100, performanceScore));
    }

    // 2. Risk Score (0-100) (lower volatility & lower drawdown = higher score)
    let riskScore = null;
    if (volatility !== null && maxDrawdown !== null) {
      const volMetric = Math.max(0, 1 - volatility / 0.4); // Max 40% standard dev
      const ddMetric = Math.max(0, 1 - maxDrawdown / 0.5); // Max 50% drawdown
      riskScore = Math.round(((volMetric + ddMetric) / 2) * 100);
      riskScore = Math.max(0, Math.min(100, riskScore));
    }

    // 3. Growth Score (recent momentum)
    // Calculate last 3 months performance
    const last3MIndex = Math.max(0, navHistory.length - 63);
    const last3MVal = navHistory[last3MIndex]?.value || startVal;
    let growthScore = null;
    if (last3MVal > 0 && endVal !== undefined) {
      const m3Return = (endVal - last3MVal) / last3MVal;
      growthScore = Math.round(((m3Return + 0.05) / 0.2) * 100);
      growthScore = Math.max(0, Math.min(100, growthScore));
    }

    // 4. SIP Score (Consistency, lower drawdown)
    let sipScore = null;
    if (performanceScore !== null && riskScore !== null) {
      sipScore = Math.round((performanceScore * 0.4) + (riskScore * 0.6));
    } else if (riskScore !== null) {
      sipScore = riskScore;
    }

    // 5. AI Score (via Gemini API)
    const aiData = await geminiAIService.scoreFund({
      schemeCode,
      cagr: cagr !== null ? (cagr * 100).toFixed(2) + '%' : 'N/A',
      volatility: volatility !== null ? (volatility * 100).toFixed(2) + '%' : 'N/A',
      maxDrawdown: maxDrawdown !== null ? (maxDrawdown * 100).toFixed(2) + '%' : 'N/A'
    });

    const aiScore = (typeof aiData?.aiScore === 'number') ? aiData.aiScore : null;
    const suitability = aiData?.suitability || (performanceScore !== null ? 'Suitable for disciplined systematic investment plans.' : 'Moderate growth index benchmark asset.');

    // 6. Overall Composite Score (weighted across verified available components)
    const scoreComponents = [
      { score: performanceScore, weight: 0.3 },
      { score: riskScore, weight: 0.3 },
      { score: growthScore, weight: 0.2 },
      { score: aiScore, weight: 0.2 }
    ].filter(c => typeof c.score === 'number' && !isNaN(c.score));

    const totalWeight = scoreComponents.reduce((acc, c) => acc + c.weight, 0);
    const overallScore = totalWeight > 0
      ? Math.round(scoreComponents.reduce((acc, c) => acc + c.score * c.weight, 0) / totalWeight)
      : null;

    const result = {
      performanceScore,
      riskScore,
      growthScore,
      aiScore,
      sipScore,
      overallScore,
      suitability
    };

    cacheService.set(cacheKey, result, 'SLOW');
    return result;
  }
}

export default new FundScoringService();
