// Verify which Yahoo ticker works for Nifty Next 50 and validate key index tickers
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
try { yf.setGlobalConfig({ validation: { logErrors: false } }); } catch (e) {}

const candidates = [
  // Nifty Next 50 candidates
  { label: 'Nifty Next 50 candidate: ^NIFTYJR', ticker: '^NIFTYJR' },
  { label: 'Nifty Next 50 candidate: ^NIFTY_JR', ticker: '^NIFTY_JR' },
  { label: 'Nifty Next 50 candidate: ^NIFTYNXT50', ticker: '^NIFTYNXT50' },
  { label: 'Nifty Next 50 candidate: ^NSMIDCP', ticker: '^NSMIDCP' },
  { label: 'Nifty Next 50 candidate: ^CNX_NIFTY_JUNIOR', ticker: '^CNX_NIFTY_JUNIOR' },
  { label: 'Nifty Next 50 candidate: NIFTYJR.NS', ticker: 'NIFTYJR.NS' },
  
  // Validate known index tickers
  { label: 'Nifty 50: ^NSEI', ticker: '^NSEI' },
  { label: 'Nifty Bank: ^NSEBANK', ticker: '^NSEBANK' },
  { label: 'Nifty IT: ^CNXIT', ticker: '^CNXIT' },
  { label: 'Nifty Auto: ^CNXAUTO', ticker: '^CNXAUTO' },
  { label: 'Nifty Pharma: ^CNXPHARMA', ticker: '^CNXPHARMA' },
  { label: 'Nifty FMCG: ^CNXFMCG', ticker: '^CNXFMCG' },
  { label: 'Nifty Metal: ^CNXMETAL', ticker: '^CNXMETAL' },
  { label: 'Nifty Energy: ^CNXENERGY', ticker: '^CNXENERGY' },
  { label: 'Nifty Realty: ^CNXREALTY', ticker: '^CNXREALTY' },
  { label: 'Nifty PSU Bank: ^CNXPSUBANK', ticker: '^CNXPSUBANK' },
  { label: 'Nifty FinServ: ^CNXFIN', ticker: '^CNXFIN' },
  { label: 'Nifty Media: ^CNXMEDIA', ticker: '^CNXMEDIA' },
  { label: 'Nifty Infra: ^CNXINFRA', ticker: '^CNXINFRA' },
  { label: 'Nifty Consumer Durables: ^CNXCONSUM', ticker: '^CNXCONSUM' },
  { label: 'Nifty 100: ^CNX100', ticker: '^CNX100' },
  { label: 'Nifty Midcap 50: ^NSEMDCP50', ticker: '^NSEMDCP50' },
  { label: 'Nifty Smallcap 100: ^CNXSC', ticker: '^CNXSC' },
  { label: 'Nifty 500: ^CRSLDX', ticker: '^CRSLDX' },

  // Also check ETF tickers for comparison (to prove they differ)
  { label: 'BANKBEES ETF: BANKBEES.NS', ticker: 'BANKBEES.NS' },
  { label: 'ITBEES ETF: ITBEES.NS', ticker: 'ITBEES.NS' },
  { label: 'JUNIORBEES ETF: JUNIORBEES.NS', ticker: 'JUNIORBEES.NS' },
];

async function testTicker(item) {
  try {
    const q = await yf.quote(item.ticker);
    return {
      label: item.label,
      ticker: item.ticker,
      status: 'OK',
      price: q.regularMarketPrice || null,
      prevClose: q.regularMarketPreviousClose || null,
      high52: q.fiftyTwoWeekHigh || null,
      low52: q.fiftyTwoWeekLow || null,
      pe: q.trailingPE || null,
      volume: q.regularMarketVolume || null,
      name: q.shortName || q.longName || null,
    };
  } catch (e) {
    return {
      label: item.label,
      ticker: item.ticker,
      status: 'FAIL',
      error: e.message?.substring(0, 80),
    };
  }
}

(async () => {
  console.log('=== Yahoo Finance Ticker Verification ===\n');
  for (const item of candidates) {
    const result = await testTicker(item);
    if (result.status === 'OK') {
      console.log(`✅ ${result.label}`);
      console.log(`   Price: ${result.price}, PrevClose: ${result.prevClose}, 52W H/L: ${result.high52}/${result.low52}, PE: ${result.pe}, Vol: ${result.volume}, Name: ${result.name}`);
    } else {
      console.log(`❌ ${result.label} — ${result.error}`);
    }
    console.log('');
  }
})();
