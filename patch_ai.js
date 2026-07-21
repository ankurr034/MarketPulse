import fs from 'fs';

// --- AiScoringService.js ---
let aiScoring = fs.readFileSync('backend/services/AiScoringService.js', 'utf-8');

aiScoring = aiScoring.replace(
`  generateScores(cagr, volatility, holdingsScore, managerScore, maxDrawdown, alpha) {
    // 1. Growth Score (0-100)
    let growth = 50 + (cagr * 1.5) + (alpha * 2) + (holdingsScore * 0.1);
    growth = this._clamp(growth);

    // 2. Risk Score (0-100) - Higher is riskier. Wait, the prompt says "Risk Score: 84/100" meaning maybe 100 is best (lowest risk)? Let's assume higher = safer (better).
    let risk = 100 - (volatility * 2) - (maxDrawdown * 0.5);
    risk = this._clamp(risk);

    // 3. Quality Score (0-100)
    let quality = (managerScore * 0.5) + (holdingsScore * 0.5);
    quality = this._clamp(quality);

    // 4. Diversification Score (0-100)
    // We mock this slightly based on the number of holdings, which isn't passed here directly, 
    // so we'll use a random-ish stable value for now, or just a default 85.
    let diversification = 80 + (Math.random() * 15);
    diversification = this._clamp(diversification);

    // 5. Overall Fund Score
    let overall = (growth * 0.4) + (risk * 0.2) + (quality * 0.25) + (diversification * 0.15);
    overall = this._clamp(overall);

    return {
      growthScore: Math.round(growth),
      riskScore: Math.round(risk),
      qualityScore: Math.round(quality),
      diversificationScore: Math.round(diversification),
      fundScore: Math.round(overall)
    };
  }`,
`  generateScores(cagr, volatility, maxDrawdown, alpha, benchmarkCagr) {
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
  }`
);

aiScoring = aiScoring.replace(
`  generateRecommendation(scores) {
    const { fundScore } = scores;`,
`  generateRecommendation(scoresData) {
    if (!scoresData.available) {
      return { available: false, label: 'Insufficient Data', reasoning: ['Not enough historical data to generate reliable recommendations.'] };
    }
    const { fundScore } = scoresData.data;`
);

aiScoring = aiScoring.replace(
`    if (scores.riskScore > 80) reasoning.push('Very low risk profile.');
    else if (scores.riskScore < 40) reasoning.push('High volatility detected.');

    return { label, reasoning };`,
`    if (scoresData.data.riskScore > 80) reasoning.push('Very low risk profile.');
    else if (scoresData.data.riskScore < 40) reasoning.push('High volatility detected.');

    return { available: true, data: { label, reasoning } };`
);

fs.writeFileSync('backend/services/AiScoringService.js', aiScoring);


// --- FundAnalysisEngine.js ---
let fundAnalysis = fs.readFileSync('backend/services/FundAnalysisEngine.js', 'utf-8');

fundAnalysis = fundAnalysis.replace(
`    // 4. Scoring & Recommendations
    // Mock holdings and manager scores for now since APIs don't easily provide manager quality 
    const holdingsScore = 80 + Math.random() * 15;
    const managerScore = 75 + Math.random() * 20;
    
    const scores = aiScoringService.generateScores(cagrStats.threeYearCagr, stdDev, holdingsScore, managerScore, maxDrawdown, alpha);
    const recommendation = aiScoringService.generateRecommendation(scores);

    // 5. Macro Context
    const macroData = await macroEconomicService.getMacroIndicators(region);

    // Evaluate Data Completeness
    const hasSufficientData = navHistoryArray && navHistoryArray.length > 100 && cagrStats.threeYearCagr !== 0;
    const dataQuality = hasSufficientData ? 'High' : (navHistoryArray && navHistoryArray.length > 0 ? 'Medium' : 'Low');
    const confidence = hasSufficientData ? 92 : (dataQuality === 'Medium' ? 65 : 20);

    if (!hasSufficientData) {
      recommendation = {
        label: 'Insufficient Data',
        reasoning: ['Not enough historical data to generate reliable AI recommendations.']
      };
      scores.fundScore = 0;
      scores.riskScore = 0;
    }`,
`    // 5. Macro Context
    const macroData = await macroEconomicService.getMacroIndicators(region);

    // Evaluate Data Completeness
    const hasSufficientData = navHistoryArray && navHistoryArray.length > 100 && cagrStats.threeYearCagr !== 0;
    const dataQuality = hasSufficientData ? 'High' : (navHistoryArray && navHistoryArray.length > 0 ? 'Medium' : 'Low');
    const confidence = hasSufficientData ? 92 : (dataQuality === 'Medium' ? 65 : 20);

    // 4. Scoring & Recommendations (Pure Data)
    let aiAnalysis = { available: false, reason: "Insufficient Data" };
    if (hasSufficientData) {
      const scoresRes = aiScoringService.generateScores(cagrStats.threeYearCagr, stdDev, maxDrawdown, alpha, benchmarkData.cagr);
      if (scoresRes.available) {
        const recRes = aiScoringService.generateRecommendation(scoresRes);
        aiAnalysis = {
          available: true,
          data: {
            ...scoresRes.data,
            recommendation: recRes.data
          }
        };
      }
    }`
);

fundAnalysis = fundAnalysis.replace(
`      aiAnalysis: {
        ...scores,
        recommendation
      },
      macroContext: macroData,
      benchmarkComparison: benchmarkData.cagr > cagrStats.threeYearCagr ? 'Underperforming' : 'Outperforming',
      portfolioQuality: Math.round(holdingsScore),
      sectorScore: 89, // Mock
      riskLevel: scores.riskScore > 75 ? 'Low' : scores.riskScore > 50 ? 'Moderate' : 'High'
    };`,
`      aiAnalysis,
      macroContext: macroData,
      benchmarkComparison: benchmarkData.cagr > cagrStats.threeYearCagr ? 'Underperforming' : 'Outperforming',
      riskLevel: aiAnalysis.available && aiAnalysis.data.riskScore > 75 ? 'Low' : 
                 (aiAnalysis.available && aiAnalysis.data.riskScore > 50 ? 'Moderate' : 'High')
    };`
);

fs.writeFileSync('backend/services/FundAnalysisEngine.js', fundAnalysis);

