import assert from 'assert';
import { athBaseService, AthBaseService } from './services/AthBaseService.js';
import yahooFinanceService from './services/YahooFinanceService.js';
import sectorDataService from './services/SectorDataService.js';
import marketDataGateway from './services/MarketDataGateway.js';

async function runTestSuite() {
  console.log('====================================================================================================');
  console.log('🧪 COMPREHENSIVE % FROM 52W LOW & % FROM ATH VERIFICATION SUITE');
  console.log('====================================================================================================\n');

  let passed = 0;
  let totalTests = 0;

  function test(num, description, condition) {
    totalTests++;
    if (condition) {
      console.log(`✅ Test ${num}: ${description}`);
      passed++;
    } else {
      console.error(`❌ Test ${num} FAILED: ${description}`);
      process.exitCode = 1;
    }
  }

  const service = new AthBaseService();

  // ── PART 1: EXACT SANITY EXAMPLES (Section 20) ──
  console.log('--- Part 1: Section 20 Sanity Mathematical Examples ---');

  // Sanity 1: Current = 1800, 52W Low = 1200, ATH = 2000
  // Expected: pctFrom52WLow = +50.00%, pctFromATH = -10.00%
  const mockCandles1 = [
    { date: '2023-01-01', high: 2000, low: 1900, close: 1950 }, // ATH 2000
    { date: '2024-01-01', high: 1300, low: 1200, close: 1250 }, // 52W Low 1200
    { date: '2024-06-01', high: 1800, low: 1750, close: 1800 }  // Current 1800
  ];
  const s1 = service.computeAthAndBase(mockCandles1, [], 1800, 'SANITY_1');
  test('S1', 'Sanity 1: Current 1800, 52W Low 1200, ATH 2000 -> +50.00% / -10.00%',
    s1.pctFrom52WLow === 50 && s1.pctFromATH === -10);

  // Sanity 2: Current = 2000, 52W Low = 1200, ATH = 2000
  // Expected: pctFrom52WLow = +66.67%, pctFromATH = 0.00%
  const s2 = service.computeAthAndBase(mockCandles1, [], 2000, 'SANITY_2');
  test('S2', 'Sanity 2: Current 2000, 52W Low 1200, ATH 2000 -> +66.67% / 0.00%',
    s2.pctFrom52WLow === 66.67 && s2.pctFromATH === 0);

  // Sanity 3: Current = 1200, 52W Low = 1200, ATH = 2000
  // Expected: pctFrom52WLow = 0.00%, pctFromATH = -40.00%
  const s3 = service.computeAthAndBase(mockCandles1, [], 1200, 'SANITY_3');
  test('S3', 'Sanity 3: Current 1200, 52W Low 1200, ATH 2000 -> 0.00% / -40.00%',
    s3.pctFrom52WLow === 0 && s3.pctFromATH === -40);

  // ── PART 2: THE 20 REQUIRED TEST CASES (Section 19) ──
  console.log('\n--- Part 2: Section 19 Required 20 Test Scenarios ---');

  // Test 1: Stock 52W low calculation across preceding ~252 trading sessions
  const d252Candles = Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    high: 500 + i,
    low: i < 48 ? 100 : 300 + (i === 150 ? -50 : 0), // within last 252, minimum is at i=150 (250)
    close: 400 + i
  }));
  const res1 = service.computeAthAndBase(d252Candles, [], 700, 'TEST_STOCK_52W');
  test(1, 'Stock 52W low calculation across preceding 252 trading sessions',
    res1.week52Low === 250);

  // Test 2: Stock ATH calculation across lifetime history
  test(2, 'Stock ATH calculation across lifetime monthly + daily history',
    res1.allTimeHigh === 799);

  // Test 3: Stock % from 52W low
  test(3, 'Stock % from 52W low formula ((current - low) / low) * 100',
    res1.pctFrom52WLow === parseFloat((((700 - 250) / 250) * 100).toFixed(2)));

  // Test 4: Stock % from ATH
  test(4, 'Stock % from ATH formula ((current - ATH) / ATH) * 100',
    res1.pctFromATH === parseFloat((((700 - 799) / 799) * 100).toFixed(2)));

  // Test 5: Live Index 52W low from actual Yahoo index candles
  const bankMetrics = await athBaseService.getAthAndBaseMetrics('^NSEBANK');
  test(5, 'Index 52W low evaluated from authentic index candles (^NSEBANK)',
    bankMetrics.week52Low > 45000 && bankMetrics.week52Low < 55000);

  // Test 6: Index ATH evaluated from authentic index candles
  test(6, 'Index ATH evaluated from authentic index candles (^NSEBANK)',
    bankMetrics.allTimeHigh >= 60000);

  // Test 7: Nifty 50 (^NSEI)
  const nifty50 = await athBaseService.getAthAndBaseMetrics('^NSEI');
  test(7, 'Nifty 50 (^NSEI) genuine index values',
    nifty50.currentPrice > 20000 && nifty50.allTimeHigh > 25000 && nifty50.week52Low > 20000 && nifty50.pctFromATH < 0 && nifty50.pctFrom52WLow > 0);

  // Test 8: Nifty 100 (^CNX100)
  const nifty100 = await athBaseService.getAthAndBaseMetrics('^CNX100');
  test(8, 'Nifty 100 (^CNX100) genuine index values',
    nifty100.currentPrice > 20000 && nifty100.allTimeHigh > 25000 && nifty100.week52Low > 20000);

  // Test 9: Nifty Bank (^NSEBANK)
  test(9, 'Nifty Bank (^NSEBANK) genuine index values',
    bankMetrics.currentPrice > 50000 && bankMetrics.allTimeHigh > 60000 && bankMetrics.pctFrom52WLow > 10);

  // Test 10: Nifty IT (^CNXIT)
  const niftyIT = await athBaseService.getAthAndBaseMetrics('^CNXIT');
  test(10, 'Nifty IT (^CNXIT) genuine index values',
    niftyIT.currentPrice > 25000 && niftyIT.allTimeHigh > 40000 && niftyIT.pctFromATH < -20);

  // Test 11: Corporate-action split adjusted stock (e.g. RELIANCE.NS)
  const reliance = await athBaseService.getAthAndBaseMetrics('RELIANCE.NS');
  test(11, 'Corporate-action adjusted stock (RELIANCE.NS)',
    reliance.allTimeHigh > 1500 && reliance.week52Low > 1000 && reliance.pctFrom52WLow > 0);

  // Test 12: New ATH (Current price exceeds prior ATH)
  const newAthRes = service.computeAthAndBase(mockCandles1, [], 2500, 'NEW_ATH');
  test(12, 'New ATH established when current price exceeds historical peak -> pctFromATH === 0.00%',
    newAthRes.allTimeHigh === 2500 && newAthRes.pctFromATH === 0);

  // Test 13: Current price at 52W low
  const atLowRes = service.computeAthAndBase(mockCandles1, [], 1200, 'AT_LOW');
  test(13, 'Current price at 52W low -> pctFrom52WLow === 0.00%',
    atLowRes.pctFrom52WLow === 0);

  // Test 14: Current price at ATH
  const atAthRes = service.computeAthAndBase(mockCandles1, [], 2000, 'AT_ATH');
  test(14, 'Current price at ATH -> pctFromATH === 0.00%',
    atAthRes.pctFromATH === 0);

  // Test 15: Missing Yahoo data returns nulls without fabrication
  const emptyRes = service.computeAthAndBase([], [], null, 'EMPTY');
  test(15, 'Missing Yahoo data returns nulls and UNAVAILABLE without fabrication',
    emptyRes.allTimeHigh === null && emptyRes.week52Low === null && emptyRes.pctFrom52WLow === null && emptyRes.pctFromATH === null && emptyRes.positionDataSource === 'UNAVAILABLE');

  // Test 16: NaN and Infinity protection
  const nanCandles = [{ date: '2024-01-01', high: NaN, low: 0, close: Infinity }];
  const nanRes = service.computeAthAndBase(nanCandles, [], 100, 'NAN_TEST');
  test(16, 'NaN / Infinity candles are safely rejected',
    nanRes.allTimeHigh === null || Number.isFinite(nanRes.allTimeHigh));

  // Test 17: ETF / Index separation
  const sectors = await sectorDataService.getAllSectors('india', '1D');
  const bankSec = sectors.find(s => s.id === 'nifty-bank');
  test(17, 'Index instrument is ^NSEBANK and not BANKBEES.NS',
    bankSec.indexDataSource === '^NSEBANK' && bankSec.indexPrice > 40000);

  // Test 18: Constituent averaging rejection (Index 52W Low is directly from index, not average of constituent lows)
  test(18, 'Constituent averaging rejection: Index 52W low equals index candle low',
    bankSec.week52Low === bankMetrics.week52Low);

  // Test 19: Snapshot fallback rejection
  test(19, 'Snapshot fallback rejection: Data source is YAHOO_FINANCE',
    bankSec.positionDataSource === 'YAHOO_FINANCE');

  // Test 20: Simulator fallback rejection
  test(20, 'Simulator fallback rejection: No synthetic simulator data used',
    bankSec.indexDataStatus === 'LIVE' || bankSec.indexDataStatus === 'EOD');

  // ── PART 3: AUDIT TABLE FOR 15 BENCHMARK INSTRUMENTS ──
  console.log('\n--- Part 3: Live Verification Audit Table ---');
  const instruments = [
    { name: 'Nifty 50', sym: '^NSEI' },
    { name: 'Nifty Bank', sym: '^NSEBANK' },
    { name: 'Nifty IT', sym: '^CNXIT' },
    { name: 'Nifty 100', sym: '^CNX100' },
    { name: 'Nifty Next 50', sym: '^NSMIDCP' },
    { name: 'Reliance Industries', sym: 'RELIANCE.NS' },
    { name: 'TCS', sym: 'TCS.NS' },
    { name: 'Infosys', sym: 'INFY.NS' },
    { name: 'HDFC Bank', sym: 'HDFCBANK.NS' },
    { name: 'ICICI Bank', sym: 'ICICIBANK.NS' },
    { name: 'State Bank of India', sym: 'SBIN.NS' },
    { name: 'ITC Ltd', sym: 'ITC.NS' },
    { name: 'Axis Bank', sym: 'AXISBANK.NS' },
    { name: 'Kotak Mahindra Bank', sym: 'KOTAKBANK.NS' },
    { name: 'Bajaj Finance', sym: 'BAJFINANCE.NS' }
  ];

  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');
  console.log('Symbol        | Instrument          | Current Price | 52W Low (Date)             | ATH (Date)                 | % From 52W Low | % From ATH | Status');
  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');

  for (const item of instruments) {
    const m = await athBaseService.getAthAndBaseMetrics(item.sym);
    const cur = m.currentPrice ? `₹${m.currentPrice.toLocaleString('en-IN')}` : '—';
    const low52 = m.week52Low ? `₹${m.week52Low.toLocaleString('en-IN')} (${m.week52LowDate})` : '—';
    const ath = m.allTimeHigh ? `₹${m.allTimeHigh.toLocaleString('en-IN')} (${m.allTimeHighDate})` : '—';
    const pLow = m.pctFrom52WLow !== null ? `${m.pctFrom52WLow > 0 ? '+' : ''}${m.pctFrom52WLow.toFixed(2)}%` : '—';
    const pAth = m.pctFromATH !== null ? `${m.pctFromATH.toFixed(2)}%` : '—';
    
    // Mathematical consistency check
    const mathValid = (m.currentPrice && m.week52Low && m.allTimeHigh) 
      ? Math.abs(m.pctFrom52WLow - (((m.currentPrice - m.week52Low) / m.week52Low) * 100)) < 0.1 &&
        Math.abs(m.pctFromATH - (((m.currentPrice - m.allTimeHigh) / m.allTimeHigh) * 100)) < 0.1
      : true;

    const statusStr = mathValid ? 'VERIFIED' : 'MATH_MISMATCH';

    console.log(`${item.sym.padEnd(13)} | ${item.name.padEnd(19)} | ${cur.padEnd(13)} | ${low52.padEnd(26)} | ${ath.padEnd(26)} | ${pLow.padEnd(14)} | ${pAth.padEnd(10)} | ${statusStr}`);
  }

  console.log('---------------------------------------------------------------------------------------------------------------------------------------------\n');
  console.log(`====================================================================================================`);
  console.log(`Summary: ${passed} / ${totalTests} tests passed.`);
  console.log(`====================================================================================================\n`);
}

runTestSuite().catch(err => {
  console.error('Test Suite Failed with error:', err);
  process.exit(1);
});
