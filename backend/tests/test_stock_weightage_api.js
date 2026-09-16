// backend/tests/test_stock_weightage_api.js
import assert from 'assert';
import { it } from 'node:test';
import stockWeightageService from '../services/StockWeightageService.js';
import axios from 'axios';

console.log('\n================================================================');
console.log('🧪 TEST SUITE: MUTUAL FUND STOCK WEIGHTAGE SCREENER API');
console.log('================================================================\n');

async function runTests() {
  await it('TEST 1: Service initializes and indexes verified disclosures', async () => {
    await stockWeightageService.init();
    assert.ok(stockWeightageService.stockMap.size > 0, 'Must have indexed distinct stocks');
    assert.ok(stockWeightageService.schemeMap.size > 0, 'Must have indexed verified schemes');
  });

  await it('TEST 2: Dynamic KPIs are calculated strictly from real data', async () => {
    const res = await stockWeightageService.getScreenerResults();
    assert.ok(res.kpis, 'Must return KPIs');
    assert.ok(typeof res.kpis.stocksCovered === 'number' && res.kpis.stocksCovered > 0, 'Stocks covered must be positive');
    assert.ok(typeof res.kpis.mutualFundsTracked === 'number' && res.kpis.mutualFundsTracked > 0, 'Funds tracked must be positive');
    assert.ok(typeof res.kpis.totalAumAnalysedCr === 'number' && res.kpis.totalAumAnalysedCr > 0, 'AUM analysed must be positive');
    assert.ok(typeof res.kpis.totalHoldingValueAnalysedCr === 'number' && res.kpis.totalHoldingValueAnalysedCr > 0, 'Total holding value must be positive');
    assert.ok(res.kpis.mostHeldStock !== '—', 'Must identify most held stock');
  });

  await it('TEST 3: Screener results contain valid financial columns', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 5 });
    assert.ok(Array.isArray(res.stocks) && res.stocks.length > 0, 'Must return stocks array');
    const first = res.stocks[0];
    assert.ok(first.symbol, 'Must have symbol');
    assert.ok(first.name, 'Must have company name');
    assert.ok(typeof first.mutualFundsHolding === 'number', 'Must have funds holding count');
    assert.ok(typeof first.avgWeightage === 'number', 'Must have avg weightage');
    assert.ok(typeof first.maxWeightage === 'number', 'Must have max weightage');
    assert.ok(first.maxWeightage >= first.avgWeightage, 'Max weightage must be >= avg weightage');
  });

  await it('TEST 4: Search filter correctly filters stocks', async () => {
    const res = await stockWeightageService.getScreenerResults({ search: 'Power Grid' });
    assert.ok(res.stocks.length > 0, 'Must find Power Grid');
    assert.ok(res.stocks.some(s => s.name.toLowerCase().includes('power grid')), 'Result must contain Power Grid');
  });

  await it('TEST 5: Stock detail returns ownership summary & distribution brackets', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 1 });
    const sym = res.stocks[0].symbol;
    const detail = await stockWeightageService.getStockDetail(sym);
    assert.ok(detail, 'Must return detail object');
    assert.strictEqual(detail.symbol, sym, 'Symbol must match');
    assert.ok(detail.ownershipSummary, 'Must have ownershipSummary');
    assert.ok(Array.isArray(detail.distribution), 'Must have distribution brackets array');
    assert.strictEqual(detail.distribution.length, 5, 'Must have 5 distribution brackets (<1%, 1-3%, 3-5%, 5-7%, >7%)');
    assert.ok(Array.isArray(detail.keyTakeaways), 'Must have key takeaways');
  });

  await it('TEST 6: Paginated mutual funds holding the stock (Stock -> Funds lookup)', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 1 });
    const sym = res.stocks[0].symbol;
    const fundsRes = await stockWeightageService.getFundsHoldingStock(sym, { limit: 5 });
    assert.ok(Array.isArray(fundsRes.funds), 'Must return funds array');
    assert.ok(fundsRes.pagination, 'Must return pagination');
    if (fundsRes.funds.length > 0) {
      const f = fundsRes.funds[0];
      assert.ok(f.schemeName, 'Fund must have schemeName');
      assert.ok(f.amc, 'Fund must have amc');
      assert.ok(typeof f.weightage === 'number', 'Fund must have stock weightage');
    }
  });

  await it('TEST 7: Reverse lookup: Fund -> Complete Stock Portfolio', async () => {
    const portfolio = await stockWeightageService.getFundCompletePortfolio('122639');
    assert.ok(portfolio.available, 'Portfolio must be available for 122639');
    assert.strictEqual(portfolio.schemeName, 'Parag Parikh Flexi Cap Fund', 'Must match PPFCF name');
    assert.ok(Array.isArray(portfolio.holdings) && portfolio.holdings.length > 0, 'Must contain holdings array');
    const firstStock = portfolio.holdings[0];
    assert.ok(firstStock.stockName || firstStock.name, 'Position must have stock name');
    assert.ok(typeof firstStock.weightPct === 'number', 'Position must have weightPct');
  });

  await it('TEST 8: Full Direct Growth universe discovery across 5 target categories', async () => {
    const diag = await stockWeightageService.getCoverageDiagnostics();
    assert.strictEqual(diag.universe.totalSchemesDiscovered, 2106, 'Must discover 2106 total schemes');
    assert.ok(diag.universe.targetCategoryUniverse.total >= 200, 'Must have 200+ target schemes');
    assert.ok(diag.universe.uniqueAmcsInUniverse >= 40, 'Must cover 40+ unique AMCs');
    assert.ok(diag.universe.targetCategoryUniverse.largeCap > 0, 'Large Cap must be populated');
    assert.ok(diag.universe.targetCategoryUniverse.midCap > 0, 'Mid Cap must be populated');
    assert.ok(diag.universe.targetCategoryUniverse.smallCap > 0, 'Small Cap must be populated');
    assert.ok(diag.universe.targetCategoryUniverse.contra > 0, 'Contra must be populated');
    assert.ok(diag.universe.targetCategoryUniverse.value > 0, 'Value must be populated');
  });

  await it('TEST 9: Multiple AMCs returned in every target category fund list', async () => {
    const categories = ['Large Cap', 'Mid Cap', 'Small Cap', 'Contra', 'Value', 'all'];
    for (const cat of categories) {
      const res = await stockWeightageService.getFundsList({ category: cat, limit: 100 });
      assert.ok(res.funds.length > 0, `Category ${cat} must return funds`);
      const amcs = new Set(res.funds.map(f => f.amc));
      assert.ok(amcs.size > 1, `Category ${cat} must have more than 1 AMC (found: ${amcs.size})`);
    }
  });

  await it('TEST 10: Pending disclosure state returns valid metadata without fake data', async () => {
    const sbiContra = Array.from(stockWeightageService.eligibleFundUniverseMap.values()).find(f => /sbi contra/i.test(f.schemeName));
    assert.ok(sbiContra, 'SBI Contra must be in eligible universe');
    const sbiRes = await stockWeightageService.getFundCompletePortfolio(sbiContra.schemeCode);
    assert.ok(sbiRes.available, 'Must be available');
    assert.strictEqual(sbiRes.holdingsAvailable, false, 'Holdings must be false until disclosed');
    assert.strictEqual(sbiRes.totalHoldings, 0, 'Must not invent fake holdings');
    assert.ok(sbiRes.reason.includes('pending publication'), 'Must provide clear reason');
  });

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failure:', err);
  process.exit(1);
});
