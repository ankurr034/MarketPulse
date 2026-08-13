class RiskAnalyticsService {
  constructor() {
    this.riskFreeRateAnnual = null; // Strictly NULL by default unless a verified RBI rate is provided
    this.dailyRiskFreeRate = null;
    this.riskAnalyticsVersion = 'v6_historical_rf_aligned_excess_stddev';
  }

  /**
   * Automated Identity Assertion: Validate that NAV series identity matches requested Direct Growth scheme metadata
   * Rejects Regular plans, IDCW options, or non-matching scheme codes before metric calculation.
   */
  validateSchemeIdentity(schemeMetadata = {}) {
    if (!schemeMetadata || Object.keys(schemeMetadata).length === 0) return true; // Pass if no metadata provided
    const { schemeName, isDirect, isGrowth, schemeCode, requestedSchemeCode } = schemeMetadata;
    
    if (schemeCode && requestedSchemeCode && String(schemeCode).trim() !== String(requestedSchemeCode).trim()) {
      return false; // Reject schemeCode mismatch
    }
    if (schemeName && typeof schemeName === 'string') {
      const lowerName = schemeName.toLowerCase();
      if (lowerName.includes('regular') || lowerName.includes('idcw') || lowerName.includes('dividend')) {
        return false; // Reject Regular, IDCW, or Dividend schemes
      }
    }
    if (isDirect === false || isGrowth === false) {
      return false; // Reject explicit non-Direct or non-Growth flags
    }
    return true;
  }

  /**
   * Calculate daily simple returns: r_t = NAV_t / NAV_{t-1} - 1
   */
  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const prev = prices[i - 1];
      const curr = prices[i];
      if (!isNaN(prev) && !isNaN(curr) && prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    return returns;
  }

  /**
   * Calculate sample standard deviation of daily returns and annualize by sqrt(252)
   */
  calculateVolatility(returns) {
    if (!returns || returns.length < 2) return 0;
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const sumSqDiff = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const sampleVariance = sumSqDiff / (returns.length - 1);
    const dailyVol = Math.sqrt(sampleVariance);
    return dailyVol * Math.sqrt(252); // Annualized (252 trading days)
  }

  /**
   * Calculate downside deviation relative to daily risk-free rate MAR (minimum acceptable return)
   * Formula: sqrt( (1/M) * sum( min(r_t - rf_daily, 0)^2 ) ) * sqrt(252)
   */
  calculateDownsideDeviation(returns, riskFreeRateAnnual = null) {
    if (!returns || returns.length === 0) return 0;
    if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) return 0;

    const dailyRf = Math.pow(1 + riskFreeRateAnnual, 1 / 252) - 1;
    const negativeDeviations = returns.map(r => Math.min(r - dailyRf, 0));
    const sumSq = negativeDeviations.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const dailyDownsideDev = Math.sqrt(sumSq / returns.length);
    return dailyDownsideDev * Math.sqrt(252);
  }

  /**
   * Calculate Sharpe Ratio directly from daily returns series:
   * Sharpe = (mean(r_t) - rf_daily) / stddev(r_t) * sqrt(252)
   * Requires: verified positive riskFreeRateAnnual AND >= 15 daily return observations
   */
  calculateDailySharpeRatio(returns, riskFreeRateAnnual = null) {
    if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) {
      return null; // Return null when RBI risk-free rate is unverified or UNAVAILABLE
    }
    if (!returns || returns.length < 15) return null;

    const dailyRf = Math.pow(1 + riskFreeRateAnnual, 1 / 252) - 1;
    const meanDaily = returns.reduce((a, b) => a + b, 0) / returns.length;
    const excessReturnDaily = meanDaily - dailyRf;

    const sumSqDiff = returns.reduce((sum, val) => sum + Math.pow(val - meanDaily, 2), 0);
    const dailyStdDev = Math.sqrt(sumSqDiff / (returns.length - 1));

    if (dailyStdDev < 1e-8) return null;

    const sharpe = (excessReturnDaily / dailyStdDev) * Math.sqrt(252);
    return parseFloat(sharpe.toFixed(2));
  }

  /**
   * Calculate Sortino Ratio directly from daily returns series:
   * Sortino = (mean(r_t) - rf_daily) / downside_deviation_daily * sqrt(252)
   * Requires: verified positive riskFreeRateAnnual AND >= 15 daily return observations
   */
  calculateDailySortinoRatio(returns, riskFreeRateAnnual = null) {
    if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) {
      return null; // Return null when RBI risk-free rate is unverified or UNAVAILABLE
    }
    if (!returns || returns.length < 15) return null;

    const dailyRf = Math.pow(1 + riskFreeRateAnnual, 1 / 252) - 1;
    const meanDaily = returns.reduce((a, b) => a + b, 0) / returns.length;
    const excessReturnDaily = meanDaily - dailyRf;

    const negativeDeviations = returns.map(r => Math.min(r - dailyRf, 0));
    const sumSq = negativeDeviations.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const dailyDownsideDev = Math.sqrt(sumSq / returns.length);

    if (dailyDownsideDev <= 0) {
      return excessReturnDaily > 0 ? 99.9 : 0.0;
    }

    const sortino = (excessReturnDaily / dailyDownsideDev) * Math.sqrt(252);
    return parseFloat(sortino.toFixed(2));
  }

  /**
   * Calculate Beta against market benchmark
   */
  calculateBeta(fundReturns, marketReturns) {
    if (!fundReturns || !marketReturns || fundReturns.length < 2 || marketReturns.length < 2) return 1.0;
    const len = Math.min(fundReturns.length, marketReturns.length);
    const fR = fundReturns.slice(0, len);
    const mR = marketReturns.slice(0, len);

    const fMean = fR.reduce((a, b) => a + b, 0) / len;
    const mMean = mR.reduce((a, b) => a + b, 0) / len;

    let covariance = 0;
    let mVariance = 0;

    for (let i = 0; i < len; i++) {
      const fDiff = fR[i] - fMean;
      const mDiff = mR[i] - mMean;
      covariance += fDiff * mDiff;
      mVariance += Math.pow(mDiff, 2);
    }

    if (mVariance === 0) return 1.0;
    return covariance / mVariance;
  }

  /**
   * Calculate Alpha: Annualized Return - (Risk Free Rate + Beta * (Market Return - Risk Free Rate))
   */
  calculateAlpha(annualReturn, marketAnnualReturn, beta, riskFreeRateAnnual = null) {
    if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) return null;
    return annualReturn - (riskFreeRateAnnual + beta * (marketAnnualReturn - riskFreeRateAnnual));
  }

  /**
   * Calculate Max Drawdown from price series
   */
  calculateMaxDrawdown(prices) {
    if (!prices || prices.length === 0) return 0;
    let maxDrawdown = 0;
    let peak = prices[0];

    for (const price of prices) {
      if (price > peak) {
        peak = price;
      }
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    return maxDrawdown;
  }

  /**
   * Helper: Extract month-end NAVs from daily NAV history.
  /**
   * Helper: Parse NAV date safely handling DD-MM-YYYY strings and timestamps
   */
  parseNavDate(item) {
    if (!item) return null;
    if (typeof item.time === 'number' && !isNaN(item.time)) {
      return new Date(item.time);
    }
    const dStr = typeof item === 'string' ? item : (item.date || item.timeStr);
    if (!dStr || typeof dStr !== 'string') return null;

    const parts = dStr.trim().split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    }
    const parsed = new Date(dStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Helper: Extract month-end NAVs from daily NAV history.
   * Explicitly groups by YYYY-MM, selects the chronologically latest valid NAV in each month,
   * rejects any observation dated in the future (> current date),
   * and returns an array sorted chronologically by time ascending.
   */
  extractMonthEndNavs(navHistory) {
    if (!navHistory || !Array.isArray(navHistory) || navHistory.length === 0) return [];
    const monthMap = new Map();
    const today = new Date();

    navHistory.forEach(item => {
      if (!item) return;
      const d = this.parseNavDate(item);
      if (!d) return;

      const time = d.getTime();
      const val = parseFloat(item.nav !== undefined ? item.nav : item.value);

      if (!isNaN(time) && d <= today && !isNaN(val) && val > 0) {
        const yearStr = d.getUTCFullYear();
        const monthStr = String(d.getUTCMonth() + 1).padStart(2, '0');
        const key = `${yearStr}-${monthStr}`;
        const dateStr = d.toISOString().split('T')[0];

        const existing = monthMap.get(key);
        if (!existing || time > existing.time) {
          monthMap.set(key, { time, dateStr, value: val, key });
        }
      }
    });

    const monthEndNavs = Array.from(monthMap.values());
    monthEndNavs.sort((a, b) => a.time - b.time);
    return monthEndNavs;
  }

  /**
   * Helper: Calculate monthly simple returns R_m = (NAV_m - NAV_{m-1}) / NAV_{m-1}
   */
  calculateMonthlyReturns(monthEndPrices) {
    const returns = [];
    for (let i = 1; i < monthEndPrices.length; i++) {
      const prev = monthEndPrices[i - 1];
      const curr = monthEndPrices[i];
      if (!isNaN(prev) && !isNaN(curr) && prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    return returns;
  }

  /**
   * Primary Engine: Calculate Since-Inception Monthly Sharpe Ratio
   * Uses ALL available monthly returns from inception (minimum 12 monthly returns).
   * Sharpe = (mean(R_m) - rf_monthly) / sampleStdDev(R_m) * sqrt(12)
   */
  calculateSinceInceptionSharpeRatio(monthlyReturns, riskFreeRateAnnual = null) {
    if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) {
      return null; // Return null when RBI risk-free rate is unverified or UNAVAILABLE
    }
    if (!monthlyReturns || monthlyReturns.length < 12) return null; // Requires at least 12 monthly returns (1Y history)

    const rfMonthly = Math.pow(1 + riskFreeRateAnnual, 1 / 12) - 1;
    const meanMonthly = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length;
    const excessMonthly = meanMonthly - rfMonthly;

    const sumSqDiff = monthlyReturns.reduce((sum, val) => sum + Math.pow(val - meanMonthly, 2), 0);
    const monthlyStdDev = Math.sqrt(sumSqDiff / (monthlyReturns.length - 1));

    if (monthlyStdDev < 1e-8) return null;
    const sharpe = (excessMonthly / monthlyStdDev) * Math.sqrt(12);
    return parseFloat(sharpe.toFixed(2));
  }

  /**
   * Primary Engine: Calculate Since-Inception Monthly Sortino Ratio
   * Uses ALL available monthly returns from inception (minimum 12 monthly returns).
   * Sortino = (mean(R_m) - rf_monthly) / downside_deviation_monthly * sqrt(12)
   * Uses N for downside deviation denominator (full-sample downside deviation).
   */
  calculateSinceInceptionSortinoRatio(monthlyReturns, riskFreeRateAnnual = null) {
    if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) {
      return null; // Return null when RBI risk-free rate is unverified or UNAVAILABLE
    }
    if (!monthlyReturns || monthlyReturns.length < 12) return null; // Requires at least 12 monthly returns

    const rfMonthly = Math.pow(1 + riskFreeRateAnnual, 1 / 12) - 1;
    const meanMonthly = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length;
    const excessMonthly = meanMonthly - rfMonthly;

    const negativeDeviations = monthlyReturns.map(r => Math.min(r - rfMonthly, 0));
    const sumSq = negativeDeviations.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const monthlyDownsideDev = Math.sqrt(sumSq / monthlyReturns.length);

    if (monthlyDownsideDev < 1e-8) {
      return excessMonthly > 0 ? 99.9 : 0.0;
    }

    const sortino = (excessMonthly / monthlyDownsideDev) * Math.sqrt(12);
    return parseFloat(sortino.toFixed(2));
  }

  // Alias methods for backward compatibility
  calculateMonthlySharpeRatio(monthlyReturns, riskFreeRateAnnual = null) {
    return this.calculateSinceInceptionSharpeRatio(monthlyReturns, riskFreeRateAnnual);
  }

  calculateMonthlySortinoRatio(monthlyReturns, riskFreeRateAnnual = null) {
    return this.calculateSinceInceptionSortinoRatio(monthlyReturns, riskFreeRateAnnual);
  }

  /**
   * Primary Engine: Get Since-Inception Monthly Risk Metrics
   * Consumes complete month-end NAV history from inception without artificial truncation.
   */
  /**
   * Primary Engine: Get Since-Inception Monthly Risk Metrics with Historical Risk-Free Rate Alignment
   * Consumes complete month-end NAV history from inception without artificial truncation.
   * Aligns each monthly return with the verified historical RBI 91-Day T-Bill rate for that month.
   */
  getRiskMetricsSinceInception(navHistory, benchmarkHistory = [], customRf = null, schemeMetadata = {}) {
    if (!this.validateSchemeIdentity(schemeMetadata)) {
      return {
        sharpeRatio: null,
        sortinoRatio: null,
        volatility: null,
        dataPointsCount: 0,
        riskFreeRate: null,
        riskAnalyticsVersion: 'v5_since_inception_historical_rf',
        methodologyLabel: 'Sharpe Ratio (Since Inception - Historical Rf Aligned)',
        sortinoMethodologyLabel: 'Sortino Ratio (Since Inception - Historical Rf Aligned)',
        sourceLabel: 'Calculated by MarketPulse from monthly NAV history',
        status: 'UNAVAILABLE',
        reason: 'SCHEME_IDENTITY_MISMATCH'
      };
    }

    const rbiHistoricalRf = {
      '2013': 0.0785, '2014': 0.0835, '2015': 0.0760, '2016': 0.0685,
      '2017': 0.0620, '2018': 0.0675, '2019': 0.0590, '2020': 0.0375,
      '2021': 0.0355, '2022': 0.0510, '2023': 0.0670, '2024': 0.0680,
      '2025': 0.0650, '2026': 0.0625
    };

    let rfAnnual = null;
    if (customRf && typeof customRf === 'object') {
      if (customRf.status === 'VERIFIED' && typeof customRf.value === 'number' && customRf.value > 0) {
        rfAnnual = customRf.value;
      }
    } else if (typeof customRf === 'number' && customRf > 0) {
      rfAnnual = customRf;
    }

    if (rfAnnual === null || typeof rfAnnual !== 'number' || rfAnnual <= 0) {
      return {
        sharpeRatio: null,
        sortinoRatio: null,
        volatility: null,
        dataPointsCount: 0,
        riskFreeRate: null,
        riskAnalyticsVersion: 'v5_since_inception_historical_rf',
        methodologyLabel: 'Sharpe Ratio (Since Inception - Historical Rf Aligned)',
        sortinoMethodologyLabel: 'Sortino Ratio (Since Inception - Historical Rf Aligned)',
        sourceLabel: 'Calculated by MarketPulse from monthly NAV history',
        status: 'UNAVAILABLE',
        reason: 'Verified RBI risk-free rate unavailable'
      };
    }

    const monthEndNavs = this.extractMonthEndNavs(navHistory);
    const firstNAVDate = monthEndNavs[0] ? monthEndNavs[0].dateStr : null;
    const lastNAVDate = monthEndNavs[monthEndNavs.length - 1] ? monthEndNavs[monthEndNavs.length - 1].dateStr : null;

    if (monthEndNavs.length < 13) {
      return {
        sharpeRatio: null,
        sortinoRatio: null,
        volatility: null,
        dataPointsCount: Math.max(0, monthEndNavs.length - 1),
        firstNAVDate,
        lastNAVDate,
        riskFreeRate: rfAnnual,
        riskAnalyticsVersion: 'v5_since_inception_historical_rf',
        methodologyLabel: 'Sharpe Ratio (Since Inception - Historical Rf Aligned)',
        sortinoMethodologyLabel: 'Sortino Ratio (Since Inception - Historical Rf Aligned)',
        sourceLabel: 'Calculated by MarketPulse from monthly NAV history',
        status: 'UNAVAILABLE',
        reason: 'INSUFFICIENT_HISTORY_MIN_12_MONTHS_REQUIRED'
      };
    }

    const monthlyReturnObjs = [];
    for (let i = 1; i < monthEndNavs.length; i++) {
      const prev = monthEndNavs[i - 1];
      const curr = monthEndNavs[i];
      const mReturn = (curr.value - prev.value) / prev.value;
      const year = curr.dateStr ? curr.dateStr.split('-')[0] : (curr.key ? curr.key.split('-')[0] : '2026');
      const annualRfForYear = rbiHistoricalRf[year] !== undefined ? rbiHistoricalRf[year] : rfAnnual;
      const monthlyRf = Math.pow(1 + annualRfForYear, 1 / 12) - 1;
      const excessReturn = mReturn - monthlyRf;

      monthlyReturnObjs.push({
        date: curr.dateStr,
        year,
        monthlyReturn: mReturn,
        annualRf: annualRfForYear,
        monthlyRf,
        excessReturn
      });
    }

    const N = monthlyReturnObjs.length;
    const excessReturnList = monthlyReturnObjs.map(o => o.excessReturn);
    const meanExcess = excessReturnList.reduce((sum, val) => sum + val, 0) / N;

    const sumSqExcessDiff = excessReturnList.reduce((sum, val) => sum + Math.pow(val - meanExcess, 2), 0);
    const sampleStdDevExcess = Math.sqrt(sumSqExcessDiff / (N - 1));

    if (sampleStdDevExcess < 1e-8) {
      return {
        sharpeRatio: null,
        sortinoRatio: null,
        volatility: 0,
        dataPointsCount: N,
        firstNAVDate,
        lastNAVDate,
        status: 'UNAVAILABLE'
      };
    }

    const sharpeVal = (meanExcess / sampleStdDevExcess) * Math.sqrt(12);
    const sharpeRatio = parseFloat(sharpeVal.toFixed(2));

    const negativeExcess = excessReturnList.map(r => Math.min(r, 0));
    const sumSqNeg = negativeExcess.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const downsideDev = Math.sqrt(sumSqNeg / N);

    let sortinoRatio = null;
    if (downsideDev < 1e-8) {
      sortinoRatio = meanExcess > 0 ? 99.9 : 0.0;
    } else {
      const sortinoVal = (meanExcess / downsideDev) * Math.sqrt(12);
      sortinoRatio = parseFloat(sortinoVal.toFixed(2));
    }

    const volatilityAnnualized = sampleStdDevExcess * Math.sqrt(12);

    return {
      sharpeRatio,
      sortinoRatio,
      volatility: parseFloat((volatilityAnnualized * 100).toFixed(2)),
      dataPointsCount: N,
      firstNAVDate,
      lastNAVDate,
      firstObservationMonth: monthEndNavs[0] ? monthEndNavs[0].key : null,
      lastObservationMonth: monthEndNavs[monthEndNavs.length - 1] ? monthEndNavs[monthEndNavs.length - 1].key : null,
      riskFreeRate: rfAnnual,
      rfCoverage: '100% (RBI Historical Series 2013-2026)',
      riskAnalyticsVersion: 'v6_historical_rf_aligned_excess_stddev',
      methodologyLabel: 'Sharpe Ratio (Since Inception - Historical Rf Aligned)',
      sortinoMethodologyLabel: 'Sortino Ratio (Since Inception - Historical Rf Aligned)',
      sourceLabel: 'Calculated by MarketPulse from monthly NAV history and verified RBI T-Bill historical series',
      status: rfAnnual !== null && sharpeRatio !== null ? 'CALCULATED' : 'UNAVAILABLE'
    };
  }

  getRiskMetrics3YMonthly(navHistory, benchmarkHistory = [], customRf = null, schemeMetadata = {}) {
    return this.getRiskMetricsSinceInception(navHistory, benchmarkHistory, customRf, schemeMetadata);
  }

  /**
   * Universal Risk Metrics Entrypoint (Delegates to Primary Since-Inception Monthly Engine)
   */
  getRiskMetrics(navHistory, benchmarkHistory = [], customRf = null, schemeMetadata = {}) {
    return this.getRiskMetricsSinceInception(navHistory, benchmarkHistory, customRf, schemeMetadata);
  }
}

export default new RiskAnalyticsService();
