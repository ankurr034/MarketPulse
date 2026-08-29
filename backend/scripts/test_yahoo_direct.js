// backend/scripts/test_yahoo_direct.js
import yahooFinanceService, { yahooFinance } from '../services/YahooFinanceService.js';
import { getIndianMarketSession } from '../services/MarketDataValidator.js';

async function testYahooDirect() {
  console.log('========================================================================================================================');
  console.log('                             MARKETPULSE DIRECT YAHOO FINANCE LIVE QUERY AUDIT                                         ');
  console.log('========================================================================================================================\n');

  const session = getIndianMarketSession();
  console.log(`Current IST Time: ${session.istTimeStr} | Detected Market Session: ${session.session}\n`);

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

  console.log(
    'Yahoo Symbol'.padEnd(16) +
    'HTTP/Query'.padEnd(12) +
    'Time (ms)'.padEnd(12) +
    'Latest Price'.padEnd(14) +
    'Prev Close'.padEnd(14) +
    'Change (%)'.padEnd(14) +
    'Volume'.padEnd(14) +
    'Session'.padEnd(12) +
    'Data Status'
  );
  console.log('-'.repeat(120));

  let successCount = 0;
  let failCount = 0;

  for (const sym of testSymbols) {
    const startTime = Date.now();
    try {
      const q = await yahooFinance.quote(sym);
      const elapsed = Date.now() - startTime;

      if (!q || typeof q.regularMarketPrice !== 'number') {
        console.log(`${sym.padEnd(16)} HTTP: 200 (No Price) ${String(elapsed + 'ms').padEnd(10)} —`);
        failCount++;
        continue;
      }

      const ltp = q.regularMarketPrice;
      const prev = typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : ltp;
      const chgPct = prev > 0 ? (((ltp - prev) / prev) * 100).toFixed(2) + '%' : '0.00%';
      const vol = q.regularMarketVolume ? String(q.regularMarketVolume) : '—';
      const timeStr = q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : '—';

      console.log(
        sym.padEnd(16) +
        'HTTP: 200'.padEnd(12) +
        (elapsed + 'ms').padEnd(12) +
        ('₹' + ltp).padEnd(14) +
        ('₹' + prev).padEnd(14) +
        chgPct.padEnd(14) +
        vol.padEnd(14) +
        session.session.padEnd(12) +
        (session.isOpen ? 'LIVE' : 'EOD')
      );
      successCount++;
    } catch (e) {
      const elapsed = Date.now() - startTime;
      console.log(
        sym.padEnd(16) +
        'FAILED'.padEnd(12) +
        (elapsed + 'ms').padEnd(12) +
        '—'.padEnd(14) +
        '—'.padEnd(14) +
        '—'.padEnd(14) +
        '—'.padEnd(14) +
        session.session.padEnd(12) +
        'UNAVAILABLE (' + e.message + ')'
      );
      failCount++;
    }
  }

  console.log('\n========================================================================================================================');
  console.log(`DIRECT YAHOO AUDIT SUMMARY: ${successCount} SUCCEEDED, ${failCount} FAILED out of ${testSymbols.length} SYMBOLS`);
  console.log('========================================================================================================================\n');

  return failCount === 0;
}

testYahooDirect().then(ok => {
  process.exit(ok ? 0 : 1);
});
