import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
async function test() {
  try {
    const quote = await yahooFinance.quoteSummary('VTSAX', { modules: ['topHoldings', 'fundProfile'] });
    console.log(JSON.stringify(quote, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
