import amfiImportService from './AmfiImportService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';
import aiRankingEngineService from './AiRankingEngineService.js';
import { isStrictDirectGrowth, resolveAmcName, resolvePlanAndOption, buildCanonicalIdentity } from '../utils/schemeFilterUtil.js';

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
          aum: (holdingsRes.aum !== null && holdingsRes.aum !== undefined && !isNaN(holdingsRes.aum) && Number(holdingsRes.aum) > 0) ? Number(holdingsRes.aum) : null,
          aumCr: (holdingsRes.aum !== null && holdingsRes.aum !== undefined && !isNaN(holdingsRes.aum) && Number(holdingsRes.aum) > 0) ? Number(holdingsRes.aum) : null,
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

    // Fast mapping from precomputed scheme objects (O(1) memory lookup)
    const rawSchemes = slice.map(s => {
      const returns = s.returns || {};
      const launchYearVal = s.launchYear ?? s.inceptionYear ?? null;
      const cleanAum = (s.aum !== null && s.aum !== undefined && !isNaN(s.aum) && Number(s.aum) > 0) ? Number(s.aum) : null;
      const resolvedAmc = s.amc || s.fundHouse || s.family || resolveAmcName(s.schemeName);
      const { plan, option } = resolvePlanAndOption(s.schemeName);
      const isin = s.isinGrowth || s.isin || null;
      const canonicalKey = `${s.schemeCode}_${isin || 'NOISIN'}_${resolvedAmc.replace(/\s+/g, '')}_${plan}_${option}`;

      return {
        id: String(s.schemeCode),
        schemeCode: String(s.schemeCode),
        name: s.schemeName,
        schemeName: s.schemeName,
        amc: resolvedAmc,
        fundHouse: resolvedAmc,
        family: resolvedAmc,
        plan,
        planType: plan,
        option,
        isin,
        isinGrowth: isin,
        canonicalKey,
        category: s.category || 'Other',
        type: 'mf',
        currency: 'INR',
        region: 'india',
        currentPrice_or_nav: s.nav ?? null,
        nav: s.nav ?? null,
        oneWeekChangePct: s.oneWeekChangePct ?? returns['1W'] ?? null,
        oneMonthChangePct: s.oneMonthChangePct ?? returns['1M'] ?? null,
        threeMonthChangePct: s.threeMonthChangePct ?? returns['3M'] ?? null,
        sixMonthChangePct: s.sixMonthChangePct ?? returns['6M'] ?? null,
        oneYearChangePct: s.oneYearChangePct ?? returns['1Y'] ?? null,
        threeYearCagr: s.threeYearCagr ?? returns['3Y'] ?? null,
        fiveYearCagr: s.fiveYearCagr ?? returns['5Y'] ?? null,
        inceptionCagr: s.inceptionCagr ?? returns['All'] ?? null,
        returns: s.returns || {
          '1D': s.oneDayChangePct ?? null,
          '1W': s.oneWeekChangePct ?? null,
          '1M': s.oneMonthChangePct ?? null,
          '3M': s.threeMonthChangePct ?? null,
          '6M': s.sixMonthChangePct ?? null,
          '1Y': s.oneYearChangePct ?? null,
          '3Y': s.threeYearCagr ?? null,
          '5Y': s.fiveYearCagr ?? null,
          'All': s.inceptionCagr ?? null
        },
        cumulativeReturn: s.oneYearChangePct ?? returns['1Y'] ?? null,
        sharpeRatio: s.sharpeRatio ?? null,
        sortinoRatio: s.sortinoRatio ?? null,
        aum: cleanAum,
        aumCr: cleanAum,
        aumAsOf: s.aumProvenance?.asOf || s.aumAsOf || null,
        aumSource: s.aumProvenance?.source || s.aumSource || (cleanAum ? 'Upvaly FinAPI Disclosure' : null),
        aumReason: cleanAum ? null : 'AUM disclosure unavailable',
        expenseRatio: s.expenseRatio ?? null,
        high52: s.high52 ?? null,
        low52: s.low52 ?? null,
        navAvailable: s.nav !== null && s.nav !== undefined,
        launchYear: launchYearVal,
        inceptionYear: launchYearVal,
        launchDate: s.launchDate ?? null,
        launchSource: s.launchDate ? 'mfapi.in NAV History' : null
      };
    });

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
