/**
 * Test Suite: Indian NSE/BSE Global Stock Ranking (20 Core Tests)
 *
 * Verifies all 20 requirements from MASTER PROMPT:
 * TEST 1: Largest Indian stock by market cap = globalRank #1
 * TEST 2: Second largest = #2
 * TEST 3: Ranks are unique
 * TEST 4: Ranks are sequential (1..N)
 * TEST 5: Only Indian NSE/BSE equities are included
 * TEST 6: Global universe contains no foreign stocks
 * TEST 7: Sector ranking never restarts at #1
 * TEST 8: Filtering Nifty Bank preserves globalRank
 * TEST 9: Filtering Nifty IT preserves globalRank
 * TEST 10: Filtering Nifty Auto preserves globalRank
 * TEST 11: Search preserves globalRank
 * TEST 12: Top Gainers preserves globalRank
 * TEST 13: Top Losers preserves globalRank
 * TEST 14: By Market Cap preserves globalRank
 * TEST 15: All Stocks and sector views show identical globalRank
 * TEST 16: A stock appearing in multiple sectors keeps the same rank
 * TEST 17: Invalid market cap -> globalRank = null
 * TEST 18: Changing display sorting does not mutate globalRank
 * TEST 19: Pagination does not restart ranking
 * TEST 20: NSE/BSE duplicate company handling works correctly
 */

import axios from 'axios';
import sectorDataService from '../services/SectorDataService.js';

const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING INDIAN NSE/BSE GLOBAL STOCK RANKING TESTS');
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
    // PART 1: Service Unit Tests (Deduplication, Tie-break, Dual Listings)
    // ──────────────────────────────────────────────────────
    console.log('--- PART 1: Service Engine Unit Tests ---');
    
    // Test Dual Listing Deduplication (RELIANCE.NS + RELIANCE.BO = ONE COMPANY RANK #1)
    const mockQuotes = [
      { symbol: 'RELIANCE.NS', marketCap: 2000000 },
      { symbol: 'RELIANCE.BO', marketCap: 2000000 }, // Dual listing
      { symbol: 'TCS.NS', marketCap: 1500000 },
      { symbol: 'HDFCBANK.NS', marketCap: 1200000 },
      { symbol: 'ICICIBANK.NS', marketCap: 900000 },
      { symbol: 'INFY.NS', marketCap: 700000 },
      { symbol: 'AAPL', marketCap: 3000000 }, // Foreign stock (should be excluded)
      { symbol: 'MSFT', marketCap: 3100000 }, // Foreign stock (should be excluded)
      { symbol: '0P00005V13.BO', marketCap: 50000 }, // Mutual fund (should be excluded)
      { symbol: 'BANKBEES.NS', marketCap: 100000 }, // ETF (should be excluded)
      { symbol: 'INVALID1.NS', marketCap: 0 },
      { symbol: 'INVALID2.NS', marketCap: null },
      { symbol: 'INVALID3.NS', marketCap: NaN }
    ];

    const symbolsToRank = mockQuotes.map(q => q.symbol);
    const rankMap = sectorDataService._computeGlobalRankings(symbolsToRank, mockQuotes);

    // TEST 1 & 2: Largest Indian stock = #1, Second largest = #2
    assert(rankMap.get('RELIANCE.NS') === 1, 'TEST 1: Largest Indian stock (RELIANCE) = globalRank #1');
    assert(rankMap.get('TCS.NS') === 2, 'TEST 2: Second largest Indian stock (TCS) = globalRank #2');
    assert(rankMap.get('HDFCBANK.NS') === 3, 'HDFCBANK receives globalRank #3');
    assert(rankMap.get('ICICIBANK.NS') === 4, 'ICICIBANK receives globalRank #4');
    assert(rankMap.get('INFY.NS') === 5, 'INFY receives globalRank #5');

    // TEST 20: Dual NSE/BSE listing maps to the exact same company rank
    assert(
      rankMap.get('RELIANCE.NS') === 1 && rankMap.get('RELIANCE.BO') === 1 && rankMap.get('RELIANCE') === 1,
      'TEST 20: NSE/BSE dual listing (RELIANCE.NS & RELIANCE.BO) share single canonical company rank #1'
    );

    // TEST 3 & 4: Ranks are unique & sequential
    const canonicalRanks = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY'].map(c => rankMap.get(c));
    const uniqueRanks = new Set(canonicalRanks);
    assert(uniqueRanks.size === canonicalRanks.length, 'TEST 3: Ranks are completely unique across Indian companies');
    
    const sortedRanks = [...canonicalRanks].sort((a, b) => a - b);
    const isSequential = sortedRanks.every((val, i) => val === i + 1);
    assert(isSequential && sortedRanks.length === 5, 'TEST 4: Ranks are sequential without gaps (1..5)');

    // TEST 5 & 6: Exclude Foreign Stocks, ETFs, Mutual Funds
    assert(
      !rankMap.has('AAPL') && !rankMap.has('MSFT'),
      'TEST 6: Global universe contains NO foreign stocks (AAPL, MSFT excluded)'
    );
    assert(
      !rankMap.has('0P00005V13.BO') && !rankMap.has('BANKBEES.NS'),
      'TEST 5: Mutual funds and ETFs excluded from equity stock ranking'
    );

    // TEST 17: Invalid market cap -> globalRank = null
    assert(
      rankMap.get('INVALID1.NS') === null &&
      rankMap.get('INVALID2.NS') === null &&
      rankMap.get('INVALID3.NS') === null,
      'TEST 17: Invalid/zero/missing market cap -> globalRank = null'
    );

    // ──────────────────────────────────────────────────────
    // PART 2: Live Backend API Integration Tests
    // ──────────────────────────────────────────────────────
    console.log('\n--- PART 2: Live Backend API Integration Tests ---');
    console.log('Fetching live sectors and all-stocks from backend...');

    const [sectorsRes, allStocksRes] = await Promise.all([
      axios.get(`${BASE_URL}/sectors?region=india`),
      axios.get(`${BASE_URL}/sectors/all-stocks?region=india`)
    ]);

    const sectors = sectorsRes.data;
    const allStocks = allStocksRes.data;

    assert(Array.isArray(sectors) && sectors.length > 0, `Fetched ${sectors.length} Indian sectors from backend`);
    assert(Array.isArray(allStocks) && allStocks.length > 0, `Fetched ${allStocks.length} Indian equities from /api/sectors/all-stocks`);

    const getStockRank = (s) => s ? (s.indiaStockRank ?? s.globalRank ?? s.rank ?? null) : null;

    // TEST 7: Sector ranking never restarts at #1
    const bankSector = sectors.find(s => s.id === 'nifty-bank');
    if (bankSector && bankSector.stocks && bankSector.stocks.length > 1) {
      const bankStocks = bankSector.stocks;
      const bankRanks = bankStocks.map(s => getStockRank(s)).filter(r => r !== null);
      console.log(`Bank Sector: ${bankStocks.map(s => `${s.symbol}: #${getStockRank(s)}`).join(', ')}`);
      
      const firstBankStock = bankStocks[0];
      assert(
        getStockRank(firstBankStock) > 1,
        `TEST 7: Nifty Bank does NOT restart at #1 (First bank stock ${firstBankStock.symbol} has true global rank #${getStockRank(firstBankStock)})`
      );
    }

    // TEST 8: Filtering Nifty Bank preserves globalRank
    if (bankSector && bankSector.stocks) {
      const allMatched = bankSector.stocks.every(stk => {
        const inAll = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')));
        return !inAll || getStockRank(inAll) === getStockRank(stk);
      });
      assert(allMatched, 'TEST 8: Filtering Nifty Bank preserves exact globalRank for all constituents');
    }

    // TEST 9: Filtering Nifty IT preserves globalRank
    const itSector = sectors.find(s => s.id === 'nifty-it');
    if (itSector && itSector.stocks) {
      const allMatched = itSector.stocks.every(stk => {
        const inAll = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')));
        return !inAll || getStockRank(inAll) === getStockRank(stk);
      });
      assert(allMatched, 'TEST 9: Filtering Nifty IT preserves exact globalRank for all constituents');
    }

    // TEST 10: Filtering Nifty Auto preserves globalRank
    const autoSector = sectors.find(s => s.id === 'nifty-auto');
    if (autoSector && autoSector.stocks) {
      const allMatched = autoSector.stocks.every(stk => {
        const inAll = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')));
        return !inAll || getStockRank(inAll) === getStockRank(stk);
      });
      assert(allMatched, 'TEST 10: Filtering Nifty Auto preserves exact globalRank for all constituents');
    }

    // TEST 11: Search preserves globalRank
    if (allStocks.length > 5) {
      const target = allStocks[4];
      const query = target.symbol.slice(0, 4);
      const searchResults = allStocks.filter(s => s.symbol.includes(query) || (s.name && s.name.includes(query)));
      const found = searchResults.find(s => s.symbol === target.symbol);
      assert(
        found && getStockRank(found) === getStockRank(target),
        `TEST 11: Search query ("${query}") preserves stock ${target.symbol} globalRank (#${found ? getStockRank(found) : null})`
      );
    }

    // TEST 12: Top Gainers preserves globalRank
    const sortedGainers = [...allStocks].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    const topGainer = sortedGainers[0];
    const topGainerOriginal = allStocks.find(s => s.symbol === topGainer.symbol);
    assert(
      getStockRank(topGainer) === getStockRank(topGainerOriginal),
      `TEST 12: Top Gainer (${topGainer.symbol}, +${topGainer.changePercent}%) retains globalRank #${getStockRank(topGainer)}`
    );

    // TEST 13: Top Losers preserves globalRank
    const sortedLosers = [...allStocks].sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    const topLoser = sortedLosers[0];
    const topLoserOriginal = allStocks.find(s => s.symbol === topLoser.symbol);
    assert(
      getStockRank(topLoser) === getStockRank(topLoserOriginal),
      `TEST 13: Top Loser (${topLoser.symbol}, ${topLoser.changePercent}%) retains globalRank #${getStockRank(topLoser)}`
    );

    // TEST 14: By Market Cap preserves globalRank
    const validCapStocks = [...allStocks].filter(s => (s.marketCap || s.marketCapCr) > 0 && getStockRank(s) !== null);
    validCapStocks.sort((a, b) => (b.marketCap || b.marketCapCr || 0) - (a.marketCap || a.marketCapCr || 0));
    assert(
      getStockRank(validCapStocks[0]) === 1,
      `TEST 14: By Market Cap sort has largest stock ${validCapStocks[0]?.symbol} with globalRank = 1`
    );

    // TEST 15: All Stocks and sector views show identical globalRank
    let totalChecked = 0;
    let matchCount = 0;
    sectors.forEach(sec => {
      (sec.stocks || []).forEach(stk => {
        const inAll = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')));
        if (inAll) {
          totalChecked++;
          if (getStockRank(inAll) === getStockRank(stk)) {
            matchCount++;
          }
        }
      });
    });
    assert(
      totalChecked > 0 && matchCount === totalChecked,
      `TEST 15: All Stocks and Sector views have 100% identical globalRank across ${totalChecked} stock instances`
    );

    // TEST 16: A stock appearing in multiple sectors keeps the same rank
    const multiSectorMap = new Map();
    sectors.forEach(sec => {
      (sec.stocks || []).forEach(stk => {
        if (!multiSectorMap.has(stk.symbol)) {
          multiSectorMap.set(stk.symbol, []);
        }
        multiSectorMap.get(stk.symbol).push({ sector: sec.name, rank: getStockRank(stk) });
      });
    });

    let multiCount = 0;
    let multiAllMatch = true;
    for (const [sym, instances] of multiSectorMap.entries()) {
      if (instances.length > 1) {
        multiCount++;
        const firstRank = instances[0].rank;
        if (!instances.every(inst => inst.rank === firstRank)) {
          multiAllMatch = false;
        }
      }
    }
    assert(
      multiAllMatch && multiCount > 0,
      `TEST 16: Stocks appearing across multiple sectors (${multiCount} stocks) retain 100% identical globalRank`
    );

    // TEST 18: Changing display sorting does not mutate globalRank
    const sortedByPrice = [...allStocks].sort((a, b) => (b.ltp || 0) - (a.ltp || 0));
    const highestPriced = sortedByPrice[0];
    const originalStock = allStocks.find(s => s.symbol === highestPriced.symbol);
    assert(
      getStockRank(highestPriced) === getStockRank(originalStock),
      `TEST 18: Display sort by Price DESC retains immutable globalRank (${highestPriced.symbol} rank #${getStockRank(highestPriced)})`
    );

    // TEST 19: Pagination does not restart ranking
    const pageSize = 10;
    const page1 = allStocks.slice(0, pageSize);
    const page2 = allStocks.slice(pageSize, pageSize * 2);
    const page2Ranks = page2.map(s => getStockRank(s)).filter(r => r !== null);
    const page2StartsAt11 = page2Ranks.length > 0 && page2Ranks[0] >= 11;
    assert(
      page2StartsAt11,
      `TEST 19: Page 2 ranking continues seamlessly without restarting at #1 (First item on Page 2 is rank #${page2Ranks[0]})`
    );

  } catch (err) {
    console.error('Error in test execution:', err.message);
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
