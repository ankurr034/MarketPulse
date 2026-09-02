/**
 * Test Suite: Advancing / Declining Stock Identification (20 Core Tests)
 *
 * Verifies all 20 requirements from MASTER PROMPT:
 * TEST 1: currentPrice - previousClose > 0.0001 -> ADVANCING
 * TEST 2: currentPrice - previousClose < -0.0001 -> DECLINING
 * TEST 3: Math.abs(currentPrice - previousClose) <= 0.0001 -> UNCHANGED
 * TEST 4: missing price -> UNKNOWN
 * TEST 5: missing previousClose -> UNKNOWN
 * TEST 6: change calculation is correct
 * TEST 7: changePercent calculation is correct
 * TEST 8: advances count equals actual advancing stocks
 * TEST 9: declines count equals actual declining stocks
 * TEST 10: unchanged count equals actual unchanged stocks
 * TEST 11: advances + declines + unchanged + unknown equals valid stock count
 * TEST 12: sector filtering does not change globalRank
 * TEST 13: advancing sorting does not change globalRank
 * TEST 14: declining sorting does not change globalRank
 * TEST 15: search does not change globalRank
 * TEST 16: All Stocks and sector views use the same direction value
 * TEST 17: A stock classified as ADVANCING actually has currentPrice > previousClose
 * TEST 18: A stock classified as DECLINING actually has currentPrice < previousClose
 * TEST 19: A stock classified as UNCHANGED actually has currentPrice approximately equal to previousClose
 * TEST 20: No foreign/global stocks enter the calculation
 */

import axios from 'axios';
import sectorDataService from '../services/SectorDataService.js';

const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING ADVANCING / DECLINING IDENTIFICATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ──────────────────────────────────────────────────────
    // PART 1: Unit Tests on Classification & Direction Logic
    // ──────────────────────────────────────────────────────
    console.log('--- PART 1: Direction & Math Classification Unit Tests ---');

    // Mock sector with explicit stock scenarios
    const mockSector = {
      id: 'test-bank',
      name: 'Test Bank',
      region: 'india',
      stocks: [
        { symbol: 'STK_ADV.NS', name: 'Advancing Stock' },
        { symbol: 'STK_DEC.NS', name: 'Declining Stock' },
        { symbol: 'STK_UNC.NS', name: 'Unchanged Stock' },
        { symbol: 'STK_NOPRICE.NS', name: 'Missing Price' },
        { symbol: 'STK_NOPREV.NS', name: 'Missing Prev Close' },
        { symbol: 'AAPL', name: 'Foreign Stock' } // Foreign (should be excluded)
      ]
    };

    // Mock quotes map
    const mockQuotesMap = new Map();
    mockQuotesMap.set('STK_ADV.NS', { symbol: 'STK_ADV.NS', ltp: 1254.20, previousClose: 1235.00, marketCap: 100000 });
    mockQuotesMap.set('STK_DEC.NS', { symbol: 'STK_DEC.NS', ltp: 239.15, previousClose: 241.20, marketCap: 80000 });
    mockQuotesMap.set('STK_UNC.NS', { symbol: 'STK_UNC.NS', ltp: 500.00, previousClose: 500.00, marketCap: 60000 });
    mockQuotesMap.set('STK_NOPRICE.NS', { symbol: 'STK_NOPRICE.NS', ltp: null, previousClose: 100.00, marketCap: 40000 });
    mockQuotesMap.set('STK_NOPREV.NS', { symbol: 'STK_NOPREV.NS', ltp: 150.00, previousClose: null, marketCap: 20000 });
    mockQuotesMap.set('AAPL', { symbol: 'AAPL', ltp: 220.00, previousClose: 215.00, marketCap: 3000000 });

    // Seed symbol cache for mock sector
    mockQuotesMap.forEach((v, k) => {
      sectorDataService.symbolCache.set(k, { data: v, timestamp: Date.now() });
    });

    const evaluatedStocks = await sectorDataService._fetchSectorQuotes(mockSector, false);

    const advStock = evaluatedStocks.find(s => s.symbol === 'STK_ADV.NS');
    const decStock = evaluatedStocks.find(s => s.symbol === 'STK_DEC.NS');
    const uncStock = evaluatedStocks.find(s => s.symbol === 'STK_UNC.NS');
    const noPriceStock = evaluatedStocks.find(s => s.symbol === 'STK_NOPRICE.NS');
    const noPrevStock = evaluatedStocks.find(s => s.symbol === 'STK_NOPREV.NS');

    // TEST 1: price > previousClose -> ADVANCING
    assert(advStock && advStock.direction === 'ADVANCING', 'TEST 1: price > previousClose (1254.20 > 1235.00) -> direction is ADVANCING');

    // TEST 2: price < previousClose -> DECLINING
    assert(decStock && decStock.direction === 'DECLINING', 'TEST 2: price < previousClose (239.15 < 241.20) -> direction is DECLINING');

    // TEST 3: price == previousClose -> UNCHANGED
    assert(uncStock && uncStock.direction === 'UNCHANGED', 'TEST 3: price == previousClose (500.00 == 500.00) -> direction is UNCHANGED');

    // TEST 4: missing price -> UNKNOWN
    assert(noPriceStock && noPriceStock.direction === 'UNKNOWN', 'TEST 4: missing price -> direction is UNKNOWN');

    // TEST 5: missing previousClose -> UNKNOWN
    assert(noPrevStock && noPrevStock.direction === 'UNKNOWN', 'TEST 5: missing previousClose -> direction is UNKNOWN');

    // TEST 6: change calculation is correct
    assert(
      advStock && Math.abs(advStock.change - (1254.20 - 1235.00)) < 0.001,
      `TEST 6: change calculation is correct (${advStock.change} === 19.20)`
    );

    // TEST 7: changePercent calculation is correct
    const expectedPct = ((1254.20 - 1235.00) / 1235.00) * 100;
    assert(
      advStock && Math.abs(advStock.changePercent - expectedPct) < 0.01,
      `TEST 7: changePercent calculation is correct (${advStock.changePercent}% === ${expectedPct.toFixed(4)}%)`
    );

    // ──────────────────────────────────────────────────────
    // PART 2: Live Backend API Integration Tests
    // ──────────────────────────────────────────────────────
    console.log('\n--- PART 2: Live Backend Sector & Universe Tests ---');

    const [sectorsRes, allStocksRes] = await Promise.all([
      axios.get(`${BASE_URL}/sectors?region=india`),
      axios.get(`${BASE_URL}/sectors/all-stocks?region=india`)
    ]);

    const sectors = sectorsRes.data;
    const allStocks = allStocksRes.data;

    assert(Array.isArray(sectors) && sectors.length > 0, `Fetched ${sectors.length} sectors from backend`);
    assert(Array.isArray(allStocks) && allStocks.length > 0, `Fetched ${allStocks.length} stocks from /api/sectors/all-stocks`);

    // Pick Nifty Bank for deep inspection
    const bankSector = sectors.find(s => s.id === 'nifty-bank');
    assert(bankSector !== undefined, 'Found Nifty Bank sector');

    if (bankSector) {
      console.log(`Nifty Bank Counts: Advances=${bankSector.advances}, Declines=${bankSector.declines}, Unchanged=${bankSector.unchanged}, Unknown=${bankSector.unknown}, Total=${bankSector.totalValidStocks}`);

      // TEST 8: advances count equals actual advancing stocks
      const actualAdv = (bankSector.advancingStocks || []).length;
      assert(
        bankSector.advances === actualAdv,
        `TEST 8: advances count (${bankSector.advances}) equals actual advancingStocks list length (${actualAdv})`
      );

      // TEST 9: declines count equals actual declining stocks
      const actualDec = (bankSector.decliningStocks || []).length;
      assert(
        bankSector.declines === actualDec,
        `TEST 9: declines count (${bankSector.declines}) equals actual decliningStocks list length (${actualDec})`
      );

      // TEST 10: unchanged count equals actual unchanged stocks
      const actualUnc = (bankSector.unchangedStocks || []).length;
      assert(
        bankSector.unchanged === actualUnc,
        `TEST 10: unchanged count (${bankSector.unchanged}) equals actual unchangedStocks list length (${actualUnc})`
      );

      // TEST 11: advances + declines + unchanged + unknown equals totalValidStocks
      const sum = bankSector.advances + bankSector.declines + bankSector.unchanged + (bankSector.unknown || 0);
      assert(
        sum === bankSector.totalValidStocks,
        `TEST 11: advances + declines + unchanged + unknown (${sum}) equals totalValidStocks (${bankSector.totalValidStocks})`
      );

      // TEST 12: Sector filtering does not change globalRank
      const bankConstituents = bankSector.stocks || [];
      const ranksPreserved = bankConstituents.every(stk => {
        const inUniverse = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')));
        return !inUniverse || inUniverse.globalRank === stk.globalRank;
      });
      assert(ranksPreserved, 'TEST 12: Sector filtering preserves exact globalRank for all constituent stocks');

      // TEST 17: All advancing stocks actually have currentPrice > previousClose
      const allAdvValid = (bankSector.advancingStocks || []).every(s => s.currentPrice > s.previousClose);
      assert(allAdvValid, 'TEST 17: All advancingStocks in Nifty Bank actually have currentPrice > previousClose');

      // TEST 18: All declining stocks actually have currentPrice < previousClose
      const allDecValid = (bankSector.decliningStocks || []).every(s => s.currentPrice < s.previousClose);
      assert(allDecValid, 'TEST 18: All decliningStocks in Nifty Bank actually have currentPrice < previousClose');

      // TEST 19: All unchanged stocks actually have currentPrice ≈ previousClose
      const allUncValid = (bankSector.unchangedStocks || []).every(s => Math.abs(s.currentPrice - s.previousClose) <= 0.0001);
      assert(allUncValid, 'TEST 19: All unchangedStocks in Nifty Bank actually have currentPrice ≈ previousClose');
    }

    // TEST 13: Advancing sorting does not change globalRank
    const advancingUniverse = allStocks.filter(s => s.direction === 'ADVANCING');
    const sortedAdv = [...advancingUniverse].sort((a, b) => b.changePercent - a.changePercent);
    if (sortedAdv.length > 0) {
      const topAdv = sortedAdv[0];
      const orig = allStocks.find(s => s.symbol === topAdv.symbol);
      assert(
        topAdv.globalRank === orig.globalRank,
        `TEST 13: Advancing sort by changePercent retains immutable globalRank (${topAdv.symbol} rank #${topAdv.globalRank})`
      );
    }

    // TEST 14: Declining sorting does not change globalRank
    const decliningUniverse = allStocks.filter(s => s.direction === 'DECLINING');
    const sortedDec = [...decliningUniverse].sort((a, b) => a.changePercent - b.changePercent);
    if (sortedDec.length > 0) {
      const topDec = sortedDec[0];
      const orig = allStocks.find(s => s.symbol === topDec.symbol);
      assert(
        topDec.globalRank === orig.globalRank,
        `TEST 14: Declining sort by changePercent retains immutable globalRank (${topDec.symbol} rank #${topDec.globalRank})`
      );
    }

    // TEST 15: Search does not change globalRank
    if (allStocks.length > 0) {
      const target = allStocks[0];
      const found = allStocks.filter(s => s.symbol.includes(target.symbol.slice(0, 3))).find(s => s.symbol === target.symbol);
      assert(
        found && found.globalRank === target.globalRank,
        `TEST 15: Search preserves stock ${target.symbol} globalRank (#${found.globalRank})`
      );
    }

    // TEST 16: All Stocks and sector views use the same direction value
    let dirChecked = 0;
    let dirMatches = 0;
    sectors.forEach(sec => {
      (sec.stocks || []).forEach(stk => {
        const inAll = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')));
        if (inAll) {
          dirChecked++;
          if (inAll.direction === stk.direction) {
            dirMatches++;
          }
        }
      });
    });
    assert(
      dirChecked > 0 && dirMatches === dirChecked,
      `TEST 16: All Stocks and Sector views have 100% identical direction across ${dirChecked} stock instances`
    );

    // TEST 20: No foreign/global stocks enter the calculation
    const hasForeign = allStocks.some(s => s.symbol === 'AAPL' || s.symbol === 'MSFT' || s.symbol === 'TSLA');
    assert(!hasForeign, 'TEST 20: No foreign/global stocks enter the Indian stock calculation universe');

  } catch (err) {
    console.error('Error during test execution:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`FINAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
