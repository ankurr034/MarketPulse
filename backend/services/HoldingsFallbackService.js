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

  async fetchFinapiHoldings(finapiCode) {
    const cacheKey = `finapi_detail_${finapiCode}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${finapiCode}`, {
        timeout: 15000
      });
      const finapiData = res.data?.data || {};
      
      const holdingsRaw = finapiData.holdings || [];
      
      const formattedHoldings = holdingsRaw.map(h => {
        let weightage = parseFloat(h.weightage);
        if (isNaN(weightage)) weightage = 0.0;
        return {
          Symbol: h.name || "Unknown",
          "Holding Percent": weightage > 1 ? weightage / 100.0 : weightage,
          sector: h.sector || "",
          marketValue: h.marketValue || "",
          change1M: h.change1M || ""
        };
      });
      
      const sectorWeightings = {};
      const sectorsRaw = finapiData.sectors || [];
      if (sectorsRaw.length > 0) {
        let rawSum = 0;
        sectorsRaw.forEach(s => {
          let sw = parseFloat(s.weightage);
          if (!isNaN(sw) && sw > 0) {
            if (sw <= 1.0) sw = sw * 100.0;
            rawSum += sw;
          }
        });

        sectorsRaw.forEach(s => {
          let sw = parseFloat(s.weightage);
          if (!isNaN(sw) && sw > 0) {
            if (sw <= 1.0) sw = sw * 100.0;
            const normalized = (rawSum > 105 || rawSum < 90) && rawSum > 0 ? (sw / rawSum) * 100.0 : sw;
            sectorWeightings[s.sector || "Unknown"] = parseFloat(normalized.toFixed(2));
          }
        });
      } else {
        // Compute from holdings if sectors array is empty
        let rawSum = 0;
        formattedHoldings.forEach(h => {
          const sec = h.sector || 'Other';
          const pct = h["Holding Percent"] * 100.0;
          sectorWeightings[sec] = (sectorWeightings[sec] || 0) + pct;
          rawSum += pct;
        });

        for (const sec in sectorWeightings) {
          const val = sectorWeightings[sec];
          const normalized = (rawSum > 105 || rawSum < 90) && rawSum > 0 ? (val / rawSum) * 100.0 : val;
          sectorWeightings[sec] = parseFloat(normalized.toFixed(2));
        }
      }

      const resolvedAum = finapiData.aum ? parseFloat(String(finapiData.aum).replace(/,/g, '')) : null;
      
      const result = {
        available: true,
        holdings: formattedHoldings,
        sector_weightings: sectorWeightings,
        aum: resolvedAum,
        expenseRatio: finapiData.expenseRatio ? parseFloat(finapiData.expenseRatio) : null,
        high52: finapiData['52WeekHighNav'] || null,
        low52: finapiData['52WeekLowNav'] || null,
        pe: finapiData.pe || null,
        pb: finapiData.pb || null,
        portfolioTurnover: finapiData.portfolioTurnover || null,
        officialReturns: finapiData.returns || null
      };
      
      this._setCache(cacheKey, result);
      return result;
    } catch (e) {
      console.error(`FinAPI holdings fetch failed for code ${finapiCode}: ${e.message}`);
    }
    return null;
  }

  async getHoldings(ticker, schemeName) {
    const cleanTicker = String(ticker).trim();
    if (/^\d+$/.test(cleanTicker)) {
      const directResult = await this.fetchFinapiHoldings(cleanTicker);
      if (directResult && directResult.available !== false) {
        return directResult;
      }

      return {
        available: false,
        reason: "Official portfolio holdings disclosure unavailable for this fund"
      };
    }
    
    return await this.fetchYFinanceHoldings(cleanTicker);
  }

  async getNav(ticker) {
    const cleanTicker = String(ticker).trim();
    if (/^\d+$/.test(cleanTicker)) {
      try {
        const result = await mfDataAggregatorService.getSchemeNavHistory(cleanTicker, 'max');
        if (result && result.available && result.data && result.data.length > 0) {
          return { available: true, data: result.data };
        }
      } catch (e) {
        console.error(`NAV fetch failed for ${cleanTicker}: ${e.message}`);
      }
      return { available: false, reason: "NAV data unavailable" };
    }
    
    try {
      const { default: yahooService } = await import('./YahooFinanceService.js');
      const chart = await yahooService.getChartData(cleanTicker, 'max');
      if (chart && chart.available) {
        const data = chart.data.map(d => ({
          time: d.time,
          value: d.close
        }));
        return { available: true, data };
      }
    } catch (e) {
      console.error(`Yahoo NAV fetch failed for ${cleanTicker}: ${e.message}`);
    }
    
    return { available: false, reason: "NAV data unavailable" };
  }

  /**
   * Get AUM for a specific scheme code.
   * 
   * Fallback chain:
   *   1. Upvaly/FinAPI: GET https://finapi.upvaly.com/api/mf/scheme-code/{schemeCode}
   *      → response.data.data.aum (string with commas, e.g. "12,547.28")
   *      → Verified accurate: e.g. Kotak Technology (152462) returns 504.02 Cr,
   *        matching 5 independent sources (504-526 Cr range).
   *   2. mfdata.in: GET https://mfdata.in/api/v1/schemes/{schemeCode}
   *      → response.data.aum (numeric)
   *      → Known to timeout frequently; used only as fallback.
   *
   * Both failures are logged with scheme code for fast future diagnosis.
   *
   * @param {string} schemeCode - AMFI scheme code
   * @returns {number|null} AUM in Crores, or null if unavailable from all sources
   */
  async getAum(schemeCode) {
    if (!schemeCode) return null;
    const code = String(schemeCode).trim();

    // Source 1: Upvaly/FinAPI (primary)
    // Endpoint: https://finapi.upvaly.com/api/mf/scheme-code/{schemeCode}
    try {
      const finapiData = await this.fetchFinapiHoldings(code);
      if (finapiData && finapiData.aum && !isNaN(finapiData.aum) && Number(finapiData.aum) > 0) {
        return Number(finapiData.aum);
      }
    } catch (e) {
      console.warn(`[AUM Fallback] Upvaly/FinAPI failed for scheme ${code}: ${e.message}`);
    }

    // Source 2: mfdata.in (fallback)
    // Endpoint: https://mfdata.in/api/v1/schemes/{schemeCode}
    try {
      const { default: axios } = await import('axios');
      const res = await axios.get(`https://mfdata.in/api/v1/schemes/${code}`, { timeout: 5000 });
      if (res.data && res.data.aum && !isNaN(res.data.aum) && Number(res.data.aum) > 0) {
        return Number(res.data.aum);
      }
      console.warn(`[AUM Fallback] mfdata.in returned no valid AUM for scheme ${code}`);
    } catch (e) {
      console.warn(`[AUM Fallback] mfdata.in failed for scheme ${code}: ${e.message}`);
    }

    // Both sources exhausted — return null, do NOT fabricate
    return null;
  }
}

export default new HoldingsFallbackService();
