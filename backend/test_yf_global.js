import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
async function run() {
  const q = await yahooFinance.quote(['AAPL', 'BRK-B', 'XLK']);
  console.log(q.map(x => ({sym: x.symbol, price: x.regularMarketPrice, chgPct: x.regularMarketChangePercent})));
}
run();
