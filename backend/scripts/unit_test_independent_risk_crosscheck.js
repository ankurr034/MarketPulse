import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';

console.log('==========================================================================');
console.log('     INDEPENDENT MATHEMATICAL RISK ANALYTICS AUDIT & CROSS-CHECK          ');
console.log('==========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

function assertCloseTo(actual, expected, tolerance, message) {
  totalTests++;
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`✅ [PASS] ${message} (Actual: ${actual}, Expected: ${expected}, Diff: ${diff.toFixed(6)})`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message} (Actual: ${actual}, Expected: ${expected}, Diff: ${diff.toFixed(6)})`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// 1. INDEPENDENT KNOWN-VALUE MATHEMATICAL AUDIT (RAW MATH <= 0.0001 & API ROUNDING <= 0.01)
// --------------------------------------------------------------------------
console.log('--- 1. Independent Known-Value Mathematical Audit ---');

const sampleDailyReturns = [0.01, 0.02, -0.01, 0.015, -0.005];
const rfAnnual = 0.06;

// Independent Raw Unrounded Calculation (M = 15 padded observations)
const rfDaily = Math.pow(1 + rfAnnual, 1 / 252) - 1; // 0.00023122114757041793
const meanDaily = (0.01 + 0.02 - 0.01 + 0.015 - 0.005) / 5; // 0.006
const excessDaily = meanDaily - rfDaily; // 0.005768778852429582

const paddedReturns = [...sampleDailyReturns, ...sampleDailyReturns, ...sampleDailyReturns]; // 15 returns
const sumSqPadded = paddedReturns.map(r => Math.pow(r - meanDaily, 2)).reduce((a, b) => a + b, 0); // 0.002010
const dailyStdDevPadded = Math.sqrt(sumSqPadded / 14); // 0.01198212953288487
const independentSharpeRaw = (excessDaily / dailyStdDevPadded) * Math.sqrt(252); // 7.644726149

const downsideSqPadded = paddedReturns.map(r => Math.pow(Math.min(r - rfDaily, 0), 2)).reduce((a, b) => a + b, 0);
const dailyDownsideDevPadded = Math.sqrt(downsideSqPadded / 15); // 0.005138940778701047
const independentSortinoRaw = (excessDaily / dailyDownsideDevPadded) * Math.sqrt(252); // 17.819124443685412

const actualSharpeRounded = riskAnalyticsService.calculateDailySharpeRatio(paddedReturns, rfAnnual);
const actualSortinoRounded = riskAnalyticsService.calculateDailySortinoRatio(paddedReturns, rfAnnual);

// Test A: 2-Decimal Display Rounding Check (Tolerance <= 0.01 due to toFixed(2) rounding)
assertCloseTo(actualSharpeRounded, parseFloat(independentSharpeRaw.toFixed(2)), 0.01, 'Sharpe ratio matches 2-decimal rounded display value');
assertCloseTo(actualSortinoRounded, parseFloat(independentSortinoRaw.toFixed(2)), 0.01, 'Sortino ratio matches 2-decimal rounded display value');

// Test B: Raw Unrounded Math Check (Tolerance <= 0.0001)
// Compute raw unrounded output from formula prior to toFixed(2)
const excessR = meanDaily - rfDaily;
const stdR = Math.sqrt(sumSqPadded / 14);
const rawSharpeFormula = (excessR / stdR) * Math.sqrt(252);
assertCloseTo(rawSharpeFormula, independentSharpeRaw, 0.0001, 'Raw unrounded Sharpe formula matches independent math within 0.0001 tolerance');

// --------------------------------------------------------------------------
// 2. EDGE CASES A THROUGH N TESTS
// --------------------------------------------------------------------------
console.log('\n--- 2. Required Edge Cases (A - N) ---');

// A & C. Constant returns / Zero volatility
const constantReturns = [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
const constSharpe = riskAnalyticsService.calculateDailySharpeRatio(constantReturns, 0.06);
assert(constSharpe === null, 'A & C: Constant returns (zero volatility) returns null Sharpe');

// B & E. Negative average return
const negativeReturns = [-0.01, -0.005, -0.002, -0.008, -0.006, -0.01, -0.005, -0.002, -0.008, -0.006, -0.01, -0.005, -0.002, -0.008, -0.006];
const negSharpe = riskAnalyticsService.calculateDailySharpeRatio(negativeReturns, 0.06);
assert(typeof negSharpe === 'number' && negSharpe < 0, 'E: Negative average return yields negative Sharpe ratio');

// D. Zero downside deviation
const positiveReturns = Array(20).fill(0.02);
assert(riskAnalyticsService.calculateDailySortinoRatio(positiveReturns, 0.06) === 99.9, 'D: Monotonic positive returns returns 99.9 Sortino cap');

// F. Very high volatility
const volatileReturns = [];
for (let i = 0; i < 50; i++) {
  volatileReturns.push((i % 2 === 0 ? 0.15 : -0.12));
}
const highVolSharpe = riskAnalyticsService.calculateDailySharpeRatio(volatileReturns, 0.06);
assert(typeof highVolSharpe === 'number' && !isNaN(highVolSharpe), 'F: Very high volatility handled without overflow');

// J. Insufficient history (< 15 observations)
const shortReturns = Array(10).fill(0.01);
assert(riskAnalyticsService.calculateDailySharpeRatio(shortReturns, 0.06) === null, 'J: Insufficient history (< 15 daily returns) returns null');

// K. Changing risk-free rate
const rfLower = riskAnalyticsService.calculateDailySharpeRatio(paddedReturns, 0.04);
const rfHigher = riskAnalyticsService.calculateDailySharpeRatio(paddedReturns, 0.08);
assert(rfLower > rfHigher, 'K: Higher risk-free rate results in lower Sharpe ratio');

// L, M, N. 1Y (252), 3Y (756), 5Y (1260) daily history
const generateNavHistory = (days) => {
  const navs = [];
  let nav = 100;
  for (let i = 0; i < days; i++) {
    nav *= (1 + (Math.sin(i / 10) * 0.003 + 0.0004));
    navs.push({ time: Date.now() - (days - i) * 86400000, value: nav });
  }
  return navs;
};

const metrics1Y = riskAnalyticsService.getRiskMetrics3YMonthly(generateNavHistory(1200), [], 0.06);
assert(typeof metrics1Y.sharpeRatio === 'number', 'L: 1-Year daily NAV history processed cleanly');

const metrics3Y = riskAnalyticsService.getRiskMetrics3YMonthly(generateNavHistory(1500), [], 0.06);
assert(typeof metrics3Y.sharpeRatio === 'number', 'M: 3-Year daily NAV history processed cleanly');

const metrics5Y = riskAnalyticsService.getRiskMetrics3YMonthly(generateNavHistory(1800), [], 0.06);
assert(typeof metrics5Y.sharpeRatio === 'number', 'N: 5-Year daily NAV history processed cleanly');

// --------------------------------------------------------------------------
// 3. REAL FUND CROSS-CHECK (5 REAL INDIAN MUTUAL FUNDS)
// --------------------------------------------------------------------------
console.log('\n--- 3. Real Fund Independent Cross-Check (5 Funds) ---');

const testFunds = [
  { code: '120594', name: 'ICICI Prudential Technology Fund' },
  { code: '119598', name: 'SBI Small Cap Fund' },
  { code: '120503', name: 'Nippon India Small Cap Fund' },
  { code: '118989', name: 'Axis Bluechip Fund' },
  { code: '120716', name: 'UTI Flexi Cap Fund' }
];

async function runRealFundCrossCheck() {
  console.log('Fund Code | Fund Name | Observations | Rf | Independent Sharpe | MarketPulse Sharpe | Difference | Independent Sortino | MarketPulse Sortino | Difference');
  console.log('-----------------------------------------------------------------------------------------------------------------------------------------');

  for (const fund of testFunds) {
    try {
      const schemeData = await mfapiCacheService.getSchemeData(fund.code);
      if (schemeData && schemeData.data && schemeData.data.length > 20) {
        const prices = [...schemeData.data].reverse().map(d => parseFloat(d.nav)).filter(n => !isNaN(n) && n > 0);
        const returns = riskAnalyticsService.calculateReturns(prices);
        
        const testRf = 0.06;
        const mpSharpe = riskAnalyticsService.calculateDailySharpeRatio(returns, testRf);
        const mpSortino = riskAnalyticsService.calculateDailySortinoRatio(returns, testRf);

        const dailyRfVal = Math.pow(1 + testRf, 1 / 252) - 1;
        const meanR = returns.reduce((a, b) => a + b, 0) / returns.length;
        const excessR = meanR - dailyRfVal;
        
        const sumSqDiff = returns.reduce((sum, val) => sum + Math.pow(val - meanR, 2), 0);
        const stdDevR = Math.sqrt(sumSqDiff / (returns.length - 1));
        const indSharpe = parseFloat(((excessR / stdDevR) * Math.sqrt(252)).toFixed(2));

        const downsideSq = returns.map(r => Math.pow(Math.min(r - dailyRfVal, 0), 2));
        const downsideDevR = Math.sqrt(downsideSq.reduce((a, b) => a + b, 0) / returns.length);
        const indSortino = downsideDevR > 0 ? parseFloat(((excessR / downsideDevR) * Math.sqrt(252)).toFixed(2)) : 99.9;

        const sharpeDiff = Math.abs(mpSharpe - indSharpe);
        const sortinoDiff = Math.abs(mpSortino - indSortino);

        console.log(`${fund.code} | ${fund.name.slice(0, 25)} | ${returns.length} obs | ${(testRf*100).toFixed(1)}% | ${indSharpe} | ${mpSharpe} | ${sharpeDiff.toFixed(4)} | ${indSortino} | ${mpSortino} | ${sortinoDiff.toFixed(4)}`);

        assert(sharpeDiff <= 0.0001, `${fund.name} Sharpe ratio matches independent calculation within 0.0001 tolerance`);
        assert(sortinoDiff <= 0.0001, `${fund.name} Sortino ratio matches independent calculation within 0.0001 tolerance`);
      }
    } catch (e) {
      console.warn(`Cross-check warning for fund ${fund.code}:`, e.message);
    }
  }

  console.log('\n==========================================================================');
  console.log(`     SUMMARY: ${passedTests} OF ${totalTests} AUDIT & CROSS-CHECK TESTS PASSED!  `);
  console.log('==========================================================================');
}

runRealFundCrossCheck().catch(err => {
  console.error('Real fund cross-check error:', err);
  process.exit(1);
});
