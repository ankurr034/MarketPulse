import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const res = await yahooFinance.quoteSummary('SPY', { modules: ['topHoldings', 'fundProfile'] });
    console.log(JSON.stringify(res.topHoldings, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
