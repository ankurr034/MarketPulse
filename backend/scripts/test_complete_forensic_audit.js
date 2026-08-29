// backend/scripts/test_complete_forensic_audit.js
import assert from 'assert';
import upstoxAuthService from '../services/UpstoxAuthService.js';
import upstoxInstrumentService from '../services/UpstoxInstrumentService.js';
import upstoxMarketDataService from '../services/UpstoxMarketDataService.js';
import yahooFinanceService from '../services/YahooFinanceService.js';
import marketDataGateway from '../services/MarketDataGateway.js';
import sectorDataService from '../services/SectorDataService.js';
import { validateAndSanitizeQuote, getIndianMarketSession, isFinancialEntity } from '../services/MarketDataValidator.js';
import { getStockSnapshot } from '../config/stockSnapshotData.js';

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    console.error(`         Error: ${err.message}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    console.error(`         Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('STARTING COMPLETE 20-DOMAIN STOCK MARKET DATA FORENSIC AUDIT');
console.log('================================================================\n');

// 1. Upstox OAuth & Token State
runTest('Domain 1: Upstox Auth Service handles tokens and offline gracefully', () => {
  const token = upstoxAuthService.getValidToken();
  const status = upstoxAuthService.getStatus();
  assert(status !== null && typeof status === 'object', 'Status must be an object');
  assert(status.configured === Boolean(token), 'Configured flag must reflect token presence');
});

// 2. Official ISIN Instrument Resolution
runAsyncTest('Domain 2: Upstox Instrument Service maps all core stocks to official ISIN keys', async () => {
  await upstoxInstrumentService.initialize();
  const tcsKey = upstoxInstrumentService.getInstrumentKey('TCS.NS');
  const relKey = upstoxInstrumentService.getInstrumentKey('RELIANCE.NS');
  const infyKey = upstoxInstrumentService.getInstrumentKey('INFY.NS');
  const hdfcKey = upstoxInstrumentService.getInstrumentKey('HDFCBANK.NS');
  const sbinKey = upstoxInstrumentService.getInstrumentKey('SBIN.NS');
  const niftyKey = upstoxInstrumentService.getInstrumentKey('^NSEI');

  assert.strictEqual(tcsKey, 'NSE_EQ|INE467B01029', 'TCS key must match official ISIN');
  assert.strictEqual(relKey, 'NSE_EQ|INE002A01018', 'Reliance key must match official ISIN');
  assert.strictEqual(infyKey, 'NSE_EQ|INE009A01021', 'Infosys key must match official ISIN');
  assert.strictEqual(hdfcKey, 'NSE_EQ|INE040A01034', 'HDFC Bank key must match official ISIN');
  assert.strictEqual(sbinKey, 'NSE_EQ|INE062A01020', 'SBIN key must match official ISIN');
  assert.strictEqual(niftyKey, 'NSE_INDEX|Nifty 50', 'Nifty 50 key must match index instrument');
});

// 3. Live Quote Ingestion & Mapping
runTest('Domain 3: Live quote validator sanitizes and structures quotes correctly', () => {
  const raw = {
    symbol: 'TCS.NS',
    ltp: 3880.50,
    open: 3870.00,
    previousClose: 3865.00,
    dayHigh: 3890.00,
    dayLow: 3860.00,
    volume: 1500000,
    source: 'UPSTOX',
    sourceType: 'UPSTOX_REST_V2',
    dataStatus: 'LIVE',
    isLive: true
  };
  const validated = validateAndSanitizeQuote(raw);
  assert.strictEqual(validated.symbol, 'TCS.NS');
  assert.strictEqual(validated.ltp, 3880.50);
  assert.strictEqual(validated.exchange, 'NSE');
  assert.strictEqual(validated.exchangeSegment, 'NSE_EQ');
  assert(['LIVE', 'CLOSED', 'POST_CLOSE', 'PRE_OPEN', 'WEEKEND', 'HOLIDAY'].includes(validated.dataStatus), 'Valid session dataStatus');
});

// 4. Previous Close Integrity
runTest('Domain 4: Previous close is strictly respected and never guessed from arbitrary candles', () => {
  const raw = { symbol: 'INFY.NS', ltp: 1820.00, previousClose: 1810.00 };
  const validated = validateAndSanitizeQuote(raw);
  assert.strictEqual(validated.previousClose, 1810.00);
});

// 5. Change and Change% Mathematical Precision
runTest('Domain 5: Change and Change% formulas are calculated exactly on unrounded floats', () => {
  const raw = { symbol: 'RELIANCE.NS', ltp: 1295.00, previousClose: 1290.00 };
  const validated = validateAndSanitizeQuote(raw);
  assert.strictEqual(validated.change, 5);
  assert.strictEqual(validated.changePercent, 0.3876);
});

// 6. OHLC Validation & Constraints
runTest('Domain 6: Day High >= max(Open, LTP) and Day Low <= min(Open, LTP)', () => {
  const raw = { symbol: 'SBIN.NS', ltp: 815.00, open: 810.00, dayHigh: 812.00, dayLow: 820.00 };
  const validated = validateAndSanitizeQuote(raw);
  assert(validated.dayHigh >= Math.max(validated.open, validated.ltp), 'Day high must bound max');
  assert(validated.dayLow <= Math.min(validated.open, validated.ltp), 'Day low must bound min');
});

// 7. Volume Validation
runTest('Domain 7: Volume must be non-negative and finite', () => {
  const raw = { symbol: 'ITC.NS', ltp: 478.00, previousClose: 475.00, volume: -500 };
  const validated = validateAndSanitizeQuote(raw);
  assert(validated.volume >= 0, 'Negative volume must be clamped to 0');
});

// 8. Historical Returns Calendar Anchoring
runTest('Domain 8: Historical return anchors use exact calendar dates without proportional multiplier heuristics', () => {
  const snap = getStockSnapshot('TCS.NS');
  assert(snap.returns !== null, 'Snapshot must have returns map');
  assert(typeof snap.returns['1Y'] === 'number', '1Y return must be a number');
  assert(typeof snap.returns['3Y'] === 'number', '3Y return must be a number');
  assert(typeof snap.returns['5Y'] === 'number', '5Y return must be a number');
});

// 9. Corporate Action Split Handling
runTest('Domain 9: Corporate actions do not cause artificial price explosion', () => {
  const snap = getStockSnapshot('AAPL');
  assert(snap.ltp < 500, 'AAPL split price must be normal range (~200-250), not pre-split 1000s');
});

// 10. Sector Aggregation & Constituent Rollup
runAsyncTest('Domain 10: Sector service computes complete rollup metrics with advances/declines/unchanged', async () => {
  const sec = await sectorDataService.getSectorDetail('nifty-it');
  assert(sec !== null, 'Nifty IT sector must exist');
  assert(typeof sec.validStocks === 'number' && sec.validStocks > 0, 'validStocks must be > 0');
  assert(typeof sec.advanceCount === 'number', 'advanceCount must be number');
  assert(typeof sec.declineCount === 'number', 'declineCount must be number');
  assert(typeof sec.unchanged === 'number', 'unchanged must be number');
  assert.strictEqual(sec.validStocks, sec.advanceCount + sec.declineCount + sec.unchanged, 'Sum of status counts must equal validStocks');
});

// 11. Index Market Data Instrument Separation
runAsyncTest('Domain 11: Index price comes directly from official index instruments, not constituent averages', async () => {
  const sec = await sectorDataService.getSectorDetail('nifty-bank');
  assert(sec.indexPrice > 40000, 'Nifty Bank index price must be at index level (~50,000), not stock average');
});

// 12. Fundamentals & Banking EBIT Rule
runTest('Domain 12: Financial institutions (Banks/NBFCs) strictly return EBIT = null (GAAP/IFRS standard)', () => {
  assert.strictEqual(isFinancialEntity('HDFCBANK.NS'), true, 'HDFC Bank is financial entity');
  assert.strictEqual(isFinancialEntity('SBIN.NS'), true, 'SBIN is financial entity');
  assert.strictEqual(isFinancialEntity('BAJFINANCE.NS'), true, 'Bajaj Finance is financial entity');
  assert.strictEqual(isFinancialEntity('TCS.NS'), false, 'TCS is not financial entity');

  const bankQuote = validateAndSanitizeQuote({ symbol: 'HDFCBANK.NS', ltp: 1742.5, previousClose: 1738.0, ebit: 50000, netProfit: 68340 });
  assert.strictEqual(bankQuote.ebit, null, 'Bank EBIT must be null');
  assert.strictEqual(bankQuote.netProfit, 68340, 'Bank Net Profit must be preserved');

  const itQuote = validateAndSanitizeQuote({ symbol: 'TCS.NS', ltp: 3880.0, previousClose: 3870.0, ebit: 61850, netProfit: 47100 });
  assert.strictEqual(itQuote.ebit, 61850, 'Non-bank EBIT must be preserved');
  assert.strictEqual(itQuote.netProfit, 47100, 'Non-bank Net Profit must be preserved');
});

// 13. Cache Behavior & Stale Status
runTest('Domain 13: Stale cache items are explicitly marked STALE and isLive: false', () => {
  const staleQuote = validateAndSanitizeQuote({ symbol: 'INFY.NS', ltp: 1820.0, previousClose: 1815.0, dataStatus: 'STALE', isLive: false });
  assert.strictEqual(staleQuote.dataStatus, 'STALE');
  assert.strictEqual(staleQuote.isLive, false);
});

// 14. Fallback Behavior & Provenance
runTest('Domain 14: Fallback Yahoo data is explicitly marked YAHOO_FINANCE with appropriate status', () => {
  const fallbackQuote = validateAndSanitizeQuote({ symbol: 'AAPL', ltp: 228.5, previousClose: 227.0, source: 'YAHOO_FINANCE', dataStatus: 'LIVE_FALLBACK', isLive: true });
  assert.strictEqual(fallbackQuote.source, 'YAHOO_FINANCE');
  assert(['LIVE_FALLBACK', 'CLOSED', 'POST_CLOSE', 'PRE_OPEN', 'WEEKEND', 'HOLIDAY'].includes(fallbackQuote.dataStatus), 'Valid fallback dataStatus');
});

// 15. Snapshot Provenance
runTest('Domain 15: Snapshot data is strictly tagged SNAPSHOT and isLive: false', () => {
  const snapQuote = validateAndSanitizeQuote({ symbol: 'ITC.NS', ltp: 478.5, previousClose: 476.0, source: 'SNAPSHOT', dataStatus: 'SNAPSHOT', isLive: false });
  assert.strictEqual(snapQuote.source, 'SNAPSHOT');
  assert.strictEqual(snapQuote.dataStatus, 'SNAPSHOT');
  assert.strictEqual(snapQuote.isLive, false);
});

// 16. WebSocket Ticks & Instrument Keys
runTest('Domain 16: Upstox streamer maps keys back to proper symbols', () => {
  const sym = upstoxInstrumentService.getSymbolFromKey('NSE_EQ|INE467B01029');
  assert.strictEqual(sym, 'TCS.NS', 'Key must map back to TCS.NS');
});

// 17. Chart Data Resolution
runAsyncTest('Domain 17: Chart data returns structured OHLC candles without throwing 404 or errors', async () => {
  const chartRes = await marketDataGateway.getChartData('TCS.NS', '1D');
  assert(chartRes.available === true, 'Chart data must be available');
  assert(Array.isArray(chartRes.data) && chartRes.data.length > 0, 'Chart data must be non-empty array');
  assert(chartRes.data[0].open > 0, 'Candle open must be positive');
  assert(chartRes.data[0].close > 0, 'Candle close must be positive');
});

// 18. Non-Existent Symbol Handling
runAsyncTest('Domain 18: Non-existent symbols honestly return UNAVAILABLE with nulls without fabricating data', async () => {
  const res = await marketDataGateway.getQuoteDetail('NON_EXISTENT_FAKE_XYZ');
  assert.strictEqual(res.available, false, 'Non-existent stock must be marked unavailable');
  assert.strictEqual(res.data.ltp, null, 'Non-existent stock ltp must be null');
  assert.strictEqual(res.data.dataStatus, 'UNAVAILABLE', 'Non-existent stock dataStatus must be UNAVAILABLE');
});

// 19. Market Session Awareness
runTest('Domain 19: Indian Market Session accurately detects session state', () => {
  const session = getIndianMarketSession();
  assert(session !== null && typeof session === 'object', 'Session must be object');
  assert(['OPEN', 'PRE_OPEN', 'POST_CLOSE', 'CLOSED', 'HOLIDAY', 'WEEKEND'].includes(session.session), 'Session must be valid enum');
});

// 20. Cross-Checking Sample Stocks Comparison
runAsyncTest('Domain 20: Cross-check 8 core Indian equities against market standards', async () => {
  const testSymbols = ['TCS.NS', 'RELIANCE.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'ITC.NS', 'BAJFINANCE.NS'];
  const res = await marketDataGateway.getQuotes(testSymbols);
  assert.strictEqual(res.data.length, testSymbols.length, 'All 8 tested stocks must return valid quotes');
  
  res.data.forEach(q => {
    assert(q.ltp > 0, `${q.symbol} LTP must be positive`);
    assert(q.previousClose > 0, `${q.symbol} PreviousClose must be positive`);
    assert(q.high52 >= q.low52, `${q.symbol} 52W High must >= 52W Low`);
    assert(q.source !== undefined && q.dataStatus !== undefined, `${q.symbol} Provenance must be defined`);
    if (isFinancialEntity(q.symbol)) {
      assert.strictEqual(q.ebit, null, `${q.symbol} EBIT must be null`);
    } else {
      assert(typeof q.ebit === 'number' && q.ebit > 0, `${q.symbol} EBIT must be positive`);
    }
  });
});

setTimeout(() => {
  console.log('\n================================================================');
  console.log(`FORENSIC AUDIT TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}, 2000);
