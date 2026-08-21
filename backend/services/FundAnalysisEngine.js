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
    // Import canonical risk analytics service, macro data service, and cache service
    const { default: riskAnalyticsService } = await import('./RiskAnalyticsService.js');
    const { default: macroDataService } = await import('./MacroDataService.js');
    const { default: mfapiCacheService } = await import('./MfapiCacheService.js');

    const rfObj = await macroDataService.getRiskFreeRate();
    const rfVal = (rfObj && typeof rfObj.value === 'number') ? rfObj.value : 0.0625;

    // Load full historical NAV sequence from database cache to ensure 3Y and 5Y calculations are complete
    let fullNavs = navHistoryArray;
    try {
      const schemeCode = fundProfile.schemeCode || fundProfile.id;
      if (schemeCode) {
        const schemeData = await mfapiCacheService.getSchemeData(schemeCode);
        if (schemeData && schemeData.data && Array.isArray(schemeData.data) && schemeData.data.length > 0) {
          fullNavs = [...schemeData.data].reverse().map(d => ({ date: d.date, value: parseFloat(d.nav) }));
        }
      }
    } catch (e) {
      console.warn('Failed to load full NAVs for advanced analysis, using parameters:', e.message);
    }

    const riskMetrics3Y = riskAnalyticsService.getRiskMetrics3YMonthly(fullNavs, benchmarkData.returns || [], rfVal, fundProfile || {});
    const riskMetrics5Y = riskAnalyticsService.getRiskMetrics5YMonthly(fullNavs, benchmarkData.returns || [], rfVal, fundProfile || {});
    const riskMetricsIncep = riskAnalyticsService.getRiskMetricsSinceInception(fullNavs, benchmarkData.returns || [], rfVal, fundProfile || {});

    const alpha = financialMath.calculateAlpha(cagrStats.threeYearCagr, benchmarkData.cagr || 12, rfVal * 100, beta);
    const sharpe = riskMetricsIncep.sharpeRatio;
    const sortino = riskMetricsIncep.sortinoRatio;
    
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
        alpha: typeof alpha === 'number' ? alpha.toFixed(2) : null,
        beta: typeof beta === 'number' ? beta.toFixed(2) : null,
        sharpeRatio: typeof sharpe === 'number' ? sharpe.toFixed(2) : null,
        sortinoRatio: typeof sortino === 'number' ? sortino.toFixed(2) : null,
        standardDeviation: typeof stdDev === 'number' ? stdDev.toFixed(2) : null,
        maxDrawdown: typeof maxDrawdown === 'number' ? maxDrawdown.toFixed(2) : null,
        timeframes: {
          '3Y': {
            sharpeRatio: riskMetrics3Y.sharpeRatio,
            sortinoRatio: riskMetrics3Y.sortinoRatio,
            status: riskMetrics3Y.status,
            reason: riskMetrics3Y.reason
          },
          '5Y': {
            sharpeRatio: riskMetrics5Y.sharpeRatio,
            sortinoRatio: riskMetrics5Y.sortinoRatio,
            status: riskMetrics5Y.status,
            reason: riskMetrics5Y.reason
          },
          'All': {
            sharpeRatio: riskMetricsIncep.sharpeRatio,
            sortinoRatio: riskMetricsIncep.sortinoRatio,
            status: riskMetricsIncep.status,
            reason: riskMetricsIncep.reason
          }
        }
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
    const latestTime = latest.time;
    
    const oneYearTarget = latestTime - 365.25 * 24 * 60 * 60 * 1000;
    const threeYearsTarget = latestTime - 3 * 365.25 * 24 * 60 * 60 * 1000;
    const fiveYearsTarget = latestTime - 5 * 365.25 * 24 * 60 * 60 * 1000;

    const findOnOrBefore = (targetTime, maxDays = 30) => {
      let candidate = null;
      for (let i = navHistory.length - 1; i >= 0; i--) {
        if (navHistory[i].time <= targetTime) {
          if (targetTime - navHistory[i].time <= maxDays * 24 * 60 * 60 * 1000) {
            candidate = navHistory[i];
          }
          break;
        }
      }
      return candidate;
    };

    const oneYearAgo = findOnOrBefore(oneYearTarget);
    const threeYearsAgo = findOnOrBefore(threeYearsTarget);
    const fiveYearsAgo = findOnOrBefore(fiveYearsTarget);

    const calcCagrWithDays = (startItem) => {
      if (!startItem || startItem.value <= 0 || latest.value <= 0) return 0;
      const days = (latestTime - startItem.time) / (24 * 60 * 60 * 1000);
      const yrs = days / 365.25;
      return financialMath.calculateCAGR(startItem.value, latest.value, yrs);
    };

    return {
      oneYear: oneYearAgo ? financialMath.calculateAbsoluteReturn(oneYearAgo.value, latest.value) : 0,
      threeYearCagr: threeYearsAgo ? calcCagrWithDays(threeYearsAgo) : 0,
      fiveYearCagr: fiveYearsAgo ? calcCagrWithDays(fiveYearsAgo) : 0,
    };
  }
}

export default new FundAnalysisEngine();
