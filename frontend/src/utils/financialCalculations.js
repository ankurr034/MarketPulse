/**
 * Financial Calculations Engine (Frontend Shared Utility)
 * 
 * Provides robust mathematical calculation and ratio extraction for risk-adjusted returns:
 * - Sharpe Ratio (Sample StdDev, excess return relative to RBI 91-Day T-Bill benchmark)
 * - Sortino Ratio (Downside deviation relative to MAR = RBI 91-Day T-Bill benchmark)
 * - NAV Return derivation with chronology validation
 * - Ratio extractors with defensive fallback handling
 * 
 * Methodology & Parity:
 * Strictly aligns with backend RiskAnalyticsService.js and DocumentationPage specifications.
 */

import { RISK_FREE_RATE_CONFIG } from '../config/riskFreeRate.js';

/**
 * Calculates Sharpe Ratio from a periodic return series (decimals, e.g. 0.02 for +2%).
 * Formula: (Mean(Excess Returns) / SampleStdDev(Excess Returns)) * sqrt(AnnualizationFactor)
 * 
 * @param {number[]} returns - Array of periodic simple returns (e.g. [0.01, -0.005, 0.02, ...])
 * @param {number} [riskFreeRateAnnual=RISK_FREE_RATE_CONFIG.annualRateDecimal] - Annual risk-free rate (e.g. 0.065 for 6.50%)
 * @param {'monthly' | 'daily'} [frequency='monthly'] - Return observation frequency
 * @returns {number|null} Annualized Sharpe Ratio rounded to 2 decimals, or null if invalid/unavailable
 */
export function calculateSharpeRatio(
  returns,
  riskFreeRateAnnual = RISK_FREE_RATE_CONFIG.annualRateDecimal,
  frequency = 'monthly'
) {
  if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) {
    return null;
  }
  if (!Array.isArray(returns) || returns.length === 0) {
    return null;
  }

  // Filter and sanitize valid numeric returns
  const cleanReturns = returns.filter(r => typeof r === 'number' && !isNaN(r) && isFinite(r));

  const isMonthly = frequency === 'monthly';
  const minObservations = isMonthly ? 12 : 15;
  if (cleanReturns.length < minObservations) {
    return null;
  }

  const annualizationFactor = Math.sqrt(isMonthly ? 12 : 252);
  const periodRf = isMonthly
    ? Math.pow(1 + riskFreeRateAnnual, 1 / 12) - 1
    : Math.pow(1 + riskFreeRateAnnual, 1 / 252) - 1;

  const N = cleanReturns.length;
  const excessReturns = cleanReturns.map(r => r - periodRf);
  const meanExcess = excessReturns.reduce((sum, val) => sum + val, 0) / N;

  // Sample standard deviation (Bessel's correction: N - 1)
  const sumSqDiff = excessReturns.reduce((sum, val) => sum + Math.pow(val - meanExcess, 2), 0);
  const sampleVariance = sumSqDiff / (N - 1);
  const sampleStdDev = Math.sqrt(sampleVariance);

  // Guard against zero/near-zero volatility or arithmetic errors
  if (sampleStdDev < 1e-8 || isNaN(sampleStdDev) || !isFinite(sampleStdDev)) {
    return null;
  }

  const sharpe = (meanExcess / sampleStdDev) * annualizationFactor;
  if (isNaN(sharpe) || !isFinite(sharpe)) {
    return null;
  }

  return parseFloat(sharpe.toFixed(2));
}

/**
 * Calculates Sortino Ratio from a periodic return series.
 * Formula: (Mean(Excess Returns) / DownsideDeviation(MAR)) * sqrt(AnnualizationFactor)
 * Downside deviation uses population denominator N per project methodology.
 * 
 * @param {number[]} returns - Array of periodic simple returns
 * @param {number} [riskFreeRateAnnual=RISK_FREE_RATE_CONFIG.annualRateDecimal] - Annual risk-free rate
 * @param {'monthly' | 'daily'} [frequency='monthly'] - Return observation frequency
 * @returns {number|null} Annualized Sortino Ratio rounded to 2 decimals, or null if invalid/unavailable
 */
export function calculateSortinoRatio(
  returns,
  riskFreeRateAnnual = RISK_FREE_RATE_CONFIG.annualRateDecimal,
  frequency = 'monthly'
) {
  if (typeof riskFreeRateAnnual !== 'number' || isNaN(riskFreeRateAnnual) || riskFreeRateAnnual <= 0) {
    return null;
  }
  if (!Array.isArray(returns) || returns.length === 0) {
    return null;
  }

  const cleanReturns = returns.filter(r => typeof r === 'number' && !isNaN(r) && isFinite(r));

  const isMonthly = frequency === 'monthly';
  const minObservations = isMonthly ? 12 : 15;
  if (cleanReturns.length < minObservations) {
    return null;
  }

  const annualizationFactor = Math.sqrt(isMonthly ? 12 : 252);
  const periodMAR = isMonthly
    ? Math.pow(1 + riskFreeRateAnnual, 1 / 12) - 1
    : Math.pow(1 + riskFreeRateAnnual, 1 / 252) - 1;

  const N = cleanReturns.length;
  const excessReturns = cleanReturns.map(r => r - periodMAR);
  const meanExcess = excessReturns.reduce((sum, val) => sum + val, 0) / N;

  // Downside deviation relative to MAR: sqrt( (1 / N) * sum( min(r_i - MAR, 0)^2 ) )
  const negativeDeviations = excessReturns.map(r => Math.min(r, 0));
  const sumSqNeg = negativeDeviations.reduce((sum, val) => sum + Math.pow(val, 2), 0);
  const downsideDeviation = Math.sqrt(sumSqNeg / N);

  // Guard against zero downside deviation
  if (downsideDeviation < 1e-8 || isNaN(downsideDeviation) || !isFinite(downsideDeviation)) {
    return null;
  }

  const sortino = (meanExcess / downsideDeviation) * annualizationFactor;
  if (isNaN(sortino) || !isFinite(sortino)) {
    return null;
  }

  return parseFloat(sortino.toFixed(2));
}

/**
 * Safely parses a NAV observation date from timestamp, ISO string, or DD-MM-YYYY format.
 * @param {any} item - NAV point or date string
 * @returns {Date|null}
 */
export function parseNavDate(item) {
  if (!item) return null;
  if (typeof item.time === 'number' && !isNaN(item.time) && item.time > 0) {
    return new Date(item.time);
  }
  const dStr = typeof item === 'string' ? item : (item.date || item.timeStr);
  if (!dStr || typeof dStr !== 'string') return null;

  const parts = dStr.trim().split('-');
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    // DD-MM-YYYY format
    const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(dStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Safely extracts periodic simple returns from chronological NAV history.
 * Rejects future dates, non-positive NAVs, and enforces chronological order.
 * 
 * @param {Array<{date?: string, time?: number, nav?: number, value?: number}>|number[]} navHistory
 * @returns {number[]} Array of periodic simple returns (e.g. (NAV_t - NAV_{t-1}) / NAV_{t-1})
 */
export function calculateReturnsFromNav(navHistory) {
  if (!Array.isArray(navHistory) || navHistory.length < 2) {
    return [];
  }

  const now = Date.now();
  const parsedPoints = [];

  for (let i = 0; i < navHistory.length; i++) {
    const item = navHistory[i];
    if (item == null) continue;

    if (typeof item === 'number') {
      if (!isNaN(item) && isFinite(item) && item > 0) {
        parsedPoints.push({ time: i, val: item });
      }
      continue;
    }

    const d = parseNavDate(item);
    const time = d ? d.getTime() : null;
    const rawVal = item.nav !== undefined ? item.nav : item.value;
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);

    if (time !== null && time <= now && !isNaN(val) && isFinite(val) && val > 0) {
      parsedPoints.push({ time, val });
    }
  }

  if (parsedPoints.length < 2) {
    return [];
  }

  // Sort chronologically ascending
  parsedPoints.sort((a, b) => a.time - b.time);

  const returns = [];
  for (let i = 1; i < parsedPoints.length; i++) {
    const prev = parsedPoints[i - 1].val;
    const curr = parsedPoints[i].val;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }

  return returns;
}

/**
 * Extracts or safely calculates the Sharpe Ratio for a mutual fund scheme.
 * Resolves across established pre-computed metric properties with timeframe awareness,
 * falling back to verified dynamic calculation from navHistory if pre-computed value is absent.
 * Returns null if data is insufficient or unavailable.
 * 
 * @param {Object} fund - Mutual fund object
 * @param {string} [timeframe='1Y'] - Active timeframe key ('1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'All')
 * @returns {number|null} Sharpe ratio formatted as float, or null if unavailable
 */
export function getSharpe(fund, timeframe = '1Y') {
  if (!fund || typeof fund !== 'object') {
    return null;
  }

  // 1. Direct pre-computed ratio lookup across canonical property paths
  const direct = (
    fund.sharpeRatios?.[timeframe] ??
    fund.riskRatios?.[timeframe]?.sharpe ??
    fund.sharpeRatio ??
    fund.sharpeRatio3Y ??
    fund.riskRatios?.['3Y']?.sharpe ??
    fund.riskRatios?.['All']?.sharpe ??
    fund.riskRatios?.['1Y']?.sharpe ??
    fund.sharpe
  );

  if (direct != null && !isNaN(direct)) {
    const num = Number(direct);
    if (isFinite(num)) {
      return parseFloat(num.toFixed(2));
    }
  }

  // 2. Secondary resolution: dynamic derivation from verified NAV history if available
  if (Array.isArray(fund.navHistory) && fund.navHistory.length >= 13) {
    const returns = calculateReturnsFromNav(fund.navHistory);
    if (returns.length >= 12) {
      const calculated = calculateSharpeRatio(returns, RISK_FREE_RATE_CONFIG.annualRateDecimal, 'monthly');
      if (calculated != null) {
        return calculated;
      }
    }
  }

  return null;
}

/**
 * Extracts or safely calculates the Sortino Ratio for a mutual fund scheme.
 * Resolves across established pre-computed metric properties with timeframe awareness,
 * falling back to verified dynamic calculation from navHistory if pre-computed value is absent.
 * Returns null if data is insufficient or unavailable.
 * 
 * @param {Object} fund - Mutual fund object
 * @param {string} [timeframe='1Y'] - Active timeframe key
 * @returns {number|null} Sortino ratio formatted as float, or null if unavailable
 */
export function getSortino(fund, timeframe = '1Y') {
  if (!fund || typeof fund !== 'object') {
    return null;
  }

  // 1. Direct pre-computed ratio lookup across canonical property paths
  const direct = (
    fund.sortinoRatios?.[timeframe] ??
    fund.riskRatios?.[timeframe]?.sortino ??
    fund.sortinoRatio ??
    fund.sortinoRatio3Y ??
    fund.riskRatios?.['3Y']?.sortino ??
    fund.riskRatios?.['All']?.sortino ??
    fund.riskRatios?.['1Y']?.sortino ??
    fund.sortino
  );

  if (direct != null && !isNaN(direct)) {
    const num = Number(direct);
    if (isFinite(num)) {
      return parseFloat(num.toFixed(2));
    }
  }

  // 2. Secondary resolution: dynamic derivation from verified NAV history if available
  if (Array.isArray(fund.navHistory) && fund.navHistory.length >= 13) {
    const returns = calculateReturnsFromNav(fund.navHistory);
    if (returns.length >= 12) {
      const calculated = calculateSortinoRatio(returns, RISK_FREE_RATE_CONFIG.annualRateDecimal, 'monthly');
      if (calculated != null) {
        return calculated;
      }
    }
  }

  return null;
}

// Aliases for explicit fund scoping
export const getFundSharpe = getSharpe;
export const getFundSortino = getSortino;
