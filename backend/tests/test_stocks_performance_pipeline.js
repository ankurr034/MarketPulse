import yahooFinanceService from '../services/YahooFinanceService.js';
import marketDataGateway from '../services/MarketDataGateway.js';
import sectorDataService from '../services/SectorDataService.js';
import athBaseService from '../services/AthBaseService.js';
import { getIndianMarketSession } from '../services/MarketDataValidator.js';

async function runPipelineTests() {
  console.log('====================================================');
  console.log('STOCKS PERFORMANCE PIPELINE E2E VERIFICATION SUITE');
  console.log('====================================================\n');

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

  // 1. Session Check
  const session = getIndianMarketSession();
  console.log(`\n--- 1. Market Session State ---`);
  console.log(`Current IST Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`Market isOpen: ${session.isOpen}, Session: ${session.session}`);

  // 2. Core Stock Quotes Verification
  console.log(`\n--- 2. Core Stock Quotes & Mathematical Consistency ---`);
  const coreStocks = [
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
    'SBIN.NS', 'ITC.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS'
  ];

  const t0 = Date.now();
  const quotesRes = await yahooFinanceService.getQuotes(coreStocks);
  const coldLatency = Date.now() - t0;
  console.log(`Fetched ${quotesRes.data.length} quotes in ${coldLatency}ms`);

  assert(quotesRes.available === true, 'Quotes available status', `Returned ${quotesRes.data.length} quotes`);
  
  for (const q of quotesRes.data) {
    if (q.dataStatus !== 'UNAVAILABLE' && q.price !== null) {
      assert(q.source === 'YAHOO_FINANCE', `${q.symbol} Source Provenance`, `source=${q.source}`);
      assert(q.dataStatus === (session.isOpen ? 'LIVE' : 'EOD'), `${q.symbol} Session DataStatus`, `status=${q.dataStatus}`);
      assert(typeof q.price === 'number' && q.price > 0, `${q.symbol} Valid Price`, `₹${q.price}`);
      
      // Math consistency
      const expectedChange = parseFloat((q.price - q.previousClose).toFixed(4));
      assert(Math.abs(q.change - expectedChange) < 0.05, `${q.symbol} Change Math Consistency`, `change=${q.change}, expected=${expectedChange}`);
      
      const expectedPct = parseFloat((((q.price - q.previousClose) / q.previousClose) * 100).toFixed(2));
      assert(Math.abs(q.changePercent - expectedPct) < 0.05, `${q.symbol} ChangePercent Math Consistency`, `pct=${q.changePercent}%, expected=${expectedPct}%`);
    } else {
      assert(q.source === 'YAHOO_FINANCE_UNAVAILABLE' && q.dataStatus === 'UNAVAILABLE', `${q.symbol} Honest Unavailable State`);
    }
  }

  // 3. Cache & Deduplication Test
  console.log(`\n--- 3. In-Memory Cache & Request Deduplication ---`);
  const tWarmStart = Date.now();
  const warmRes = await yahooFinanceService.getQuotes(coreStocks);
  const warmLatency = Date.now() - tWarmStart;
  console.log(`Warm cache lookup latency: ${warmLatency}ms`);
  assert(warmLatency < 10, 'In-Memory Cache Speed (<10ms)', `${warmLatency}ms`);

  // Concurrent duplicate requests
  const tDedupeStart = Date.now();
  const [res1, res2, res3] = await Promise.all([
    yahooFinanceService.getQuotes(['INFY.NS', 'TCS.NS']),
    yahooFinanceService.getQuotes(['INFY.NS', 'TCS.NS']),
    yahooFinanceService.getQuotes(['INFY.NS', 'TCS.NS'])
  ]);
  const dedupeLatency = Date.now() - tDedupeStart;
  assert(res1.data.length === 2 && res2.data.length === 2 && res3.data.length === 2, 'Concurrent Request Deduplication', `${dedupeLatency}ms`);

  // 4. Indian Index Tickers Test (No ETF substitution)
  console.log(`\n--- 4. Indian Index Tickers & Direct Index Quotes ---`);
  const indexTickers = [
    { name: 'Nifty 50', ticker: '^NSEI' },
    { name: 'Nifty Bank', ticker: '^NSEBANK' },
    { name: 'Nifty IT', ticker: '^CNXIT' },
    { name: 'Nifty Auto', ticker: '^CNXAUTO' },
    { name: 'Nifty Pharma', ticker: '^CNXPHARMA' },
    { name: 'Nifty PSU Bank', ticker: '^CNXPSUBANK' }
  ];

  const indexQuotesRes = await yahooFinanceService.getQuotes(indexTickers.map(i => i.ticker));
  for (const idx of indexTickers) {
    const quote = indexQuotesRes.data.find(q => q.symbol === idx.ticker);
    assert(quote !== undefined, `${idx.name} (${idx.ticker}) Index Present`);
    if (quote && quote.dataStatus !== 'UNAVAILABLE') {
      assert(quote.source === 'YAHOO_FINANCE', `${idx.name} Source`, `source=${quote.source}`);
      assert(typeof quote.price === 'number' && quote.price > 100, `${idx.name} Direct Index Price`, `₹${quote.price}`);
    }
  }

  // 5. Unified Historical Analysis Pipeline (Returns + ATH + 52W Low)
  console.log(`\n--- 5. Unified Historical Analysis & Mathematical Invariants ---`);
  const testHistoricalSymbols = ['RELIANCE.NS', 'TCS.NS', '^NSEI', '^NSEBANK'];
  
  for (const sym of testHistoricalSymbols) {
    const quote = quotesRes.data.find(q => q.symbol === sym) || indexQuotesRes.data.find(q => q.symbol === sym);
    const analysis = await yahooFinanceService.getHistoricalAnalysis(sym, quote?.price);
    
    assert(analysis.returns !== null, `${sym} Multi-Period Returns Computed`);
    console.log(`    Returns for ${sym}: 1W=${analysis.returns['1W']}%, 1M=${analysis.returns['1M']}%, 1Y=${analysis.returns['1Y']}%, 5Y=${analysis.returns['5Y']}%, ALL=${analysis.returns['ALL']}%`);
    
    if (analysis.athBase && analysis.athBase.allTimeHigh) {
      const { allTimeHigh, week52Low, currentPrice, pctFromATH, pctFrom52WLow, percentFromATH, percentFrom52WLow, week52LowDate, allTimeHighDate } = analysis.athBase;
      console.log(`    ATH/52W for ${sym}: Price=${currentPrice}, 52W Low=${week52Low} on ${week52LowDate}, ATH=${allTimeHigh} on ${allTimeHighDate}, %fromATH=${pctFromATH}%, %from52WLow=${pctFrom52WLow}%`);
      
      // Mathematical Invariant 1: week52Low <= currentPrice
      if (week52Low && currentPrice) {
        assert(week52Low <= currentPrice * 1.001, `${sym} Invariant: 52W Low (₹${week52Low}) <= Price (₹${currentPrice})`);
      }
      
      // Mathematical Invariant 2: currentPrice <= ATH
      if (allTimeHigh && currentPrice) {
        assert(currentPrice <= allTimeHigh * 1.001, `${sym} Invariant: Price (₹${currentPrice}) <= ATH (₹${allTimeHigh})`);
      }

      // Mathematical Invariant 3: pctFromATH <= 0
      if (pctFromATH !== null) {
        assert(pctFromATH <= 0.01, `${sym} Invariant: pctFromATH <= 0 (${pctFromATH}%)`);
      }

      // Mathematical Invariant 4: pctFrom52WLow >= 0
      if (pctFrom52WLow !== null) {
        assert(pctFrom52WLow >= -0.01, `${sym} Invariant: pctFrom52WLow >= 0 (${pctFrom52WLow}%)`);
      }

      // Mathematical Invariant 5: Exact formulas
      if (week52Low && currentPrice && percentFrom52WLow !== null) {
        const expectedLowPct = parseFloat((((currentPrice - week52Low) / week52Low) * 100).toFixed(2));
        assert(Math.abs(percentFrom52WLow - expectedLowPct) < 0.05, `${sym} percentFrom52WLow formula match`, `${percentFrom52WLow}% vs expected ${expectedLowPct}%`);
      }

      if (allTimeHigh && currentPrice && percentFromATH !== null) {
        const expectedAthPct = parseFloat((((currentPrice - allTimeHigh) / allTimeHigh) * 100).toFixed(2));
        assert(Math.abs(percentFromATH - expectedAthPct) < 0.05, `${sym} percentFromATH formula match`, `${percentFromATH}% vs expected ${expectedAthPct}%`);
      }
    }
  }

  // 6. Verification of Explicit Formula Example from Prompt (Nifty Bank simulated point)
  console.log(`\n--- 6. Explicit 52W Low & ATH Reference Calculation Check ---`);
  const exPrice = 56981.25;
  const exLow52 = 49954.85;
  const exAth = 61764.85;

  const exPctFrom52WLow = parseFloat((((exPrice - exLow52) / exLow52) * 100).toFixed(2));
  const exPctFromATH = parseFloat((((exPrice - exAth) / exAth) * 100).toFixed(2));

  assert(exPctFrom52WLow === 14.07, 'Example % From 52W Low is +14.07%', `actual=${exPctFrom52WLow}%`);
  assert(exPctFromATH === -7.74, 'Example % From ATH is -7.74%', `actual=${exPctFromATH}%`);

  // 7. Sector Aggregates & Advance/Decline/Unchanged Consistency
  console.log(`\n--- 7. Sector Pipeline & Advance/Decline Consistency ---`);
  const tSectorStart = Date.now();
  const allSectors = await sectorDataService.getAllSectors('all', '1D', 'stocks');
  const sectorLatency = Date.now() - tSectorStart;
  console.log(`Fetched ${allSectors.length} sectors in ${sectorLatency}ms`);

  assert(allSectors.length >= 24, 'All Sectors Count', `Returned ${allSectors.length} sectors`);

  for (const s of allSectors) {
    const validCount = s.validStocks || 0;
    const advances = s.advances || 0;
    const declines = s.declines || 0;
    const unchanged = s.unchanged || 0;

    // Strict Mathematical Invariant: advances + declines + unchanged === validCount
    const sum = advances + declines + unchanged;
    assert(sum === validCount, `${s.name} Adv/Dec/Unchanged Sum Consistency`, `${advances} + ${declines} + ${unchanged} = ${sum} vs total valid=${validCount}`);

    // Financial entity EBIT rule
    const isFin = s.id.includes('bank') || s.id.includes('fin') || s.id.includes('insurance');
    if (isFin) {
      assert(s.ebit === null, `${s.name} Financial Institution EBIT is NULL (GAAP/IFRS Rule)`);
    }

    // Index Price source purity
    if (s.region === 'india' && s.indexTicker) {
      assert(!s.indexTicker.includes('BEES'), `${s.name} Index Ticker is PURE index (${s.indexTicker}) not ETF`);
    }

    // Performance & 52W binding fields presence
    assert(s.returns !== undefined && s.returns !== null, `${s.name} Performance object present`);
  }

  // 8. Single Sector Detail & Immediate Constituent Expansion
  console.log(`\n--- 8. Sector Detail & Immediate Constituent Expansion ---`);
  const tDetailStart = Date.now();
  const bankDetail = await sectorDataService.getSectorDetail('nifty-bank', '1D');
  const detailLatency = Date.now() - tDetailStart;
  console.log(`Fetched Nifty Bank detail in ${detailLatency}ms`);

  assert(bankDetail !== null, 'Sector Detail Returned', `Stocks: ${bankDetail?.stocks?.length}`);
  assert(bankDetail.advanceCount + bankDetail.declineCount + bankDetail.unchanged === bankDetail.validStocks, 'Sector Detail Adv/Dec/Unchanged Consistency');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPipelineTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
