import axios from 'axios';
import { yahooFinance } from './YahooFinanceService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';

class HoldingsFallbackService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  }

  classifySecurityType(name, sector) {
    const normName = String(name || '').toLowerCase();
    const normSector = String(sector || '').toLowerCase();
    if (/future|futures|\bfut\b|option|options|\bopt\b|\bcall\b|\bput\b|cash offset|cash margin|derivatives|hedge/i.test(normName) || /derivative/i.test(normSector)) return 'Derivatives';
    if ((/liquid|treasury|\btbill\b|g-sec|debts?|t-bill|bond|ncd|commercial paper|\bcp\b|certificate of deposit|\bcd\b|debenture|sovereign/i.test(normName) && !/equity|stock/i.test(normName)) || /debt|fixed income|money market/i.test(normSector)) return 'Debt';
    if (/treps|tri-party repo|repo|net receivables|net current asset|cash & cash equivalent|cash balance|bank margin|clearing corporation/i.test(normName) || /cash|receivables/i.test(normSector)) return 'Cash/Receivables';
    if (/\breit\b|\binvit\b|\betf\b|infrastructure trust|real estate investment trust/i.test(normName) || /reit|invit|etf/i.test(normSector)) return 'ETF/REIT';
    return 'Equity';
  }

  _getCached(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  _setCache(key, data) {
    const existing = this.cache.get(key)?.data;
    if (existing && data) {
      if (!data.aum && existing.aum) {
        data.aum = existing.aum;
        data.aumAsOf = existing.aumAsOf;
        data.aumSource = existing.aumSource;
      }
      if (!data.launchYear && existing.launchYear) {
        data.launchYear = existing.launchYear;
        data.launchDate = existing.launchDate;
        data.launchSource = existing.launchSource;
      }
    }
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
    try {
      const res = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${finapiCode}`, {
        timeout: 15000
      });
      const finapiData = res.data?.data || {};
      
      const holdingsRaw = finapiData.holdings || [];
      const portfolioDate = finapiData.latestNavDate || new Date().toISOString().split('T')[0];
      const isin = finapiData.isin || finapiData.schemeIsin || null;

      const cacheKey = `finapi_detail_${finapiCode}_${portfolioDate}`;
      const cached = this._getCached(cacheKey);
      if (cached) return cached;

      let resolvedAum = finapiData.aum ? parseFloat(String(finapiData.aum).replace(/,/g, '')) : null;
      if (isNaN(resolvedAum) || resolvedAum <= 0) resolvedAum = null;

      const formattedHoldings = holdingsRaw.map(h => {
        // Parse weightage: FinAPI weightage is a percentage string like "11.15" (11.15%), "8.99" (8.99%), "0.84" (0.84%)
        const rawWeight = parseFloat(String(h.weightage || '0').replace(/,/g, ''));
        const weightPct = !isNaN(rawWeight) && rawWeight >= 0 ? parseFloat(rawWeight.toFixed(2)) : 0.0;
        const holdingPercent = parseFloat((weightPct / 100.0).toFixed(4));

        // Parse marketValue: FinAPI marketValue is a string like "2,641.85" or "2641.85"
        let marketValNum = null;
        if (h.marketValue) {
          const cleanVal = parseFloat(String(h.marketValue).replace(/₹|,|\s/g, ''));
          if (!isNaN(cleanVal)) {
            marketValNum = parseFloat(cleanVal.toFixed(2));
          }
        }

        // Validate marketValue vs weightPct consistency with verified scheme AUM:
        // Expected value = (AUM * weightPct) / 100
        let validatedMarketVal = marketValNum;
        if (marketValNum !== null && resolvedAum !== null && resolvedAum > 0 && weightPct > 0) {
          const expectedVal = (resolvedAum * weightPct) / 100.0;
          if (marketValNum > expectedVal * 5 || marketValNum < expectedVal / 5) {
            console.warn(`[Snapshot Mismatch] Scheme ${finapiCode} (${h.name}): raw marketValue (${marketValNum}) deviates from expected (${expectedVal.toFixed(2)}) for weight ${weightPct}%. Re-calibrating marketValue.`);
            validatedMarketVal = parseFloat(expectedVal.toFixed(2));
          }
        } else if (marketValNum === null && resolvedAum !== null && resolvedAum > 0 && weightPct > 0) {
          validatedMarketVal = parseFloat(((resolvedAum * weightPct) / 100.0).toFixed(2));
        }

        const stockName = h.name || "Unknown";
        const secType = this.classifySecurityType(stockName, h.sector);
        return {
          name: stockName,
          stock: stockName,
          Symbol: stockName,
          securityId: isin,
          ISIN: isin,
          sector: h.sector || "—",
          securityType: secType,
          weightPct: weightPct,
          marketValueCr: validatedMarketVal,
          valueCr: validatedMarketVal,
          allocation: weightPct.toFixed(2),
          marketValue: validatedMarketVal !== null ? validatedMarketVal.toFixed(2) : null,
          "Holding Percent": weightPct,
          portfolioAsOf: portfolioDate,
          asOf: portfolioDate,
          source: 'Upvaly FinAPI Disclosure',
          change1M: h.change1M || null
        };
      });

      // Sort holdings by weightPct descending so Top 10 contains actual highest-weight holdings
      formattedHoldings.sort((a, b) => (b.weightPct || 0) - (a.weightPct || 0));

      const totalWeight = formattedHoldings.reduce((sum, item) => sum + (item.weightPct || 0), 0);
      console.log(`[HOLDINGS PIPELINE VALIDATED] Scheme: ${finapiCode} | ISIN: ${isin || 'N/A'} | Provider: Upvaly FinAPI | Portfolio Date: ${portfolioDate} | Holdings Count: ${formattedHoldings.length} | Total Weight: ${totalWeight.toFixed(2)}%`);
      
      const sectorWeightings = {};
      const sectorsRaw = finapiData.sectors || [];
      if (sectorsRaw.length > 0) {
        let rawSum = 0;
        sectorsRaw.forEach(s => {
          let sw = parseFloat(String(s.weightage || '0').replace(/,/g, ''));
          if (!isNaN(sw) && sw > 0) {
            rawSum += sw;
          }
        });

        sectorsRaw.forEach(s => {
          let sw = parseFloat(String(s.weightage || '0').replace(/,/g, ''));
          if (!isNaN(sw) && sw > 0) {
            const normalized = (rawSum > 105 || rawSum < 90) && rawSum > 0 ? (sw / rawSum) * 100.0 : sw;
            sectorWeightings[s.sector || "Unknown"] = parseFloat(normalized.toFixed(2));
          }
        });
      } else {
        // Compute from holdings if sectors array is empty
        let rawSum = 0;
        formattedHoldings.forEach(h => {
          const sec = h.sector || 'Other';
          const pct = h.weightPct || 0;
          sectorWeightings[sec] = (sectorWeightings[sec] || 0) + pct;
          rawSum += pct;
        });

        for (const sec in sectorWeightings) {
          const val = sectorWeightings[sec];
          const normalized = (rawSum > 105 || rawSum < 90) && rawSum > 0 ? (val / rawSum) * 100.0 : val;
          sectorWeightings[sec] = parseFloat(normalized.toFixed(2));
        }
      }

      let aumSource = resolvedAum !== null ? 'Upvaly FinAPI Disclosure' : null;
      let aumAsOf = finapiData.latestNavDate || null;

      // Deterministic variant lookup if AUM is unpopulated on this specific scheme code
      if (resolvedAum === null || isNaN(resolvedAum) || resolvedAum <= 0) {
        try {
          let targetName = finapiData.schemeName;
          if (!targetName) {
            const mfMeta = await axios.get(`https://api.mfapi.in/mf/${finapiCode}`, { timeout: 4000 }).catch(() => null);
            targetName = mfMeta?.data?.meta?.scheme_name || null;
          }

          if (targetName) {
            const normName = targetName
              .toLowerCase()
              .replace(/direct\s+plan/g, '')
              .replace(/direct/g, '')
              .replace(/growth\s+option/g, '')
              .replace(/growth/g, '')
              .replace(/[^a-z0-9]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (normName.length > 5) {
              const searchRes = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(normName.slice(0, 25))}`, { timeout: 4000 });
              if (searchRes.data && Array.isArray(searchRes.data)) {
                const variants = searchRes.data.filter(v => String(v.schemeCode) !== String(finapiCode));
                for (const variant of variants.slice(0, 5)) {
                  const vCode = String(variant.schemeCode);
                  const vAxiosRes = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${vCode}`, { timeout: 4000 }).catch(() => null);
                  const vAumRaw = vAxiosRes?.data?.data?.aum;
                  if (vAumRaw) {
                    const vAumVal = parseFloat(String(vAumRaw).replace(/,/g, ''));
                    if (!isNaN(vAumVal) && vAumVal > 0) {
                      resolvedAum = vAumVal;
                      aumSource = 'Upvaly / AMFI Scheme Variant Sync';
                      aumAsOf = vAxiosRes?.data?.data?.latestNavDate || aumAsOf;
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (variantErr) {
          // Keep resolvedAum as null if variant lookup fails
        }
      }
      
      const rawInceptionDate = finapiData.inceptionDate || finapiData.launchDate || null;
      const launchYearMatch = rawInceptionDate ? String(rawInceptionDate).match(/\b(19|20)\d{2}\b/) : null;
      const resolvedLaunchYear = launchYearMatch ? parseInt(launchYearMatch[0], 10) : null;

      const result = {
        available: true,
        holdings: formattedHoldings,
        sector_weightings: sectorWeightings,
        aum: resolvedAum,
        aumAsOf: aumAsOf,
        aumSource: aumSource,
        aumReason: resolvedAum === null ? `Official AMC AUM disclosure unavailable for scheme code ${finapiCode}` : null,
        launchDate: rawInceptionDate,
        launchYear: resolvedLaunchYear,
        launchSource: rawInceptionDate ? 'Upvaly Scheme Disclosure' : null,
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
