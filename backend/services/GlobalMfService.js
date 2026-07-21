import { yahooFinance } from './YahooFinanceService.js';
import { resolveRangeToDates, stringifyRange } from '../utils/dateRangeUtils.js';

class GlobalMfService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes
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

  async searchSchemes(query) {
    const cacheKey = `search_global_${query}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      if (!query || query.trim().length === 0) return [];
      const res = await yahooFinance.search(query, { newsCount: 0 });
      
      const results = (res.quotes || [])
        .filter(q => {
          const type = q.quoteType?.toUpperCase();
          return type === 'MUTUALFUND' || type === 'ETF';
        })
        .map(q => ({
          schemeCode: q.symbol,
          schemeName: q.shortname || q.longname || q.symbol,
          fundHouse: q.quoteType,
          region: 'global'
        }));

      this._setCache(cacheKey, results);
      return results;
    } catch (err) {
      console.error('Global MF Search Error (Yahoo Finance):', err.message);
      return [];
    }
  }

  async getSchemeNavHistory(schemeCode, range = '1y') {
    const cacheKey = `nav_global_${schemeCode}_${stringifyRange(range)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const parsedRange = resolveRangeToDates(range);
      let period1 = parsedRange.start;

      const res = await yahooFinance.chart(schemeCode, {
        period1,
        interval: '1d'
      });

      const quotes = res?.quotes || [];
      const formatted = quotes.map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        value: item.close
      })).filter(item => item.value !== null && item.value !== undefined);

      if (res.meta && res.meta.firstTradeDate) {
        formatted.earliestDate = res.meta.firstTradeDate * 1000;
      }

      this._setCache(cacheKey, formatted);
      return formatted;
    } catch (err) {
      console.error(`Global MF NAV fetch failed for ${schemeCode}:`, err.message);
      return [];
    }
  }

  async getSchemeHoldings(schemeCode) {
    const cacheKey = `holdings_global_${schemeCode}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      // Use topHoldings and fundProfile
      const quote = await yahooFinance.quoteSummary(schemeCode, { modules: ['topHoldings', 'fundProfile'] });
      
      const topHoldings = quote?.topHoldings?.holdings || [];
      const sectorWeightings = quote?.topHoldings?.sectorWeightings || [];

      // Format holdings
      const holdings = topHoldings.map(h => ({
        stock: h.holdingName || h.symbol,
        allocation: (h.holdingPercent * 100).toFixed(2),
        sector: 'Unknown'
      }));

      // Format sectors
      const sectorBreakdown = {};
      sectorWeightings.forEach(s => {
        const key = Object.keys(s)[0];
        const val = s[key] * 100;
        
        // Pretty print sector names
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
        sectorBreakdown[formattedKey] = parseFloat(val.toFixed(2));
      });

      const result = {
        schemeCode,
        schemeName: schemeCode, // We don't have the full name here easily without another query
        available: holdings.length > 0 || Object.keys(sectorBreakdown).length > 0,
        holdings,
        sectorBreakdown,
        region: 'global',
        expenseRatio: quote?.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio?.fmt ? parseFloat(quote.fundProfile.feesExpensesInvestment.annualReportExpenseRatio.fmt) : null,
        yield: quote?.summaryDetail?.yield?.raw ? (quote.summaryDetail.yield.raw * 100).toFixed(2) : null,
        aum: quote?.summaryDetail?.totalAssets?.raw ? Math.floor(quote.summaryDetail.totalAssets.raw / 1000000) : null,
        sharpeRatio: null
      };

      this._setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.error(`Global MF Holdings fetch failed for ${schemeCode}:`, err.message);
      return {
        schemeCode,
        available: false,
        reason: 'Failed to fetch global MF holdings',
        holdings: [],
        sectorBreakdown: {},
        region: 'global'
      };
    }
  }
}

export default new GlobalMfService();
