import yahooFinanceService from './YahooFinanceService.js';
import unifiedMfService from './UnifiedMfService.js';
import riskAnalyticsService from './RiskAnalyticsService.js';
import sectorBasket from '../config/sectorBasket.js';
import axios from 'axios';

class UnifiedAssetService {
  async getAssetSummary(type, id, region = 'india') {
    if (type === 'stock') {
      const quotesRes = await yahooFinanceService.getQuotes([id]);
      const quotes = quotesRes.available ? quotesRes.data : [];
      if (!quotes || quotes.length === 0) return null;
      const q = quotes[0];
      return {
        type: 'stock',
        id: q.symbol,
        name: q.name,
        currentPrice_or_nav: q.ltp,
        currency: region === 'global' || !id.endsWith('.NS') ? 'USD' : 'INR',
        sector: q.sector || 'General',
        oneYearChangePct: q.changePercent
      };
    } else {
      // Mutual Fund / ETF
      const navHistoryRes = await unifiedMfService.getFundNavHistory(id, region, '1y');
      const navHistory = navHistoryRes && navHistoryRes.data ? navHistoryRes.data : (Array.isArray(navHistoryRes) ? navHistoryRes : []);
      const meta = navHistoryRes && navHistoryRes.meta ? navHistoryRes.meta : null;

      let profile = {};
      if (region === 'india') {
        profile = {
          schemeCode: id,
          schemeName: meta?.scheme_name || id,
          category: meta?.scheme_category || 'Mutual Funds',
          currency: 'INR'
        };
      } else {
        profile = await unifiedMfService.getFundProfile(id, region);
      }
      
      const hasNavHistory = navHistory && navHistory.length > 0;
      const latestNav = hasNavHistory ? navHistory[navHistory.length - 1].value : null;
      const startNav = hasNavHistory ? navHistory[0].value : null;
      const oneYearChangePct = (startNav && startNav > 0) ? parseFloat((((latestNav - startNav) / startNav) * 100).toFixed(2)) : null;

      const riskMetrics = riskAnalyticsService.getRiskMetrics(navHistory);

      let curatedName = 'Unknown Fund';
      for (const sectorName in sectorBasket) {
        const found = sectorBasket[sectorName].funds.find(f => f.id === id);
        if (found && found.name !== id) {
          curatedName = found.name;
          break;
        }
      }

      const finalName = (profile.schemeName && profile.schemeName !== 'Unknown Fund' && profile.schemeName !== id) ? profile.schemeName : curatedName;

      const currentPrice_or_nav = latestNav !== null ? latestNav : (profile.nav || null);
      const navAvailable = currentPrice_or_nav !== null;

      return {
        type: 'mf',
        id: profile.schemeCode || id,
        name: finalName,
        currentPrice_or_nav,
        currency: profile.currency || 'INR',
        sector: profile.category || 'Mutual Funds',
        oneYearChangePct,
        sharpeRatio: riskMetrics.sharpeRatio,
        sortinoRatio: riskMetrics.sortinoRatio,
        navAvailable
      };
    }
  }

  async getAssetDetail(type, id, region = 'india', range = '1yr') {
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

      return {
        ...profile,
        name,
        schemeName: name,
        category,
        nav,
        currentPrice_or_nav: nav,
        oneYearChangePct,
        type: 'mf',
        history: navHistory,
        peers
      };
    }
  }
}

export default new UnifiedAssetService();
