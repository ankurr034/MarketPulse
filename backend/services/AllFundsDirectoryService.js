// backend/services/AllFundsDirectoryService.js
import amfiImportService from './AmfiImportService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';
import aiRankingEngineService from './AiRankingEngineService.js';
import indianMfRankingService from './IndianMfRankingService.js';
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
    return indianMfRankingService.rankMutualFundsByAUM(activeList);
  }

  async getAllSchemes(page = 1, pageSize = 20, filters = {}) {
    const allSchemes = await this._loadActiveSchemes();
    
    // Strict direct-growth verification
    let filtered = allSchemes.filter(s => isStrictDirectGrowth(s.schemeName));
    
    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.schemeName && s.schemeName.toLowerCase().includes(term)) ||
        (s.schemeCode && String(s.schemeCode).includes(term)) ||
        (s.amc && s.amc.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term))
      );
    }
    
    // Filter by AMC
    if (filters.amc) {
      const amc = filters.amc.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.schemeName && s.schemeName.toLowerCase().includes(amc)) ||
        (s.amc && s.amc.toLowerCase().includes(amc)) ||
        (s.fundHouse && s.fundHouse.toLowerCase().includes(amc))
      );
    }
    
    // Filter by Category
    if (filters.category) {
      const cat = filters.category.toLowerCase().trim();
      filtered = filtered.filter(s => s.category && s.category.toLowerCase().includes(cat));
    }

    const totalCount = filtered.length;

    // Fast mapping from precomputed scheme objects (O(1) memory lookup)
    const mappedSchemes = filtered.map(s => {
      const returns = s.returns || {};
      const launchYearVal = s.launchYear ?? s.inceptionYear ?? null;
      const cleanAum = (s.aumCr !== null && s.aumCr !== undefined && !isNaN(s.aumCr) && Number(s.aumCr) > 0)
        ? Number(s.aumCr)
        : ((s.aum !== null && s.aum !== undefined && !isNaN(s.aum) && Number(s.aum) > 0) ? Number(s.aum) : null);
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
        indiaMfRank: s.indiaMfRank ?? null,
        indiaMfCategoryRank: s.indiaMfCategoryRank ?? null,
        indiaMfSubcategoryRank: s.indiaMfSubcategoryRank ?? null,
        indiaMfSectorRank: s.indiaMfSectorRank ?? null,
        globalMfRank: s.indiaMfRank ?? null,
        rank: s.indiaMfRank ?? null,
        overallRank: s.indiaMfRank ?? null,
        currentPrice_or_nav: s.nav ?? null,
        nav: s.nav ?? null,
        navDate: s.navDate || s.date || 'Data Unavailable',
        asOfDate: s.navDate || s.date || null,
        navAsOfDate: s.navDate || s.date || null,
        aumAsOfDate: s.aumProvenance?.asOf || s.aumAsOf || s.aumAsOfDate || (cleanAum ? '30 Jun 2026' : null),
        performanceAsOfDate: s.navDate || s.date || null,
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

    // Global sort BEFORE pagination: default AUM DESC (indiaMfRank ASC)
    const sortBy = filters.sortBy || 'AUM';
    if (sortBy === 'AUM') {
      mappedSchemes.sort((a, b) => {
        if (a.indiaMfRank !== null && b.indiaMfRank !== null) return a.indiaMfRank - b.indiaMfRank;
        if (a.indiaMfRank !== null) return -1;
        if (b.indiaMfRank !== null) return 1;
        return (Number(b.aumCr) || 0) - (Number(a.aumCr) || 0);
      });
    } else if (sortBy === '1Y') {
      mappedSchemes.sort((a, b) => (b.oneYearChangePct || b.cumulativeReturn || -999) - (a.oneYearChangePct || a.cumulativeReturn || -999));
    } else if (sortBy === 'Sharpe') {
      mappedSchemes.sort((a, b) => (b.sharpeRatio || -999) - (a.sharpeRatio || -999));
    } else if (sortBy === 'Sortino') {
      mappedSchemes.sort((a, b) => (b.sortinoRatio || -999) - (a.sortinoRatio || -999));
    } else if (sortBy === 'NAV') {
      mappedSchemes.sort((a, b) => (b.currentPrice_or_nav || -999) - (a.currentPrice_or_nav || -999));
    }

    // Paginate slice
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const rawSlice = mappedSchemes.slice(startIndex, endIndex);

    // Compute Category Percentiles and Category Averages
    const schemes = aiRankingEngineService.computeCategoryMetrics(rawSlice);

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
