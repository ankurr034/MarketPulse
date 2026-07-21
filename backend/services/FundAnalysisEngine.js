import financialMath from '../utils/FinancialMath.js';
import sipCalculator from '../utils/SipCalculator.js';
import aiScoringService from './AiScoringService.js';
import benchmarkService from './BenchmarkService.js';
import macroEconomicService from './MacroEconomicService.js';

class FundAnalysisEngine {
  /**
   * Run the full analysis pipeline on a fund
   */
  async analyzeFund(fundProfile, navHistoryArray, region = 'india') {
    // 1. NAV Analysis & Returns
    const returnsArray = this._calculatePeriodicReturns(navHistoryArray);
    const cagrStats = this._calculateCAGR(navHistoryArray);
    
    // 2. Risk Metrics & Math
    const stdDev = financialMath.calculateStandardDeviation(returnsArray);
    const maxDrawdown = financialMath.calculateMaxDrawdown(navHistoryArray.map(d => d.value));
    
    // Fetch benchmark for Alpha/Beta
    const benchmarkSymbol = region === 'india' ? '^NSEI' : '^GSPC';
    const benchmarkData = await benchmarkService.getBenchmarkReturns(benchmarkSymbol, 'max');
    const beta = financialMath.calculateBeta(returnsArray, benchmarkData.returns || []);
    const alpha = financialMath.calculateAlpha(cagrStats.threeYearCagr, benchmarkData.cagr || 12, 7.0, beta);
    const sharpe = financialMath.calculateSharpeRatio(cagrStats.threeYearCagr, 7.0, stdDev);
    const sortino = financialMath.calculateSortinoRatio(cagrStats.threeYearCagr, 7.0, returnsArray);
    
    // 3. SIP Analysis (1Y, 3Y, 5Y)
    const sipAnalysis = {
      oneYear: sipCalculator.calculateSipReturns(10000, cagrStats.oneYear, 1),
      threeYear: sipCalculator.calculateSipReturns(10000, cagrStats.threeYearCagr, 3),
      fiveYear: sipCalculator.calculateSipReturns(10000, cagrStats.fiveYearCagr, 5)
    };

    // 5. Macro Context
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
    }

    return {
      dataQuality,
      confidence,
      navAnalysis: {
        ...cagrStats,
        returnsArray: returnsArray.slice(-12) // Last 12 months
      },
      performance: {
        alpha: alpha.toFixed(2),
        beta: beta.toFixed(2),
        sharpeRatio: sharpe.toFixed(2),
        standardDeviation: stdDev.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2)
      },
      sipAnalysis,
      aiAnalysis,
      macroContext: macroData,
      benchmarkComparison: benchmarkData.cagr > cagrStats.threeYearCagr ? 'Underperforming' : 'Outperforming',
      riskLevel: aiAnalysis.available && aiAnalysis.data.riskScore > 75 ? 'Low' : 
                 (aiAnalysis.available && aiAnalysis.data.riskScore > 50 ? 'Moderate' : 'High')
    };
  }

  _calculatePeriodicReturns(navHistory) {
    if (!navHistory || navHistory.length < 2) return [];
    const returns = [];
    for (let i = 1; i < navHistory.length; i++) {
      const prev = navHistory[i - 1].value;
      const curr = navHistory[i].value;
      returns.push(((curr - prev) / prev) * 100);
    }
    return returns;
  }

  _calculateCAGR(navHistory) {
    if (!navHistory || navHistory.length === 0) return { oneYear: 0, threeYearCagr: 0, fiveYearCagr: 0 };
    
    const latest = navHistory[navHistory.length - 1];
    
    // Find closest date matches for 1y, 3y, 5y ago
    const oneYearAgo = navHistory.find(d => latest.time - d.time <= 365 * 24 * 60 * 60 * 1000);
    const threeYearsAgo = navHistory.find(d => latest.time - d.time <= 3 * 365 * 24 * 60 * 60 * 1000);
    const fiveYearsAgo = navHistory.find(d => latest.time - d.time <= 5 * 365 * 24 * 60 * 60 * 1000);

    return {
      oneYear: oneYearAgo ? financialMath.calculateAbsoluteReturn(oneYearAgo.value, latest.value) : 0,
      threeYearCagr: threeYearsAgo ? financialMath.calculateCAGR(threeYearsAgo.value, latest.value, 3) : 0,
      fiveYearCagr: fiveYearsAgo ? financialMath.calculateCAGR(fiveYearsAgo.value, latest.value, 5) : 0,
    };
  }
}

export default new FundAnalysisEngine();
