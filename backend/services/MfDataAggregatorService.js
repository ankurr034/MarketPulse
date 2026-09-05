import axios from 'axios';
import symbolResolver from './SymbolResolver.js';
import yahooFinanceService from './YahooFinanceService.js';
import { resolveRangeToDates, stringifyRange } from '../utils/dateRangeUtils.js';
import sectorBasket from '../config/sectorBasket.js';
import holdingsFallbackService from './HoldingsFallbackService.js';
import riskAnalyticsService from './RiskAnalyticsService.js';
import aiRankingEngineService from './AiRankingEngineService.js';
import mfapiCacheService from './MfapiCacheService.js';
import officialAmcPortfolioService from './OfficialAmcPortfolioService.js';

class MfDataAggregatorService {
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
    const cacheKey = `search_${query}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, { timeout: 15000 });
      const results = (res.data || [])
        .filter(scheme => {
          if (!scheme.schemeName) return false;
          const lower = scheme.schemeName.toLowerCase();
          const isEtfOrCommodity = lower.includes('etf') || lower.includes('bees') || lower.includes('gold') || lower.includes('silver') || lower.includes('commodity');

          if (!isEtfOrCommodity) {
            const isDirect = lower.includes('direct') || lower.includes('-dir') || lower.includes('(dir)') || lower.includes(' dir ');
            const isGrowth = lower.includes('growth') || lower.includes('-gr') || lower.includes('(gr)') || lower.includes(' gr ');
            if (!isDirect || !isGrowth) return false;

            const broadForbidden = /(idcw|dividend|payout|reinvest|bonus|regular)/i;
            if (broadForbidden.test(lower)) return false;

            const boundaryForbidden = /\b(reg|div)\b/i;
            if (boundaryForbidden.test(lower)) return false;
          }

          return true;
        })
        .map(scheme => ({
          schemeCode: String(scheme.schemeCode),
          schemeName: scheme.schemeName,
          fundHouse: scheme.schemeName.split(' ')[0] || 'Unknown'
        }));

      this._setCache(cacheKey, results);
      return results;
    } catch (err) {
      console.error('MF Search Error (api.mfapi.in):', err.message);
      return [];
    }
  }

  async getSchemeNavHistory(schemeCode, range = '1y') {
    const cacheKey = `nav_${schemeCode}_${stringifyRange(range)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    let data = null;
    let meta = null;

    try {
      const schemeData = await mfapiCacheService.getSchemeData(schemeCode);
      if (schemeData && schemeData.data && Array.isArray(schemeData.data) && schemeData.data.length > 0) {
        data = this._formatNavDataMfApi(schemeData.data, range);
        meta = schemeData.meta;
      }
    } catch (err) {
      console.warn(`api.mfapi.in NAV fetch failed for ${schemeCode}: ${err.message}`);
    }

    if (!data || data.length === 0) {
      const result = { available: false, data: [], reason: 'NAV data unavailable from official sources' };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() - (this.CACHE_TTL - 60000) });
      return result;
    }

    const result = { available: true, data, meta };
    this._setCache(cacheKey, result);
    return result;
  }

  async getSchemeHoldings(schemeCode, timeframe = 'all') {
    const cleanCode = String(schemeCode || '').trim();
    const cacheKey = `holdings_${cleanCode}_${timeframe}_dynamic`;
    const cached = this._getCached(cacheKey);
    if (cached && String(cached.schemeCode) === cleanCode) return cached;

    const maxNavHistoryRes = await this.getSchemeNavHistory(cleanCode, 'max');
    const fullNavHistory = maxNavHistoryRes && maxNavHistoryRes.data ? maxNavHistoryRes.data : [];

    const navHistoryRes = (timeframe === 'max' || timeframe === 'all') ? maxNavHistoryRes : await this.getSchemeNavHistory(cleanCode, timeframe);
    const navHistory = navHistoryRes && navHistoryRes.data ? navHistoryRes.data : [];
    const meta = maxNavHistoryRes && maxNavHistoryRes.meta ? maxNavHistoryRes.meta : null;

    const schemeName = meta ? meta.scheme_name : `Scheme ${cleanCode}`;
    const category = meta ? meta.scheme_category : 'Equity Scheme';

    const aiEvaluation = aiRankingEngineService.evaluateAssetRiskAndPerformance(navHistory, [], timeframe);

    let holdings = [];
    let positions = [];
    let sectorBreakdown = {};
    let holdingsAvailable = false;
    let holdingsReason = "Official portfolio holdings disclosure unavailable for this fund";
    let holdingsAsOf = null;
    let holdingsSource = null;
    let aum = null;
    let expenseRatio = null;
    let high52 = null;
    let low52 = null;
    let pe = null;
    let pb = null;
    let finapiRes = null;

    let officialMeta = null;

    // 1. Primary authoritative source: Official AMC Portfolio Disclosure
    try {
      const officialRes = await officialAmcPortfolioService.getSchemeHoldings(cleanCode);
      if (officialRes && officialRes.available && officialRes.positions && officialRes.positions.length > 0 && String(officialRes.schemeCode) === cleanCode) {
        officialMeta = officialRes;
        positions = officialRes.positions;
        holdings = officialRes.positions;
        sectorBreakdown = officialRes.sectorBreakdown || {};
        holdingsAvailable = true;
        holdingsReason = null;
        holdingsAsOf = officialRes.holdingsAsOf;
        holdingsSource = officialRes.source;
        if (officialRes.portfolioAumCr && !isNaN(officialRes.portfolioAumCr)) {
          aum = Number(officialRes.portfolioAumCr);
        }
      }
    } catch (amcErr) {
      console.warn(`Official AMC portfolio check warning for scheme ${cleanCode}:`, amcErr.message);
    }

    // 2. Fetch FinAPI for auxiliary fundamentals (expenseRatio, pe, pb) or fallback holdings
    try {
      finapiRes = await holdingsFallbackService.fetchFinapiHoldings(schemeCode);
      if (finapiRes) {
        if (!holdingsAvailable && finapiRes.available && finapiRes.holdings && finapiRes.holdings.length > 0) {
          positions = finapiRes.holdings;
          holdings = finapiRes.holdings;
          sectorBreakdown = finapiRes.sector_weightings || {};
          holdingsAvailable = true;
          holdingsReason = null;
          holdingsAsOf = finapiRes.holdings[0]?.portfolioAsOf || null;
          holdingsSource = 'Upvaly FinAPI Disclosure';
        }
        expenseRatio = finapiRes.expenseRatio ?? null;
        high52 = finapiRes.high52 ?? null;
        low52 = finapiRes.low52 ?? null;
        pe = finapiRes.pe ?? null;
        pb = finapiRes.pb ?? null;
        if (aum === null && finapiRes.aum !== null && finapiRes.aum !== undefined && !isNaN(finapiRes.aum) && Number(finapiRes.aum) > 0) {
          aum = Number(finapiRes.aum);
        }
      }
    } catch (finErr) {
      console.warn(`FinAPI fetch warning for scheme ${schemeCode}:`, finErr.message);
    }

    if (aum === null) {
      try {
        const aumDetails = await holdingsFallbackService.getAumDetails(schemeCode);
        if (aumDetails && aumDetails.value !== null && aumDetails.value !== undefined && !isNaN(aumDetails.value) && Number(aumDetails.value) > 0) {
          aum = Number(aumDetails.value);
        }
      } catch (aumErr) {}
    }

    let benchmark = 'Nifty 50 TRI';
    if (category.toLowerCase().includes('mid cap')) benchmark = 'Nifty Midcap 150 TRI';
    else if (category.toLowerCase().includes('small cap')) benchmark = 'Nifty Smallcap 250 TRI';
    else if (category.toLowerCase().includes('tech') || category.toLowerCase().includes('it')) benchmark = 'Nifty IT TRI';
    else if (category.toLowerCase().includes('bank') || category.toLowerCase().includes('finan')) benchmark = 'Nifty Bank TRI';
    else if (category.toLowerCase().includes('pharma') || category.toLowerCase().includes('health')) benchmark = 'Nifty Healthcare TRI';
    else if (category.toLowerCase().includes('momentum') || schemeName.toLowerCase().includes('momentum')) benchmark = 'Nifty 200 Momentum 30 TRI';

    const latestNav = navHistory.length > 0 ? navHistory[navHistory.length - 1].value : null;

    let calcMetrics = { return1W: null, return1M: null, return3M: null, return6M: null, return1Y: null, return3Y: null, return5Y: null, returnAll: null, returns: null, sharpeRatio: null, sortinoRatio: null, riskRatios: null };
    const navCalcHistory = fullNavHistory.length > 0 ? fullNavHistory : navHistory;
    if (navCalcHistory && navCalcHistory.length > 2) {
      const { default: liveMfAnalyticsService } = await import('./LiveMfAnalyticsService.js');
      // Ensure risk-free rate is set before computing risk metrics
      if (liveMfAnalyticsService.riskFreeRate === null || liveMfAnalyticsService.riskFreeRate === undefined) {
        try {
          const { default: macroDataService } = await import('./MacroDataService.js');
          const rfData = await macroDataService.getRiskFreeRate();
          if (rfData && typeof rfData.value === 'number' && rfData.value > 0) {
            liveMfAnalyticsService.setRiskFreeRate(rfData.value);
          } else {
            liveMfAnalyticsService.setRiskFreeRate(0.0625);
          }
        } catch (e) {
          liveMfAnalyticsService.setRiskFreeRate(0.0625);
        }
      }
      const formattedNavData = [...navCalcHistory].reverse().map(item => {
        const d = new Date(item.time);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return {
          date: `${day}-${month}-${year}`,
          nav: item.value,
          time: item.time
        };
      });
      calcMetrics = liveMfAnalyticsService.calculateSchemeMetrics(formattedNavData);
    }

    const result = {
      available: true,
      schemeCode: cleanCode,
      schemeName: schemeName,
      category: category,
      fundManager: meta ? (meta.fund_house || 'Mutual Fund AMC') : 'Mutual Fund Management Team',
      benchmark: benchmark,
      risk: category.toLowerCase().includes('debt') ? 'Moderate' : 'Very High',
      asOfDate: holdingsAsOf || new Date().toLocaleDateString('en-IN'),
      nav: latestNav,
      holdingsAvailable,
      holdingsReason,
      dataStatus: holdingsAvailable ? 'DATA_AVAILABLE' : 'DATA_UNAVAILABLE',
      holdingsAsOf: holdingsAsOf || null,
      holdingsSource: holdingsSource || null,
      sourceUrl: officialMeta?.sourceUrl || null,
      sourceFile: officialMeta?.sourceFile || null,
      fetchedAt: officialMeta?.fetchedAt || null,
      amc: officialMeta?.amc || meta?.fund_house || null,
      AMC: officialMeta?.AMC || meta?.fund_house || null,
      plan: officialMeta?.plan || 'Direct Plan',
      option: officialMeta?.option || 'Growth',
      isin: officialMeta?.isin || meta?.isin_growth || null,
      ISIN: officialMeta?.ISIN || meta?.isin_growth || null,
      totalDisclosedPositionsCount: officialMeta?.totalDisclosedPositionsCount || (holdingsAvailable ? positions.length : 0),
      eligibleStockPositionsCount: officialMeta?.eligibleStockPositionsCount || (holdingsAvailable ? positions.filter(p => p.securityType === 'Equity' || p.securityType === 'Foreign Equity' || p.securityType === 'ETF/REIT').length : 0),
      positions: positions,
      holdings: holdings,
      sectorBreakdown: sectorBreakdown,
      oneDayChangePct: calcMetrics.return1D ?? null,
      oneWeekChangePct: calcMetrics.return1W,
      oneMonthChangePct: calcMetrics.return1M,
      threeMonthChangePct: calcMetrics.return3M,
      sixMonthChangePct: calcMetrics.return6M,
      oneYearChangePct: calcMetrics.return1Y !== null ? calcMetrics.return1Y : aiEvaluation.cagr,
      threeYearCagr: calcMetrics.return3Y,
      fiveYearCagr: calcMetrics.return5Y,
      inceptionCagr: calcMetrics.returnAll,
      returns: calcMetrics.returns || {
        '1D': calcMetrics.return1D ?? null,
        '1W': calcMetrics.return1W,
        '1M': calcMetrics.return1M,
        '3M': calcMetrics.return3M,
        '6M': calcMetrics.return6M,
        '1Y': calcMetrics.return1Y !== null ? calcMetrics.return1Y : aiEvaluation.cagr,
        '3Y': calcMetrics.return3Y,
        '5Y': calcMetrics.return5Y,
        'All': calcMetrics.returnAll
      },

      // Dynamic Risk Engine Output
      timeframe,
      cagr: calcMetrics.return1Y !== null ? calcMetrics.return1Y : aiEvaluation.cagr,
      cumulativeReturn: aiEvaluation.cumulativeReturn,
      sharpeRatio: calcMetrics.sharpeRatio !== null ? calcMetrics.sharpeRatio : aiEvaluation.sharpeRatio,
      sortinoRatio: calcMetrics.sortinoRatio !== null ? calcMetrics.sortinoRatio : aiEvaluation.sortinoRatio,
      alpha: aiEvaluation.alpha,
      riskRatios: calcMetrics.riskRatios,
      beta: aiEvaluation.beta,
      volatility: aiEvaluation.volatility,
      maxDrawdown: aiEvaluation.maxDrawdown,
      aiEvaluation: aiEvaluation,
      // Official AMC Reported Fundamentals
      expenseRatio: expenseRatio,
      aum: (aum !== null && aum !== undefined && !isNaN(aum) && Number(aum) > 0) ? Number(aum) : null,
      aumCr: (aum !== null && aum !== undefined && !isNaN(aum) && Number(aum) > 0) ? Number(aum) : null,
      aumAsOf: finapiRes?.aumAsOf ?? null,
      aumSource: finapiRes?.aumSource ?? ((aum !== null && aum > 0) ? 'Upvaly FinAPI Disclosure' : null),
      aumReason: finapiRes?.aumReason ?? ((aum !== null && aum > 0) ? null : `Official AMC AUM disclosure unavailable for scheme code ${schemeCode}`),
      high52: high52,
      low52: low52,
      pe: pe,
      pb: pb,
      launchYear: calcMetrics.launchYear ?? finapiRes?.launchYear ?? null,
      inceptionYear: calcMetrics.launchYear ?? finapiRes?.launchYear ?? null,
      launchDate: calcMetrics.launchDate ?? finapiRes?.launchDate ?? null,
      launchSource: calcMetrics.launchSource ?? finapiRes?.launchSource ?? null
    };

    this._setCache(cacheKey, result);
    return result;
  }

  _formatNavDataMfApi(navArray, range) {
    const parsed = navArray.map(n => {
      const parts = n.date.split('-');
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
      return {
        time: d.getTime(),
        value: parseFloat(n.nav)
      };
    }).sort((a, b) => a.time - b.time);

    const result = this._filterByRange(parsed, range);
    if (parsed.length > 0) result.earliestDate = parsed[0].time;
    return result;
  }

  _filterByRange(data, range) {
    if (data.length === 0) return [];
    const parsedRange = resolveRangeToDates(range);
    
    const startTime = parsedRange.start.getTime();
    const endTime = parsedRange.end.getTime();
    const filtered = data.filter(d => d.time >= startTime && d.time <= endTime);
    
    if (filtered.length === 0 && data.length > 0) {
      return data;
    }
    
    return filtered;
  }
}

export default new MfDataAggregatorService();
