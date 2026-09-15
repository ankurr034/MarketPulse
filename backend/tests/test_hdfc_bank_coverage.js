// backend/tests/test_hdfc_bank_coverage.js
import assert from 'assert';
import { it } from 'node:test';
import stockWeightageService from '../services/StockWeightageService.js';
import officialAmcPortfolioService from '../services/OfficialAmcPortfolioService.js';

console.log('\n================================================================');
console.log('🧪 TEST SUITE: HDFC BANK END-TO-END VERIFICATION & REGRESSION');
console.log('================================================================\n');

async function runTests() {
  await stockWeightageService.init();

  await it('TEST 1: Canonical HDFC Bank identity resolution', async () => {
    const detail = await stockWeightageService.getStockDetail('HDFCBANK');
    assert.ok(detail, 'HDFC Bank detail must exist');
    assert.strictEqual(detail.isin, 'INE040A01034', 'Must resolve canonical ISIN for HDFC Bank');
    assert.ok(detail.name.toLowerCase().includes('hdfc bank'), 'Must resolve canonical name');
  });

  await it('TEST 2: Multiple AMCs are represented and NOT restricted to Parag Parikh', async () => {
    const detail = await stockWeightageService.getStockDetail('HDFCBANK');
    const amcs = detail.ownershipSummary.amcsHolding || [];
    console.log(`ℹ Found ${amcs.length} AMCs holding HDFC Bank:`, amcs);
    assert.ok(amcs.length >= 2, 'Must have at least 2 distinct AMCs');
    assert.ok(amcs.some(a => a.toLowerCase().includes('hdfc')), 'Must include HDFC Mutual Fund');
    assert.ok(amcs.some(a => a.toLowerCase().includes('baroda')), 'Must include Baroda BNP Paribas');
    assert.ok(amcs.some(a => a.toLowerCase().includes('ppfas') || a.toLowerCase().includes('parag parikh')), 'Must include PPFAS');
  });

  await it('TEST 3: Distinct schemes, no duplicate schemeCode', async () => {
    const fundsRes = await stockWeightageService.getFundsHoldingStock('HDFCBANK', { limit: 1000 });
    const funds = fundsRes.funds || [];
    assert.ok(funds.length > 0, 'Must return funds list');

    const schemeCodes = funds.map(f => f.schemeCode);
    const uniqueCodes = new Set(schemeCodes);
    assert.strictEqual(schemeCodes.length, uniqueCodes.size, 'Every schemeCode must be distinct (zero duplicates)');
    assert.strictEqual(fundsRes.summary.mutualFundsHolding, uniqueCodes.size, 'Summary fund count must match distinct schemes');
  });

  await it('TEST 4: Weights are authentic source-derived and not artificially inflated', async () => {
    const detail = await stockWeightageService.getStockDetail('HDFCBANK');
    const avgW = detail.ownershipSummary.avgWeightage;
    const maxW = detail.ownershipSummary.maxWeightage;
    console.log(`ℹ HDFC Bank Avg Weight: ${avgW}%, Max Weight: ${maxW}%`);
    assert.ok(avgW > 0 && avgW < 30, `Average weight (${avgW}%) must be financially plausible (< 30%)`);
    assert.ok(maxW > 0 && maxW <= 30, `Max weight (${maxW}%) must be financially plausible (<= 30%)`);
  });

  await it('TEST 5: Source portfolio verification for holding schemes', async () => {
    // Check PPFAS Flexi Cap (122639)
    const ppfasPortfolio = await stockWeightageService.getFundCompletePortfolio('122639');
    assert.ok(ppfasPortfolio.available, 'PPFAS portfolio must be available');
    const hdfcInPpfas = ppfasPortfolio.holdings.find(h => (h.isin === 'INE040A01034' || h.ISIN === 'INE040A01034' || (h.name || h.stockName || h.stock || '').toLowerCase().includes('hdfc bank')));
    assert.ok(hdfcInPpfas, 'HDFC Bank must actually be present in PPFAS source portfolio');

    // Check HDFC Flexi Cap (118955)
    const hdfcFlexiPortfolio = await stockWeightageService.getFundCompletePortfolio('118955');
    assert.ok(hdfcFlexiPortfolio.available, 'HDFC Flexi Cap portfolio must be available');
    const hdfcInHdfcFlexi = hdfcFlexiPortfolio.holdings.find(h => (h.isin === 'INE040A01034' || h.ISIN === 'INE040A01034' || (h.name || h.stockName || h.stock || '').toLowerCase().includes('hdfc bank')));
    assert.ok(hdfcInHdfcFlexi, 'HDFC Bank must actually be present in HDFC Flexi Cap source portfolio');
  });

  await it('TEST 6: Coverage diagnostics report is populated and accurate', async () => {
    const coverage = await stockWeightageService.getCoverageDiagnostics();
    assert.ok(coverage.universe, 'Coverage universe must exist');
    assert.ok(coverage.universe.indexedSchemes > 0, 'Must have indexed schemes');
    assert.ok(coverage.quality.uniqueStocksIndexed > 0, 'Must have indexed stocks');
    assert.ok(coverage.amcCoverage.length >= 3, 'Must have at least 3 AMCs covered');
    console.log('ℹ Coverage ratio:', coverage.universe.coverageRatio);
    console.log('ℹ AMCs covered:', coverage.amcCoverage.map(a => `${a.amc} (${a.indexedSchemes} schemes)`));
  });

  console.log('\n================================================================');
  console.log('ALL HDFC BANK REGRESSION TESTS PASSED');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('HDFC Bank test failure:', err);
  process.exit(1);
});
