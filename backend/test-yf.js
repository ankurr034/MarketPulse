import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
yahooFinance.quote('AAPL').then(console.log).catch(console.error);
