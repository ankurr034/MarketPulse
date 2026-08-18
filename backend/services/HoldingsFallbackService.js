import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { yahooFinance } from './YahooFinanceService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISK_CACHE_PATHS = [
  path.resolve('data/verified_aum_cache.json'),
  path.resolve('backend/data/verified_aum_cache.json'),
  path.resolve(__dirname, '../data/verified_aum_cache.json'),
  path.resolve(__dirname, '../../data/verified_aum_cache.json')
];

class HoldingsFallbackService {
  constructor() {
    this.cache = new Map();
    this.failedHoldings = new Map(); // schemeCode -> timestamp
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    this.FAILED_TTL = 5 * 60 * 1000; // 5 minutes negative cache
    this.finapiOfflineUntil = 0;
    this.mfdataOfflineUntil = 0;
    this._loadDiskCache();
  }

  _loadDiskCache() {
    let totalLoaded = 0;
    for (const p of DISK_CACHE_PATHS) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.disclosures && typeof parsed.disclosures === 'object') {
            for (const [code, item] of Object.entries(parsed.disclosures)) {
              if (item && typeof item.value === 'number' && item.value > 0) {
                if (!this.cache.has(`aum_details_${code}`)) {
                  this.cache.set(`aum_details_${code}`, { data: item, timestamp: Date.now() });
                  totalLoaded++;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Failed reading AUM disk cache from ${p}:`, e.message);
      }
    }
    console.log(`⚡ Pre-loaded ${totalLoaded} verified scheme AUM records from disk cache`);
  }

  _saveDiskCache(code, item) {
    if (!code || !item || !item.value || item.value <= 0) return;
    for (const targetPath of DISK_CACHE_PATHS) {
      try {
        const dir = path.dirname(targetPath);
        if (fs.existsSync(dir)) {
          let existing = { lastUpdated: new Date().toISOString(), disclosures: {} };
          if (fs.existsSync(targetPath)) {
            try { existing = JSON.parse(fs.readFileSync(targetPath, 'utf8')); } catch (e) {}
          }
          existing.disclosures = existing.disclosures || {};
          existing.disclosures[String(code)] = item;
          existing.lastUpdated = new Date().toISOString();
          fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2), 'utf8');
        }
      } catch (e) {}
    }
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
    const cacheKey = `yf_holdings_${ticker}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await yahooFinance.quoteSummary(ticker, { modules: ['topHoldings', 'fundProfile'] });
      const topHoldings = res.topHoldings;
      
      if (!topHoldings || !topHoldings.holdings || topHoldings.holdings.length === 0) {
        const unavailable = { available: false, reason: "Holdings data not available for this ticker in Yahoo Finance." };
        this._setCache(cacheKey, unavailable);
        return unavailable;
      }
      
      const holdings = topHoldings.holdings.map(h => ({
        Symbol: h.symbol || h.holdingName,
        "Holding Percent": h.holdingPercent,
        name: h.holdingName || h.symbol,
        sector: ""
      }));
      
      const sectorWeightings = topHoldings.sectorWeightings || {};
      
      const result = {
        available: true,
        holdings: holdings,
        sector_weightings: sectorWeightings
      };
      this._setCache(cacheKey, result);
      return result;
    } catch (e) {
      return { available: false, reason: `Failed to parse holdings: ${e.message}` };
    }
  }

  async fetchFinapiHoldings(finapiCode) {
    const cleanCode = String(finapiCode).trim();
    if (!cleanCode) return null;

    // 1. ALWAYS check cache BEFORE making network request!
    const cacheKey = `finapi_detail_${cleanCode}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    // 2. Check negative cache for recent failures
    const failedTime = this.failedHoldings.get(cleanCode);
    if (failedTime && (Date.now() - failedTime < this.FAILED_TTL)) {
      return null;
    }

    // 3. Check circuit breaker for offline provider
    if (Date.now() < this.finapiOfflineUntil) {
      return null;
    }

    try {
      const res = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${cleanCode}`, {
        timeout: 6000
      });
      const finapiData = res.data?.data || {};
      
      const holdingsRaw = finapiData.holdings || [];
      const portfolioDate = finapiData.latestNavDate || new Date().toISOString().split('T')[0];
      const isin = finapiData.isin || finapiData.schemeIsin || null;

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
      
      const rawInceptionDate = finapiData.inceptionDate || finapiData.launchDate || null;
      const launchYearMatch = rawInceptionDate ? String(rawInceptionDate).match(/\b(19|20)\d{2}\b/) : null;
      const resolvedLaunchYear = launchYearMatch ? parseInt(launchYearMatch[0], 10) : null;

      const result = {
        available: true,
        holdings: formattedHoldings,
        sector_weightings: sectorWeightings,
        aum: resolvedAum,
        aumCr: resolvedAum,
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
      if (resolvedAum !== null && resolvedAum > 0) {
        this._saveDiskCache(cleanCode, { value: resolvedAum, aumCr: resolvedAum, source: aumSource, status: 'PROVIDER_REPORTED', asOf: aumAsOf });
      }
      return result;
    } catch (e) {
      this.failedHoldings.set(cleanCode, Date.now());
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
        aum: null,
        aumCr: null,
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
   * Get full AUM details with provenance for a scheme code.
   * 
   * Provenance guarantees:
   *   - status: "PROVIDER_REPORTED" (never claimed as AMFI Verified)
   *   - source: "Upvaly FinAPI Disclosure", "mfdata.in", or "Upvaly / AMFI Scheme Variant Sync"
   *   - value: numeric AUM in Crores, or null if UNAVAILABLE
   * 
   * @param {string} schemeCode - AMFI scheme code
   * @returns {Promise<{value: number|null, aumCr: number|null, source: string|null, status: string, asOf: string|null}>}
   */
  async getAumDetails(schemeCode) {
    if (!schemeCode) {
      return { value: null, aumCr: null, source: null, status: 'UNAVAILABLE', asOf: null };
    }
    const code = String(schemeCode).trim();
    const aumCacheKey = `aum_details_${code}`;
    const cachedAum = this._getCached(aumCacheKey);
    if (cachedAum) return cachedAum;

    // Source 1: Upvaly/FinAPI (primary provider)
    try {
      const finapiData = await this.fetchFinapiHoldings(code);
      if (finapiData && finapiData.aum !== null && finapiData.aum !== undefined && !isNaN(finapiData.aum) && Number(finapiData.aum) > 0) {
        const val = Number(finapiData.aum);
        const result = {
          value: val,
          aumCr: val,
          source: finapiData.aumSource || 'Upvaly FinAPI Disclosure',
          status: 'PROVIDER_REPORTED',
          asOf: finapiData.aumAsOf || finapiData.latestNavDate || null
        };
        this._setCache(aumCacheKey, result);
        return result;
      }
    } catch (e) {}

    // Source 2: mfdata.in (secondary provider)
    if (Date.now() >= this.mfdataOfflineUntil) {
      try {
        const res = await axios.get(`https://mfdata.in/api/v1/schemes/${code}`, { timeout: 3000 });
        if (res.data && res.data.aum && !isNaN(res.data.aum) && Number(res.data.aum) > 0) {
          const val = Number(res.data.aum);
          const result = {
            value: val,
            aumCr: val,
            source: 'mfdata.in',
            status: 'PROVIDER_REPORTED',
            asOf: '30 Jun 2026'
          };
          this._setCache(aumCacheKey, result);
          return result;
        }
      } catch (e) {
        if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
          this.mfdataOfflineUntil = Date.now() + 10 * 60 * 1000;
        }
      }
    }

    const unavailable = { value: null, aumCr: null, source: null, status: 'UNAVAILABLE', asOf: null };
    this._setCache(aumCacheKey, unavailable);
    return unavailable;
  }

  /**
   * Get AUM for a specific scheme code.
   * 
   * @param {string} schemeCode - AMFI scheme code
   * @returns {number|null} AUM in Crores, or null if unavailable from all sources
   */
  async getAum(schemeCode) {
    const details = await this.getAumDetails(schemeCode);
    return details.value;
  }
}

export default new HoldingsFallbackService();
