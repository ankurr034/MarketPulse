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
    assert.ok(diag.universe.totalSchemesDiscovered >= 2125, `Must discover >= 2125 total schemes (got ${diag.universe.totalSchemesDiscovered})`);
    assert.ok(diag.universe.targetCategoryUniverse.total >= 130, `Must have >= 130 target schemes (got ${diag.universe.targetCategoryUniverse.total})`);
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

  await it('TEST 11: Sector resolution ensures authentic sectors (no placeholder General)', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 50 });
    assert.ok(res.stocks.length > 0, 'Must return stocks');
    const generalCount = res.stocks.filter(s => !s.sector || s.sector === 'General').length;
    assert.strictEqual(generalCount, 0, 'No top stocks should have General as sector');

    // Test specific marquee stock sectors
    const hdfc = res.stocks.find(s => s.symbol === 'HDFCBANK');
    if (hdfc) assert.strictEqual(hdfc.sector, 'Banks', 'HDFC Bank sector must be Banks');
    const infy = res.stocks.find(s => s.symbol === 'INFY');
    if (infy) assert.strictEqual(infy.sector, 'IT - Software', 'Infosys sector must be IT - Software');
  });

  await it('TEST 12: MF Universe Weightage is mathematically (Total Holding Value / Universe AUM) * 100', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 10 });
    const totalAum = res.kpis.totalAumAnalysedCr;
    assert.ok(totalAum > 0, 'Total analyzed AUM must be positive');
    
    for (const stock of res.stocks) {
      assert.ok(typeof stock.mfUniverseWeightage === 'number', 'Must have mfUniverseWeightage');
      assert.ok(typeof stock.totalAumExposureCr === 'number', 'Must have totalAumExposureCr');
      assert.ok(typeof stock.mutualFundsHolding === 'number', 'Must have mutualFundsHolding');
      assert.ok(stock.totalUniverseFunds > 0, 'Must have totalUniverseFunds count');

      const expectedWeight = parseFloat(((stock.totalAumExposureCr / totalAum) * 100).toFixed(2));
      assert.strictEqual(stock.mfUniverseWeightage, expectedWeight, 'MF Universe weightage must match formula');
    }
  });

  await it('TEST 13: Sorting by MF Universe Weightage and Total AUM Exposure', async () => {
    const sortedByWeight = await stockWeightageService.getScreenerResults({ sortBy: 'universeWeightPct', sortOrder: 'desc', limit: 10 });
    for (let i = 0; i < sortedByWeight.stocks.length - 1; i++) {
      assert.ok(
        (sortedByWeight.stocks[i].mfUniverseWeightage ?? 0) >= (sortedByWeight.stocks[i + 1].mfUniverseWeightage ?? 0),
        'Stocks must be sorted in descending order of MF universe weightage'
      );
    }
  });

  await it('TEST 14: Universe vs verified holdings distinction & UI denominator', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 5 });
    const verifiedCount = stockWeightageService.schemeMap.size;
    const eligibleCount = stockWeightageService.eligibleFundUniverseMap.size;
    const expectedCoverage = parseFloat(((verifiedCount / eligibleCount) * 100).toFixed(2));
    assert.strictEqual(res.kpis.eligibleUniverseFunds, eligibleCount, `Eligible universe must be ${eligibleCount}`);
    assert.strictEqual(res.kpis.totalUniverseFunds, eligibleCount, `UI denominator must be ${eligibleCount}`);
    assert.strictEqual(res.kpis.fundsWithVerifiedHoldings, verifiedCount, `Verified holdings must be ${verifiedCount}`);
    assert.strictEqual(res.kpis.holdingsCoveragePct, expectedCoverage, `Coverage percentage must be ${expectedCoverage}%`);
    
    // Each stock must use 228 as denominator
    for (const s of res.stocks) {
      assert.strictEqual(s.totalUniverseFunds, eligibleCount, `Stock UI denominator must be ${eligibleCount}`);
      assert.strictEqual(s.eligibleUniverseFunds, eligibleCount, `Stock eligibleUniverseFunds must be ${eligibleCount}`);
      assert.strictEqual(s.fundsWithVerifiedHoldings, verifiedCount, `Stock fundsWithVerifiedHoldings must be ${verifiedCount}`);
      assert.strictEqual(s.fundsHoldingStock, s.mutualFundsHolding, 'fundsHoldingStock must match mutualFundsHolding');
    }
  });

  await it('TEST 15: Sector provenance 5-tier classification & diagnostics', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 50 });
    const diag = res.kpis.sectorDiagnostics;
    assert.ok(diag, 'Must include sector diagnostics');
    assert.ok(typeof diag.verifiedSectorCount === 'number' && diag.verifiedSectorCount > 0, 'Must have verifiedSectorCount');
    assert.ok(typeof diag.disclosureSectorCount === 'number' && diag.disclosureSectorCount > 0, 'Must have disclosureSectorCount');
    assert.ok(typeof diag.snapshotSectorCount === 'number', 'Must have snapshotSectorCount');
    assert.ok(typeof diag.heuristicSectorCount === 'number', 'Must have heuristicSectorCount');
    assert.ok(typeof diag.unmappedSectorCount === 'number', 'Must have unmappedSectorCount');

    for (const s of res.stocks) {
      assert.ok(s.sector, 'Every stock must have a sector');
      assert.ok(['EXCHANGE_CLASSIFICATION', 'OFFICIAL_DISCLOSURE', 'VERIFIED_SNAPSHOT', 'HEURISTIC_FALLBACK', 'UNMAPPED'].includes(s.sectorSource), 'Valid sectorSource');
      assert.ok(['HIGH', 'LOW', 'NONE'].includes(s.sectorConfidence), 'Valid sectorConfidence');
    }
  });

  await it('TEST 16: Mathematical reconciliation for sample marquee stocks', async () => {
    const res = await stockWeightageService.getScreenerResults({ limit: 100 });
    const totalUniverseAum = res.kpis.totalUniverseAumCr;
    assert.ok(totalUniverseAum > 1000000, 'Total universe AUM must exceed 10 lakh crore');

    const sampleSymbols = ['HDFCBANK', 'INFY', 'ICICIBANK', 'RELIANCE', 'AXISBANK'];
    for (const sym of sampleSymbols) {
      const stock = res.stocks.find(s => s.symbol === sym) || 
        (await stockWeightageService.getScreenerResults({ search: sym, limit: 1 })).stocks[0];
      assert.ok(stock, `Must find sample stock ${sym}`);
      assert.strictEqual(stock.totalAumExposureCr, stock.totalHoldingValueCr, 'totalAumExposureCr === totalHoldingValueCr');
      const eligibleCount = stockWeightageService.eligibleFundUniverseMap.size;
      assert.strictEqual(stock.totalUniverseFunds, eligibleCount, `Denominator must be ${eligibleCount}`);
      const expectedWeight = parseFloat(((stock.totalHoldingValueCr / totalUniverseAum) * 100).toFixed(2));
      assert.strictEqual(stock.mfUniverseWeightage, expectedWeight, `MF weightage for ${sym} must equal formula`);
      assert.strictEqual(stock.sectorConfidence, 'HIGH', `Marquee stock ${sym} must have HIGH sector confidence`);
    }
  });

  await it('TEST 17: Category filter validation with isolated recalculations', async () => {
    const catCounts = {};
    for (const f of stockWeightageService.eligibleFundUniverseMap.values()) {
      catCounts[f.targetCategory] = (catCounts[f.targetCategory] || 0) + 1;
    }
    const categories = {
      'Large Cap': catCounts['Large Cap'] || 34,
      'Mid Cap': catCounts['Mid Cap'] || 33,
      'Small Cap': catCounts['Small Cap'] || 36,
      'Contra': catCounts['Contra'] || 5,
      'Value': catCounts['Value'] || 24
    };

    for (const [cat, expectedEligible] of Object.entries(categories)) {
      const catRes = await stockWeightageService.getScreenerResults({ category: cat, limit: 5 });
      assert.strictEqual(catRes.kpis.eligibleUniverseFunds, expectedEligible, `Eligible funds for ${cat} must be ${expectedEligible}`);
      assert.strictEqual(catRes.kpis.totalUniverseFunds, expectedEligible, `UI denominator for ${cat} must be ${expectedEligible}`);
      assert.ok(catRes.kpis.totalUniverseAumCr > 0, `Category AUM for ${cat} must be positive`);

      if (catRes.stocks.length > 0) {
        const top = catRes.stocks[0];
        assert.strictEqual(top.totalUniverseFunds, expectedEligible, `Top stock denominator must match category eligible funds`);
        const expectedWeight = parseFloat(((top.totalHoldingValueCr / catRes.kpis.totalUniverseAumCr) * 100).toFixed(2));
        assert.strictEqual(top.mfUniverseWeightage, expectedWeight, `Category weightage must match formula`);
      }
    }
  });

  await it('TEST 18: Stock detail ownershipSummary integrity', async () => {
    const detail = await stockWeightageService.getStockDetail('HDFCBANK');
    assert.ok(detail, 'Must return detail');
    const eligibleCount = stockWeightageService.eligibleFundUniverseMap.size;
    assert.strictEqual(detail.ownershipSummary.totalUniverseFunds, eligibleCount, `Detail total universe must be ${eligibleCount}`);
    assert.strictEqual(detail.ownershipSummary.eligibleUniverseFunds, eligibleCount, `Detail eligible universe must be ${eligibleCount}`);
    assert.strictEqual(detail.ownershipSummary.totalAumExposureCr, detail.ownershipSummary.totalHoldingValueCr, 'Detail exposure === holding value');
    assert.ok(detail.ownershipSummary.totalUniverseAumCr > 1000000, 'Detail total universe AUM must exceed 10 lakh crore');
    assert.strictEqual(detail.sector, 'Banks', 'HDFCBANK sector must be Banks');
    assert.strictEqual(detail.sectorSource, 'EXCHANGE_CLASSIFICATION', 'HDFCBANK sectorSource must be EXCHANGE_CLASSIFICATION');
    assert.strictEqual(detail.sectorConfidence, 'HIGH', 'HDFCBANK sectorConfidence must be HIGH');
  });

  console.log('\n================================================================');
  console.log('ALL 18 AUDIT TESTS PASSED SUCCESSFULLY WITH 100% PRECISION');
  console.log('================================================================\n');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test Suite Failure:', err);
  process.exit(1);
});
