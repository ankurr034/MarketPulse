// backend/services/ScreenerService.js
import sectorDataService from './SectorDataService.js';
import allFundsDirectoryService from './AllFundsDirectoryService.js';
import indianMfRankingService from './IndianMfRankingService.js';
import cacheService from './CacheService.js';
import { isResearchUsable, DataClassification } from './MarketDataValidator.js';
import { isStrictDirectGrowth, resolveAmcName } from '../utils/schemeFilterUtil.js';

/**
 * ScreenerService
 * Production research-only stock and mutual fund screener.
 *
 * Invariants:
 * 1. Research-only neutral terminology: "Matches criteria", "Research candidate",
 *    "Insufficient data", "Data unavailable". NEVER "BUY", "SELL", "GUARANTEED",
 *    "TARGET PRICE", "SAFE INVESTMENT", etc.
 * 2. Immutable Global Ranking: Filtering by sector, category, AMC, metrics, or search
 *    MUST NEVER recalculate or overwrite global ranks (indiaStockRank, indiaMfRank).
 * 3. Strict Missing-Data Safety: Missing values MUST NOT be coerced to 0 (missing PE != 0,
 *    missing Sharpe != 0, missing AUM != 0). Missing values are excluded from range filters.
 * 4. Data Quality Gate: isResearchUsable ensures only acceptable data enters research calculations.
 */
class ScreenerService {
  constructor() {
    this.CACHE_TTL = 60 * 1000; // 1 minute in memory
  }

  /**
   * Helper to check if a numeric value falls within an optional [min, max] range.
   * If value is missing/null/NaN, returns false if a filter is active (missing != zero).
   */
  _isInRange(val, min, max) {
    if (min === undefined && max === undefined) return true;
    if (val === null || val === undefined || typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      return false; // Missing data cannot satisfy a numeric range filter
    }
    if (min !== undefined && min !== null && min !== '' && val < Number(min)) return false;
    if (max !== undefined && max !== null && max !== '' && val > Number(max)) return false;
    return true;
  }

  /**
   * Stock Research Screener
   */
  async screenStocks(filters = {}) {
    const cacheKey = `screener_stocks_${JSON.stringify(filters)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    // Retrieve full universe of ranked Indian equities
    const allStocks = await sectorDataService.getAllRankedStocks('india', '1D', 'stocks');

    let matchingCandidates = [];
    let insufficientDataCount = 0;

    for (const stk of allStocks) {
      // 1. IDENTITY & CLASSIFICATION FILTERS
      if (filters.exchange) {
        const exTarget = String(filters.exchange).toUpperCase();
        if (stk.exchange !== exTarget && !stk.symbol?.endsWith(`.${exTarget === 'NSE' ? 'NS' : 'BO'}`)) {
          continue;
        }
      }

      if (filters.sector && filters.sector !== 'all') {
        const targetSec = String(filters.sector).toLowerCase();
        const stkSec = String(stk.sector || stk.sectorName || stk.sectorId || '').toLowerCase();
        if (!stkSec.includes(targetSec)) continue;
      }

      if (filters.industry && filters.industry !== 'all') {
        const targetInd = String(filters.industry).toLowerCase();
        const stkInd = String(stk.industry || '').toLowerCase();
        if (!stkInd.includes(targetInd)) continue;
      }

      if (filters.searchTerm) {
        const term = String(filters.searchTerm).toLowerCase().trim();
        const symMatch = stk.symbol?.toLowerCase().includes(term);
        const nameMatch = stk.name?.toLowerCase().includes(term) || stk.companyName?.toLowerCase().includes(term);
        if (!symMatch && !nameMatch) continue;
      }

      // 2. RANK FILTERS (Global rank immutable)
      if (!this._isInRange(stk.indiaStockRank, filters.minRank, filters.maxRank)) continue;

      // 3. SIZE & MARKET CAP FILTERS (in ₹ Cr)
      const mCapCr = stk.marketCapCr ?? (typeof stk.marketCap === 'number' ? stk.marketCap / 10000000 : null);
      if (!this._isInRange(mCapCr, filters.minMarketCapCr, filters.maxMarketCapCr)) continue;

      // 4. VALUATION FILTERS
      if (!this._isInRange(stk.pe, filters.minPe, filters.maxPe)) continue;
      if (!this._isInRange(stk.pb, filters.minPb, filters.maxPb)) continue;
      if (!this._isInRange(stk.evToEbitda, filters.minEvEbitda, filters.maxEvEbitda)) continue;
      if (!this._isInRange(stk.peg, filters.minPeg, filters.maxPeg)) continue;

      // 5. GROWTH FILTERS
      if (!this._isInRange(stk.revenueYoY, filters.minRevenueYoY, filters.maxRevenueYoY)) continue;
      if (!this._isInRange(stk.netProfitYoY, filters.minProfitYoY, filters.maxProfitYoY)) continue;
      if (!this._isInRange(stk.epsGrowth, filters.minEpsGrowth, filters.maxEpsGrowth)) continue;

      // 6. QUALITY & RETURN METRICS
      if (!this._isInRange(stk.roe, filters.minRoe, filters.maxRoe)) continue;
      if (!this._isInRange(stk.roce, filters.minRoce, filters.maxRoce)) continue;

      // 7. FINANCIAL HEALTH
      if (!this._isInRange(stk.debtToEquity, filters.minDebtToEquity, filters.maxDebtToEquity)) continue;
      if (!this._isInRange(stk.interestCoverage, filters.minInterestCoverage, filters.maxInterestCoverage)) continue;
      if (!this._isInRange(stk.currentRatio, filters.minCurrentRatio, filters.maxCurrentRatio)) continue;

      // 8. PROFITABILITY
      if (!this._isInRange(stk.operatingMargin, filters.minOperatingMargin, filters.maxOperatingMargin)) continue;
      if (!this._isInRange(stk.netMargin, filters.minNetMargin, filters.maxNetMargin)) continue;

      // 9. DIVIDENDS
      if (!this._isInRange(stk.dividendYield, filters.minDividendYield, filters.maxDividendYield)) continue;
      if (!this._isInRange(stk.payoutRatio, filters.minPayoutRatio, filters.maxPayoutRatio)) continue;

      // 10. MOMENTUM & TECHNICALS
      const rets = stk.returns || {};
      if (!this._isInRange(rets['1M'], filters.minReturn1M, filters.maxReturn1M)) continue;
      if (!this._isInRange(rets['3M'], filters.minReturn3M, filters.maxReturn3M)) continue;
      if (!this._isInRange(rets['6M'], filters.minReturn6M, filters.maxReturn6M)) continue;
      if (!this._isInRange(rets['1Y'], filters.minReturn1Y, filters.maxReturn1Y)) continue;

      if (!this._isInRange(stk.pctFromATH, filters.minPctFromATH, filters.maxPctFromATH)) continue;
      if (!this._isInRange(stk.pctFrom52WLow, filters.minPctFrom52WLow, filters.maxPctFrom52WLow)) continue;

      // Check research usability status
      const isUsable = isResearchUsable(stk);
      const researchStatus = isUsable ? 'MATCHES_CRITERIA' : 'RESEARCH_CANDIDATE';

      matchingCandidates.push({
        symbol: stk.symbol,
        name: stk.name || stk.companyName || stk.symbol,
        companyName: stk.companyName || stk.name || stk.symbol,
        exchange: stk.exchange || (stk.symbol.endsWith('.BO') ? 'BSE' : 'NSE'),
        sector: stk.sector || stk.sectorName || 'General',
        industry: stk.industry || null,
        // Global ranking is preserved and NEVER mutated
        indiaStockRank: stk.indiaStockRank ?? null,
        marketCap: stk.marketCap ?? null,
        marketCapCr: mCapCr !== null ? Math.round(mCapCr) : null,
        price: stk.price ?? stk.ltp ?? null,
        change: stk.change ?? null,
        changePercent: stk.changePercent ?? null,
        pe: stk.pe ?? null,
        pb: stk.pb ?? null,
        eps: stk.eps ?? null,
        roe: stk.roe ?? null,
        roce: stk.roce ?? null,
        debtToEquity: stk.debtToEquity ?? null,
        revenue: stk.revenue ?? stk.revenueCr ?? null,
        revenueCr: stk.revenueCr ?? stk.revenue ?? null,
        revenueYoY: stk.revenueYoY ?? null,
        netProfit: stk.netProfit ?? null,
        netProfitYoY: stk.netProfitYoY ?? null,
        dividendYield: stk.dividendYield ?? null,
        returns: stk.returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
        fiftyTwoWeekHigh: stk.fiftyTwoWeekHigh ?? stk.allTimeHigh ?? null,
        fiftyTwoWeekLow: stk.fiftyTwoWeekLow ?? stk.week52Low ?? null,
        pctFromATH: stk.pctFromATH ?? null,
        pctFrom52WLow: stk.pctFrom52WLow ?? null,
        // Screener research metadata
        researchClassification: researchStatus,
        researchStatusLabel: 'Matches criteria',
        disclaimer: 'Research candidate for analysis and comparison only. Not investment advice or recommendation.',
        source: stk.source || 'YAHOO_FINANCE',
        dataStatus: stk.dataStatus || 'EOD',
        priceAsOf: stk.priceAsOf || null
      });
    }

    // Sort if requested (default to marketCapCr DESC)
    const sortBy = filters.sortBy || 'marketCapCr';
    const sortDir = filters.sortDirection === 'asc' ? 1 : -1;

    matchingCandidates.sort((a, b) => {
      let va = a[sortBy];
      let vb = b[sortBy];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
      return (va - vb) * sortDir;
    });

    const totalCount = matchingCandidates.length;
    const page = Math.max(1, parseInt(filters.page || 1, 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(filters.pageSize || filters.limit || 50, 10)));
    const offset = (page - 1) * pageSize;
    const pagedResults = matchingCandidates.slice(offset, offset + pageSize);

    const response = {
      screenerType: 'STOCK_RESEARCH_SCREENER',
      universe: 'NSE_BSE_EQUITIES',
      totalCandidatesInUniverse: allStocks.length,
      matchesCount: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      activeFilters: filters,
      results: pagedResults,
      disclaimer: 'Research screener for analytical evaluation only. MarketPulse does not provide buy/sell recommendations, target prices, or return guarantees.'
    };

    cacheService.set(cacheKey, response, 'STANDARD');
    return response;
  }

  /**
   * Mutual Fund Research Screener
   */
  async screenFunds(filters = {}) {
    const cacheKey = `screener_funds_v2_${JSON.stringify(filters)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    // Retrieve active schemes with precomputed canonical AUM rankings
    const allSchemes = await allFundsDirectoryService._loadActiveSchemes();

    let matchingFunds = [];

    for (const fund of allSchemes) {
      // 1. PLAN & OPTION SEPARATION
      const isDirect = isStrictDirectGrowth(fund.schemeName);
      if (filters.plan === 'Direct' && !isDirect) continue;
      if (filters.plan === 'Regular' && isDirect) continue;

      if (filters.option === 'Growth' && !/growth/i.test(fund.schemeName)) continue;
      if (filters.option === 'IDCW' && !/idcw|dividend/i.test(fund.schemeName)) continue;

      // 2. AMC & NAME FILTER
      if (filters.amc && filters.amc !== 'all') {
        const amcTarget = String(filters.amc).toLowerCase().trim();
        const fundAmc = String(fund.amc || fund.fundHouse || '').toLowerCase();
        const fundName = String(fund.schemeName || '').toLowerCase();
        if (!fundAmc.includes(amcTarget) && !fundName.includes(amcTarget)) continue;
      }

      if (filters.searchTerm) {
        const term = String(filters.searchTerm).toLowerCase().trim();
        const nameMatch = fund.schemeName?.toLowerCase().includes(term);
        const codeMatch = String(fund.schemeCode || fund.id || '').includes(term);
        const isinMatch = fund.isin?.toLowerCase().includes(term);
        const amcMatch = fund.amc?.toLowerCase().includes(term);
        if (!nameMatch && !codeMatch && !isinMatch && !amcMatch) continue;
      }

      // 3. CATEGORY & SUBCATEGORY
      if (filters.category && filters.category !== 'all') {
        const catTarget = String(filters.category).toLowerCase().trim();
        const fundCat = String(fund.category || '').toLowerCase();
        if (!fundCat.includes(catTarget)) continue;
      }

      if (filters.subcategory && filters.subcategory !== 'all') {
        const subTarget = String(filters.subcategory).toLowerCase().trim();
        const fundSub = String(fund.subcategory || '').toLowerCase();
        if (!fundSub.includes(subTarget)) continue;
      }

      // 4. AUM RANGE (in ₹ Cr) - Missing != Zero
      const aumVal = fund.aumCr ?? (typeof fund.aum === 'number' ? fund.aum : null);
      if (!this._isInRange(aumVal, filters.minAumCr, filters.maxAumCr)) continue;

      // 5. RANK FILTERS - Global & Category Ranks
      if (!this._isInRange(fund.indiaMfRank, filters.minGlobalRank, filters.maxGlobalRank)) continue;
      if (!this._isInRange(fund.indiaMfCategoryRank, filters.minCategoryRank, filters.maxCategoryRank)) continue;
      if (!this._isInRange(fund.indiaMfSubcategoryRank, filters.minSubcategoryRank, filters.maxSubcategoryRank)) continue;

      // 6. EXPENSE RATIO
      if (!this._isInRange(fund.expenseRatio, filters.minExpenseRatio, filters.maxExpenseRatio)) continue;

      // 7. PERFORMANCE & RETURNS
      const rets = fund.returns || {};
      if (!this._isInRange(rets['1Y'], filters.minReturn1Y, filters.maxReturn1Y)) continue;
      if (!this._isInRange(rets['3Y'], filters.minReturn3Y, filters.maxReturn3Y)) continue;
      if (!this._isInRange(rets['5Y'], filters.minReturn5Y, filters.maxReturn5Y)) continue;
      if (!this._isInRange(rets['SI'] || rets['Since Inception'], filters.minReturnSI, filters.maxReturnSI)) continue;

      // 8. RISK METRICS
      const risk = fund.riskMetrics || {};
      if (!this._isInRange(risk.standardDeviation || fund.volatility, filters.minVolatility, filters.maxVolatility)) continue;
      if (!this._isInRange(risk.sharpeRatio || fund.sharpe, filters.minSharpe, filters.maxSharpe)) continue;
      if (!this._isInRange(risk.sortinoRatio || fund.sortino, filters.minSortino, filters.maxSortino)) continue;
      if (!this._isInRange(risk.maxDrawdown || fund.maxDrawdown, filters.minMaxDrawdown, filters.maxMaxDrawdown)) continue;
      if (!this._isInRange(risk.beta || fund.beta, filters.minBeta, filters.maxBeta)) continue;
      if (!this._isInRange(risk.alpha || fund.alpha, filters.minAlpha, filters.maxAlpha)) continue;

      // 9. PORTFOLIO & ASSET ALLOCATION
      if (!this._isInRange(fund.portfolioCount || fund.holdingsCount, filters.minHoldingsCount, filters.maxHoldingsCount)) continue;
      if (!this._isInRange(fund.equityPct, filters.minEquityPct, filters.maxEquityPct)) continue;
      if (!this._isInRange(fund.debtPct, filters.minDebtPct, filters.maxDebtPct)) continue;
      if (!this._isInRange(fund.cashPct, filters.minCashPct, filters.maxCashPct)) continue;

      matchingFunds.push({
        schemeCode: String(fund.schemeCode || fund.id || '').trim(),
        schemeName: fund.schemeName || fund.name,
        amc: fund.amc || resolveAmcName(fund.schemeName),
        isin: fund.isin || null,
        plan: isDirect ? 'Direct' : 'Regular',
        option: /growth/i.test(fund.schemeName) ? 'Growth' : 'IDCW',
        category: fund.category || 'Other',
        subcategory: fund.subcategory || 'General',
        // Global and local ranks are completely preserved
        indiaMfRank: fund.indiaMfRank ?? null,
        indiaMfCategoryRank: fund.indiaMfCategoryRank ?? null,
        indiaMfSubcategoryRank: fund.indiaMfSubcategoryRank ?? null,
        indiaMfSectorRank: fund.indiaMfSectorRank ?? null,
        aumCr: aumVal !== null ? Math.round(aumVal) : null,
        aumAsOf: fund.aumAsOf || fund.asOf || null,
        aumSource: fund.aumSource || 'Official AMC Disclosure',
        nav: fund.nav ?? fund.currentNav ?? null,
        navDate: fund.navDate || fund.date || null,
        expenseRatio: fund.expenseRatio ?? null,
        returns: fund.returns || { '1M': null, '3M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'SI': null },
        riskMetrics: {
          sharpe: risk.sharpeRatio ?? fund.sharpe ?? null,
          sortino: risk.sortinoRatio ?? fund.sortino ?? null,
          volatility: risk.standardDeviation ?? fund.volatility ?? null,
          beta: risk.beta ?? fund.beta ?? null,
          alpha: risk.alpha ?? fund.alpha ?? null,
          maxDrawdown: risk.maxDrawdown ?? fund.maxDrawdown ?? null
        },
        researchClassification: 'MATCHES_CRITERIA',
        researchStatusLabel: 'Matches criteria',
        disclaimer: 'Research candidate for analytical comparison only. Past performance does not guarantee future results.'
      });
    }

    // Sort if requested (default to aumCr DESC)
    const sortBy = filters.sortBy || 'aumCr';
    const sortDir = filters.sortDirection === 'asc' ? 1 : -1;

    matchingFunds.sort((a, b) => {
      let va = a[sortBy];
      let vb = b[sortBy];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
      return (va - vb) * sortDir;
    });

    const totalCount = matchingFunds.length;
    const page = Math.max(1, parseInt(filters.page || 1, 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(filters.pageSize || filters.limit || 50, 10)));
    const offset = (page - 1) * pageSize;
    const pagedResults = matchingFunds.slice(offset, offset + pageSize);

    const response = {
      screenerType: 'MUTUAL_FUND_RESEARCH_SCREENER',
      universe: 'INDIAN_MUTUAL_FUNDS',
      totalCandidatesInUniverse: allSchemes.length,
      matchesCount: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      activeFilters: filters,
      results: pagedResults,
      disclaimer: 'Research screener for analytical evaluation only. MarketPulse does not provide buy/sell recommendations or return guarantees.'
    };

    cacheService.set(cacheKey, response, 'STANDARD');
    return response;
  }
}

export default new ScreenerService();
