import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';

console.log('==========================================================================');
console.log('      MARKETPULSE METHODOLOGY COMPARISON AUDIT (METHOD A vs METHOD B)    ');
console.log('==========================================================================\n');

const testFunds = [
  { code: '120594', name: 'ICICI Prudential Technology Fund' },
  { code: '120893', name: 'HDFC Small Cap Fund' },
  { code: '119598', name: 'SBI Small Cap Fund' },
  { code: '120503', name: 'Nippon India Small Cap Fund' },
  { code: '118989', name: 'Axis Bluechip Fund' }
];

const testRf = 0.06; // 6.0% annual benchmark

// Helper: Calculate Method B (AMFI-Style 3Y Monthly Returns Sharpe & Sortino)
function calculateAmfiMonthlyMetrics(navHistory, rfAnnual = 0.06) {
  if (!navHistory || navHistory.length < 36) return { sharpe: null, sortino: null, obsCount: 0 };

  // Sample monthly NAVs (month-end NAVs)
  const monthlyNavs = [];
  const mapMonth = new Map();

  // navHistory is sorted chronologically (oldest to newest)
  navHistory.forEach(item => {
    const d = new Date(item.date || item.time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    mapMonth.set(key, parseFloat(item.nav || item.value)); // Store latest NAV for month
  });

  const monthEndPrices = Array.from(mapMonth.values());
  if (monthEndPrices.length < 12) return { sharpe: null, sortino: null, obsCount: 0 };

  // Calculate monthly returns
  const monthlyReturns = [];
  for (let i = 1; i < monthEndPrices.length; i++) {
    const prev = monthEndPrices[i - 1];
    const curr = monthEndPrices[i];
    if (prev > 0) monthlyReturns.push((curr - prev) / prev);
  }

  // Focus on trailing 36 monthly returns (3Y window per AMFI standard)
  const returns36 = monthlyReturns.slice(-36);
  if (returns36.length < 12) return { sharpe: null, sortino: null, obsCount: 0 };

  const rfMonthly = Math.pow(1 + rfAnnual, 1 / 12) - 1;
  const meanMonthly = returns36.reduce((a, b) => a + b, 0) / returns36.length;
  const excessMonthly = meanMonthly - rfMonthly;

  // Monthly Standard Deviation (N - 1)
  const sumSq = returns36.map(r => Math.pow(r - meanMonthly, 2)).reduce((a, b) => a + b, 0);
  const monthlyStdDev = Math.sqrt(sumSq / (returns36.length - 1));
  const sharpeMonthly = monthlyStdDev > 0 ? parseFloat(((excessMonthly / monthlyStdDev) * Math.sqrt(12)).toFixed(2)) : null;

  // Monthly Downside Deviation
  const downsideSq = returns36.map(r => Math.pow(Math.min(r - rfMonthly, 0), 2)).reduce((a, b) => a + b, 0);
  const monthlyDownsideDev = Math.sqrt(downsideSq / returns36.length);
  const sortinoMonthly = monthlyDownsideDev > 0 ? parseFloat(((excessMonthly / monthlyDownsideDev) * Math.sqrt(12)).toFixed(2)) : 99.9;

  return {
    sharpe: sharpeMonthly,
    sortino: sortinoMonthly,
    obsCount: returns36.length
  };
}

async function runMethodologyComparison() {
  console.log('Fund Code | Scheme Name | Method A Daily Sharpe | Method B AMFI Monthly Sharpe | Method A Daily Sortino | Method B AMFI Monthly Sortino');
  console.log('---------------------------------------------------------------------------------------------------------------------------------------');

  for (const fund of testFunds) {
    try {
      const schemeData = await mfapiCacheService.getSchemeData(fund.code);
      if (schemeData && schemeData.data && schemeData.data.length > 20) {
        const chronologicalData = [...schemeData.data].reverse();
        const prices = chronologicalData.map(d => parseFloat(d.nav)).filter(n => !isNaN(n) && n > 0);
        const dailyReturns = riskAnalyticsService.calculateReturns(prices);

        // Method A: Daily NAV
        const dailySharpe = riskAnalyticsService.calculateDailySharpeRatio(dailyReturns, testRf);
        const dailySortino = riskAnalyticsService.calculateDailySortinoRatio(dailyReturns, testRf);

        // Method B: AMFI 3Y Monthly NAV
        const amfiRes = calculateAmfiMonthlyMetrics(chronologicalData, testRf);

        console.log(`${fund.code} | ${fund.name.slice(0, 25)} | ${dailySharpe} | ${amfiRes.sharpe} | ${dailySortino} | ${amfiRes.sortino}`);
      }
    } catch (e) {
      console.warn(`Error auditing fund ${fund.code}:`, e.message);
    }
  }

  console.log('\n==========================================================================');
  console.log('         METHODOLOGY COMPARISON AUDIT FINISHED SUCCESSFULLY!              ');
  console.log('==========================================================================');
}

runMethodologyComparison();
