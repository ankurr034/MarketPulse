import YahooFinance from 'yahoo-finance2';

const constituents = {
  'nifty-bank': ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'INDUSINDBK.NS', 'BANKBARODA.NS', 'PNB.NS', 'IDFCFIRSTB.NS', 'FEDERALBNK.NS'],
  'nifty-it': ['TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS', 'TECHM.NS', 'PERSISTENT.NS', 'COFORGE.NS', 'MPHASIS.NS', 'LTTS.NS', 'TATAELXSI.NS'],
  'nifty-auto': ['TMCV.NS', 'TMPV.NS', 'M&M.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS', 'ASHOKLEY.NS', 'BALKRISIND.NS', 'TVSMOTOR.NS'],
  'nifty-pharma': ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS', 'LUPIN.NS', 'AUROPHARMA.NS', 'BIOCON.NS', 'MANKIND.NS', 'ZYDUSLIFE.NS'],
  'nifty-fmcg': ['ITC.NS', 'HINDUNILVR.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'GODREJCP.NS', 'DABUR.NS', 'MARICO.NS', 'COLPAL.NS', 'TATACONSUM.NS', 'VBL.NS'],
  'nifty-metal': ['TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'COALINDIA.NS', 'VEDL.NS', 'NMDC.NS', 'SAIL.NS', 'NATIONALUM.NS', 'JINDALSTEL.NS'],
  'nifty-energy': ['RELIANCE.NS', 'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'BPCL.NS', 'IOC.NS', 'ADANIGREEN.NS', 'TATAPOWER.NS', 'GAIL.NS'],
  'nifty-realty': ['DLF.NS', 'GODREJPROP.NS', 'OBEROIRLTY.NS', 'PRESTIGE.NS', 'PHOENIXLTD.NS', 'BRIGADE.NS', 'SOBHA.NS'],
  'nifty-psu-bank': ['SBIN.NS', 'BANKBARODA.NS', 'PNB.NS', 'CANBK.NS', 'UNIONBANK.NS', 'IOB.NS', 'INDIANB.NS', 'MAHABANK.NS'],
  'nifty-financial-services': ['HDFCBANK.NS', 'ICICIBANK.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'SBILIFE.NS', 'HDFCLIFE.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'CHOLAFIN.NS', 'MUTHOOTFIN.NS'],
  'nifty-media': ['ZEEL.NS', 'PVRINOX.NS', 'SUNTV.NS', 'NETWORK18.NS', 'NDTV.NS', 'NAZARA.NS'],
  'nifty-infra': ['LT.NS', 'ADANIPORTS.NS', 'ULTRACEMCO.NS', 'GRASIM.NS', 'ADANIENT.NS', 'SIEMENS.NS', 'BHARTIARTL.NS'],
  'nifty-consumer-durables': ['TITAN.NS', 'HAVELLS.NS', 'VOLTAS.NS', 'WHIRLPOOL.NS', 'BLUESTARCO.NS', 'CROMPTON.NS', 'BATAINDIA.NS', 'DIXON.NS', 'KALYANKJIL.NS']
};

async function testAll() {
  const yf = new YahooFinance();
  let total = 0;
  let success = 0;
  for (const [sector, syms] of Object.entries(constituents)) {
    console.log(`\n--- Sector: ${sector} (${syms.length} stocks) ---`);
    for (const s of syms) {
      total++;
      try {
        const q = await yf.quote(s);
        if (q && q.regularMarketPrice > 0) {
          success++;
          console.log(`  ✅ ${s} | LTP: ₹${q.regularMarketPrice} | PrevClose: ₹${q.regularMarketPreviousClose} | 1D%: ${q.regularMarketChangePercent?.toFixed(2)}% | 52W High: ₹${q.fiftyTwoWeekHigh} | 52W Low: ₹${q.fiftyTwoWeekLow}`);
        } else {
          console.log(`  ⚠️ ${s} No LTP`);
        }
      } catch (e) {
        console.log(`  ❌ ${s} Error: ${e.message}`);
      }
    }
  }
  console.log('\n=============================================');
  console.log(`TOTAL CONSTITUENTS: ${total} | SUCCESS: ${success} | FAILED: ${total - success}`);
  console.log('=============================================\n');
}

testAll();
