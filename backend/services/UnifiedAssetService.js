import yahooFinanceService from './YahooFinanceService.js';
import unifiedMfService from './UnifiedMfService.js';
import riskAnalyticsService from './RiskAnalyticsService.js';
import liveMfAnalyticsService from './LiveMfAnalyticsService.js';
import sectorBasket from '../config/sectorBasket.js';
import macroDataService from './MacroDataService.js';
import holdingsFallbackService from './HoldingsFallbackService.js';
import { resolveAmcName, resolvePlanAndOption, buildCanonicalIdentity } from '../utils/schemeFilterUtil.js';
import axios from 'axios';

class UnifiedAssetService {
  constructor() {
    this.summaryCache = new Map();
    this.CACHE_TTL = 15 * 60 * 1000; // 15 mins
  }

  async getAssetSummary(type, id, region = 'india') {
    const cacheKey = `summary_${type}_${id}_${region}`;
    const cached = this.summaryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    if (type === 'stock') {
      const quotesRes = await yahooFinanceService.getQuotes([id]);
      const quotes = quotesRes.available ? quotesRes.data : [];
      if (!quotes || quotes.length === 0) return null;
      const q = quotes[0];
      const result = {
        type: 'stock',
        id: q.symbol,
        name: q.name,
        currentPrice_or_nav: q.ltp,
        currency: region === 'global' || !id.endsWith('.NS') ? 'USD' : 'INR',
        sector: q.sector || 'General',
        changePercent: q.changePercent,
        oneDayChangePct: q.changePercent,
        oneYearChangePct: q.changePercent
      };
      this.summaryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } else {
      // Mutual Fund / ETF
      const navHistoryRes = await unifiedMfService.getFundNavHistory(id, region, 'all');
      const navHistory = navHistoryRes && navHistoryRes.data ? navHistoryRes.data : (Array.isArray(navHistoryRes) ? navHistoryRes : []);
      const meta = navHistoryRes && navHistoryRes.meta ? navHistoryRes.meta : null;

      let profile = {};
      if (region === 'india') {
        profile = {
          schemeCode: id,
          schemeName: meta?.scheme_name || id,
          category: meta?.scheme_category || 'Mutual Funds',
          fundHouse: meta?.fund_house || null,
          isinGrowth: meta?.isin_growth || null,
          currency: 'INR'
        };
      } else {
        profile = await unifiedMfService.getFundProfile(id, region);
      }
      
      const hasNavHistory = navHistory && navHistory.length > 0;
      const latestNav = hasNavHistory ? navHistory[navHistory.length - 1].value : null;
      const startNav = hasNavHistory ? navHistory[0].value : null;
      
      // Calculate full timeframe metrics from NAV history if available
      let calcMetrics = { return1W: null, return1M: null, return3M: null, return6M: null, return1Y: null, return3Y: null, return5Y: null, returnAll: null, sharpeRatio: null, sortinoRatio: null };
      const rfData = await macroDataService.getRiskFreeRate();
      const rfVal = (rfData && typeof rfData.value === 'number') ? rfData.value : null;

      if (hasNavHistory && navHistory.length > 2) {
        liveMfAnalyticsService.setRiskFreeRate(rfVal);
        // Convert to format required by calculateSchemeMetrics (date: "DD-MM-YYYY", nav: value)
        const formattedNavData = [...navHistory].reverse().map(item => ({
          date: new Date(item.time).toLocaleDateString('en-GB').replace(/\//g, '-'),
          nav: item.value
        }));
        calcMetrics = liveMfAnalyticsService.calculateSchemeMetrics(formattedNavData);
      }

      const oneYearChangePct = calcMetrics.return1Y !== null ? calcMetrics.return1Y : ((startNav && startNav > 0) ? parseFloat((((latestNav - startNav) / startNav) * 100).toFixed(2)) : null);
      const riskMetrics = riskAnalyticsService.getRiskMetrics(navHistory, [], rfVal, profile);

      let curatedName = 'Unknown Fund';
      for (const sectorName in sectorBasket) {
        const found = sectorBasket[sectorName].funds.find(f => f.id === id);
        if (found && found.name !== id) {
          curatedName = found.name;
          break;
        }
      }

      const authoritativeSchemeName = (profile.schemeName && profile.schemeName !== 'Unknown Fund' && profile.schemeName !== id) ? profile.schemeName : curatedName;
      const resolvedAmc = resolveAmcName(meta?.fund_house || profile.fundHouse || authoritativeSchemeName);
      const { plan, option } = resolvePlanAndOption(authoritativeSchemeName);
      const isin = meta?.isin_growth || profile.isinGrowth || null;
      const canonicalKey = `${id}_${isin || 'NOISIN'}_${resolvedAmc.replace(/\s+/g, '')}_${plan}_${option}`;

      const currentPrice_or_nav = latestNav !== null ? latestNav : (profile.nav || null);
      const navAvailable = currentPrice_or_nav !== null;

      let aum = null;
      let aumProvenance = { value: null, aumCr: null, source: null, status: 'UNAVAILABLE', asOf: null };
      let expenseRatio = null;
      if (region === 'india' && id && /^\d+$/.test(String(id))) {
        try {
          const aumDetails = await holdingsFallbackService.getAumDetails(String(id));
          if (aumDetails && aumDetails.value !== null && aumDetails.value !== undefined && !isNaN(aumDetails.value) && Number(aumDetails.value) > 0) {
            aum = Number(aumDetails.value);
            aumProvenance = aumDetails;
          } else {
            aum = null;
            aumProvenance = aumDetails || { value: null, aumCr: null, source: null, status: 'UNAVAILABLE', asOf: null };
          }

          const finapiData = await holdingsFallbackService.fetchFinapiHoldings(String(id));
          if (finapiData && finapiData.available) {
            expenseRatio = finapiData.expenseRatio ?? null;
          }
        } catch (e) {
          console.warn(`FinAPI AUM fetch warning for ${id}:`, e.message);
        }
      }

      const result = {
        type: 'mf',
        id: profile.schemeCode || id,
        schemeCode: profile.schemeCode || id,
        name: authoritativeSchemeName,
        schemeName: authoritativeSchemeName,
        amc: resolvedAmc,
        fundHouse: resolvedAmc,
        family: resolvedAmc,
        plan,
        planType: plan,
        option,
        isin,
        isinGrowth: isin,
        canonicalKey,
        currentPrice_or_nav,
        currency: profile.currency || 'INR',
        sector: profile.category || 'Mutual Funds',
        oneDayChangePct: calcMetrics.return1D ?? null,
        oneWeekChangePct: calcMetrics.return1W,
        oneMonthChangePct: calcMetrics.return1M,
        threeMonthChangePct: calcMetrics.return3M,
        sixMonthChangePct: calcMetrics.return6M,
        oneYearChangePct,
        threeYearCagr: calcMetrics.return3Y,
        fiveYearCagr: calcMetrics.return5Y,
        inceptionCagr: calcMetrics.returnAll,
        returns: {
          '1D': calcMetrics.return1D ?? null,
          '1W': calcMetrics.return1W,
          '1M': calcMetrics.return1M,
          '3M': calcMetrics.return3M,
          '6M': calcMetrics.return6M,
          '1Y': oneYearChangePct,
          '3Y': calcMetrics.return3Y,
          '5Y': calcMetrics.return5Y,
          'All': calcMetrics.returnAll
        },

        sharpeRatio: (riskMetrics && riskMetrics.sharpeRatio !== null) ? riskMetrics.sharpeRatio : calcMetrics.sharpeRatio,
        sortinoRatio: (riskMetrics && riskMetrics.sortinoRatio !== null) ? riskMetrics.sortinoRatio : calcMetrics.sortinoRatio,
        launchYear: calcMetrics.launchYear ?? null,
        inceptionYear: calcMetrics.inceptionYear ?? null,
        launchDate: calcMetrics.launchDate ?? null,
        aum,
        aumCr: aum,
        aumAsOf: aumProvenance?.asOf || null,
        aumSource: aumProvenance?.source || (aum ? 'Upvaly FinAPI Disclosure' : null),
        aumStatus: aumProvenance?.status || (aum ? 'PROVIDER_REPORTED' : 'UNAVAILABLE'),
        aumProvenance: aumProvenance || {
          value: aum,
          aumCr: aum,
          source: aum ? 'Upvaly FinAPI Disclosure' : null,
          status: aum ? 'PROVIDER_REPORTED' : 'UNAVAILABLE',
          asOf: null
        },
        expenseRatio,
        navAvailable
      };
      this.summaryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  }

  async getAssetDetail(type, id, region = 'india', range = 'all') {
    if (type === 'stock') {
      const detailRes = await yahooFinanceService.getQuoteDetail(id);
      const detail = detailRes.available ? detailRes.data : null;
      const chartRes = await yahooFinanceService.getChartData(id, range);
      const chart = chartRes.available ? chartRes.data : [];

      let rangeChangePct = detail?.changePercent || detail?.oneYearChangePct;
      if (chart && chart.length >= 2) {
        const firstVal = chart[0].close || chart[0].value || chart[0].price;
        const lastVal = chart[chart.length - 1].close || chart[chart.length - 1].value || chart[chart.length - 1].price;
        if (firstVal && lastVal && firstVal > 0) {
          rangeChangePct = parseFloat((((lastVal - firstVal) / firstVal) * 100).toFixed(2));
        }
      }

      return {
        ...detail,
        oneYearChangePct: rangeChangePct,
        type: 'stock',
        history: chart
      };
    } else {
      const profile = await unifiedMfService.getFundProfile(id, region);
      const navHistoryRes = await unifiedMfService.getFundNavHistory(id, region, range);
      const navHistory = navHistoryRes && navHistoryRes.data ? navHistoryRes.data : (Array.isArray(navHistoryRes) ? navHistoryRes : []);
      
      let nav = profile?.nav;
      let oneYearChangePct = profile?.oneYearChangePct;

      if (navHistory && navHistory.length > 0) {
        const latestVal = navHistory[navHistory.length - 1].value;
        if (!nav) nav = latestVal;

        if (oneYearChangePct === undefined || oneYearChangePct === null) {
          const firstVal = navHistory[0].value;
          if (firstVal > 0) {
            oneYearChangePct = ((latestVal - firstVal) / firstVal) * 100;
          }
        }
      }

      const name = profile?.schemeName && profile?.schemeName !== 'Unknown Fund' ? profile.schemeName : (navHistoryRes?.meta?.scheme_name || profile?.schemeName || 'Unknown Fund');
      const category = profile?.category || navHistoryRes?.meta?.scheme_category || null;

      let peers = [];
      for (const sectorName in sectorBasket) {
        const sector = sectorBasket[sectorName];
        if (sector.funds.some(f => f.id === id)) {
          peers = sector.funds.filter(f => f.id !== id && f.region === region).map(f => ({
            id: f.id,
            name: f.name,
            family: f.family,
            currency: f.currency,
            sector: sectorName
          }));
          break;
        }
      }

      const resolvedAum = profile?.aum !== null && profile?.aum !== undefined && !isNaN(profile.aum) && Number(profile.aum) > 0 ? Number(profile.aum) : null;

      return {
        ...profile,
        name,
        schemeName: name,
        category,
        nav,
        currentPrice_or_nav: nav,
        oneYearChangePct,
        aum: resolvedAum,
        aumCr: resolvedAum,
        aumProvenance: profile?.aumProvenance || { value: resolvedAum, aumCr: resolvedAum, source: resolvedAum ? 'Upvaly FinAPI Disclosure' : null, status: resolvedAum ? 'PROVIDER_REPORTED' : 'UNAVAILABLE' },
        type: 'mf',
        history: navHistory,
        peers
      };
    }
  }
}

export default new UnifiedAssetService();
