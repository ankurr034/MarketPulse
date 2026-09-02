import yahooFinanceService, { yahooFinance } from '../services/YahooFinanceService.js';
import marketDataGateway from '../services/MarketDataGateway.js';
import sectorDataService from '../services/SectorDataService.js';
import athBaseService from '../services/AthBaseService.js';
import { getIndianMarketSession, validateAndSanitizeQuote } from '../services/MarketDataValidator.js';

async function runFinalAcceptanceCheck() {
  console.log('================================================================');
  console.log('         FINAL PRODUCTION ACCEPTANCE VERIFICATION CHECK         ');
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

  // Current IST Time & Session
  const session = getIndianMarketSession();
  console.log(`[Session Status]`);
  console.log(`  Local Time (IST): ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`  Market Open: ${session.isOpen}, Session: ${session.session}\n`);

  // Target symbols: 6 Indian indices + 5 representative NSE stocks
  const targetIndices = ['^NSEI', '^NSEBANK', '^CNXIT', '^CNXAUTO', '^CNXPHARMA', '^CNXPSUBANK'];
  const targetStocks = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'SBIN.NS'];
  const allTargets = [...targetIndices, ...targetStocks];

  console.log(`----------------------------------------------------------------`);
  console.log(`STEP 1 & 2 & 3: FETCH & LOG REAL YAHOO FINANCE DATA FOR TARGETS`);
  console.log(`----------------------------------------------------------------`);

  const fetchedRecords = [];

  for (const sym of allTargets) {
    const [rawQuoteDirect, quoteRes] = await Promise.all([
      yahooFinance.quote(sym).catch(() => null),
      yahooFinanceService.getQuoteDetail(sym)
    ]);

    const data = quoteRes?.data;

    if (!data) {
      console.error(`❌ Could not fetch quote detail for ${sym}`);
      failed++;
      continue;
    }

    const rec = {
      symbol: data.symbol,
      price: data.price,
      previousClose: data.previousClose,
      change: data.change,
      changePercent: data.changePercent,
      week52Low: data.week52Low,
      ATH: data.allTimeHigh || data.ath,
      priceAsOf: data.priceAsOf,
      fetchedAt: data.fetchedAt,
      dataStatus: data.dataStatus,
      isLive: data.isLive,
      source: data.source
    };

    fetchedRecords.push({ rec, rawQuoteDirect, data });

    console.log(`\n[SYMBOL: ${rec.symbol}]`);
    console.log(`  price:         ${rec.price !== null ? '₹' + rec.price : 'null'}`);
    console.log(`  previousClose: ${rec.previousClose !== null ? '₹' + rec.previousClose : 'null'}`);
    console.log(`  change:        ${rec.change !== null ? (rec.change > 0 ? '+' : '') + rec.change : 'null'}`);
    console.log(`  changePercent: ${rec.changePercent !== null ? (rec.changePercent > 0 ? '+' : '') + rec.changePercent + '%' : 'null'}`);
    console.log(`  week52Low:     ${rec.week52Low !== null ? '₹' + rec.week52Low : 'null'}`);
    console.log(`  ATH:           ${rec.ATH !== null ? '₹' + rec.ATH : 'null'}`);
    console.log(`  priceAsOf:     ${rec.priceAsOf}`);
    console.log(`  fetchedAt:     ${rec.fetchedAt}`);
    console.log(`  dataStatus:    ${rec.dataStatus}`);
    console.log(`  isLive:        ${rec.isLive}`);
    console.log(`  source:        ${rec.source}`);
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 4: MATHEMATICAL & FINANCIAL INVARIANT CHECKS`);
  console.log(`----------------------------------------------------------------`);

  for (const { rec } of fetchedRecords) {
    if (rec.dataStatus !== 'UNAVAILABLE' && rec.price !== null && rec.previousClose !== null) {
      // 1. change === price - previousClose (tolerance for rounding)
      const expectedChange = parseFloat((rec.price - rec.previousClose).toFixed(4));
      const changeDiff = Math.abs(rec.change - expectedChange);
      assert(changeDiff < 0.05, `${rec.symbol} change === price - previousClose`, `actual=${rec.change}, expected=${expectedChange}, diff=${changeDiff}`);

      // 2. changePercent === ((price - previousClose) / previousClose) * 100
      const expectedPct = parseFloat((((rec.price - rec.previousClose) / rec.previousClose) * 100).toFixed(2));
      const pctDiff = Math.abs(rec.changePercent - expectedPct);
      assert(pctDiff < 0.05, `${rec.symbol} changePercent === ((price - prevClose)/prevClose)*100`, `actual=${rec.changePercent}%, expected=${expectedPct}%`);

      // 3. week52Low <= price <= ATH
      if (rec.week52Low !== null) {
        assert(rec.week52Low <= rec.price * 1.001, `${rec.symbol} week52Low (₹${rec.week52Low}) <= price (₹${rec.price})`);
      }
      if (rec.ATH !== null) {
        assert(rec.price <= rec.ATH * 1.001, `${rec.symbol} price (₹${rec.price}) <= ATH (₹${rec.ATH})`);
      }
    }
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 5: ZERO OLD DATA / NO SIMULATOR / NO SNAPSHOT VERIFICATION`);
  console.log(`----------------------------------------------------------------`);

  for (const { rec } of fetchedRecords) {
    assert(rec.source === 'YAHOO_FINANCE' || rec.source === 'YAHOO_FINANCE_UNAVAILABLE', `${rec.symbol} Source Provenance`, `source=${rec.source}`);
    assert(rec.source !== 'SIMULATOR', `${rec.symbol} Not from SimulatorService`);
    assert(rec.source !== 'SNAPSHOT', `${rec.symbol} Not from stockSnapshotData`);
    assert(rec.price !== 9999.99 && rec.price !== 1234.56, `${rec.symbol} Not a hardcoded price dummy`);
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 6: PURE INDEX TICKER VERIFICATION (NO ETF SUBSTITUTES)`);
  console.log(`----------------------------------------------------------------`);

  const allSectors = await sectorDataService.getAllSectors('india', '1D', 'stocks');

  for (const s of allSectors) {
    if (s.region === 'india' && s.indexTicker) {
      assert(!s.indexTicker.includes('BEES'), `${s.name} pure index ticker: ${s.indexTicker} (NOT ETF)`);
      assert(s.primaryTicker === s.indexTicker, `${s.name} primaryTicker matches indexTicker`);
    }
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 7: DIRECT YAHOO FINANCE PRICE COMPARISON AT SAME FETCH TIME`);
  console.log(`----------------------------------------------------------------`);

  for (const { rec, rawQuoteDirect } of fetchedRecords) {
    if (rawQuoteDirect && rec.price !== null) {
      const rawPrice = rawQuoteDirect.regularMarketPrice || rawQuoteDirect.currentPrice;
      const rawPrev = rawQuoteDirect.regularMarketPreviousClose;
      
      const priceDiffPct = Math.abs((rec.price - rawPrice) / rawPrice) * 100;
      const prevDiff = Math.abs(rec.previousClose - rawPrev);

      // Previous close is immutable during the trading day and must match exactly
      assert(prevDiff < 0.01, `${rec.symbol} PrevClose matches direct Yahoo API exactly`, `pipeline=₹${rec.previousClose}, direct=₹${rawPrev}`);
      // Live price matches within live tick oscillation (<0.2%)
      assert(priceDiffPct < 0.2, `${rec.symbol} Live Price matches direct Yahoo API tick`, `pipeline=₹${rec.price}, direct=₹${rawPrice}, diff=${priceDiffPct.toFixed(4)}%`);
    }
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 8 & 9: MARKET-SESSION CLASSIFICATION VERIFICATION`);
  console.log(`----------------------------------------------------------------`);

  for (const { rec, rawQuoteDirect } of fetchedRecords) {
    if (rec.price !== null) {
      if (session.isOpen) {
        const isFresh = rawQuoteDirect?.regularMarketTime && (Date.now() - new Date(rawQuoteDirect.regularMarketTime).getTime() < 30 * 60 * 1000);
        console.log(`  ${rec.symbol}: session.isOpen=${session.isOpen}, isFresh=${isFresh}, dataStatus=${rec.dataStatus}, isLive=${rec.isLive}`);
        assert(rec.dataStatus === 'LIVE' || rec.dataStatus === 'EOD', `${rec.symbol} Valid DataStatus (${rec.dataStatus})`);
        if (isFresh) {
          assert(rec.isLive === true, `${rec.symbol} isLive is true for fresh market data`);
        }
      } else {
        assert(rec.dataStatus === 'EOD', `${rec.symbol} Off-market classified as EOD (${rec.dataStatus})`);
        assert(rec.isLive === false, `${rec.symbol} isLive is false after market close`);
      }
    }
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 10: UNAVAILABLE / MISSING DATA HONEST HANDLING`);
  console.log(`----------------------------------------------------------------`);

  const bogusQuote = await yahooFinanceService.getQuote('NONEXISTENT_BOGUS_SYMBOL_XYZ123.NS');
  console.log(`  Bogus symbol response: available=${bogusQuote.available}, data=${JSON.stringify(bogusQuote.data)}`);
  assert(bogusQuote.available === false || bogusQuote.data?.dataStatus === 'UNAVAILABLE', 'Bogus symbol honestly unavailable');
  if (bogusQuote.data) {
    assert(bogusQuote.data.price === null || bogusQuote.data.ltp === null, 'Bogus symbol price is strictly NULL (no dummy price)');
    assert(bogusQuote.data.dataStatus === 'UNAVAILABLE', 'Bogus symbol dataStatus === UNAVAILABLE');
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 11: CONCURRENT REQUEST DEDUPLICATION (ONE IN-FLIGHT PROMISE)`);
  console.log(`----------------------------------------------------------------`);

  const tStartDedupe = Date.now();
  
  // Fire 10 concurrent requests for the exact same symbol batch
  const concurrentPromises = Array.from({ length: 10 }, () => yahooFinanceService.getQuotes(['INFY.NS', 'TCS.NS', 'RELIANCE.NS']));
  const concurrentResults = await Promise.all(concurrentPromises);
  const dedupeElapsed = Date.now() - tStartDedupe;

  assert(concurrentResults.every(r => r && r.data && (Array.isArray(r.data) || typeof r.data === 'object')), 'All 10 concurrent requests returned results');
  assert(dedupeElapsed < 350, 'Concurrent batch deduplication finished in <350ms', `${dedupeElapsed}ms`);
  console.log(`  10 Concurrent requests completed in ${dedupeElapsed}ms`);

  console.log(`\n----------------------------------------------------------------`);
  console.log(`STEP 12: CACHE EXPIRY VERIFICATION (20s TTL)`);
  console.log(`----------------------------------------------------------------`);

  // 1. Initial cached fetch
  const testSymbol = 'INFY.NS';
  const tCache1 = Date.now();
  const cachedQuote1 = await yahooFinanceService.getQuotes([testSymbol]);
  const latency1 = Date.now() - tCache1;
  console.log(`  Lookup 1 (Cached): ${latency1}ms, timestamp=${cachedQuote1.data[0]?.fetchedAt}`);
  assert(latency1 < 10, 'Cached lookup is instantaneous (<10ms)');

  // 2. Clear cache to simulate exact expiry
  console.log(`  Simulating cache expiration by ageing entry past 20,000ms TTL...`);
  const existingEntry = yahooFinanceService.quoteCache.get(testSymbol);
  if (existingEntry) {
    existingEntry.timestamp = Date.now() - 25000; // Force expired
  }

  const tCache2 = Date.now();
  const expiredQuote = await yahooFinanceService.getQuotes([testSymbol]);
  const latency2 = Date.now() - tCache2;
  console.log(`  Lookup 2 (After Expiry): ${latency2}ms, timestamp=${expiredQuote.data[0]?.fetchedAt}`);
  assert(latency2 > 50, 'Post-expiry triggers fresh Yahoo request', `${latency2}ms`);
  assert(expiredQuote.available === true, 'Fresh post-expiry quote fetched successfully');

  console.log(`\n================================================================`);
  console.log(`FINAL ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalAcceptanceCheck().catch(err => {
  console.error('Fatal error during final acceptance check:', err);
  process.exit(1);
});
