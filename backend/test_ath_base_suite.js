import assert from 'assert';
import { athBaseService, AthBaseService } from './services/AthBaseService.js';
import yahooFinanceService from './services/YahooFinanceService.js';
import sectorDataService from './services/SectorDataService.js';
import marketDataGateway from './services/MarketDataGateway.js';

async function runTests() {
  console.log('🧪 Starting 25-Point Comprehensive ATH & Base Detection Test Suite...\n');
  let passed = 0;

  function test(num, description, condition) {
    if (condition) {
      console.log(`✅ Test ${num}: ${description}`);
      passed++;
    } else {
      console.error(`❌ Test ${num} FAILED: ${description}`);
      process.exitCode = 1;
    }
  }

  const service = new AthBaseService();

  // Test 1: Stock at ATH
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
  test(5, 'Stock with 20% decline + 90d consolidation detects base', res5.baseStatus === 'DECLINE_CONSOLIDATION_BASE' && res5.baseLow === 76);

  // Test 6: Stock with 50% decline + consolidation
  const decline50Candles = [
    { date: '2022-01-01', high: 1000, low: 900, close: 1000 },
    { date: '2022-06-01', high: 500, low: 450, close: 480 }, // 52% decline
    { date: '2022-08-01', high: 520, low: 460, close: 490 },
    { date: '2022-10-01', high: 530, low: 470, close: 485 },
    { date: '2022-12-01', high: 540, low: 480, close: 510 }, // 180 days base
    { date: '2024-01-01', high: 800, low: 750, close: 780 }
  ];
  const res6 = service.computeAthAndBase(decline50Candles, [], 780, 'TEST_DEC50');
  test(6, 'Stock with 50% decline + consolidation calculates recovery', res6.recoveryFromBasePercent !== null && res6.recoveryFromBasePercent > 60);

  // Test 7: Stock with 1-year base
  const base1yCandles = [
    { date: '2021-01-01', high: 500, low: 450, close: 500 },
    { date: '2021-06-01', high: 350, low: 300, close: 320 },
    { date: '2022-06-01', high: 360, low: 310, close: 330 }, // 1 year base
    { date: '2024-01-01', high: 600, low: 550, close: 580 }
  ];
  const res7 = service.computeAthAndBase(base1yCandles, [], 580, 'TEST_1Y');
  test(7, 'Stock with 1-year base detects base duration >= 1y', res7.baseDurationYears >= 1.0);

  // Test 8: Stock with 2-year base
  const base2yCandles = [
    { date: '2020-01-01', high: 1000, low: 900, close: 1000 },
    { date: '2020-06-01', high: 600, low: 550, close: 580 },
    { date: '2022-06-01', high: 680, low: 560, close: 620 }, // 2 year base
    { date: '2024-01-01', high: 1200, low: 1100, close: 1150 }
  ];
  const res8 = service.computeAthAndBase(base2yCandles, [], 1150, 'TEST_2Y');
  test(8, 'Stock with 2-year base detects base duration >= 2y', res8.baseDurationYears >= 2.0);

  // Test 9: Stock with no meaningful base (straight monotonic rise)
  const noBaseCandles = [
    { date: '2023-01-01', high: 100, low: 90, close: 95 },
    { date: '2023-06-01', high: 130, low: 120, close: 125 },
    { date: '2024-01-01', high: 160, low: 150, close: 155 }
  ];
  const res9 = service.computeAthAndBase(noBaseCandles, [], 155, 'TEST_NO_BASE');
  test(9, 'Stock with no decline base reports NO_CONSOLIDATION_BASE and baseLow = null', res9.baseLow === null && res9.baseStatus === 'NO_CONSOLIDATION_BASE');

  // Test 10: Stock with insufficient history
  const res10 = service.computeAthAndBase([], [], 100, 'TEST_EMPTY');
  test(10, 'Stock with insufficient history returns null fields', res10.allTimeHigh === null && res10.baseLow === null && res10.baseStatus === 'UNAVAILABLE');

  // Test 11: Corporate action candle filtering (zero or negative candle ignored)
  const splitCandles = [
    { date: '2023-01-01', high: 1000, low: 900, close: 1000 },
    { date: '2023-02-01', high: -50, low: -100, close: 0 }, // invalid candle
    { date: '2023-06-01', high: 1200, low: 1100, close: 1150 }
  ];
  const res11 = service.computeAthAndBase(splitCandles, [], 1150, 'TEST_SPLIT');
  test(11, 'Invalid/negative candles are safely excluded', res11.allTimeHigh === 1200);

  // Test 12: Sector Index at ATH
  const sectorAthCandles = [
    { date: '2020-01-01', high: 20000, low: 19000, close: 19500 },
    { date: '2024-01-01', high: 50000, low: 48000, close: 49500 },
    { date: '2026-08-31', high: 50000, low: 49000, close: 50000 }
  ];
  const res12 = service.computeAthAndBase(sectorAthCandles, [], 50000, '^NSEBANK');
  test(12, 'Sector index at ATH computes 0.00% distance', res12.distanceFromATHPercent === 0);

  // Test 13: Sector index after long decline
  const sectorDeclineCandles = [
    { date: '2021-10-01', high: 40000, low: 38000, close: 40000 },
    { date: '2022-06-01', high: 28000, low: 26000, close: 27000 }, // 32.5% decline
    { date: '2023-01-01', high: 30000, low: 27000, close: 28500 }, // 7 months base
    { date: '2024-08-31', high: 38000, low: 36000, close: 37500 }
  ];
  const res13 = service.computeAthAndBase(sectorDeclineCandles, [], 37500, '^CNXIT');
  test(13, 'Sector index after decline detects authentic base', res13.baseLow === 27000 && res13.recoveryFromBasePercent > 35);

  // Test 14: Nifty Bank live API metrics
  const bankMetrics = await athBaseService.getAthAndBaseMetrics('^NSEBANK');
  test(14, 'Nifty Bank returns authentic ATH and Base', bankMetrics.allTimeHigh > 50000 && bankMetrics.distanceFromATHPercent < 0 && bankMetrics.baseLow > 20000);

  // Test 15: Nifty IT live API metrics
  const itMetrics = await athBaseService.getAthAndBaseMetrics('^CNXIT');
  test(15, 'Nifty IT returns authentic ATH and Base', itMetrics.allTimeHigh > 40000 && itMetrics.baseLow > 20000);

  // Test 16: Nifty 50 live API metrics
  const n50Metrics = await athBaseService.getAthAndBaseMetrics('^NSEI');
  test(16, 'Nifty 50 returns authentic ATH and Base', n50Metrics.allTimeHigh > 24000 && n50Metrics.baseLow > 8000);

  // Test 17: Nifty 100 live API metrics
  const n100Metrics = await athBaseService.getAthAndBaseMetrics('^CNX100');
  test(17, 'Nifty 100 returns authentic ATH and Base', n100Metrics.allTimeHigh > 24000 && n100Metrics.baseLow > 8000);

  // Test 18: Nifty Next 50 live API metrics
  const nNext50Metrics = await athBaseService.getAthAndBaseMetrics('^NSMIDCP');
  test(18, 'Nifty Next 50 uses official ticker (^NSMIDCP)', nNext50Metrics.allTimeHigh > 60000 && nNext50Metrics.baseLow > 40000);

  // Test 19: Yahoo unavailable returns honest null
  const unavail = await athBaseService.getAthAndBaseMetrics('NON_EXISTENT_TICKER_XYZ123_456');
  test(19, 'Unavailable symbol returns null metrics without fabrication', unavail.allTimeHigh === null && unavail.baseLow === null);

  // Test 20: Invalid historical candle ignored
  const corruptedCandles = [
    { date: '2023-01-01', high: NaN, low: 10, close: 12 },
    { date: '2023-02-01', high: 100, low: 90, close: 95 }
  ];
  const res20 = service.computeAthAndBase(corruptedCandles, [], 95, 'TEST_CORRUPT');
  test(20, 'NaN candles are discarded gracefully', res20.allTimeHigh === 100);

  // Test 21: No snapshot fallback
  test(21, 'Data source provenance reports YAHOO_FINANCE', bankMetrics.dataSource === 'YAHOO_FINANCE');

  // Test 22: No simulator fallback
  test(22, 'No simulated or snapshot keys in metric payload', !('simulator' in bankMetrics) && !('snapshot' in bankMetrics));

  // Test 23: No ETF substitution for Indian indexes
  const sectors = await sectorDataService.getAllSectors('india', '1D');
  const bankSector = sectors.find(s => s.id === 'nifty-bank');
  test(23, 'Indian sector primary ticker is ^NSEBANK (not BANKBEES.NS)', bankSector.primaryTicker === '^NSEBANK' && bankSector.indexDataSource === '^NSEBANK');

  // Test 24: No constituent-average ATH for index
  test(24, 'Sector ATH matches index ATH (> 60,000 for Nifty Bank)', bankSector.allTimeHigh > 60000);

  // Test 25: No fabricated percentage
  test(25, 'Recovery % and Distance % are finite valid numbers', Number.isFinite(bankSector.recoveryFromBasePercent) && Number.isFinite(bankSector.distanceFromATHPercent));

  console.log('\n=========================================');
  console.log(`Summary: ${passed} / 25 tests passed.`);
  console.log('=========================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
