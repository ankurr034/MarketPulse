import riskAnalyticsService from '../services/RiskAnalyticsService.js';

console.log('==========================================================================');
console.log('      COMPREHENSIVE RISK-RATIO & NAV ANOMALY TEST SUITE                 ');
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

// Helper for NAV history generation
function generateNavHistory(days, dailyGain = 0.0004, noise = 0.003, startYear = 2023) {
  const navs = [];
  let nav = 100;
  // Use a fixed start time so year mapping works deterministically
  const startTime = new Date(`${startYear}-01-01T00:00:00Z`).getTime();
  for (let i = 0; i < days; i++) {
    const time = startTime + i * 24 * 60 * 60 * 1000;
    const factor = 1 + dailyGain + (Math.sin(i / 10) * noise);
    nav *= factor;
    navs.push({ time, value: parseFloat(nav.toFixed(4)) });
  }
  return navs;
}

// 1. 1Y Daily NAV History (252 trading days / ~12 months)
console.log('--- Test 1: 1Y Daily NAV History (Insufficient for 3Y Monthly) ---');
const nav1Y = generateNavHistory(365);
const metrics1Y = riskAnalyticsService.getRiskMetrics(nav1Y, [], 0.06);
assert(metrics1Y.status === 'UNAVAILABLE', '1Y history returns UNAVAILABLE status');
assert(metrics1Y.sharpeRatio === null, '1Y history returns null Sharpe ratio due to insufficient observations');
assert(metrics1Y.sortinoRatio === null, '1Y history returns null Sortino ratio due to insufficient observations');

// 2. 3Y Daily NAV History (1100 days / ~36 months)
console.log('\n--- Test 2: 3Y Daily NAV History (Sufficient history) ---');
const nav3Y = generateNavHistory(1150); // 1150 days = ~38 months
const metrics3Y = riskAnalyticsService.getRiskMetrics(nav3Y, [], 0.06);
assert(metrics3Y.status === 'CALCULATED', '3Y history returns CALCULATED status');
assert(typeof metrics3Y.sharpeRatio === 'number', 'Sharpe ratio calculated for 3Y history is a valid number');
assert(typeof metrics3Y.sortinoRatio === 'number', 'Sortino ratio calculated for 3Y history is a valid number');
  assert(metrics3Y.dataPointsCount >= 36, 'Data points count is sufficient');

// 3. Missing NAV Dates / Irregular Time Steps
console.log('\n--- Test 3: Missing NAV Dates / Irregular Time Steps ---');
const nav3YIrregular = [];
let navVal = 100;
const startTime = new Date('2023-01-01T00:00:00Z').getTime();
for (let i = 0; i < 1150; i++) {
  // skip weekends and random days to create irregular dates
  if (i % 7 === 5 || i % 7 === 6 || i % 25 === 0) continue;
  const time = startTime + i * 24 * 60 * 60 * 1000;
  navVal *= 1.0004 + Math.sin(i / 10) * 0.003;
  nav3YIrregular.push({ time, value: parseFloat(navVal.toFixed(4)) });
}
const metricsMissing = riskAnalyticsService.getRiskMetrics(nav3YIrregular, [], 0.06);
assert(metricsMissing.status === 'CALCULATED', 'Ratios calculated successfully for irregular dates');
assert(metricsMissing.sharpeRatio !== null, 'Sharpe ratio handles irregular dates successfully');

// 4. Duplicate NAV Records (same timestamp or same NAV value)
console.log('\n--- Test 4: Duplicate NAV Records & Zero Change Days ---');
const nav3YDupes = [...nav3Y];
// Insert duplicate/flat NAV records (only overwrite value, not timestamp)
for (let i = 200; i < 300; i++) {
  nav3YDupes[i] = { time: nav3YDupes[i].time, value: nav3YDupes[199].value };
}
const metricsDupes = riskAnalyticsService.getRiskMetrics(nav3YDupes, [], 0.06);
assert(metricsDupes.status === 'CALCULATED', 'Calculated successfully with duplicate NAV records');
assert(metricsDupes.sharpeRatio !== null, 'Sharpe ratio handles duplicate/zero change days cleanly');

// 5. Zero / Invalid NAV Records
console.log('\n--- Test 5: Zero / Invalid NAV Records Filtered Out ---');
const navInvalid = [
  { time: new Date('2023-01-31').getTime(), value: 100 },
  { time: new Date('2023-02-28').getTime(), value: 0 }, // Invalid zero NAV
  { time: new Date('2023-03-31').getTime(), value: -5 }, // Invalid negative NAV
  { time: new Date('2023-04-30').getTime(), value: NaN }, // Invalid NaN NAV
  { time: new Date('2023-05-31').getTime(), value: 102 }
];
const extractedInvalid = riskAnalyticsService.extractMonthEndNavs(navInvalid);
assert(extractedInvalid.length === 2 && extractedInvalid[0].value === 100 && extractedInvalid[1].value === 102, 'Invalid zero/negative/NaN NAVs safely excluded from month-end extraction');

// 6. Recently Launched Funds (< 13 month-end NAVs / < 12 monthly returns)
console.log('\n--- Test 6: Recently Launched Funds (< 13 month-end NAVs) ---');
const navRecent = generateNavHistory(200); // ~6 months
const metricsRecent = riskAnalyticsService.getRiskMetrics(navRecent, [], 0.06);
assert(metricsRecent.status === 'UNAVAILABLE', 'Recently launched fund returns UNAVAILABLE status');
assert(metricsRecent.sharpeRatio === null, 'Recently launched fund returns null Sharpe ratio');
assert(metricsRecent.sortinoRatio === null, 'Recently launched fund returns null Sortino ratio');

// 7. Insufficient History (< 2 NAV Points)
console.log('\n--- Test 7: Insufficient History (< 2 NAV Points) ---');
const metricsSingle = riskAnalyticsService.getRiskMetrics([{ time: Date.now(), value: 10 }], [], 0.06);
assert(metricsSingle.sharpeRatio === null && metricsSingle.status === 'UNAVAILABLE', 'Returns UNAVAILABLE state for single NAV record');

// 8. Changing Risk-Free Rates
console.log('\n--- Test 8: Impact of Changing Risk-Free Rates ---');
// Use a historical year (2008) so it doesn't trigger RBI historical table (2013-2026) but is in the past
const nav3YPast = generateNavHistory(1150, 0.0004, 0.003, 2008);
const metricsRf5 = riskAnalyticsService.getRiskMetrics(nav3YPast, [], 0.05); // 5% Rf
const metricsRf7 = riskAnalyticsService.getRiskMetrics(nav3YPast, [], 0.07); // 7% Rf
assert(metricsRf5.sharpeRatio > metricsRf7.sharpeRatio, 'Sharpe ratio decreases when risk-free rate increases (higher hurdle rate)');

// 9. Zero Downside Deviation Edge Case
console.log('\n--- Test 9: Zero Downside Deviation Edge Case ---');
// Monotonically increasing 3Y NAV where monthly returns are always higher than monthly Rf
const navMonotonic = [];
let monoVal = 100;
for (let i = 0; i < 37; i++) {
  const year = 2023 + Math.floor(i / 12);
  const month = i % 12;
  const d = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0));
  monoVal *= 1.05;
  navMonotonic.push({ time: d.getTime(), value: monoVal, dateStr: d.toISOString().split('T')[0] });
}
const metricsMonotonic = riskAnalyticsService.getRiskMetrics(navMonotonic, [], 0.06);
assert(metricsMonotonic.status === 'CALCULATED', 'Monotonic series calculated successfully');
assert(metricsMonotonic.sortinoRatio === null, 'Sortino ratio returns null when downside deviation is zero (per strict requirements)');

// 10. Extreme Returns / Outliers
console.log('\n--- Test 10: Extreme Returns / Outliers ---');
const navOutlier = [...nav3Y];
navOutlier[500] = { time: navOutlier[500].time, value: navOutlier[499].value * 3.0 }; // massive spike
const metricsOutlier = riskAnalyticsService.getRiskMetrics(navOutlier, [], 0.06);
assert(typeof metricsOutlier.volatility === 'number' && !isNaN(metricsOutlier.volatility), 'Volatility handles extreme return spikes cleanly');
assert(typeof metricsOutlier.sharpeRatio === 'number' && !isNaN(metricsOutlier.sharpeRatio), 'Sharpe ratio handles extreme return spikes cleanly');

console.log('\n==========================================================================');
console.log(`     SUMMARY: ${passedTests} OF ${totalTests} RISK-RATIO TESTS PASSED SUCCESSFULLY!    `);
console.log('==========================================================================');
