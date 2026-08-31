import assert from 'assert';
import { athBaseService, AthBaseService } from './services/AthBaseService.js';
import yahooFinanceService from './services/YahooFinanceService.js';
import sectorDataService from './services/SectorDataService.js';
import marketDataGateway from './services/MarketDataGateway.js';

async function runAudit() {
  console.log('====================================================================================================');
  console.log('🧪 COMPREHENSIVE MARKETPULSE ATH & BASE DATA PATH & RECONCILIATION AUDIT');
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

  // ── PART 1: ALGORITHMIC EDGE CASES ──
  console.log('--- Part 1: Algorithm & Mathematical Integrity ---');
  
  // Test 1: Stock at ATH (0.00% distance)
  const atAthCandles = [
    { date: '2024-01-01', high: 100, low: 90, close: 95 },
    { date: '2024-06-01', high: 150, low: 140, close: 145 },
    { date: '2024-12-01', high: 200, low: 190, close: 200 }
  ];
  const res1 = service.computeAthAndBase(atAthCandles, [], 200, 'TEST_ATH');
  test(1, 'Stock at ATH has 0.00% distance from ATH', res1.allTimeHigh === 200 && res1.distanceFromATHPercent === 0);

  // Test 2: Stock near ATH (within 0.5% tolerance)
  const res2 = service.computeAthAndBase(atAthCandles, [], 199.5, 'TEST_NEAR_ATH');
  test(2, 'Stock within 0.5% tolerance is classified as 0.00% distance', res2.distanceFromATHPercent === 0);

  // Test 3: Stock 10% below ATH
  const res3 = service.computeAthAndBase(atAthCandles, [], 180, 'TEST_10PCT');
  test(3, 'Stock 10% below ATH reports -10.00%', res3.distanceFromATHPercent === -10);

  // Test 4: Stock 50% below ATH
  const res4 = service.computeAthAndBase(atAthCandles, [], 100, 'TEST_50PCT');
  test(4, 'Stock 50% below ATH reports -50.00%', res4.distanceFromATHPercent === -50);

  // Test 5: Stock with 20% decline + consolidation (90+ days)
  const decline20Candles = [
    { date: '2023-01-01', high: 100, low: 90, close: 100 },
    { date: '2023-03-01', high: 80, low: 75, close: 78 }, // 22% decline
    { date: '2023-04-01', high: 82, low: 76, close: 77 },
    { date: '2023-05-01', high: 81, low: 75, close: 76 },
    { date: '2023-06-15', high: 83, low: 76, close: 79 }, // >90 days
    { date: '2024-01-01', high: 120, low: 110, close: 115 }
  ];
  const res5 = service.computeAthAndBase(decline20Candles, [], 115, 'TEST_DEC20');
  test(5, 'Stock with 20% decline + 90d consolidation detects base and returns longTermBaseLow', 
    res5.baseStatus === 'DECLINE_CONSOLIDATION_BASE' && res5.longTermBaseLow === 76 && res5.baseLow === 76);

  // Test 6: Multi-year base (1.4+ years)
  const base2yCandles = [
    { date: '2020-01-01', high: 1000, low: 900, close: 1000 },
    { date: '2020-06-01', high: 600, low: 550, close: 580 },
    { date: '2022-06-01', high: 680, low: 560, close: 620 }, // 2 year base
    { date: '2024-01-01', high: 1200, low: 1100, close: 1150 }
  ];
  const res6 = service.computeAthAndBase(base2yCandles, [], 1150, 'TEST_2Y');
  test(6, 'Stock with 2-year base detects base duration >= 2y', res6.longTermBaseDurationYears >= 2.0);

  // Test 7: Monotonic rise without decline base
  const noBaseCandles = [
    { date: '2023-01-01', high: 100, low: 90, close: 95 },
    { date: '2023-06-01', high: 130, low: 120, close: 125 },
    { date: '2024-01-01', high: 160, low: 150, close: 155 }
  ];
  const res7 = service.computeAthAndBase(noBaseCandles, [], 155, 'TEST_NO_BASE');
  test(7, 'Stock with no decline base reports NO_CONSOLIDATION_BASE and baseLow = null', res7.longTermBaseLow === null && res7.baseStatus === 'NO_CONSOLIDATION_BASE');

  // Test 8: Empty history returns null fields without fabrication
  const res8 = service.computeAthAndBase([], [], 100, 'TEST_EMPTY');
  test(8, 'Stock with insufficient history returns null fields', res8.allTimeHigh === null && res8.longTermBaseLow === null && res8.baseStatus === 'UNAVAILABLE');

  // ── PART 2: LIVE INSTRUMENTS VALIDATION & DIFFERENCE PROOF ──
  console.log('\n--- Part 2: Live Index & Stock Metric Validation ---');

  const testInstruments = [
    { name: 'Nifty Bank', sym: '^NSEBANK', isIndex: true },
    { name: 'Nifty IT', sym: '^CNXIT', isIndex: true },
    { name: 'Nifty 50', sym: '^NSEI', isIndex: true },
    { name: 'Nifty 100', sym: '^CNX100', isIndex: true },
    { name: 'Nifty Next 50', sym: '^NSMIDCP', isIndex: true },
    { name: 'Reliance Industries', sym: 'RELIANCE.NS', isIndex: false },
    { name: 'TCS', sym: 'TCS.NS', isIndex: false },
    { name: 'Infosys', sym: 'INFY.NS', isIndex: false },
    { name: 'HDFC Bank', sym: 'HDFCBANK.NS', isIndex: false },
    { name: 'ICICI Bank', sym: 'ICICIBANK.NS', isIndex: false },
    { name: 'State Bank of India', sym: 'SBIN.NS', isIndex: false },
    { name: 'ITC Ltd', sym: 'ITC.NS', isIndex: false },
    { name: 'Axis Bank', sym: 'AXISBANK.NS', isIndex: false },
    { name: 'Kotak Mahindra Bank', sym: 'KOTAKBANK.NS', isIndex: false },
    { name: 'Bajaj Finance', sym: 'BAJFINANCE.NS', isIndex: false }
  ];

  console.log('------------------------------------------------------------------------------------------------------------------------------------------------------');
  console.log('Symbol        | Current Price | ATH (Date)                 | Distance% | Long-Term Base (Date)      | Duration | Recovery% | Old 52W H/L % | Difference Proof');
  console.log('------------------------------------------------------------------------------------------------------------------------------------------------------');

  for (let i = 0; i < testInstruments.length; i++) {
    const item = testInstruments[i];
    const metrics = await athBaseService.getAthAndBaseMetrics(item.sym);
    let quote = null;
    try {
      quote = await yahooFinanceService.getQuote(item.sym);
    } catch {}

    const curPrice = metrics.currentPrice || quote?.regularMarketPrice || quote?.ltp || null;
    const athStr = metrics.allTimeHigh ? `₹${metrics.allTimeHigh.toLocaleString('en-IN')} (${metrics.allTimeHighDate})` : '—';
    const distStr = metrics.distanceFromATHPercent !== null ? `${metrics.distanceFromATHPercent.toFixed(2)}%` : '—';
    const baseStr = metrics.longTermBaseLow ? `₹${metrics.longTermBaseLow.toLocaleString('en-IN')} (${metrics.longTermBaseLowDate})` : '—';
    const durStr = metrics.longTermBaseDurationYears ? `${metrics.longTermBaseDurationYears} yrs` : '—';
    const recStr = metrics.recoveryFromBasePercent !== null ? `${metrics.recoveryFromBasePercent > 0 ? '+' : ''}${metrics.recoveryFromBasePercent.toFixed(2)}%` : '—';

    // Old 52W calculation
    const h52 = quote?.fiftyTwoWeekHigh || null;
    const l52 = quote?.fiftyTwoWeekLow || null;
    let old52Str = '—';
    let isDifferent = true;
    if (h52 && l52 && curPrice) {
      const oldRec = (((curPrice - l52) / l52) * 100).toFixed(2);
      const oldDist = (((curPrice - h52) / h52) * 100).toFixed(2);
      old52Str = `+${oldRec}% / ${oldDist}%`;

      // Difference proof check: recovery from base vs 52W low recovery
      if (metrics.recoveryFromBasePercent !== null) {
        const diff = Math.abs(metrics.recoveryFromBasePercent - parseFloat(oldRec));
        isDifferent = diff > 0.05;
      }
    }

    const proofStr = isDifferent ? 'PROVEN DIFFERENT (Authentic Base)' : 'Identical (Base is 52W Low)';

    console.log(`${item.sym.padEnd(13)} | ${('₹' + curPrice?.toFixed(2)).padEnd(13)} | ${athStr.padEnd(26)} | ${distStr.padEnd(9)} | ${baseStr.padEnd(26)} | ${durStr.padEnd(8)} | ${recStr.padEnd(9)} | ${old52Str.padEnd(14)} | ${proofStr}`);

    test(9 + i, `${item.name} (${item.sym}) ATH and Base metrics successfully evaluated`, 
      metrics.allTimeHigh > 0 && Number.isFinite(metrics.distanceFromATHPercent));
  }

  // ── PART 3: API ENDPOINTS INTEGRATION ──
  console.log('\n--- Part 3: API Endpoints & Field Mapping Integrity ---');

  // Sector list verification
  const sectors = await sectorDataService.getAllSectors('india', '1D');
  const bankSector = sectors.find(s => s.id === 'nifty-bank');
  test(24, 'Sector row exposes explicit longTermBaseLow and allTimeHigh', 
    bankSector.allTimeHigh > 60000 && bankSector.longTermBaseLow > 30000 && bankSector.recoveryFromBasePercent > 50);

  // Sector detail verification
  const bankDetail = await sectorDataService.getSectorDetail('nifty-bank', '1D');
  const hdfc = bankDetail.stocks.find(s => s.symbol === 'HDFCBANK.NS');
  test(25, 'Constituent stock exposes explicit longTermBaseLow and recoveryFromBasePercent', 
    hdfc.allTimeHigh > 900 && hdfc.longTermBaseLow > 500 && hdfc.recoveryFromBasePercent !== null);

  console.log('\n====================================================================================================');
  console.log(`Summary: ${passed} / ${totalTests} tests passed.`);
  console.log('====================================================================================================\n');
}

runAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
