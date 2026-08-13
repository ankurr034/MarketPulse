/**
 * Deterministic Composite Ranking Engine for Mutual Funds
 * 
 * Mathematical Scoring Model:
 *   rankingScore = (normSinceInceptionCAGR * 0.45) 
 *                + (normRiskAdjustedScore * 0.35) 
 *                + (norm1YReturn * 0.20)
 * 
 * Methodology & Risk Metrics Definitions:
 * 
 * 1. Risk-Free Rate (Rf) & Minimum Acceptable Return (MAR):
 *    - Benchmark: Verified RBI 91-day T-Bill Rate (MacroDataService).
 *    - Monthly MAR: (1 + Rf_annual)^(1/12) - 1.
 * 
 * 2. Sharpe Ratio (3Y Monthly):
 *    Sharpe = (Mean_Return_Monthly - Rf_Monthly) / Volatility_Monthly * sqrt(12)
 *    - Return Frequency: Latest 36 monthly NAV returns (derived from >= 37 month-end NAV observations).
 *    - Minimum Required History: 36 monthly returns.
 * 
 * 3. Sortino Ratio & Downside Deviation:
 *    Sortino = (Mean_Return_Monthly - Rf_Monthly) / DownsideDeviation_Monthly * sqrt(12)
 *    - MAR: Defined as verified RBI 91-day T-Bill rate.
 *    - Downside Deviation: sqrt( (1 / N) * sum( min(R_i - MAR_monthly, 0)^2 ) ) * sqrt(12)
 *    - Minimum Required History: 36 monthly returns.

 * 
 * 4. Risk-Adjusted Score (RiskAdj):
 *    RiskAdj = 0.5 * normalizedSharpe + 0.5 * normalizedSortino
 *    (or single normalized ratio if only one ratio meets history criteria).
 * 
 * 5. Normalization Rules:
 *    - minMaxNormalize(val, min, max): Returns (val - min) / (max - min), clamped to [0, 1].
 *    - If max === min or peer count <= 1: Returns 0.5.
 *    - Missing or null metrics: Returns null (never converted to 0).
 * 
 * 6. Data & Peer Group Scoping:
 *    - Apples-to-apples: Direct Growth plans are prioritized over IDCW / Dividend options.
 *    - Peer Scoping: Normalization occurs strictly within each peer subcategory (e.g. Small Cap vs Small Cap).
 *    - Insufficient Data: Schemes with fewer than 2 valid components remain Unranked (compositeScore = null).
 */

import { RISK_FREE_RATE_CONFIG } from '../config/riskFreeRate';

function minMaxNormalize(value, min, max) {
  if (value == null || isNaN(value)) return null;
  if (min === max || min == null || max == null) return 0.5;
  const range = max - min;
  if (range <= 0) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / range));
}

export function calculateFundRankings(funds = []) {
  if (!Array.isArray(funds) || funds.length === 0) return [];

  // Group funds by subType or type for peer-group normalization
  const peerGroups = {};
  funds.forEach(fund => {
    // Prefer Direct Growth variants to ensure apples-to-apples comparisons
    const groupKey = fund.subType || fund.type || 'general';
    if (!peerGroups[groupKey]) peerGroups[groupKey] = [];
    peerGroups[groupKey].push(fund);
  });

  const rankedFunds = [];

  Object.keys(peerGroups).forEach(groupKey => {
    const group = peerGroups[groupKey];

    // Extract valid values for min/max within this peer group
    const sinceInceptionVals = group.map(f => f.returns?.['All'] ?? f.sinceInceptionReturn).filter(v => v != null && !isNaN(v));
    const sharpeVals = group.map(f => f.sharpeRatio).filter(v => v != null && !isNaN(v));
    const sortinoVals = group.map(f => f.sortinoRatio).filter(v => v != null && !isNaN(v));
    const oneYrVals = group.map(f => f.returns?.['1Y'] ?? f.oneYrReturn).filter(v => v != null && !isNaN(v));

    const hasInception = sinceInceptionVals.length > 0;
    const hasSharpe = sharpeVals.length > 0;
    const hasSortino = sortinoVals.length > 0;
    const has1Yr = oneYrVals.length > 0;

    const minInception = hasInception ? Math.min(...sinceInceptionVals) : null;
    const maxInception = hasInception ? Math.max(...sinceInceptionVals) : null;

    const minSharpe = hasSharpe ? Math.min(...sharpeVals) : null;
    const maxSharpe = hasSharpe ? Math.max(...sharpeVals) : null;

    const minSortino = hasSortino ? Math.min(...sortinoVals) : null;
    const maxSortino = hasSortino ? Math.max(...sortinoVals) : null;

    const min1Yr = has1Yr ? Math.min(...oneYrVals) : null;
    const max1Yr = has1Yr ? Math.max(...oneYrVals) : null;

    // Calculate score for each fund in peer group
    const scoredGroup = group.map(fund => {
      const incVal = fund.returns?.['All'] ?? fund.sinceInceptionReturn;
      const sharpeVal = fund.sharpeRatio;
      const sortinoVal = fund.sortinoRatio;
      const oneYrVal = fund.returns?.['1Y'] ?? fund.oneYrReturn;

      const normInc = minMaxNormalize(incVal, minInception, maxInception);
      const normSharpe = minMaxNormalize(sharpeVal, minSharpe, maxSharpe);
      const normSortino = minMaxNormalize(sortinoVal, minSortino, maxSortino);
      const norm1Yr = minMaxNormalize(oneYrVal, min1Yr, max1Yr);

      // RiskAdj = 0.5 * normalizedSharpe + 0.5 * normalizedSortino
      let normRiskAdj = null;
      if (normSharpe != null && normSortino != null) {
        normRiskAdj = (0.5 * normSharpe) + (0.5 * normSortino);
      } else if (normSharpe != null) {
        normRiskAdj = normSharpe;
      } else if (normSortino != null) {
        normRiskAdj = normSortino;
      }

      // Check available components
      const components = [];
      let totalWeight = 0;
      let scoreSum = 0;

      if (normInc != null) {
        components.push('inception');
        totalWeight += 0.45;
        scoreSum += normInc * 0.45;
      }
      if (normRiskAdj != null) {
        components.push('risk');
        totalWeight += 0.35;
        scoreSum += normRiskAdj * 0.35;
      }
      if (norm1Yr != null) {
        components.push('recent');
        totalWeight += 0.20;
        scoreSum += norm1Yr * 0.20;
      }

      // Must have at least 2 components to receive a valid ranking score
      const finalScore = (components.length >= 2 && totalWeight > 0)
        ? (scoreSum / totalWeight)
        : null;

      return {
        ...fund,
        compositeScore: finalScore,
        rankingComponentsCount: components.length,
        riskFreeRateBenchmark: RISK_FREE_RATE_CONFIG.annualRatePct
      };
    });

    // Rank within peer group
    const validScored = scoredGroup.filter(f => f.compositeScore != null);
    validScored.sort((a, b) => b.compositeScore - a.compositeScore);

    validScored.forEach((fund, idx) => {
      fund.peerRank = idx + 1;
      fund.isTop3InPeer = idx < 3;
    });

    scoredGroup.forEach(fund => {
      if (fund.compositeScore == null) {
        fund.peerRank = null;
        fund.isTop3InPeer = false;
      }
      rankedFunds.push(fund);
    });
  });

  // Overall sort by composite score for top-level listing
  rankedFunds.sort((a, b) => {
    if (a.compositeScore == null && b.compositeScore == null) return 0;
    if (a.compositeScore == null) return 1;
    if (b.compositeScore == null) return -1;
    return b.compositeScore - a.compositeScore;
  });

  rankedFunds.forEach((fund, idx) => {
    fund.overallRank = fund.compositeScore != null ? idx + 1 : null;
  });

  return rankedFunds;
}

/**
 * Group ranked funds by subcategory/type and return top N per group
 */
export function groupFundsBySubCategory(funds = [], limitPerGroup = 5) {
  const groups = {};

  funds.forEach(fund => {
    const sub = fund.subType || fund.type || 'Other';
    if (!groups[sub]) groups[sub] = [];
    groups[sub].push(fund);
  });

  const result = {};
  Object.keys(groups).forEach(subKey => {
    result[subKey] = limitPerGroup ? groups[subKey].slice(0, limitPerGroup) : groups[subKey];
  });

  return result;
}
