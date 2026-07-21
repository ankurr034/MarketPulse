import { yahooFinance } from './YahooFinanceService.js';
import redisCache from './RedisCacheService.js';

class BenchmarkService {
  async getBenchmarkReturns(benchmarkSymbol = '^NSEI', period = '1y') {
    const cacheKey = `benchmark_${benchmarkSymbol}_${period}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached;

    try {
      let period1 = new Date();
      if (period === '1y') period1.setFullYear(period1.getFullYear() - 1);
      else if (period === '3y') period1.setFullYear(period1.getFullYear() - 3);
      else if (period === '5y') period1.setFullYear(period1.getFullYear() - 5);
      else if (period === 'max') period1.setFullYear(1970);
      else period1.setFullYear(period1.getFullYear() - 1);

      const res = await yahooFinance.chart(benchmarkSymbol, {
        period1,
        interval: '1d'
      });

      const quotes = res?.quotes || [];
      const returns = [];
      for (let i = 1; i < quotes.length; i++) {
        if (quotes[i].close && quotes[i - 1].close) {
          returns.push(((quotes[i].close - quotes[i - 1].close) / quotes[i - 1].close) * 100);
        }
      }

      // Calculate annualized return
      const startPrice = quotes[0]?.close;
      const endPrice = quotes[quotes.length - 1]?.close;
      const years = (quotes[quotes.length - 1].date.getTime() - quotes[0].date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      let cagr = 0;
      if (startPrice && endPrice && years > 0) {
        cagr = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
      }

      const result = {
        available: true,
        returns,
        cagr,
        startPrice,
        endPrice
      };

      await redisCache.set(cacheKey, result, 3600 * 24); // Cache for 1 day
      return result;
    } catch (err) {
      console.warn(`Benchmark fetch failed for ${benchmarkSymbol}:`, err.message);
      return { available: false, reason: 'Benchmark data fetch failed' };
    }
  }
}

export default new BenchmarkService();
