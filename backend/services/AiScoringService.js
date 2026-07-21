class AiScoringService {
  generateScores(cagr, volatility, maxDrawdown, alpha, benchmarkCagr) {
    if (cagr === undefined || volatility === undefined || maxDrawdown === undefined || alpha === undefined) {
       return { available: false, reason: "Insufficient metrics for scoring" };
    }

    // Pure rule-based scoring, NO Math.random()
    
    // Growth purely derived from actual returns vs benchmark and absolute CAGR
    let growth = 50 + (cagr * 1.5) + (alpha * 2);
    growth = this._clamp(growth);

    // Risk purely derived from volatility and drawdown
    let risk = 100 - (volatility * 2) - (maxDrawdown * 0.5);
    risk = this._clamp(risk);

    // Overall Fund Score based solely on real risk-adjusted returns
    let overall = (growth * 0.6) + (risk * 0.4);
    overall = this._clamp(overall);

    return {
      available: true,
      data: {
        growthScore: Math.round(growth),
        riskScore: Math.round(risk),
        fundScore: Math.round(overall)
      }
    };
  }

  generateRecommendation(scoresData) {
    if (!scoresData.available) {
      return { available: false, label: 'Insufficient Data', reasoning: ['Not enough historical data to generate reliable recommendations.'] };
    }
    const { fundScore } = scoresData.data;
    let label = 'Hold';
    let reasoning = [];

    if (fundScore >= 85) {
      label = 'Strong Buy';
      reasoning = ['Exceptional CAGR and Growth metrics.', 'High portfolio quality and manager consistency.'];
    } else if (fundScore >= 70) {
      label = 'Buy';
      reasoning = ['Solid historical returns.', 'Acceptable risk/reward ratio.'];
    } else if (fundScore >= 50) {
      label = 'Hold';
      reasoning = ['Average market performance.', 'No clear indicators for accumulation or offloading.'];
    } else if (fundScore >= 35) {
      label = 'Reduce Exposure';
      reasoning = ['Underperforming benchmarks.', 'High volatility and downside risk.'];
    } else {
      label = 'Sell';
      reasoning = ['Severe underperformance and drawdowns.', 'Poor fund management quality.'];
    }

    if (scoresData.data.riskScore > 80) reasoning.push('Very low risk profile.');
    else if (scoresData.data.riskScore < 40) reasoning.push('High volatility detected.');

    return { available: true, data: { label, reasoning } };
  }

  _clamp(value, min = 0, max = 100) {
    if (value > max) return max;
    if (value < min) return min;
    return value;
  }
}

export default new AiScoringService();
