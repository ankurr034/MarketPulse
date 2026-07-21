class RiskAnalyticsService {
  constructor() {
    this.riskFreeRate = 0.06; // 6% annual risk free rate standard in India, or custom
  }

  // Calculate daily returns from price series
  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const prev = prices[i - 1];
      const curr = prices[i];
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    return returns;
  }

  // Calculate volatility (annualized standard deviation of daily returns)
  calculateVolatility(returns) {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    return dailyVolatility * Math.sqrt(252); // Annualized (252 trading days)
  }

  // Calculate downside deviation (for Sortino ratio)
  calculateDownsideDeviation(returns) {
    if (returns.length === 0) return 0;
    const dailyRiskFree = this.riskFreeRate / 252;
    const negativeReturns = returns.map(r => r - dailyRiskFree).filter(r => r < 0);
    if (negativeReturns.length === 0) return 0.0001; // Avoid division by zero
    const sumSq = negativeReturns.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const dailyDownside = Math.sqrt(sumSq / returns.length);
    return dailyDownside * Math.sqrt(252); // Annualized
  }

  // Calculate Sharpe Ratio
  calculateSharpeRatio(annualReturn, volatility) {
    if (volatility <= 0) return 0;
    return (annualReturn - this.riskFreeRate) / volatility;
  }

  // Calculate Sortino Ratio
  calculateSortinoRatio(annualReturn, downsideDeviation) {
    if (downsideDeviation <= 0) return 0;
    return (annualReturn - this.riskFreeRate) / downsideDeviation;
  }

  // Calculate Beta
  calculateBeta(fundReturns, marketReturns) {
    if (fundReturns.length === 0 || marketReturns.length === 0) return 1;
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

    if (mVariance === 0) return 1;
    return covariance / mVariance;
  }

  // Calculate Alpha
  calculateAlpha(annualReturn, marketAnnualReturn, beta) {
    return annualReturn - (this.riskFreeRate + beta * (marketAnnualReturn - this.riskFreeRate));
  }

  // Calculate Max Drawdown
  calculateMaxDrawdown(prices) {
    if (prices.length === 0) return 0;
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

  // Calculate all metrics from NAV history
  getRiskMetrics(navHistory, benchmarkHistory = []) {
    if (!navHistory || navHistory.length < 2) {
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        alpha: 0,
        beta: 1,
        volatility: 0,
        maxDrawdown: 0,
        riskRewardRatio: 0
      };
    }

    const prices = navHistory.map(item => item.value);
    const returns = this.calculateReturns(prices);
    
    // Approximate annual return based on CAGR of history
    const years = navHistory.length / 252;
    const startVal = prices[0];
    const endVal = prices[prices.length - 1];
    let annualReturn = 0.12; // 12% fallback
    if (startVal > 0 && endVal > 0 && years > 0) {
      annualReturn = Math.pow(endVal / startVal, 1 / Math.max(0.1, years)) - 1;
    }

    const volatility = this.calculateVolatility(returns);
    const downsideDeviation = this.calculateDownsideDeviation(returns);
    const maxDrawdown = this.calculateMaxDrawdown(prices);

    let beta = 1;
    let alpha = 0;

    if (benchmarkHistory && benchmarkHistory.length > 1) {
      const benchmarkPrices = benchmarkHistory.map(item => item.value);
      const benchmarkReturns = this.calculateReturns(benchmarkPrices);
      beta = this.calculateBeta(returns, benchmarkReturns);
      
      const benchmarkYears = benchmarkHistory.length / 252;
      const bStart = benchmarkPrices[0];
      const bEnd = benchmarkPrices[benchmarkPrices.length - 1];
      let bAnnualReturn = 0.12;
      if (bStart > 0 && bEnd > 0 && benchmarkYears > 0) {
        bAnnualReturn = Math.pow(bEnd / bStart, 1 / Math.max(0.1, benchmarkYears)) - 1;
      }
      alpha = this.calculateAlpha(annualReturn, bAnnualReturn, beta);
    }

    const sharpeRatio = this.calculateSharpeRatio(annualReturn, volatility);
    const sortinoRatio = this.calculateSortinoRatio(annualReturn, downsideDeviation);
    const riskRewardRatio = maxDrawdown > 0 ? annualReturn / maxDrawdown : 0;

    return {
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      alpha: parseFloat(alpha.toFixed(4)),
      beta: parseFloat(beta.toFixed(2)),
      volatility: parseFloat((volatility * 100).toFixed(2)), // in %
      maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)), // in %
      riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2))
    };
  }
}

export default new RiskAnalyticsService();
