// backend/tests/test_indian_mf_ranking.js
import assert from 'assert';
import indianMfRankingService from '../services/IndianMfRankingService.js';
import amfiImportService from '../services/AmfiImportService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import indianMfSectorService from '../services/IndianMfSectorService.js';
import sectorDataService from '../services/SectorDataService.js';

let passed = 0;
let failed = 0;

async function it(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 TEST SUITE: INDIAN MF CATEGORY & SUBCATEGORY AUM RANKING ENGINE');
  console.log('================================================================\n');

  console.log('--- SECTION 1: CANONICAL MULTI-LEVEL AUM RANKING CALCULATIONS ---');

  await it('TEST 1: Global AUM ranking works (indiaMfRank 1..N DESC across all valid schemes)', () => {
    const fixtures = [
      { schemeCode: '101', schemeName: 'Fund C', category: 'Equity Scheme - Small Cap Fund', aum: 10000 },
      { schemeCode: '102', schemeName: 'Fund A', category: 'Equity Scheme - Flexi Cap Fund', aum: 50000 },
      { schemeCode: '103', schemeName: 'Fund B', category: 'Debt Scheme - Liquid Fund', aum: 25000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    assert.strictEqual(ranked[0].schemeCode, '102');
    assert.strictEqual(ranked[0].indiaMfRank, 1);
    assert.strictEqual(ranked[1].schemeCode, '103');
    assert.strictEqual(ranked[1].indiaMfRank, 2);
    assert.strictEqual(ranked[2].schemeCode, '101');
    assert.strictEqual(ranked[2].indiaMfRank, 3);
  });

  await it('TEST 2: Flexi Cap ranking works (Parag Parikh #1, HDFC #2 in Flexi Cap)', () => {
    const fixtures = [
      { schemeCode: '201', schemeName: 'Parag Parikh Flexi Cap', category: 'Equity Scheme - Flexi Cap Fund', aum: 148429 },
      { schemeCode: '202', schemeName: 'HDFC Flexi Cap', category: 'Equity Scheme - Flexi Cap Fund', aum: 110736 },
      { schemeCode: '203', schemeName: 'Kotak Flexicap', category: 'Equity Scheme - Flexi Cap Fund', aum: 50146 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    const ppfas = ranked.find(s => s.schemeCode === '201');
    const hdfc = ranked.find(s => s.schemeCode === '202');
    const kotak = ranked.find(s => s.schemeCode === '203');

    assert.strictEqual(ppfas.indiaMfSubcategoryRank, 1);
    assert.strictEqual(hdfc.indiaMfSubcategoryRank, 2);
    assert.strictEqual(kotak.indiaMfSubcategoryRank, 3);
  });

  await it('TEST 3: Large Cap ranking works (starts at #1 strictly by AUM DESC)', () => {
    const fixtures = [
      { schemeCode: '301', schemeName: 'ICICI Prudential Large Cap', category: 'Equity Scheme - Large Cap Fund', aum: 80961 },
      { schemeCode: '302', schemeName: 'HDFC Top 100', category: 'Equity Scheme - Large Cap Fund', aum: 35000 },
      { schemeCode: '303', schemeName: 'SBI Bluechip', category: 'Equity Scheme - Large Cap Fund', aum: 45000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    const icici = ranked.find(s => s.schemeCode === '301');
    const sbi = ranked.find(s => s.schemeCode === '303');
    const hdfc = ranked.find(s => s.schemeCode === '302');

    assert.strictEqual(icici.indiaMfSubcategoryRank, 1);
    assert.strictEqual(sbi.indiaMfSubcategoryRank, 2);
    assert.strictEqual(hdfc.indiaMfSubcategoryRank, 3);
  });

  await it('TEST 4: Mid Cap ranking works (starts at #1 strictly by AUM DESC)', () => {
    const fixtures = [
      { schemeCode: '401', schemeName: 'HDFC Mid-Cap Opportunities', category: 'Equity Scheme - Mid Cap Fund', aum: 105142 },
      { schemeCode: '402', schemeName: 'Kotak Emerging Equity', category: 'Equity Scheme - Mid Cap Fund', aum: 48000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    assert.strictEqual(ranked[0].schemeCode, '401');
    assert.strictEqual(ranked[0].indiaMfSubcategoryRank, 1);
    assert.strictEqual(ranked[1].schemeCode, '402');
    assert.strictEqual(ranked[1].indiaMfSubcategoryRank, 2);
  });

  await it('TEST 5: Small Cap ranking works (starts at #1 strictly by AUM DESC)', () => {
    const fixtures = [
      { schemeCode: '501', schemeName: 'Nippon India Small Cap', category: 'Equity Scheme - Small Cap Fund', aum: 78956 },
      { schemeCode: '502', schemeName: 'HDFC Small Cap', category: 'Equity Scheme - Small Cap Fund', aum: 41679 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    assert.strictEqual(ranked[0].schemeCode, '501');
    assert.strictEqual(ranked[0].indiaMfSubcategoryRank, 1);
    assert.strictEqual(ranked[1].schemeCode, '502');
    assert.strictEqual(ranked[1].indiaMfSubcategoryRank, 2);
  });

  await it('TEST 6: Each subcategory independently starts at #1', () => {
    const fixtures = [
      { schemeCode: '601', schemeName: 'Flexi Top', category: 'Equity Scheme - Flexi Cap', aum: 1000 },
      { schemeCode: '602', schemeName: 'Large Top', category: 'Equity Scheme - Large Cap', aum: 2000 },
      { schemeCode: '603', schemeName: 'Mid Top', category: 'Equity Scheme - Mid Cap', aum: 3000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    ranked.forEach(s => {
      assert.strictEqual(s.indiaMfSubcategoryRank, 1, `Subcategory for ${s.schemeName} must start at #1`);
    });
  });

  await it('TEST 7: AUM DESC determines subcategory ranking (NEVER returns, NAV, or Sharpe)', () => {
    const fixtures = [
      { schemeCode: '701', schemeName: 'High Return Low AUM', category: 'Equity Scheme - Flexi Cap', aum: 1000, returns: { '1Y': 50 }, sharpeRatio: 3.0 },
      { schemeCode: '702', schemeName: 'Low Return High AUM', category: 'Equity Scheme - Flexi Cap', aum: 50000, returns: { '1Y': 10 }, sharpeRatio: 1.0 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    const highAum = ranked.find(s => s.schemeCode === '702');
    const lowAum = ranked.find(s => s.schemeCode === '701');

    assert.strictEqual(highAum.indiaMfSubcategoryRank, 1, 'Higher AUM scheme must be subcategory rank #1');
    assert.strictEqual(lowAum.indiaMfSubcategoryRank, 2, 'Lower AUM scheme must be subcategory rank #2');
  });

  await it('TEST 8: Global rank and subcategory rank are different fields', () => {
    const fixtures = [
      { schemeCode: '801', schemeName: 'Top Global Large Cap', category: 'Equity Scheme - Large Cap', aum: 100000 },
      { schemeCode: '802', schemeName: 'Top Global Debt', category: 'Debt Scheme - Liquid', aum: 80000 },
      { schemeCode: '803', schemeName: 'Kotak Flexicap', category: 'Equity Scheme - Flexi Cap', aum: 50000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    const kotak = ranked.find(s => s.schemeCode === '803');

    assert.strictEqual(kotak.indiaMfRank, 3, 'Kotak global rank must be #3');
    assert.strictEqual(kotak.indiaMfSubcategoryRank, 1, 'Kotak Flexi Cap subcategory rank must be #1');
    assert.notStrictEqual(kotak.indiaMfRank, kotak.indiaMfSubcategoryRank);
  });

  await it('TEST 9: Category filtering does not change global rank', async () => {
    const directory = await allFundsDirectoryService.getAllSchemes(1, 20, { category: 'Flexi Cap' });
    const hdfcFlexi = directory.schemes.find(s => s.schemeCode === '118955');
    assert(hdfcFlexi !== undefined);
    assert.strictEqual(hdfcFlexi.indiaMfRank, 2, 'Global rank must remain #2');
  });

  await it('TEST 10: Search does not change subcategory rank', async () => {
    const search = await allFundsDirectoryService.getAllSchemes(1, 20, { searchTerm: 'HDFC' });
    const hdfcFlexi = search.schemes.find(s => s.schemeCode === '118955');
    assert(hdfcFlexi !== undefined);
    assert.strictEqual(hdfcFlexi.indiaMfSubcategoryRank, 2, 'Subcategory rank must remain #2 after search');
  });

  await it('TEST 11: Performance sorting does not change subcategory rank', async () => {
    const sort1Y = await allFundsDirectoryService.getAllSchemes(1, 20, { sortBy: '1Y' });
    const ppfas = sort1Y.schemes.find(s => s.schemeCode === '122639');
    if (ppfas) {
      assert.strictEqual(ppfas.indiaMfSubcategoryRank, 1);
    }
  });

  await it('TEST 12: Pagination does not change subcategory rank', async () => {
    const p1 = await allFundsDirectoryService.getAllSchemes(1, 10, { sortBy: 'AUM' });
    const p2 = await allFundsDirectoryService.getAllSchemes(2, 10, { sortBy: 'AUM' });
    assert.strictEqual(p1.schemes[0].indiaMfRank, 1);
    assert.strictEqual(p2.schemes[0].indiaMfRank, 11);
  });

  await it('TEST 13: Sector ranking works (starts at #1 strictly by AUM DESC)', () => {
    const fixtures = [
      { schemeCode: '1301', schemeName: 'ICICI Tech Fund', sectorId: 'technology', aum: 13540 },
      { schemeCode: '1302', schemeName: 'Tata Digital Fund', sectorId: 'technology', aum: 10214 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    assert.strictEqual(ranked[0].indiaMfSectorRank, 1);
    assert.strictEqual(ranked[1].indiaMfSectorRank, 2);
  });

  await it('TEST 14: Invalid AUM receives null local rank', () => {
    const fixtures = [
      { schemeCode: '1401', schemeName: 'Valid Fund', category: 'Equity Scheme - Mid Cap', aum: 10000 },
      { schemeCode: '1402', schemeName: 'Null AUM Fund', category: 'Equity Scheme - Mid Cap', aum: null }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    const nullFund = ranked.find(s => s.schemeCode === '1402');

    assert.strictEqual(nullFund.indiaMfRank, null);
    assert.strictEqual(nullFund.indiaMfCategoryRank, null);
    assert.strictEqual(nullFund.indiaMfSubcategoryRank, null);
    assert.strictEqual(nullFund.indiaMfSectorRank, null);
  });

  await it('TEST 15: Duplicate schemes are not double-ranked', () => {
    const fixtures = [
      { schemeCode: '1501', schemeName: 'HDFC Direct Growth', aum: 40000 },
      { schemeCode: '1501', schemeName: 'HDFC Direct Growth (Duplicate)', aum: 40000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    assert.strictEqual(ranked.length, 1);
  });

  await it('TEST 16: Direct/Regular identities remain correct', () => {
    const fixtures = [
      { schemeCode: '1601', schemeName: 'SBI Bluechip - Direct Plan - Growth', aum: 35000 },
      { schemeCode: '1602', schemeName: 'SBI Bluechip - Regular Plan - Growth', aum: 20000 }
    ];

    const ranked = indianMfRankingService.rankMutualFundsByAUM(fixtures);
    assert.strictEqual(ranked.length, 2);
    assert.strictEqual(ranked[0].plan, 'Direct');
    assert.strictEqual(ranked[1].plan, 'Regular');
  });

  console.log('\n--- SECTION 2: FRONTEND UI CONTEXTUAL RESOLVER & INVARIANTS ---');

  await it('TEST 17: Frontend uses contextual rank resolver (getDisplayedMfRank)', async () => {
    const { getDisplayedMfRank } = await import('../../frontend/src/utils/rankMutualFunds.js');
    const fund = {
      indiaMfRank: 22,
      indiaMfCategoryRank: 12,
      indiaMfSubcategoryRank: 3,
      indiaMfSectorRank: 1
    };

    assert.strictEqual(getDisplayedMfRank(fund, 'all'), 22);
    assert.strictEqual(getDisplayedMfRank(fund, 'category'), 22);
    assert.strictEqual(getDisplayedMfRank(fund, 'subcategory'), 22);
    assert.strictEqual(getDisplayedMfRank(fund, 'sector'), 22);
  });

  await it('TEST 18: Category view displays total funds global rank (indiaMfRank)', async () => {
    const { getDisplayedMfRank } = await import('../../frontend/src/utils/rankMutualFunds.js');
    const fund = {
      indiaMfRank: 22,
      indiaMfCategoryRank: 12,
      indiaMfSubcategoryRank: null
    };

    assert.strictEqual(getDisplayedMfRank(fund, 'subcategory'), 22, 'Returns total funds global rank #22');
  });

  await it('TEST 19: All Funds view displays indiaMfRank', async () => {
    const { getDisplayedMfRank } = await import('../../frontend/src/utils/rankMutualFunds.js');
    const fund = { indiaMfRank: 1, indiaMfSubcategoryRank: 5 };
    assert.strictEqual(getDisplayedMfRank(fund, 'all'), 1);
  });

  await it('TEST 20: Subcategory view displays total funds rank (indiaMfRank)', async () => {
    const { getDisplayedMfRank } = await import('../../frontend/src/utils/rankMutualFunds.js');
    const fund = { indiaMfRank: 22, indiaMfSubcategoryRank: 3 };
    assert.strictEqual(getDisplayedMfRank(fund, 'subcategory'), 22);
  });

  await it('TEST 21: Category view displays total funds rank (indiaMfRank)', async () => {
    const { getDisplayedMfRank } = await import('../../frontend/src/utils/rankMutualFunds.js');
    const fund = { indiaMfRank: 22, indiaMfCategoryRank: 12 };
    assert.strictEqual(getDisplayedMfRank(fund, 'category'), 22);
  });

  await it('TEST 22: Sector view displays total funds rank (indiaMfRank)', async () => {
    const { getDisplayedMfRank } = await import('../../frontend/src/utils/rankMutualFunds.js');
    const fund = { indiaMfRank: 110, indiaMfSectorRank: 1 };
    assert.strictEqual(getDisplayedMfRank(fund, 'sector'), 110);
  });

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
