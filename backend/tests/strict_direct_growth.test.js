import { isStrictDirectGrowth, filterAndDeduplicateSchemes } from '../utils/schemeFilterUtil.js';
import amfiImportService from '../services/AmfiImportService.js';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';

async function runTests() {
  console.log('🧪 Starting Strict Direct-Growth & Validation Master Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Strict Direct Growth Filter Verification
  // ----------------------------------------------------
  console.log('--- Test Group 1: Scheme Name Filtering Rules ---');
  
  assert(isStrictDirectGrowth('HDFC Flexi Cap Fund Direct Growth') === true, 'Direct Growth scheme should pass');
  assert(isStrictDirectGrowth('SBI Small Cap Fund Direct Plan - Growth Option') === true, 'Direct Plan - Growth Option should pass');
  assert(isStrictDirectGrowth('Nippon India ETF Gold BeES') === true, 'ETF / BeES fund should pass');

  assert(isStrictDirectGrowth('HDFC Flexi Cap Fund Regular Growth') === false, 'Regular Growth scheme must be rejected');
  assert(isStrictDirectGrowth('ICICI Prudential Bluechip Fund Regular Plan') === false, 'Regular Plan must be rejected');
  assert(isStrictDirectGrowth('SBI Bluechip Fund Direct IDCW') === false, 'IDCW option must be rejected');
  assert(isStrictDirectGrowth('Axis Midcap Fund Direct Dividend Reinvestment') === false, 'Dividend option must be rejected');
  assert(isStrictDirectGrowth('Quant Multi Cap Fund Bonus Option') === false, 'Bonus option must be rejected');
  assert(isStrictDirectGrowth('DSP ELSS Segregated Portfolio 1') === false, 'Segregated Portfolio must be rejected');
  assert(isStrictDirectGrowth('UTI Fixed Income Interval Scheme Matured') === false, 'Matured scheme must be rejected');

  // ----------------------------------------------------
  // Test 2: Deduplication & Audit Report Generation
  // ----------------------------------------------------
  console.log('\n--- Test Group 2: Deduplication & Audit Reporting ---');
  
  const mockRawData = [
    { schemeCode: '100001', schemeName: 'Fund A Direct Growth', nav: 100.5, category: 'Equity' },
    { schemeCode: '100001', schemeName: 'Fund A Direct Growth Duplicate', nav: 101.0, category: 'Equity' }, // Duplicate code
    { schemeCode: '100002', schemeName: 'Fund B Regular Growth', nav: 50.0, category: 'Equity' }, // Rejected Regular
    { schemeCode: '100003', schemeName: 'Fund C Direct IDCW', nav: 20.0, category: 'Equity' } // Rejected IDCW
  ];

  const { filteredSchemes, auditReport } = filterAndDeduplicateSchemes(mockRawData);

  assert(filteredSchemes.length === 1, 'Only 1 valid scheme should remain after filtering and deduplication');
  assert(filteredSchemes[0].schemeCode === '100001', 'Deduplicated scheme code should match primary key');
  assert(auditReport.duplicatesRemoved === 1, 'Audit report should correctly record 1 duplicate removed');
  assert(auditReport.rejectedCount === 2, 'Audit report should record 2 rejected non-compliant schemes');

  // ----------------------------------------------------
  // Test 3: Insufficient Historical NAV Risk Metrics Test
  // ----------------------------------------------------
  console.log('\n--- Test Group 3: Dynamic Risk Engine Fallback ---');

  const emptyRiskMetrics = riskAnalyticsService.getRiskMetrics([], []);
  assert(emptyRiskMetrics.sharpeRatio === null, 'Sharpe ratio must be null when NAV history is empty');
  assert(emptyRiskMetrics.sortinoRatio === null, 'Sortino ratio must be null when NAV history is empty');
  assert(emptyRiskMetrics.volatility === null, 'Volatility must be null when NAV history is empty');

  const singlePointMetrics = riskAnalyticsService.getRiskMetrics([{ time: Date.now(), value: 100 }], []);
  assert(singlePointMetrics.sharpeRatio === null, 'Sharpe ratio must be null for single NAV point');
  assert(singlePointMetrics.volatility === null, 'Volatility must be null for single NAV point');

  // ----------------------------------------------------
  // Test 4: Live Atomic AMFI Ingestion & Audit Report
  // ----------------------------------------------------
  console.log('\n--- Test Group 4: Live AMFI Atomic Import & Total Count ---');
  
  try {
    const importResult = await amfiImportService.runAtomicImport();
    assert(importResult.status === 'success' || importResult.retainedPreviousDataset === true, 'Atomic AMFI import must complete successfully or retain verified dataset');
    const totalCount = importResult.totalActiveDirectGrowth || (await amfiImportService.getActiveSchemes()).length;
    assert(totalCount > 1000, `Active Direct Growth count (${totalCount}) should be > 1000`);
    
    const activeSchemes = await amfiImportService.getActiveSchemes();
    const nonCompliantInActive = activeSchemes.filter(s => !isStrictDirectGrowth(s.schemeName));
    assert(nonCompliantInActive.length === 0, 'Active schemes cache must contain 0 non-compliant schemes');

    // ----------------------------------------------------
    // Test 5: AllFundsDirectoryService Dynamic totalCount Match
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Directory Service Dynamic totalCount Verification ---');
    const directoryRes = await allFundsDirectoryService.getAllSchemes(1, 10, {});
    assert(directoryRes.totalCount === activeSchemes.length, `Directory totalCount (${directoryRes.totalCount}) must dynamically match active schemes length (${activeSchemes.length})`);
    assert(directoryRes.schemes.length === 10, 'Page size 10 should return exactly 10 scheme items');
  } catch (err) {
    console.error('  ❌ Exception in Live Atomic Import test:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
