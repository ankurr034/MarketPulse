import * as math from 'mathjs';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';


class FinancialMath {
  /**
   * Calculate CAGR (Compound Annual Growth Rate)
   * @param {number} startValue 
   * @param {number} endValue 
   * @param {number} years 
   * @returns {number} CAGR as percentage
   */
  calculateCAGR(startValue, endValue, years) {
    if (startValue <= 0 || years <= 0) return 0;
    return (Math.pow((endValue / startValue), (1 / years)) - 1) * 100;
  }

  /**
   * Calculate Absolute Return
   * @param {number} startValue 
   * @param {number} endValue 
   * @returns {number} Return as percentage
   */
  calculateAbsoluteReturn(startValue, endValue) {
    if (startValue <= 0) return 0;
    return ((endValue - startValue) / startValue) * 100;
  }

  /**
   * Calculate Standard Deviation (Volatility)
   * @param {Array<number>} returns - Array of percentage returns
   * @returns {number} Standard Deviation
   */
  calculateStandardDeviation(returns) {
    if (!returns || returns.length === 0) return 0;
    return math.std(returns);
  }

  /**
   * Calculate Beta (Relative volatility to benchmark)
   * @param {Array<number>} fundReturns 
   * @param {Array<number>} benchmarkReturns 
   * @returns {number} Beta
   */
  calculateBeta(fundReturns, benchmarkReturns) {
    if (fundReturns.length === 0 || benchmarkReturns.length === 0) return 1.0;
    const covariance = this._calculateCovariance(fundReturns, benchmarkReturns);
    const variance = math.variance(benchmarkReturns);
    return variance === 0 ? 1.0 : covariance / variance;
  }

  /**
   * Calculate Alpha (Excess return over benchmark adjusted for risk)
   * @param {number} fundReturn - Annualized
   * @param {number} benchmarkReturn - Annualized
   * @param {number} riskFreeRate - Annualized (e.g. 7.0 for India)
   * @param {number} beta 
   * @returns {number} Alpha as percentage
   */
  calculateAlpha(fundReturn, benchmarkReturn, riskFreeRate, beta) {
    return fundReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
  }

  /**
   * Calculate Sharpe Ratio (Delegates to canonical RiskAnalyticsService)
   */
  calculateSharpeRatio(returns, riskFreeRateAnnual = null) {
    return riskAnalyticsService.calculateDailySharpeRatio(returns, riskFreeRateAnnual);
  }

  /**
   * Calculate Sortino Ratio (Delegates to canonical RiskAnalyticsService)
   */
  calculateSortinoRatio(returns, riskFreeRateAnnual = null) {
    return riskAnalyticsService.calculateDailySortinoRatio(returns, riskFreeRateAnnual);
  }


  /**
   * Calculate Maximum Drawdown
   * @param {Array<number>} prices - Array of historical prices/NAVs
   * @returns {number} Max Drawdown as percentage
   */
  calculateMaxDrawdown(prices) {
    if (!prices || prices.length === 0) return 0;
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let price of prices) {
      if (price > peak) peak = price;
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown * 100;
  }

  // Private Helper
  _calculateCovariance(x, y) {
    const meanX = math.mean(x);
    const meanY = math.mean(y);
    let sum = 0;
    const len = Math.min(x.length, y.length);
    for (let i = 0; i < len; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }
    return sum / (len - 1);
  }
}

export default new FinancialMath();
