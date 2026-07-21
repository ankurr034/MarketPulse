import yahooFinanceService, { yahooFinance } from './YahooFinanceService.js';
import cacheService from './CacheService.js';

class ETFService {
  constructor() {
    this.categories = {
      gold: {
        name: 'Gold ETFs',
        symbols: ['GLD', 'IAU', 'GOLDBEES.NS', 'NIPGOLD.NS']
      },
      index: {
        name: 'Index ETFs',
        symbols: ['SPY', 'QQQ', 'VTI', 'NIFTYBEES.NS', 'BANKBEES.NS']
      },
      sector: {
        name: 'Sector ETFs',
        symbols: ['XLK', 'XLF', 'XLV', 'XLE', 'XLI']
      },
      technology: {
        name: 'Technology ETFs',
        symbols: ['QQQ', 'XLK', 'VGT', 'SOXX', 'SMH']
      }
    };
  }

  getETFCategories() {
    return Object.keys(this.categories).map(key => ({
      key,
      name: this.categories[key].name,
      count: this.categories[key].symbols.length
    }));
  }

  async getETFsByCategory(category) {
    const basket = this.categories[category];
    if (!basket) return [];

    const cacheKey = `etfs_list_${category}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const quotesRes = await yahooFinanceService.getQuotes(basket.symbols);
    const quotes = quotesRes.available ? quotesRes.data : [];
    cacheService.set(cacheKey, quotes, 'STANDARD');
    return quotes;
  }

  async getETFDetail(symbol) {
    const cacheKey = `etf_detail_${symbol}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const quoteRes = await yahooFinanceService.getQuoteDetail(symbol);
    const quote = quoteRes.available ? quoteRes.data : null;
    if (!quote) return null;

    // Get asset profile / modules using yahooFinance instance directly
    let summary = {};
    try {
      const summaryRes = await yahooFinance.quoteSummary(symbol, { modules: ['topHoldings', 'fundProfile'] });
      summary = {
        holdings: summaryRes?.topHoldings?.holdings || [],
        sectorWeightings: summaryRes?.topHoldings?.sectorWeightings || [],
        expenseRatio: summaryRes?.fundProfile?.feesExpensesInvestment?.expenseRatioValue || 0.002
      };
    } catch (e) {
      console.warn(`Could not get topHoldings/profile for ETF ${symbol}:`, e.message);
    }

    const detail = {
      ...quote,
      holdings: summary.holdings.map(h => ({
        name: h.holdingName || h.symbol,
        allocation: (h.holdingPercent * 100).toFixed(2)
      })),
      expenseRatio: summary.expenseRatio ? (summary.expenseRatio * 100).toFixed(2) + '%' : '0.20%',
      sectorWeightings: summary.sectorWeightings
    };

    cacheService.set(cacheKey, detail, 'STANDARD');
    return detail;
  }
}

export default new ETFService();
