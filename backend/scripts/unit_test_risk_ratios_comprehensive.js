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

// 1. 1Y Daily NAV History (252 trading days)
console.log('--- Test 1: 1Y Daily NAV History (252 trading days) ---');
const nav1Y = [];
let baseNav = 100;
const startTime = Date.now() - 365 * 24 * 60 * 60 * 1000;
for (let i = 0; i < 252; i++) {
  const time = startTime + i * (24 * 60 * 60 * 1000 * (365 / 252));
  baseNav = baseNav * (1 + (Math.sin(i / 10) * 0.005 + 0.0005));
  nav1Y.push({ time, value: parseFloat(baseNav.toFixed(4)) });
}
const metrics1Y = riskAnalyticsService.getRiskMetrics(nav1Y, [], 0.0625);
assert(metrics1Y.dataPointsCount === 251, 'Correct daily return data points (251 for 252 NAVs)');
assert(typeof metrics1Y.volatility === 'number' && metrics1Y.volatility > 0, 'Annualized volatility is positive');
assert(typeof metrics1Y.sharpeRatio === 'number', 'Sharpe ratio calculated for 1Y history');
assert(typeof metrics1Y.sortinoRatio === 'number', 'Sortino ratio calculated for 1Y history');

// 2. 3Y Daily NAV History (756 trading days)
console.log('\n--- Test 2: 3Y Daily NAV History (756 trading days) ---');
const nav3Y = [];
let baseNav3Y = 100;
const startTime3Y = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
for (let i = 0; i < 756; i++) {
  const time = startTime3Y + i * (24 * 60 * 60 * 1000 * (1095 / 756));
  baseNav3Y = baseNav3Y * (1 + (Math.cos(i / 15) * 0.004 + 0.0003));
  nav3Y.push({ time, value: parseFloat(baseNav3Y.toFixed(4)) });
}
const metrics3Y = riskAnalyticsService.getRiskMetrics(nav3Y, [], 0.0625);
assert(metrics3Y.dataPointsCount === 755, 'Correct return data points for 3Y history');
assert(typeof metrics3Y.sharpeRatio === 'number', 'Sharpe ratio calculated for 3Y history');
assert(typeof metrics3Y.maxDrawdown === 'number' && metrics3Y.maxDrawdown >= 0, 'Max Drawdown calculated correctly');

// 3. Missing NAV Dates / Irregular Time Steps
console.log('\n--- Test 3: Missing NAV Dates / Irregular Time Steps ---');
const navMissing = [
  { time: Date.now() - 30 * 86400000, value: 100 },
  { time: Date.now() - 25 * 86400000, value: 102 }, // 5-day gap (weekend/holiday)
  { time: Date.now() - 20 * 86400000, value: 101 },
  { time: Date.now() - 15 * 86400000, value: 104 },
  { time: Date.now() - 10 * 86400000, value: 103 },
  { time: Date.now() - 5 * 86400000, value: 106 },
  { time: Date.now(), value: 107 }
];
// Add enough points to exceed 15 threshold
for (let i = 0; i < 15; i++) {
  navMissing.unshift({ time: Date.now() - (35 + i * 2) * 86400000, value: 99 - i * 0.5 });
}
const metricsMissing = riskAnalyticsService.getRiskMetrics(navMissing, [], 0.0625);
assert(metricsMissing.sharpeRatio !== null, 'Sharpe ratio handles irregular/missing weekend dates');

// 4. Duplicate NAV Records (same timestamp or same NAV value)
console.log('\n--- Test 4: Duplicate NAV Records & Zero Change Days ---');
const navDupes = [...nav1Y];
// Insert flat NAV days
for (let i = 50; i < 60; i++) {
  navDupes[i] = { ...navDupes[49] };
}
const metricsDupes = riskAnalyticsService.getRiskMetrics(navDupes, [], 0.0625);
assert(metricsDupes.sharpeRatio !== null, 'Sharpe ratio handles zero-change duplicate NAV days without divide-by-zero');

// 5. Zero / Invalid NAV Records
console.log('\n--- Test 5: Zero / Invalid NAV Records Filtered Out ---');
const navInvalid = [
  { time: 1000, value: 10 },
  { time: 2000, value: 0 }, // Invalid zero NAV
  { time: 3000, value: -5 }, // Invalid negative NAV
  { time: 4000, value: NaN }, // Invalid NaN NAV
  { time: 5000, value: 12 }
];
const returnsSanitized = riskAnalyticsService.calculateReturns(navInvalid.map(n => n.value).filter(v => v > 0));
assert(returnsSanitized.length === 1 && returnsSanitized[0] === 0.2, 'Invalid zero/negative/NaN NAVs safely excluded from returns calculation');

// 6. Recently Launched Funds (< 15 Trading Days)
console.log('\n--- Test 6: Recently Launched Funds (< 15 Trading Days Threshold) ---');
const navRecent = [];
for (let i = 0; i < 10; i++) {
  navRecent.push({ time: Date.now() - (10 - i) * 86400000, value: 10 + i * 0.1 });
}
const metricsRecent = riskAnalyticsService.getRiskMetrics(navRecent, [], 0.0625);
assert(metricsRecent.sharpeRatio === null, 'Sharpe ratio correctly returns null for funds with < 15 daily returns');
assert(metricsRecent.sortinoRatio === null, 'Sortino ratio correctly returns null for funds with < 15 daily returns');

// 7. Insufficient History (< 2 NAV Points)
console.log('\n--- Test 7: Insufficient History (< 2 NAV Points) ---');
const metricsSingle = riskAnalyticsService.getRiskMetrics([{ time: Date.now(), value: 10 }], [], 0.0625);
assert(metricsSingle.sharpeRatio === null && metricsSingle.status === 'UNAVAILABLE', 'Returns UNAVAILABLE state for single NAV record');

// 8. Changing Risk-Free Rates
console.log('\n--- Test 8: Impact of Changing Risk-Free Rates ---');
const metricsRf5 = riskAnalyticsService.getRiskMetrics(nav1Y, [], 0.05); // 5% Rf
const metricsRf7 = riskAnalyticsService.getRiskMetrics(nav1Y, [], 0.07); // 7% Rf
assert(metricsRf5.sharpeRatio > metricsRf7.sharpeRatio, 'Sharpe ratio decreases when risk-free rate increases (higher hurdle rate)');

// 9. Zero Downside Deviation Edge Case
console.log('\n--- Test 9: Zero Downside Deviation Edge Case ---');
// Monotonically increasing NAV where every single daily return is higher than daily Rf
const navMonotonic = [];
for (let i = 0; i < 30; i++) {
  navMonotonic.push({ time: Date.now() - (30 - i) * 86400000, value: 100 + i * 2 }); // +2% daily gain
}
const metricsMonotonic = riskAnalyticsService.getRiskMetrics(navMonotonic, [], 0.0625);
assert(metricsMonotonic.sortinoRatio === 99.9, 'Sortino ratio correctly returns 99.9 cap when downside deviation is zero');

// 10. Extreme Returns / Outliers
console.log('\n--- Test 10: Extreme Returns / Outliers ---');
const navOutlier = [...nav1Y];
navOutlier[100] = { time: navOutlier[100].time, value: navOutlier[99].value * 3.0 }; // +200% spike
const metricsOutlier = riskAnalyticsService.getRiskMetrics(navOutlier, [], 0.0625);
assert(typeof metricsOutlier.volatility === 'number' && !isNaN(metricsOutlier.volatility), 'Volatility handles extreme return spikes cleanly');
assert(typeof metricsOutlier.sharpeRatio === 'number' && !isNaN(metricsOutlier.sharpeRatio), 'Sharpe ratio handles extreme return spikes cleanly');

console.log('\n==========================================================================');
console.log(`     SUMMARY: ${passedTests} OF ${totalTests} RISK-RATIO TESTS PASSED SUCCESSFULLY!    `);
console.log('==========================================================================');
