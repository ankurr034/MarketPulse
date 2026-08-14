import amfiImportService from './AmfiImportService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';
import aiRankingEngineService from './AiRankingEngineService.js';
import { isStrictDirectGrowth } from '../utils/schemeFilterUtil.js';

class AllFundsDirectoryService {
  constructor() {
    this.CACHE_TTL = 30 * 60 * 1000; // 30 mins
  }

  async _loadActiveSchemes() {
    let activeList = await amfiImportService.getActiveSchemes();
    if (!activeList || activeList.length === 0) {
      const result = await amfiImportService.runAtomicImport();
      activeList = await amfiImportService.getActiveSchemes();
    }
    return activeList;
  }

  async _getNavAndChange(schemeCode, timeframe = '1y') {
    try {
      const holdingsRes = await mfDataAggregatorService.getSchemeHoldings(schemeCode, 'max');
      if (holdingsRes && holdingsRes.available) {
        return {
          currentPrice_or_nav: holdingsRes.nav,
          nav: holdingsRes.nav,
          oneWeekChangePct: holdingsRes.oneWeekChangePct ?? null,
          oneMonthChangePct: holdingsRes.oneMonthChangePct ?? null,
          threeMonthChangePct: holdingsRes.threeMonthChangePct ?? null,
          sixMonthChangePct: holdingsRes.sixMonthChangePct ?? null,
          oneYearChangePct: holdingsRes.oneYearChangePct ?? holdingsRes.cagr,
          threeYearCagr: holdingsRes.threeYearCagr ?? null,
          fiveYearCagr: holdingsRes.fiveYearCagr ?? null,
          inceptionCagr: holdingsRes.inceptionCagr ?? null,
          returns: holdingsRes.returns ?? null,
          cumulativeReturn: holdingsRes.cumulativeReturn ?? null,
          sharpeRatio: holdingsRes.sharpeRatio ?? null,
          sortinoRatio: holdingsRes.sortinoRatio ?? null,
          aum: holdingsRes.aum ?? null,
          aumAsOf: holdingsRes.aumAsOf ?? null,
          aumSource: holdingsRes.aumSource ?? null,
          aumReason: holdingsRes.aumReason ?? null,
          expenseRatio: holdingsRes.expenseRatio ?? null,
          high52: holdingsRes.high52 ?? null,
          low52: holdingsRes.low52 ?? null,
          navAvailable: holdingsRes.nav !== null,
          launchYear: holdingsRes.launchYear ?? null,
          inceptionYear: holdingsRes.inceptionYear ?? null,
          launchDate: holdingsRes.launchDate ?? null,
          launchSource: holdingsRes.launchSource ?? null
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch NAV history for ${schemeCode}: ${e.message}`);
    }

    return {
      currentPrice_or_nav: null,
      nav: null,
      oneWeekChangePct: null,
      oneMonthChangePct: null,
      threeMonthChangePct: null,
      sixMonthChangePct: null,
      oneYearChangePct: null,
      threeYearCagr: null,
      fiveYearCagr: null,
      inceptionCagr: null,
      returns: null,
      cumulativeReturn: null,
      sharpeRatio: null,
      sortinoRatio: null,
      aum: null,
      expenseRatio: null,
      high52: null,
      low52: null,
      navAvailable: false
    };
  }

  async getAllSchemes(page = 1, pageSize = 20, filters = {}) {
    const allSchemes = await this._loadActiveSchemes();
    
    // Strict direct-growth verification
    let filtered = allSchemes.filter(s => isStrictDirectGrowth(s.schemeName));
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        (s.schemeName && s.schemeName.toLowerCase().includes(term)) ||
        (s.schemeCode && String(s.schemeCode).includes(term))
      );
    }
    
    if (filters.amc) {
      const amc = filters.amc.toLowerCase();
      filtered = filtered.filter(s => 
        (s.schemeName && s.schemeName.toLowerCase().includes(amc)) ||
        (s.amc && s.amc.toLowerCase().includes(amc))
      );
    }
    
    if (filters.category) {
      const cat = filters.category.toLowerCase();
      filtered = filtered.filter(s => s.category && s.category.toLowerCase().includes(cat));
    }

    const totalCount = filtered.length;
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const slice = filtered.slice(startIndex, endIndex);

    const chunkSize = 4;
    const rawSchemes = [];
    for (let i = 0; i < slice.length; i += chunkSize) {
      const chunk = slice.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(async s => {
        const navData = await this._getNavAndChange(s.schemeCode, filters.timeframe || '1y');
        return {
          id: String(s.schemeCode),
          schemeCode: String(s.schemeCode),
          name: s.schemeName,
          schemeName: s.schemeName,
          category: s.category || 'Other',
          type: 'mf',
          currency: 'INR',
          region: 'india',
          family: s.amc || s.schemeName.split(' ')[0], 
          ...navData
        };
      }));
      rawSchemes.push(...results);
      if (i + chunkSize < slice.length) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    // Sort schemes if requested by user (1Y Return, AUM, Sharpe, Sortino, NAV)
    const sortBy = filters.sortBy || '1Y';
    if (sortBy === '1Y') {
      rawSchemes.sort((a, b) => (b.oneYearChangePct || b.cumulativeReturn || -999) - (a.oneYearChangePct || a.cumulativeReturn || -999));
    } else if (sortBy === 'AUM') {
      rawSchemes.sort((a, b) => (b.aum || -999) - (a.aum || -999));
    } else if (sortBy === 'Sharpe') {
      rawSchemes.sort((a, b) => (b.sharpeRatio || -999) - (a.sharpeRatio || -999));
    } else if (sortBy === 'Sortino') {
      rawSchemes.sort((a, b) => (b.sortinoRatio || -999) - (a.sortinoRatio || -999));
    } else if (sortBy === 'NAV') {
      rawSchemes.sort((a, b) => (b.currentPrice_or_nav || -999) - (a.currentPrice_or_nav || -999));
    }

    // Compute Category Percentiles and Category Averages
    const schemes = aiRankingEngineService.computeCategoryMetrics(rawSchemes);

    return {
      schemes,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  }
}

export default new AllFundsDirectoryService();
