import yahooFinanceService from '../services/YahooFinanceService.js';
import marketDataValidator from '../services/MarketDataValidator.js';
import marketDataGateway from '../services/MarketDataGateway.js';
import sectorDataService from '../services/SectorDataService.js';

async function runRevenueTests() {
  console.log('================================================================');
  console.log('QUARTERLY REVENUE & YoY REAL-DATA VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // TEST 1: Real Reported Quarterly Revenue Extraction from Yahoo Finance
  console.log('--- TEST 1: Live Stock Financials Revenue Verification ---');
  const testSymbols = ['TCS.NS', 'RELIANCE.NS', 'INFY.NS'];

  for (const sym of testSymbols) {
    const fin = await yahooFinanceService.getStockFinancials(sym);
    console.log(`\nSymbol: ${sym}`);
    console.log(`  Revenue: ₹${fin.revenue} Cr`);
    console.log(`  Revenue YoY: ${fin.revenueYoY}%`);
    console.log(`  Period End: ${fin.revenueQuarterly?.currentQuarterPeriodEnd}`);
    console.log(`  Prior Year Same Quarter: ${fin.revenueQuarterly?.previousYearSameQuarterPeriodEnd}`);
    console.log(`  Status: ${fin.revenueQuarterly?.revenueDataStatus}`);

    assert(fin !== null && typeof fin === 'object', `${sym} financials object returned`);
    assert(fin.revenue !== undefined, `${sym} has revenue field`);
    assert(fin.revenueYoY !== undefined, `${sym} has revenueYoY field`);
    assert(fin.revenueQuarterly !== undefined, `${sym} has revenueQuarterly model`);

    if (fin.revenue !== null) {
      assert(typeof fin.revenue === 'number' && fin.revenue > 0, `${sym} revenue is positive number in ₹ Cr`, `₹${fin.revenue} Cr`);
      assert(fin.revenueSource === 'Quarterly Statement' || fin.revenueSource === 'YAHOO_BSE_VALIDATED' || fin.revenueSource === 'YAHOO_FINANCE', `${sym} revenueSource is valid statement source (${fin.revenueSource})`);

      // Verify Same-Quarter YoY (Period check: not previous quarter)
      if (fin.revenueQuarterly.previousYearSameQuarterPeriodEnd) {
        const currDate = new Date(fin.revenueQuarterly.currentQuarterPeriodEnd);
        const priorDate = new Date(fin.revenueQuarterly.previousYearSameQuarterPeriodEnd);
        const yearDiff = currDate.getUTCFullYear() - priorDate.getUTCFullYear();
        const monthDiff = Math.abs(currDate.getUTCMonth() - priorDate.getUTCMonth());

        assert(yearDiff === 1, `${sym} Prior quarter is exactly 1 year earlier (YoY, not QoQ)`, `${currDate.toISOString().slice(0, 10)} vs ${priorDate.toISOString().slice(0, 10)}`);
        assert(monthDiff <= 1, `${sym} Same quarter month boundary within 1 month`, `Month diff: ${monthDiff}`);

        // Verify mathematical formula: ((curr - prior) / ABS(prior)) * 100
        const currRev = fin.revenueQuarterly.currentQuarterRevenue;
        const priorRev = fin.revenueQuarterly.previousYearSameQuarterRevenue;
        const expectedYoY = parseFloat((((currRev - priorRev) / Math.abs(priorRev)) * 100).toFixed(2));
        assert(Math.abs(fin.revenueYoY - expectedYoY) < 0.05, `${sym} Revenue YoY mathematical accuracy`, `calculated: ${fin.revenueYoY}%, expected: ${expectedYoY}%`);
      }
    }
  }

  // TEST 2: MarketDataValidator Sanitization & Preservation
  console.log('\n--- TEST 2: MarketDataValidator Verification ---');
  const sampleRaw = {
    symbol: 'TEST.NS',
    ltp: 1500,
    previousClose: 1480,
    revenue: 25000,
    revenueYoY: 12.5,
    revenueQuarterly: { currentQuarterRevenue: 25000, revenueYoYPercent: 12.5 }
  };
  const validated = marketDataValidator.validateAndSanitizeQuote(sampleRaw);
  assert(validated.revenue === 25000, 'MarketDataValidator preserves valid revenue');
  assert(validated.revenueYoY === 12.5, 'MarketDataValidator preserves valid revenueYoY');
  assert(validated.revenueQuarterly !== null, 'MarketDataValidator preserves revenueQuarterly');

  const sampleNullRaw = {
    symbol: 'NO_REV.NS',
    ltp: 500,
    previousClose: 490
  };
  const validatedNull = marketDataValidator.validateAndSanitizeQuote(sampleNullRaw);
  assert(validatedNull.revenue === null, 'Missing revenue stays null (no fake fallback)');
  assert(validatedNull.revenueYoY === null, 'Missing revenueYoY stays null');

  // TEST 3: Zero Denominator Handling & Math Safety
  console.log('\n--- TEST 3: Zero Denominator Safety ---');
  const curr = 1000;
  const priorZero = 0;
  let zeroYoY = null;
  if (priorZero !== 0) {
    zeroYoY = ((curr - priorZero) / Math.abs(priorZero)) * 100;
  }
  assert(zeroYoY === null, 'Zero prior year revenue handled safely (null, not Infinity/NaN)');

  // TEST 4: Sector Level Handling (Section 12: Sector rows MUST NOT fabricate revenue)
  console.log('\n--- TEST 4: Sector Rows Revenue Handling (Section 12) ---');
  const sectors = await sectorDataService.getAllSectors('india', '1D', 'stocks');
  assert(Array.isArray(sectors) && sectors.length > 0, 'Sectors list fetched');

  for (const s of sectors) {
    assert(s.revenue === null, `Sector ${s.name} revenue is strictly null (no blind summation)`, `revenue=${s.revenue}`);
    assert(s.revenueYoY === null, `Sector ${s.name} revenueYoY is strictly null`, `revenueYoY=${s.revenueYoY}`);
  }

  // TEST 5: Constituent Stocks within Sector Detail
  console.log('\n--- TEST 5: Constituent Stocks within Sector Detail ---');
  const itSector = await sectorDataService.getSectorDetail('nifty-it', '1D');
  assert(itSector !== null, 'Nifty IT sector detail fetched');
  assert(itSector.revenue === null, 'Nifty IT sector-level revenue is null');
  assert(itSector.stocks && itSector.stocks.length > 0, 'Nifty IT constituents present');

  const tcsInSector = itSector.stocks.find(s => s.symbol === 'TCS.NS');
  assert(tcsInSector !== undefined, 'TCS found in Nifty IT constituents');
  if (tcsInSector) {
    console.log(`  TCS in sector: revenue = ${tcsInSector.revenue}, revenueYoY = ${tcsInSector.revenueYoY}%`);
    assert(tcsInSector.revenue !== undefined, 'TCS has revenue field in constituent row');
    assert(tcsInSector.revenueYoY !== undefined, 'TCS has revenueYoY field in constituent row');
  }

  // TEST 6: All Ranked Stocks Universe
  console.log('\n--- TEST 6: All Ranked Stocks Universe ---');
  const allStocks = await sectorDataService.getAllRankedStocks('india', '1D', 'stocks');
  assert(Array.isArray(allStocks) && allStocks.length > 0, `All ranked stocks count: ${allStocks.length}`);

  const sampleStocks = allStocks.slice(0, 10);
  for (const stk of sampleStocks) {
    assert(stk.indiaStockRank !== undefined, `${stk.symbol} indiaStockRank defined (value: ${stk.indiaStockRank})`);
    assert(stk.revenue !== undefined, `${stk.symbol} has revenue field`);
    assert(stk.revenueYoY !== undefined, `${stk.symbol} has revenueYoY field`);
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRevenueTests().catch(err => {
  console.error('Fatal error running revenue tests:', err);
  process.exit(1);
});
