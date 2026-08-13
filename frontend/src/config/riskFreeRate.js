/**
 * Central Risk-Free Rate (Rf) & Minimum Acceptable Return (MAR) Benchmark Configuration
 * 
 * Benchmark: Configured Methodology Benchmark (6.50% p.a. assumption)
 * Usage: Standardized baseline for Sharpe Ratio (excess return) and Sortino Ratio (downside MAR) calculations.
 */

export const RISK_FREE_RATE_CONFIG = {
  annualRatePct: null,
  annualRateDecimal: null,
  monthlyMARDecimal: null,
  status: 'UNAVAILABLE',
  source: 'RBI 91-Day T-Bill Benchmark Rate',
  isLiveMarketData: false,
  description: 'Verified RBI 91-day T-Bill risk-free rate required for Sharpe & Sortino ratio calculations.'
};

/**
 * Calculates Downside Deviation relative to MAR for monthly return series
 */
export function calculateDownsideDeviation(monthlyReturns = [], monthlyMAR = RISK_FREE_RATE_CONFIG.monthlyMARDecimal) {
  if (monthlyMAR == null || typeof monthlyMAR !== 'number' || monthlyMAR <= 0) return null;
  if (!Array.isArray(monthlyReturns) || monthlyReturns.length < 12) return null;

  let sumSqDiff = 0;
  monthlyReturns.forEach(r => {
    const returnDecimal = r / 100;
    const downsideDiff = Math.min(returnDecimal - monthlyMAR, 0);
    sumSqDiff += downsideDiff * downsideDiff;
  });

  const monthlyVariance = sumSqDiff / monthlyReturns.length;
  const monthlyDownsideDev = Math.sqrt(monthlyVariance);
  const annualizedDownsideDev = monthlyDownsideDev * Math.sqrt(12);

  return annualizedDownsideDev > 0 ? annualizedDownsideDev : null;
}

/**
 * Calculates Sortino Ratio: (Annualized Return - Annual Rf) / Annualized Downside Deviation
 * Returns NULL when annualRf is null or UNAVAILABLE
 */
export function calculateSortinoRatio(annualizedReturnPct, monthlyReturns = [], annualRf = RISK_FREE_RATE_CONFIG.annualRateDecimal) {
  if (annualRf == null || typeof annualRf !== 'number' || annualRf <= 0) return null;
  if (annualizedReturnPct == null || isNaN(annualizedReturnPct)) return null;

  const downsideDev = calculateDownsideDeviation(monthlyReturns, Math.pow(1 + annualRf, 1 / 12) - 1);
  if (downsideDev == null || downsideDev === 0) return null;

  const returnDecimal = annualizedReturnPct / 100;
  return Number(((returnDecimal - annualRf) / downsideDev).toFixed(2));
}

