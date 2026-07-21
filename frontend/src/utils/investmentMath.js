/**
 * Calculates the Future Value of a Systematic Investment Plan (SIP).
 * FV = P × [((1 + r)^n − 1) / r] × (1 + r)
 * @param {number} monthlyInvestment - The monthly investment amount (P).
 * @param {number} annualCagr - The expected annual CAGR as a percentage (e.g., 12 for 12%).
 * @param {number} years - The duration of the investment in years.
 * @returns {Object} { investedAmount, expectedReturns, totalValue }
 */
export function calculateSIP(monthlyInvestment, annualCagr, years) {
  const P = Number(monthlyInvestment) || 0;
  const cagr = Number(annualCagr) || 0;
  const t = Number(years) || 0;

  const n = t * 12; // Total months
  const investedAmount = P * n;

  const timelineData = [];

  if (P <= 0 || t <= 0) {
    return { investedAmount, expectedReturns: 0, totalValue: investedAmount, timelineData };
  }

  if (cagr === 0) {
    for (let y = 1; y <= t; y++) {
      timelineData.push({ year: y, Invested: P * y * 12, Profit: 0 });
    }
    return { investedAmount, expectedReturns: 0, totalValue: investedAmount, timelineData };
  }

  const r = (cagr / 100) / 12; // Monthly rate as decimal

  // FV = P × [((1 + r)^n − 1) / r] × (1 + r)
  const totalValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const expectedReturns = totalValue - investedAmount;

  // Generate timeline data per year
  for (let y = 1; y <= t; y++) {
    const months = y * 12;
    const inv = P * months;
    const val = P * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    timelineData.push({
      year: y,
      Invested: Math.round(inv),
      Profit: Math.max(0, Math.round(val - inv))
    });
  }

  return {
    investedAmount,
    expectedReturns,
    totalValue,
    timelineData
  };
}

/**
 * Calculates the Future Value of a Lumpsum investment.
 * FV = P × (1 + r)^t
 * @param {number} initialInvestment - The initial investment amount (P).
 * @param {number} annualCagr - The expected annual CAGR as a percentage (e.g., 12 for 12%).
 * @param {number} years - The duration of the investment in years.
 * @returns {Object} { investedAmount, expectedReturns, totalValue }
 */
export function calculateLumpsum(initialInvestment, annualCagr, years) {
  const P = Number(initialInvestment) || 0;
  const cagr = Number(annualCagr) || 0;
  const t = Number(years) || 0;

  const investedAmount = P;
  const timelineData = [];

  if (P <= 0 || t <= 0) {
    return { investedAmount, expectedReturns: 0, totalValue: investedAmount, timelineData };
  }

  if (cagr === 0) {
    for (let y = 1; y <= t; y++) {
      timelineData.push({ year: y, Invested: P, Profit: 0 });
    }
    return { investedAmount, expectedReturns: 0, totalValue: investedAmount, timelineData };
  }

  const r = cagr / 100; // Annual rate as decimal

  // FV = P × (1 + r)^t
  const totalValue = P * Math.pow(1 + r, t);
  const expectedReturns = totalValue - investedAmount;

  // Generate timeline data per year
  for (let y = 1; y <= t; y++) {
    const val = P * Math.pow(1 + r, y);
    timelineData.push({
      year: y,
      Invested: Math.round(P),
      Profit: Math.max(0, Math.round(val - P))
    });
  }

  return {
    investedAmount,
    expectedReturns,
    totalValue,
    timelineData
  };
}
