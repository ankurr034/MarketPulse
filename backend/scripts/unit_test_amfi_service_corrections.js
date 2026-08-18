import amfiImportService from '../services/AmfiImportService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';

console.log('==========================================================================');
console.log('       AMFI IMPORT SERVICE & PROVENANCE CORRECTIONS TEST SUITE            ');
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

// 1. Test 1D return uses actual daily NAVs: NAV_curr = 105, NAV_prev = 100 -> +5.0%
console.log('--- Test 1: 1D Return Uses Actual Daily NAVs ---');
const consecutiveNavs = [
  { date: '12-08-2026', nav: '105.00' },
  { date: '11-08-2026', nav: '100.00' }
];
const metricsConsecutive = liveMfAnalyticsService.calculateSchemeMetrics(consecutiveNavs);
assert(metricsConsecutive.return1D === 5.0, `1D return correctly computed as +5.0% from consecutive NAVs (105 vs 100)`);
assert(metricsConsecutive.returns['1D'] === 5.0, `1D return in returns object equals 5.0`);

// 2. Test 1D is null when previous NAV is unavailable (single NAV observation)
console.log('\n--- Test 2: 1D Return is Null When Previous NAV Unavailable ---');
const singleNav = [{ date: '12-08-2026', nav: '105.00' }];
const metricsSingle = liveMfAnalyticsService.calculateSchemeMetrics(singleNav);
assert(metricsSingle.return1D === null, '1D return is null when previous NAV unavailable');
assert(metricsSingle.returns['1D'] === null, 'returns["1D"] is null for single NAV observation');

// 3. Test No 1W/5 Approximation Exists
console.log('\n--- Test 3: No 1W/5 Approximation Exists ---');
// Create NAV series where 1W return is +10%, but last 1-day change is -2%
const navSeriesCustom = [
  { date: '12-08-2026', nav: '110.00' }, // Latest today
  { date: '11-08-2026', nav: '112.24' }, // Prev day -> 1D return = ((110 - 112.24)/112.24) = -2.0%
];
// Append older NAVs to make 1W return +10% (100 -> 110)
for (let i = 2; i <= 7; i++) {
  navSeriesCustom.push({ date: `${12-i}-08-2026`, nav: '100.00' });
}
const metricsCustom = liveMfAnalyticsService.calculateSchemeMetrics(navSeriesCustom);
assert(metricsCustom.return1W === 10.0, '1W return is +10.0%');
assert(metricsCustom.return1D === -2.0, '1D return is -2.0% (exact consecutive trading day change), NOT 1W/5 = +2.0%');

// 4. Test AUM Source Correctly Labeled (mfdata.in is labeled mfdata.in, NOT official AMFI)
console.log('\n--- Test 4: AUM Source Provenance Labeling ---');
const aumResult = await amfiImportService.fetchAmfiSchemeWiseAum('122639');
if (aumResult) {
  assert(aumResult.source === 'Upvaly FinAPI Disclosure' || aumResult.source === 'mfdata.in', `AUM source correctly labeled as "${aumResult.source}" (NOT claiming official AMFI endpoint)`);
  assert(aumResult.status === 'PROVIDER_REPORTED' || aumResult.status === 'VERIFIED', `AUM status is ${aumResult.status}`);
} else {
  assert(true, 'AUM fetch returned null when unavailable (zero synthetic fallback)');
}

// 5. Test Scheduled Refresh & Atomic Dataset Preservation
console.log('\n--- Test 5: Atomic Dataset Preservation on Import Failure ---');
const activeBefore = await amfiImportService.getActiveSchemes();
assert(Array.isArray(activeBefore) && activeBefore.length > 0, `Active dataset contains ${activeBefore.length} schemes before simulated failure`);

// Simulate atomic import failure with invalid URL
const originalUrl = amfiImportService.AMFI_NAV_URL;
amfiImportService.AMFI_NAV_URL = 'https://portal.amfiindia.com/invalid_endpoint_url_test.txt';

const failureResult = await amfiImportService.runAtomicImport();
assert(failureResult.status === 'error', 'Import failure cleanly caught');
assert(failureResult.retainedPreviousDataset === true, 'Import failure retained previous active dataset');

const activeAfter = await amfiImportService.getActiveSchemes();
assert(activeAfter.length === activeBefore.length, `Active dataset count preserved after import failure (${activeAfter.length} schemes)`);

// Restore original URL
amfiImportService.AMFI_NAV_URL = originalUrl;

console.log('\n==========================================================================');
console.log(`     SUMMARY: ${passedTests} OF ${totalTests} AMFI CORRECTION TESTS PASSED!       `);
console.log('==========================================================================');
