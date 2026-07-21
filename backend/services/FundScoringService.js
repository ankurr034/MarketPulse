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
        performanceScore: 50,
        riskScore: 50,
        growthScore: 50,
        aiScore: 50,
        sipScore: 50,
        overallScore: 50,
        suitability: 'Moderate growth index benchmark asset.'
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
    let cagr = 0.12;
    if (startVal > 0 && endVal > 0 && years > 0) {
      cagr = Math.pow(endVal / startVal, 1 / Math.max(0.1, years)) - 1;
    }

    // 1. Performance Score (0-100)
    // Map CAGR from -10% to +30% into a 0-100 range
    let performanceScore = Math.round(((cagr + 0.1) / 0.4) * 100);
    performanceScore = Math.max(0, Math.min(100, performanceScore));

    // 2. Risk Score (0-100) (lower volatility & lower drawdown = higher score)
    const volMetric = Math.max(0, 1 - volatility / 0.4); // Max 40% standard dev
    const ddMetric = Math.max(0, 1 - maxDrawdown / 0.5); // Max 50% drawdown
    let riskScore = Math.round(((volMetric + ddMetric) / 2) * 100);
    riskScore = Math.max(0, Math.min(100, riskScore));

    // 3. Growth Score (recent momentum)
    // Calculate last 3 months performance
    const last3MIndex = Math.max(0, navHistory.length - 63);
    const last3MVal = navHistory[last3MIndex]?.value || startVal;
    const m3Return = (endVal - last3MVal) / last3MVal;
    let growthScore = Math.round(((m3Return + 0.05) / 0.2) * 100);
    growthScore = Math.max(0, Math.min(100, growthScore));

    // 4. SIP Score (Consistency, lower drawdown)
    let sipScore = Math.round((performanceScore * 0.4) + (riskScore * 0.6));

    // 5. AI Score (via Gemini API fallback)
    const aiData = await geminiAIService.scoreFund({
      schemeCode,
      cagr: (cagr * 100).toFixed(2) + '%',
      volatility: (volatility * 100).toFixed(2) + '%',
      maxDrawdown: (maxDrawdown * 100).toFixed(2) + '%'
    });

    const aiScore = aiData?.aiScore || 75;
    const suitability = aiData?.suitability || 'Excellent for disciplined systematic investment plans.';

    // 6. Overall Composite Score
    const overallScore = Math.round(
      (performanceScore * 0.3) +
      (riskScore * 0.3) +
      (growthScore * 0.2) +
      (aiScore * 0.2)
    );

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
