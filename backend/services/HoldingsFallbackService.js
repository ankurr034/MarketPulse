import axios from 'axios';
import { yahooFinance } from './YahooFinanceService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';

class HoldingsFallbackService {
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

  async fetchYFinanceHoldings(ticker) {
    try {
      const res = await yahooFinance.quoteSummary(ticker, { modules: ['topHoldings', 'fundProfile'] });
      const topHoldings = res.topHoldings;
      
      if (!topHoldings || !topHoldings.holdings || topHoldings.holdings.length === 0) {
        return { available: false, reason: "Holdings data not available for this ticker in Yahoo Finance." };
      }
      
      const holdings = topHoldings.holdings.map(h => ({
        Symbol: h.symbol || h.holdingName,
        "Holding Percent": h.holdingPercent,
        name: h.holdingName || h.symbol,
        sector: ""
      }));
      
      const sectorWeightings = topHoldings.sectorWeightings || {};
      
      return {
        available: true,
        holdings: holdings,
        sector_weightings: sectorWeightings
      };
    } catch (e) {
      return { available: false, reason: `Failed to parse holdings: ${e.message}` };
    }
  }

  async resolveFinapiSchemeCode(schemeName) {
    if (!schemeName) return null;
    const cacheKey = `finapi_search_${schemeName}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await axios.get("https://finapi.upvaly.com/api/mf/search", {
        params: { schemeName },
        timeout: 15000
      });
      const results = res.data?.data || [];
      if (results.length > 0) {
        const code = String(results[0].schemeCode || "");
        this._setCache(cacheKey, code);
        return code;
      }
    } catch (e) {
      console.error(`FinAPI search failed: ${e.message}`);
    }
    return null;
  }

  async fetchFinapiHoldings(finapiCode) {
    const cacheKey = `finapi_detail_${finapiCode}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${finapiCode}`, {
        params: { fields: "holdings,sectors" },
        timeout: 15000
      });
      const finapiData = res.data?.data || {};
      
      const holdingsRaw = finapiData.holdings || [];
      if (holdingsRaw.length === 0) {
        return null;
      }
      
      const formattedHoldings = holdingsRaw.map(h => {
        let weightage = parseFloat(h.weightage);
        if (isNaN(weightage)) weightage = 0.0;
        return {
          Symbol: h.name || "Unknown",
          "Holding Percent": weightage / 100.0,
          sector: h.sector || "",
          marketValue: h.marketValue || "",
          change1M: h.change1M || ""
        };
      });
      
      const sectorWeightings = {};
      const sectorsRaw = finapiData.sectors || [];
      sectorsRaw.forEach(s => {
        let sw = parseFloat(s.weightage);
        if (isNaN(sw)) sw = 0.0;
        sectorWeightings[s.sector || "Unknown"] = sw / 100.0;
      });
      
      const result = {
        available: true,
        holdings: formattedHoldings,
        sector_weightings: sectorWeightings
      };
      
      this._setCache(cacheKey, result);
      return result;
    } catch (e) {
      console.error(`FinAPI holdings fetch failed for code ${finapiCode}: ${e.message}`);
    }
    return null;
  }

  async getHoldings(ticker, schemeName) {
    if (/^\d+$/.test(ticker)) {
      // Step 1: Search FinAPI by scheme name (most reliable)
      if (schemeName) {
        const finapiCode = await this.resolveFinapiSchemeCode(schemeName);
        if (finapiCode) {
          const result = await this.fetchFinapiHoldings(finapiCode);
          if (result) return result;
        }
      }
      
      // Removed Strategy 2 per user instruction (MFAPI codes and FinAPI codes are distinct).
      
      return {
        available: false,
        reason: "Holdings data not available for this Indian fund. FinAPI could not resolve the scheme."
      };
    }
    
    return await this.fetchYFinanceHoldings(ticker);
  }

  async getNav(ticker) {
    if (/^\d+$/.test(ticker)) {
      // Indian MFs -> Try mfDataAggregator (which fetches from api.mfapi.in and falls back to mfdata.in)
      try {
        const result = await mfDataAggregatorService.getSchemeNavHistory(ticker, 'max');
        if (result && result.available && result.data && result.data.length > 0) {
          return { available: true, data: result.data };
        }
      } catch (e) {
        console.error(`NAV fetch failed for ${ticker}: ${e.message}`);
      }
      return { available: false, reason: "NAV data unavailable" };
    }
    
    // Global ETFs/Stocks -> Yahoo Finance
    try {
      // Import inline or rely on existing yahooFinance functions 
      // Actually we should use YahooFinanceService.getChartData which handles it well
      const { default: yahooService } = await import('./YahooFinanceService.js');
      const chart = await yahooService.getChartData(ticker, 'max');
      if (chart && chart.available) {
        // Just return the close prices as NAV to match format roughly
        const data = chart.data.map(d => ({
          time: d.time,
          value: d.close
        }));
        return { available: true, data };
      }
    } catch (e) {
      console.error(`Yahoo NAV fetch failed for ${ticker}: ${e.message}`);
    }
    
    return { available: false, reason: "NAV data unavailable" };
  }
}

export default new HoldingsFallbackService();
