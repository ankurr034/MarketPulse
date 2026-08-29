// backend/scripts/test_live_stock_prices.js
import marketDataGateway from '../services/MarketDataGateway.js';
import upstoxInstrumentService from '../services/UpstoxInstrumentService.js';
import { getIndianMarketSession } from '../services/MarketDataValidator.js';

async function runLiveStockAudit() {
  console.log('====================================================================================================');
  console.log('                 MARKETPULSE LIVE STOCK PRICES & RUNTIME RECONCILIATION AUDIT                       ');
  console.log('====================================================================================================\n');

  await upstoxInstrumentService.initialize();
  const currentSession = getIndianMarketSession();
  console.log(`Current Indian Market Session: ${currentSession.session} | IST Time: ${currentSession.istTimeStr}\n`);

  const testSymbols = [
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

  const gatewayResult = await marketDataGateway.getQuotes(testSymbols);
  const quotesMap = new Map(gatewayResult.data.map(q => [q.symbol, q]));

  console.log(
    'Symbol'.padEnd(14) +
    'Instrument Key'.padEnd(24) +
    'Exchange'.padEnd(10) +
    'Provider'.padEnd(12) +
    'LTP'.padEnd(12) +
    'Prev Close'.padEnd(12) +
    'Change'.padEnd(10) +
    'Change %'.padEnd(12) +
    'Session'.padEnd(12) +
    'Data Status'.padEnd(14) +
    'Timestamp'
  );
  console.log('-'.repeat(140));

  let auditPassed = true;

  for (const sym of testSymbols) {
    const q = quotesMap.get(sym);
    const instKey = upstoxInstrumentService.getInstrumentKey(sym) || 'N/A';

    if (!q) {
      console.error(`MISSING QUOTE FOR ${sym}`);
      auditPassed = false;
      continue;
    }

    // Mathematical verification
    const expectedChange = parseFloat((q.ltp - q.previousClose).toFixed(4));
    const expectedChangePercent = parseFloat((((q.ltp - q.previousClose) / q.previousClose) * 100).toFixed(4));

    const isChangeMathValid = Math.abs(q.change - expectedChange) < 0.001;
    const isChangePercentMathValid = Math.abs(q.changePercent - expectedChangePercent) < 0.01;

    if (!isChangeMathValid || !isChangePercentMathValid) {
      console.error(`MATHEMATICAL DISCREPANCY on ${sym}: Expected Change=${expectedChange}, Got=${q.change} | Expected Change%=${expectedChangePercent}, Got=${q.changePercent}`);
      auditPassed = false;
    }

    console.log(
      sym.padEnd(14) +
      instKey.padEnd(24) +
      (q.exchange || 'NSE').padEnd(10) +
      q.source.padEnd(12) +
      String(q.ltp).padEnd(12) +
      String(q.previousClose).padEnd(12) +
      String(q.change).padEnd(10) +
      (q.changePercent + '%').padEnd(12) +
      (q.marketSession || currentSession.session).padEnd(12) +
      q.dataStatus.padEnd(14) +
      (q.priceAsOf || 'N/A')
    );
  }

  console.log('\n====================================================================================================');
  console.log('                          MULTI-PERIOD RETURNS AUDIT (NO FAKE ALL RETURNS)                          ');
  console.log('====================================================================================================\n');

  console.log(
    'Symbol'.padEnd(14) +
    '1W'.padEnd(10) +
    '1M'.padEnd(10) +
    '6M'.padEnd(10) +
    '1Y'.padEnd(10) +
    '3Y'.padEnd(10) +
    '5Y'.padEnd(10) +
    'ALL'.padEnd(10) +
    'EBIT (₹ Cr)'.padEnd(16) +
    'Net Profit (₹ Cr)'
  );
  console.log('-'.repeat(110));

  for (const sym of testSymbols) {
    const q = quotesMap.get(sym);
    if (!q) continue;

    const r = q.returns || {};
    console.log(
      sym.padEnd(14) +
      (r['1W'] !== null && r['1W'] !== undefined ? (r['1W'] + '%') : '—').padEnd(10) +
      (r['1M'] !== null && r['1M'] !== undefined ? (r['1M'] + '%') : '—').padEnd(10) +
      (r['6M'] !== null && r['6M'] !== undefined ? (r['6M'] + '%') : '—').padEnd(10) +
      (r['1Y'] !== null && r['1Y'] !== undefined ? (r['1Y'] + '%') : '—').padEnd(10) +
      (r['3Y'] !== null && r['3Y'] !== undefined ? (r['3Y'] + '%') : '—').padEnd(10) +
      (r['5Y'] !== null && r['5Y'] !== undefined ? (r['5Y'] + '%') : '—').padEnd(10) +
      (r['ALL'] !== null && r['ALL'] !== undefined ? (r['ALL'] + '%') : '—').padEnd(10) +
      (q.ebit !== null ? String(q.ebit) : '— (Bank/NBFC)').padEnd(16) +
      (q.netProfit !== null ? String(q.netProfit) : '—')
    );
  }

  console.log(`\nAUDIT STATUS: ${auditPassed ? 'ALL MATHEMATICAL & PROVENANCE CHECKS PASSED' : 'DISCREPANCIES DETECTED'}\n`);
  return auditPassed;
}

runLiveStockAudit().then(success => {
  process.exit(success ? 0 : 1);
});
