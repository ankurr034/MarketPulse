import axios from 'axios';
import amfiImportService from '../services/AmfiImportService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import mfDataAggregatorService from '../services/MfDataAggregatorService.js';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';

async function runFinalVerificationSuite() {
  console.log('==================================================================');
  console.log('🚀 MARKETPULSE MUTUAL FUND ENGINE: FINAL VERIFICATION SUITE');
  console.log('==================================================================\n');

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

  // ------------------------------------------------------------------
  // CHECK 1: AMFI Live Feed Match & Timestamp Report
  // ------------------------------------------------------------------
  console.log('--- CHECK 1: Official AMFI NAV Dataset Sourcing & Timestamp ---');
  const rawAmfiRes = await axios.get('https://portal.amfiindia.com/spages/NAVAll.txt', { timeout: 15000 });
  const rawText = rawAmfiRes.data;
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Find date from first valid scheme line
  let latestAmfiDate = 'Unknown';
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length >= 6 && /^\d+$/.test(parts[0])) {
      latestAmfiDate = parts[5];
      break;
    }
  }

  assert(rawText.length > 500000, `Raw AMFI feed downloaded successfully (${(rawText.length / 1024).toFixed(1)} KB)`);
  assert(latestAmfiDate !== 'Unknown', `Dataset official NAV date stamp confirmed: "${latestAmfiDate}"`);

  // ------------------------------------------------------------------
  // CHECK 2: Dynamic totalCount Verification (Not Hardcoded / Static)
  // ------------------------------------------------------------------
  console.log('\n--- CHECK 2: Dynamic totalCount Verification ---');
  await amfiImportService.runAtomicImport();
  const activeCount = amfiImportService.getActiveSchemes().length;

  const resAll = await allFundsDirectoryService.getAllSchemes(1, 10, {});
  const resHdfc = await allFundsDirectoryService.getAllSchemes(1, 10, { amc: 'HDFC' });
  const resQuant = await allFundsDirectoryService.getAllSchemes(1, 10, { amc: 'Quant' });

  assert(resAll.totalCount === activeCount, `Unfiltered totalCount (${resAll.totalCount}) matches active DB count (${activeCount})`);
  assert(resHdfc.totalCount < resAll.totalCount && resHdfc.totalCount > 0, `HDFC filtered totalCount (${resHdfc.totalCount}) updates dynamically`);
  assert(resQuant.totalCount < resAll.totalCount && resQuant.totalCount > 0, `Quant filtered totalCount (${resQuant.totalCount}) updates dynamically`);

  // ------------------------------------------------------------------
  // CHECK 3: AUM & Holdings Official Sourcing Integrity
  // ------------------------------------------------------------------
  console.log('\n--- CHECK 3: AUM & Holdings Official Sourcing & Null Safety ---');
  const sampleHoldingsRes = await mfDataAggregatorService.getSchemeHoldings('120492', '1y'); // JM Flexicap
  assert(sampleHoldingsRes.available === true, 'Holdings query executed without error');
  if (!sampleHoldingsRes.holdingsAvailable) {
    assert(sampleHoldingsRes.holdingsReason.includes('Official portfolio holdings disclosure unavailable'), 'Missing holdings return explicit official reason');
    assert(Array.isArray(sampleHoldingsRes.holdings) && sampleHoldingsRes.holdings.length === 0, 'No synthetic holdings generated when official disclosures are unavailable');
  }

  // ------------------------------------------------------------------
  // CHECK 4: Independent Mathematical Recalculation & API Output Match
  // ------------------------------------------------------------------
  console.log('\n--- CHECK 4: Independent Math Recalculation vs API Output ---');
  const testSchemeCode = '120492'; // JM Flexicap Fund Direct Growth
  const navRes = await mfDataAggregatorService.getSchemeNavHistory(testSchemeCode, '1y');
  
  if (navRes && navRes.data && navRes.data.length > 10) {
    const prices = navRes.data.map(d => d.value);
    const startNav = prices[0];
    const endNav = prices[prices.length - 1];
    
    // Independent CAGR math
    const totalDays = (navRes.data[navRes.data.length - 1].time - navRes.data[0].time) / (1000 * 60 * 60 * 24);
    const years = totalDays / 365.25;
    const independentCagr = parseFloat(((Math.pow(endNav / startNav, 1 / years) - 1) * 100).toFixed(2));

    const holdings = await mfDataAggregatorService.getSchemeHoldings(testSchemeCode, '1y');
    assert(Math.abs(independentCagr - holdings.cagr) < 0.1, `Independent CAGR (${independentCagr}%) matches API output (${holdings.cagr}%)`);

    // Risk metrics independent call
    const independentRisk = riskAnalyticsService.getRiskMetrics(navRes.data, []);
    assert(independentRisk.sharpeRatio === holdings.sharpeRatio, `Independent Sharpe (${independentRisk.sharpeRatio}) matches API Sharpe (${holdings.sharpeRatio})`);
    assert(independentRisk.sortinoRatio === holdings.sortinoRatio, `Independent Sortino (${independentRisk.sortinoRatio}) matches API Sortino (${holdings.sortinoRatio})`);
  }

  // ------------------------------------------------------------------
  // CHECK 5: End-to-End Pipeline Integration Test
  // ------------------------------------------------------------------
  console.log('\n--- CHECK 5: End-to-End Pipeline (Import -> Cache -> API) ---');
  const importMetrics = await amfiImportService.runAtomicImport();
  assert(importMetrics.status === 'success' || importMetrics.status === 'in_progress', 'Atomic import pipeline executed cleanly');

  const liveApiData = await allFundsDirectoryService.getAllSchemes(1, 5, {});
  assert(liveApiData.schemes.length === 5, 'API directory returns expected page size');
  assert(liveApiData.totalCount > 2000, `API totalCount (${liveApiData.totalCount}) reflects 2000+ active Direct Growth schemes`);
  
  // Verify Category Percentile formatting fix
  const firstScheme = liveApiData.schemes[0];
  assert(firstScheme.categoryRank !== undefined, `Category rank present: "${firstScheme.categoryRank}"`);
  assert(firstScheme.percentileLabel !== undefined, `Percentile label present: "${firstScheme.percentileLabel}"`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('\n==================================================================');
  console.log(`TOTAL FINAL VERIFICATION CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('==================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalVerificationSuite().catch(err => {
  console.error('Final Verification Suite Exception:', err);
  process.exit(1);
});
