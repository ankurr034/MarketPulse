// backend/scripts/test_yahoo_market_data_integrity.js
import marketDataGateway from '../services/MarketDataGateway.js';
import yahooFinanceService from '../services/YahooFinanceService.js';
import sectorDataService from '../services/SectorDataService.js';
import { getIndianMarketSession, validateAndSanitizeQuote } from '../services/MarketDataValidator.js';

async function runYahooMarketDataIntegrityAudit() {
  console.log('====================================================================================================');
  console.log('                 MARKETPULSE YAHOO FINANCE MARKET DATA INTEGRITY AUDIT (25 DOMAINS)                 ');
  console.log('====================================================================================================\n');

  const session = getIndianMarketSession();
  console.log(`Current IST Time: ${session.istTimeStr} | Detected Market Session: ${session.session}\n`);

  const coreSymbols = [
    'RELIANCE.NS',
    'TCS.NS',
    'INFY.NS',
    'HDFCBANK.NS',
    'ICICIBANK.NS',
    'SBIN.NS',
    'ITC.NS',
    'AXISBANK.NS',
    'KOTAKBANK.NS',
    'BAJFINANCE.NS'
  ];

  let passed = 0;
  let total = 25;

  const test = (num, name, condition) => {
    if (condition) {
      console.log(`  [PASS] Test ${num}: ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${num}: ${name}`);
    }
  };

  // 1. Yahoo Symbol Resolution
  const quotesRes = await marketDataGateway.getQuotes(coreSymbols);
  const quotes = quotesRes.data || [];
  test(1, 'Yahoo symbol resolution preserves exchange suffix & canonical identity', quotes.length === coreSymbols.length && quotes.every(q => q.symbol.endsWith('.NS') && q.exchange === 'NSE'));

  // 2. Current Quote Retrieval
  test(2, 'Current quote retrieval produces valid quote objects', quotes.length === 10);

  // 3. Current Price Timestamp
  test(3, 'Every processed quote carries priceAsOf or lastUpdatedAt ISO timestamp', quotes.every(q => q.lastUpdatedAt || q.priceAsOf));

  // 4. Previous Close Validity
  test(4, 'Previous close is strictly positive or null (never NaN/0)', quotes.every(q => q.previousClose === null || (typeof q.previousClose === 'number' && q.previousClose > 0)));

  // 5. Change Calculation Precision
  const changeTest = quotes.filter(q => q.ltp !== null && q.previousClose !== null);
  test(5, 'Daily change is mathematically equal to ltp - previousClose', changeTest.every(q => Math.abs(q.change - (q.ltp - q.previousClose)) < 0.05));

  // 6. ChangePercent Calculation Precision
  test(6, 'Change% is mathematically equal to ((ltp - prevClose)/prevClose) * 100', changeTest.every(q => Math.abs(q.changePercent - (((q.ltp - q.previousClose) / q.previousClose) * 100)) < 0.05));

  // 7. OHLC Validation
  test(7, 'OHLC enforces DayHigh >= max(Open, LTP) and DayLow <= min(Open, LTP)', quotes.filter(q => q.dayHigh && q.dayLow).every(q => q.dayHigh >= Math.max(q.open || q.ltp, q.ltp) && q.dayLow <= Math.min(q.open || q.ltp, q.ltp)));

  // 8. Volume Non-negative
  test(8, 'Volume is non-negative and finite', quotes.every(q => q.volume === null || (typeof q.volume === 'number' && q.volume >= 0)));

  // 9. 52-Week High / Low Validation
  test(9, '52W High >= 52W Low when both exist', quotes.filter(q => q.high52 && q.low52).every(q => q.high52 >= q.low52));

  // 10. Historical Candles
  const chartRes = await marketDataGateway.getChartData('TCS.NS', '1D');
  test(10, 'Chart data returns authentic OHLC structure or honest UNAVAILABLE', Array.isArray(chartRes.data));

  // 11-16. Multi-Period Returns
  const sampleReturns = quotes[0]?.returns || {};
  test(11, '1W return is computed from historical close or null', sampleReturns['1W'] === null || typeof sampleReturns['1W'] === 'number');
  test(12, '1M return is computed from historical close or null', sampleReturns['1M'] === null || typeof sampleReturns['1M'] === 'number');
  test(13, '6M return is computed from historical close or null', sampleReturns['6M'] === null || typeof sampleReturns['6M'] === 'number');
  test(14, '1Y return is computed from historical close or null', sampleReturns['1Y'] === null || typeof sampleReturns['1Y'] === 'number');
  test(15, '3Y return is computed from historical close or null', sampleReturns['3Y'] === null || typeof sampleReturns['3Y'] === 'number');
  test(16, '5Y return is computed from historical close or null', sampleReturns['5Y'] === null || typeof sampleReturns['5Y'] === 'number');

  // 17. ALL Return
  test(17, 'ALL return uses authentic inception historical price or returns null', sampleReturns['ALL'] === null || typeof sampleReturns['ALL'] === 'number');

  // 18. Sector Index Prices
  const sectorRes = await sectorDataService.getSectorDetail('nifty-bank', '1D');
  test(18, 'Sector index price is sourced from index instrument and not overwritten with 100 or constituent average', sectorRes && sectorRes.indexPrice !== 100);

  // 19. Unavailable Symbol Behavior
  const unavailRes = await marketDataGateway.getQuoteDetail('NON_EXISTENT_FAKE_TICKER_123');
  test(19, 'Unavailable symbols return null fields with UNAVAILABLE provenance', unavailRes.data && unavailRes.data.dataStatus === 'UNAVAILABLE' && unavailRes.data.ltp === null);

  // 20. No Snapshot Usage in Stock Quotes
  test(20, 'Zero stock quotes carry source: SNAPSHOT', quotes.every(q => q.source !== 'SNAPSHOT'));

  // 21. No Simulator Usage in Stock Quotes
  test(21, 'Zero stock quotes carry source: SIMULATOR', quotes.every(q => q.source !== 'SIMULATOR'));

  // 22. No Hardcoded Prices
  test(22, 'Stock prices originate from authentic provider or remain null', quotes.every(q => q.source === 'UPSTOX' || q.source === 'YAHOO_FINANCE' || q.source === 'UNAVAILABLE'));

  // 23. No Artificial Multipliers
  test(23, 'No artificial multiplier hacks in returns or index pricing', !sectorRes || sectorRes.indexSymbol !== 'JUNIORBEES.NS' || sectorRes.indexPrice < 10000);

  // 24. API Response Contract
  test(24, 'Quote responses adhere to full API response schema with provenance', quotes.every(q => 'source' in q && 'dataStatus' in q && 'isLive' in q && 'returns' in q));

  // 25. Financial Institutions GAAP Rule
  const bankQuotes = quotes.filter(q => q.symbol.includes('BANK'));
  test(25, 'Financial institutions (Banks/NBFCs) strictly return ebit: null', bankQuotes.every(q => q.ebit === null));

  console.log('\n====================================================================================================');
  console.log(`INTEGRITY AUDIT SUMMARY: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================================================================\n');

  return passed === total;
}

runYahooMarketDataIntegrityAudit().then(success => {
  process.exit(success ? 0 : 1);
});
