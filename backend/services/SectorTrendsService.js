// backend/services/SectorTrendsService.js

import { yahooFinance } from './YahooFinanceService.js';
import sectorBasket from '../config/sectorBasket.js';
import sectorIndexMap from '../config/sectorIndexMap.js';
import sectorDataService from './SectorDataService.js';
import { resolveRangeToDates, stringifyRange } from '../utils/dateRangeUtils.js';

class SectorTrendsService {
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

  async getSectorTrends(sector, range = '1y') {
    const cacheKey = `trends_${sector}_${stringifyRange(range)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    // 1. Sector Index History
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
          date: new Date(item.date).toISOString().split('T')[0],
          value: item.close,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close
        })).filter(item => item.value !== null && item.value !== undefined);

        indexAvailable = indexHistory.length > 0;
      } catch (err) {
        console.error(`Failed to fetch index history for ${ticker}:`, err.message);
      }
    }

    // 2. Top Stocks in Sector
    let topStocks = [];
    const mapping = {
      "Technology": { india: "nifty-it", global: "global-technology" },
      "Financials": { india: "nifty-bank", global: "global-financials" },
      "Healthcare": { india: "nifty-pharma", global: "global-healthcare" },
      "Infrastructure": { india: "nifty-infra", global: "global-industrials" },
      "Energy": { india: "nifty-energy", global: "global-energy" },
      "Consumption": { india: "nifty-fmcg", global: "global-consumer-discretionary" }
    }[sector];

    if (mapping) {
      try {
        const indiaDetail = await sectorDataService.getSectorDetail(mapping.india);
        const globalDetail = await sectorDataService.getSectorDetail(mapping.global);
        
        const indiaStocks = (indiaDetail?.stocks || []).slice(0, 5).map(s => ({
          id: s.symbol,
          type: 'stock',
          name: s.name || s.symbol,
          currentPrice_or_nav: s.ltp || s.price || 0,
          changePercent: s.changePercent || 0,
          currency: 'INR',
          region: 'india'
        }));
        const globalStocks = (globalDetail?.stocks || []).slice(0, 5).map(s => ({
          id: s.symbol,
          type: 'stock',
          name: s.name || s.symbol,
          currentPrice_or_nav: s.ltp || s.price || 0,
          changePercent: s.changePercent || 0,
          currency: 'USD',
          region: 'global'
        }));
        topStocks = [...indiaStocks, ...globalStocks];
      } catch (err) {
        console.error(`Failed to fetch stocks for sector ${sector}:`, err.message);
      }
    }

    // 3. Funds Basket
    const funds = (sectorBasket[sector]?.funds || []).map(f => ({
      id: f.id,
      type: 'fund',
      name: f.name,
      currentPrice_or_nav: f.nav || 0,
      changePercent: f.changePercent || 0,
      currency: f.currency || 'INR',
      region: f.region || 'india'
    }));

    const result = {
      sector,
      ticker: ticker || null,
      indexAvailable,
      indexHistory,
      topStocks,
      funds
    };

    this._setCache(cacheKey, result);
    return result;
  }

  async compareSectors(sectors, range = '1y') {
    const results = [];
    for (const sector of sectors) {
      const data = await this.getSectorTrends(sector, range);
      if (data.indexAvailable && data.indexHistory.length > 0) {
        // Base-100 index calculation
        const baseValue = data.indexHistory[0].value;
        const baseHistory = data.indexHistory.map(item => ({
          date: item.date,
          value: parseFloat(((item.value / baseValue) * 100).toFixed(2))
        }));
        results.push({
          sector,
          indexHistory: baseHistory
        });
      } else {
        results.push({
          sector,
          indexHistory: []
        });
      }
    }
    return results;
  }
}

export default new SectorTrendsService();
