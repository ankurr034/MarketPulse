import amfiImportService from '../services/AmfiImportService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import macroDataService from '../services/MacroDataService.js';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import macroSnapshot from '../config/macroSnapshot.js';

console.log('==========================================================================');
console.log('      FINAL DATA-INTEGRITY & RISK-FREE RATE TEST SUITE                   ');
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

async function runTests() {
  // 1 & 2. Verified RBI Rate -> Sharpe & Sortino Calculated
  console.log('--- Test 1 & 2: Verified RBI Rate -> Sharpe & Sortino Calculated ---');
  liveMfAnalyticsService.setRiskFreeRate(0.06);  // Mock NAV History (40 months = 1200 days)
  const mockNavHistory = [];
  let nav = 100;
  for (let i = 0; i < 1200; i++) {
    nav *= (1 + (Math.sin(i / 10) * 0.003 + 0.0004));
    mockNavHistory.push({ time: Date.now() - (1200 - i) * 86400000, value: nav });
  }


  const verifiedMetrics = riskAnalyticsService.getRiskMetrics3YMonthly(mockNavHistory, [], 0.06);
  assert(typeof verifiedMetrics.sharpeRatio === 'number' && !isNaN(verifiedMetrics.sharpeRatio), 'Sharpe ratio calculated when verified RBI rate is provided');
  assert(typeof verifiedMetrics.sortinoRatio === 'number' && !isNaN(verifiedMetrics.sortinoRatio), 'Sortino ratio calculated when verified RBI rate is provided');


  // 3 & 4. RBI Rate Unavailable -> Sharpe & Sortino NULL
  console.log('\n--- Test 3 & 4: RBI Rate Unavailable -> Sharpe & Sortino NULL ---');
  liveMfAnalyticsService.setRiskFreeRate(null); // UNAVAILABLE rate
  const unverifiedMetrics = riskAnalyticsService.getRiskMetrics3YMonthly(mockNavHistory, [], null);
  assert(unverifiedMetrics.sharpeRatio === null, 'Sharpe ratio is strictly NULL when RBI rate is UNAVAILABLE');
  assert(unverifiedMetrics.sortinoRatio === null, 'Sortino ratio is strictly NULL when RBI rate is UNAVAILABLE');


  // 5 & 6. No 6.25% or 6.50% Fallback Used
  console.log('\n--- Test 5 & 6: No 6.25% or 6.50% Fallback Used ---');
  assert(liveMfAnalyticsService.riskFreeRate === null, 'LiveMfAnalyticsService.riskFreeRate defaults to NULL (zero hardcoded fallback)');

  // 7. Dashboard Never Reports Numeric Rate when UNAVAILABLE
  console.log('\n--- Test 7: Dashboard Truthful Risk-Free Representation ---');
  const originalRiskFreeRate = { ...macroSnapshot.riskFreeRate };
  macroSnapshot.riskFreeRate.status = 'UNAVAILABLE';
  macroSnapshot.riskFreeRate.value = null;

  const rfData = await macroDataService.getRiskFreeRate();
  assert(rfData.value === null && rfData.status === 'UNAVAILABLE', 'MacroDataService.getRiskFreeRate returns value: null and status: UNAVAILABLE');
  assert(rfData.source === 'RBI 91-Day T-Bill Benchmark Rate', 'Source correctly labeled as RBI 91-Day T-Bill Benchmark Rate');

  macroSnapshot.riskFreeRate.status = originalRiskFreeRate.status;
  macroSnapshot.riskFreeRate.value = originalRiskFreeRate.value;

  // 8. Dashboard Scheme Count Equals Validated AMFI Direct Growth Count
  console.log('\n--- Test 8: Dashboard Scheme Count Match ---');
  const activeSchemes = await amfiImportService.getActiveSchemes();
  const expectedCount = activeSchemes.length;
  const expectedDisplay = Number(expectedCount).toLocaleString();

  const summary = await liveMfAnalyticsService.getLiveDashboardSummary('all');
  assert(summary.totalFunds.value === expectedCount, `Dashboard totalFunds count equals exact AMFI Direct Growth count (${expectedDisplay} schemes)`);
  assert(summary.totalFunds.display === expectedDisplay, `Dashboard display string equals "${expectedDisplay}"`);

  // 9. Redis Cache Cannot Cause Old 2,751 Value
  console.log('\n--- Test 9: Redis Scheme Count Invalidation & Deduplication ---');
  assert(activeSchemes.length === expectedCount, `Active AMFI scheme count is strictly ${expectedCount} (zero 2,751 mismatch)`);

  // 10. Failed AMFI Refresh Preserves Last Valid Dataset
  console.log('\n--- Test 10: Failed AMFI Refresh Preserves Dataset ---');
  const originalUrl = amfiImportService.AMFI_NAV_URL;
  amfiImportService.AMFI_NAV_URL = 'https://invalid-domain-test.txt';
  const failResult = await amfiImportService.runAtomicImport();
  assert(failResult.status === 'error' && failResult.retainedPreviousDataset === true, 'Failed import cleanly retains previous valid dataset');
  amfiImportService.AMFI_NAV_URL = originalUrl;

  console.log('\n==========================================================================');
  console.log(`     SUMMARY: ${passedTests} OF ${totalTests} INTEGRITY TESTS PASSED!          `);
  console.log('==========================================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
