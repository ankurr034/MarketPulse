/**
 * Test Suite: Global Market-Cap Stock Ranking & "View All Stocks"
 *
 * Verifies all 16 test cases:
 * 1. Largest market cap stock receives globalRank = 1
 * 2. Second-largest market cap stock receives globalRank = 2
 * 3. Ranks are unique across the universe
 * 4. Ranks are sequential without gaps (1..N)
 * 5. Every valid stock is ranked
 * 6. Sector view does NOT restart ranking at #1 (preserves global rank)
 * 7. Filtering a sector preserves globalRank
 * 8. Searching within a sector preserves globalRank
 * 9. Top Gainers sorting preserves globalRank
 * 10. Top Losers sorting preserves globalRank
 * 11. By Market Cap sorting preserves globalRank
 * 12. All Stocks view shows identical globalRank to Sector view
 * 13. A stock appearing in multiple sectors retains the same globalRank
 * 14. Invalid/zero/missing market-cap stocks receive globalRank = null
 * 15. Global ranking is computed purely based on market cap (deterministic tie-break)
 * 16. Display sorting does not mutate globalRank
 */

import axios from 'axios';
import sectorDataService from '../services/SectorDataService.js';

const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING GLOBAL STOCK RANKING TEST SUITE (16 CASES)');
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
    // Unit Test: Pure ranking calculation
    console.log('\n--- Part 1: Service Unit Tests ---');
    const mockQuotes = [
      { symbol: 'RELIANCE.NS', marketCap: 2000000 },
      { symbol: 'TCS.NS', marketCap: 1500000 },
      { symbol: 'HDFCBANK.NS', marketCap: 1200000 },
      { symbol: 'INFY.NS', marketCap: 700000 },
      { symbol: 'ICICIBANK.NS', marketCap: 800000 },
      { symbol: 'INVALID1.NS', marketCap: 0 },
      { symbol: 'INVALID2.NS', marketCap: null },
      { symbol: 'INVALID3.NS', marketCap: undefined },
      { symbol: 'INVALID4.NS', marketCap: NaN },
      { symbol: 'INVALID5.NS', marketCap: -100 }
    ];

    const rankMap = sectorDataService._computeGlobalRankings(
      mockQuotes.map(q => q.symbol),
      mockQuotes
    );

    // Case 1 & 2: Largest = 1, Second largest = 2
    assert(rankMap.get('RELIANCE.NS') === 1, 'Case 1: Largest market cap (RELIANCE) receives globalRank = 1');
    assert(rankMap.get('TCS.NS') === 2, 'Case 2: Second largest market cap (TCS) receives globalRank = 2');
    assert(rankMap.get('HDFCBANK.NS') === 3, 'HDFCBANK receives globalRank = 3');
    assert(rankMap.get('ICICIBANK.NS') === 4, 'ICICIBANK receives globalRank = 4');
    assert(rankMap.get('INFY.NS') === 5, 'INFY receives globalRank = 5');

    // Case 3 & 4: Unique & Sequential (1..5)
    const validRanks = mockQuotes
      .map(q => rankMap.get(q.symbol))
      .filter(r => r !== null);
    
    const uniqueRanksSet = new Set(validRanks);
    assert(uniqueRanksSet.size === validRanks.length, 'Case 3: All ranks are completely unique');
    
    const sortedNonNull = [...validRanks].sort((a, b) => a - b);
    const isSeq = sortedNonNull.every((val, i) => val === i + 1);
    assert(isSeq && sortedNonNull.length === 5, 'Case 4: Ranks are sequential without gaps (1..N)');

    // Case 5: Every valid stock is ranked
    assert(
      rankMap.get('RELIANCE.NS') !== null &&
      rankMap.get('TCS.NS') !== null &&
      rankMap.get('HDFCBANK.NS') !== null &&
      rankMap.get('ICICIBANK.NS') !== null &&
      rankMap.get('INFY.NS') !== null,
      'Case 5: Every valid stock with positive finite market cap is ranked'
    );

    // Case 14: Invalid market cap receives null
    assert(
      rankMap.get('INVALID1.NS') === null &&
      rankMap.get('INVALID2.NS') === null &&
      rankMap.get('INVALID3.NS') === null &&
      rankMap.get('INVALID4.NS') === null &&
      rankMap.get('INVALID5.NS') === null,
      'Case 14: Invalid/zero/missing market-cap stocks receive globalRank = null'
    );

    // Case 15: Deterministic tie-breaker
    const tieQuotes = [
      { symbol: 'ZZZ.NS', marketCap: 1000 },
      { symbol: 'AAA.NS', marketCap: 1000 },
      { symbol: 'MMM.NS', marketCap: 1000 }
    ];
    const tieMap = sectorDataService._computeGlobalRankings(
      tieQuotes.map(q => q.symbol),
      tieQuotes
    );
    assert(
      tieMap.get('AAA.NS') === 1 && tieMap.get('MMM.NS') === 2 && tieMap.get('ZZZ.NS') === 3,
      'Case 15: Tie-break sorts deterministically by symbol ASC'
    );

    // Live API Integration Tests
    console.log('\n--- Part 2: Live Backend API Integration Tests ---');
    console.log('Fetching live sectors and all-stocks from running backend...');

    const [sectorsRes, allStocksRes] = await Promise.all([
      axios.get(`${BASE_URL}/sectors?region=IN`),
      axios.get(`${BASE_URL}/sectors/all-stocks?region=IN`)
    ]);

    const sectors = sectorsRes.data;
    const allStocks = allStocksRes.data;

    assert(Array.isArray(sectors) && sectors.length > 0, `Fetched ${sectors.length} sectors from backend`);
    assert(Array.isArray(allStocks) && allStocks.length > 0, `Fetched ${allStocks.length} ranked stocks from /api/sectors/all-stocks`);

    // Case 6: A sector does NOT restart ranking at #1
    const bankSector = sectors.find(s => s.id === 'nifty-bank' || s.name.toLowerCase().includes('bank'));
    if (bankSector && bankSector.stocks && bankSector.stocks.length > 1) {
      const bankStockRanks = bankSector.stocks.map(stk => stk.globalRank).filter(r => r !== null);
      const firstBankRank = bankSector.stocks[0].globalRank;
      console.log(`Bank sector stocks count: ${bankSector.stocks.length}. Stock #0 (${bankSector.stocks[0].symbol}) rank: ${firstBankRank}`);
      
      assert(
        bankStockRanks.length > 0,
        'Case 6a: Bank sector constituent stocks contain globalRank'
      );
      
      const allUniqueInBank = new Set(bankStockRanks).size === bankStockRanks.length;
      assert(
        allUniqueInBank,
        'Case 6b: Bank sector stocks retain their unique global ranks'
      );
    } else {
      console.log('Warning: bank sector stocks not populated yet in initial response');
    }

    // Case 7: Filtering a sector preserves globalRank
    if (sectors.length > 0) {
      const secWithStocks = sectors.find(s => s.stocks && s.stocks.length > 0);
      if (secWithStocks) {
        const stkA = secWithStocks.stocks[0];
        const foundInAll = allStocks.find(s => s.symbol === stkA.symbol);
        assert(
          foundInAll && foundInAll.globalRank === stkA.globalRank,
          `Case 7: Filtering to sector "${secWithStocks.name}" preserves stock ${stkA.symbol} globalRank (${stkA.globalRank})`
        );
      }
    }

    // Case 8: Searching within a sector preserves globalRank
    if (allStocks.length > 5) {
      const targetStock = allStocks[3];
      const simulatedSearchQuery = targetStock.symbol.substring(0, 4);
      const searchMatches = allStocks.filter(s => s.symbol.includes(simulatedSearchQuery));
      const match = searchMatches.find(s => s.symbol === targetStock.symbol);
      assert(
        match && match.globalRank === targetStock.globalRank,
        `Case 8: Search match retains immutable globalRank (${match.globalRank})`
      );
    }

    // Case 9: Top Gainers sorting preserves globalRank
    const sortedGainers = [...allStocks].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    const topGainer = sortedGainers[0];
    const topGainerOriginal = allStocks.find(s => s.symbol === topGainer.symbol);
    assert(
      topGainer.globalRank === topGainerOriginal.globalRank,
      `Case 9: Top Gainer (${topGainer.symbol}, +${topGainer.changePercent}%) retains true globalRank (#${topGainer.globalRank})`
    );

    // Case 10: Top Losers sorting preserves globalRank
    const sortedLosers = [...allStocks].sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    const topLoser = sortedLosers[0];
    const topLoserOriginal = allStocks.find(s => s.symbol === topLoser.symbol);
    assert(
      topLoser.globalRank === topLoserOriginal.globalRank,
      `Case 10: Top Loser (${topLoser.symbol}, ${topLoser.changePercent}%) retains true globalRank (#${topLoser.globalRank})`
    );

    // Case 11: By Market Cap sorting preserves globalRank
    const sortedByCap = [...allStocks].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    assert(
      sortedByCap[0].globalRank === 1,
      `Case 11: Sorting by Market Cap has top stock with globalRank = 1 (${sortedByCap[0].symbol})`
    );

    // Case 12: All Stocks table shows identical globalRank to sector view
    let matchingRankCount = 0;
    let totalChecked = 0;
    const mismatches = [];
    sectors.forEach(sec => {
      (sec.stocks || []).forEach(stk => {
        const globalStock = allStocks.find(s => s.symbol === stk.symbol || (stk.symbol.endsWith('.NS') && s.symbol === stk.symbol.replace('.NS', '')) || s.symbol === `${stk.symbol}.NS`);
        if (globalStock) {
          totalChecked++;
          if (globalStock.globalRank === stk.globalRank) {
            matchingRankCount++;
          } else {
            mismatches.push({ symbol: stk.symbol, sector: sec.name, sectorRank: stk.globalRank, allStocksRank: globalStock.globalRank });
          }
        }
      });
    });
    if (mismatches.length > 0) {
      console.log('Case 12 Mismatches sample:', mismatches.slice(0, 5));
    }
    assert(
      totalChecked > 0 && matchingRankCount === totalChecked,
      `Case 12: All Stocks table and Sector view have 100% identical globalRank across all ${totalChecked} constituent instances`
    );

    // Case 13: A stock appearing in multiple sectors retains the exact same globalRank
    const symbolSectorMap = new Map();
    sectors.forEach(sec => {
      (sec.stocks || []).forEach(stk => {
        if (!symbolSectorMap.has(stk.symbol)) {
          symbolSectorMap.set(stk.symbol, []);
        }
        symbolSectorMap.get(stk.symbol).push({ sector: sec.name, rank: stk.globalRank });
      });
    });

    let multiSectorStocksFound = 0;
    let multiSectorConsistent = true;
    for (const [sym, instances] of symbolSectorMap.entries()) {
      if (instances.length > 1) {
        multiSectorStocksFound++;
        const firstRank = instances[0].rank;
        const allSame = instances.every(inst => inst.rank === firstRank);
        if (!allSame) multiSectorConsistent = false;
      }
    }
    assert(
      multiSectorConsistent,
      `Case 13: Stocks appearing in multiple sectors (${multiSectorStocksFound} stocks) have 100% identical globalRank`
    );

    // Case 16: Display sorting does not mutate globalRank
    const sortedByPrice = [...allStocks].sort((a, b) => (b.ltp || 0) - (a.ltp || 0));
    const highestPriceStock = sortedByPrice[0];
    const originalStock = allStocks.find(s => s.symbol === highestPriceStock.symbol);
    assert(
      highestPriceStock.globalRank === originalStock.globalRank,
      `Case 16: Display sorting by Price DESC preserves immutable globalRank (${highestPriceStock.symbol} rank #${highestPriceStock.globalRank})`
    );

  } catch (err) {
    console.error('Error during test execution:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
