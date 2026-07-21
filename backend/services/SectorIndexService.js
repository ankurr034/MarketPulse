import { yahooFinance } from './YahooFinanceService.js';
import sectorIndexMap from '../config/sectorIndexMap.js';
import { resolveRangeToDates, stringifyRange } from '../utils/dateRangeUtils.js';

class SectorIndexService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  }

  _getCached(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getSectorIndex(sector, range = '1y') {
    const cacheKey = `sector_index_${sector}_${stringifyRange(range)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const ticker = sectorIndexMap[sector];
    let indexHistory = [];
    let indexAvailable = false;

    if (ticker) {
      try {
        const parsedRange = resolveRangeToDates(range);
        
        const chartOpts = {
          period1: parsedRange.start,
          interval: '1d'
        };
        if (parsedRange.end) {
          chartOpts.period2 = parsedRange.end;
        }

        const res = await yahooFinance.chart(ticker, chartOpts);

        const quotes = res?.quotes || [];
        indexHistory = quotes.map(item => ({
          time: new Date(item.date).getTime(),
          date: new Date(item.date).toISOString().split('T')[0],
          value: parseFloat(item.close.toFixed(2)),
          open: parseFloat(item.open.toFixed(2)),
          high: parseFloat(item.high.toFixed(2)),
          low: parseFloat(item.low.toFixed(2)),
          close: parseFloat(item.close.toFixed(2))
        })).filter(item => item.value !== null && !isNaN(item.value));

        indexAvailable = indexHistory.length > 0;
      } catch (err) {
        console.error(`Failed to fetch lightweight index history for ${ticker}:`, err.message);
      }
    }

    const latestValue = indexHistory.length > 0 ? indexHistory[indexHistory.length - 1].value : 0;
    const startValue = indexHistory.length > 0 ? indexHistory[0].value : latestValue;
    const changePercent = startValue > 0 ? parseFloat((((latestValue - startValue) / startValue) * 100).toFixed(2)) : 0;

    const result = {
      type: 'sector',
      id: sector,
      name: sector,
      ticker: ticker || null,
      history: indexHistory,
      currentPrice_or_nav: latestValue,
      oneYearChangePct: changePercent, // Can be considered 'range' change percent depending on context
      currency: 'INR' // Assuming Indian sectors
    };

    this._setCache(cacheKey, result);
    return result;
  }
}

export default new SectorIndexService();
