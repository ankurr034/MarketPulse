import YahooFinance from 'yahoo-finance2';
import { getIndianMarketSession } from './MarketDataValidator.js';

export const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
try {
  yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
} catch (e) {}

export const ATH_BASE_CONFIG = {
  CACHE_VERSION: 'ATH_52W_V5',
  CACHE_TTL: 3600000,                // 1 hour in-memory cache
  TOLERANCE_NEAR_ATH: 0.5,           // Within 0.5% of ATH is classified as 0.00%
  WINDOW_52W_SESSIONS: 252           // ~252 trading sessions in 52 weeks
};

const withTimeout = (promise, ms = 10000, fallbackValue = null) => {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
};

export class AthBaseService {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
  }

  /**
   * Pure algorithm computing All-Time High (ATH) and 52-Week Low from authentic Yahoo Finance candle history.
   * 
   * 1. 52-Week Low = minimum(low) across the preceding ~252 valid daily trading candles.
   * 2. ATH = maximum(high) across complete authentic historical candles.
   * 3. pctFrom52WLow = ((currentPrice - week52Low) / week52Low) * 100
   * 4. pctFromATH = ((currentPrice - ATH) / ATH) * 100
   */
  computeAthAndBase(dQuotes = [], mQuotes = [], currentPrice = null, yahooSym = '') {
    const session = getIndianMarketSession();
    const cleanDaily = [];
    const allQuotes = [];
    const seenDailyDates = new Set();
    const seenAllDates = new Set();

    // 1. Ingest and validate monthly candles (historical lifetime for ATH)
    for (const q of (mQuotes || [])) {
      if (
        q && 
        typeof q.close === 'number' && !isNaN(q.close) && q.close > 0 &&
        typeof q.high === 'number' && !isNaN(q.high) && q.high > 0 &&
        typeof q.low === 'number' && !isNaN(q.low) && q.low > 0 &&
        q.high >= q.low && q.date
      ) {
        const dStr = new Date(q.date).toISOString().split('T')[0];
        if (!seenAllDates.has(dStr)) {
          seenAllDates.add(dStr);
          allQuotes.push({
            date: dStr,
            high: q.high,
            low: q.low,
            close: q.close,
            open: q.open || q.close
          });
        }
      }
    }

    // 2. Ingest and validate daily candles (5Y high-resolution for 52W Low & ATH)
    for (const q of (dQuotes || [])) {
      if (
        q && 
        typeof q.close === 'number' && !isNaN(q.close) && q.close > 0 &&
        typeof q.high === 'number' && !isNaN(q.high) && q.high > 0 &&
        typeof q.low === 'number' && !isNaN(q.low) && q.low > 0 &&
        q.high >= q.low && q.date
      ) {
        const dStr = new Date(q.date).toISOString().split('T')[0];
        const candleObj = {
          date: dStr,
          high: q.high,
          low: q.low,
          close: q.close,
          open: q.open || q.close
        };

        if (!seenDailyDates.has(dStr)) {
          seenDailyDates.add(dStr);
          cleanDaily.push(candleObj);
        }

        if (!seenAllDates.has(dStr)) {
          seenAllDates.add(dStr);
          allQuotes.push(candleObj);
        }
      }
    }

    // Sort chronologically
    cleanDaily.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    allQuotes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (cleanDaily.length === 0 && allQuotes.length === 0) {
      return {
        symbol: yahooSym,
        currentPrice: typeof currentPrice === 'number' && currentPrice > 0 ? parseFloat(currentPrice.toFixed(2)) : null,
        week52Low: null,
        week52LowDate: null,
        allTimeHigh: null,
        allTimeHighDate: null,
        ath: null,
        pctFrom52WLow: null,
        pctFromATH: null,
        recoveryFromBasePercent: null,
        distanceFromATHPercent: null,
        baseLow: null,
        baseLowDate: null,
        longTermBaseLow: null,
        longTermBaseLowDate: null,
        baseStatus: 'UNAVAILABLE',
        positionDataSource: 'UNAVAILABLE',
        dataSource: 'YAHOO_FINANCE_UNAVAILABLE',
        dataStatus: 'UNAVAILABLE',
        historicalAsOf: null,
        calculatedAt: new Date().toISOString(),
        priceAsOf: null
      };
    }

    const latestCandle = cleanDaily.length > 0 ? cleanDaily[cleanDaily.length - 1] : allQuotes[allQuotes.length - 1];
    const latestPrice = (typeof currentPrice === 'number' && currentPrice > 0) ? currentPrice : latestCandle.close;
    const latestPriceDate = latestCandle.date;

    // 3. Compute All-Time High (ATH) across complete authentic historical candle history
    let ath = 0;
    let athDate = null;
    for (const q of allQuotes) {
      const h = q.high || q.close;
      if (h > ath) {
        ath = h;
        athDate = q.date;
      }
    }

    // If current price exceeds historical ATH, establish new ATH
    if (latestPrice >= ath) {
      ath = latestPrice;
      athDate = latestPriceDate;
    }

    // 4. Compute % From ATH
    let pctFromATH = null;
    if (ath > 0 && latestPrice > 0) {
      if (latestPrice >= ath) {
        pctFromATH = 0.00;
      } else {
        const pctDiff = ((ath - latestPrice) / ath) * 100;
        if (pctDiff <= ATH_BASE_CONFIG.TOLERANCE_NEAR_ATH) {
          pctFromATH = 0.00;
        } else {
          // Down from ATH is negative percentage
          pctFromATH = parseFloat((((latestPrice - ath) / ath) * 100).toFixed(4));
        }
      }
    }

    // 5. Compute 52-Week Low across preceding ~252 daily trading sessions
    const windowCandles = cleanDaily.length >= ATH_BASE_CONFIG.WINDOW_52W_SESSIONS 
      ? cleanDaily.slice(-ATH_BASE_CONFIG.WINDOW_52W_SESSIONS) 
      : cleanDaily;

    let week52Low = Infinity;
    let week52LowDate = null;

    for (const q of windowCandles) {
      const l = q.low || q.close;
      if (l < week52Low && l > 0) {
        week52Low = l;
        week52LowDate = q.date;
      }
    }

    if (week52Low === Infinity || windowCandles.length === 0) {
      week52Low = latestPrice;
      week52LowDate = latestPriceDate;
    }

    // If live current price dropped below 52W low candle, update 52W low
    if (latestPrice > 0 && latestPrice < week52Low) {
      week52Low = latestPrice;
      week52LowDate = latestPriceDate;
    }

    // 6. Compute % From 52W Low
    let pctFrom52WLow = null;
    if (week52Low > 0 && latestPrice > 0) {
      if (latestPrice <= week52Low) {
        pctFrom52WLow = 0.00;
      } else {
        pctFrom52WLow = parseFloat((((latestPrice - week52Low) / week52Low) * 100).toFixed(4));
      }
    }

    // Ensure mathematical consistency
    const cleanCurrent = latestPrice ? parseFloat(latestPrice.toFixed(2)) : null;
    const cleanAth = ath > 0 ? parseFloat(ath.toFixed(2)) : null;
    const cleanLow52 = (week52Low > 0 && week52Low !== Infinity) ? parseFloat(week52Low.toFixed(2)) : null;

    return {
      symbol: yahooSym,
      currentPrice: cleanCurrent,
      week52Low: cleanLow52,
      week52LowDate: week52LowDate,
      allTimeHigh: cleanAth,
      allTimeHighDate: athDate,
      ath: cleanAth,
      pctFrom52WLow: pctFrom52WLow !== null ? parseFloat(pctFrom52WLow.toFixed(2)) : null,
      pctFromATH: pctFromATH !== null ? parseFloat(pctFromATH.toFixed(2)) : null,
      
      // Backward-compatibility aliases for frontend & existing API consumers
      recoveryFromBasePercent: pctFrom52WLow !== null ? parseFloat(pctFrom52WLow.toFixed(2)) : null,
      distanceFromATHPercent: pctFromATH !== null ? parseFloat(pctFromATH.toFixed(2)) : null,
      baseLow: cleanLow52,
      baseLowDate: week52LowDate,
      longTermBaseLow: cleanLow52,
      longTermBaseLowDate: week52LowDate,
      baseStatus: 'WEEK_52_LOW',

      positionDataSource: 'YAHOO_FINANCE',
      dataSource: 'YAHOO_FINANCE',
      dataStatus: session.isOpen ? 'LIVE' : 'EOD',
      historicalAsOf: latestPriceDate || new Date().toISOString().split('T')[0],
      calculatedAt: new Date().toISOString(),
      priceAsOf: new Date().toISOString()
    };
  }

  /**
   * Alias for computeAthAndBase
   */
  computeAthAnd52WLow(dQuotes = [], mQuotes = [], currentPrice = null, yahooSym = '') {
    return this.computeAthAndBase(dQuotes, mQuotes, currentPrice, yahooSym);
  }

  /**
   * Fetch and calculate ATH + Base metrics with memory caching and flight deduplication.
   */
  async getAthAndBaseMetrics(sym, currentPrice = null) {
    if (!sym) return null;
    const cacheKey = `${ATH_BASE_CONFIG.CACHE_VERSION}:${sym.toUpperCase().trim()}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < ATH_BASE_CONFIG.CACHE_TTL)) {
      if (typeof currentPrice === 'number' && currentPrice > 0 && cached.data.allTimeHigh) {
        // Re-evaluate instantaneous distance with live tick
        const ath = Math.max(cached.data.allTimeHigh, currentPrice);
        const low52 = (cached.data.week52Low && currentPrice < cached.data.week52Low) ? currentPrice : cached.data.week52Low;

        let pctAth = 0.00;
        if (currentPrice < ath) {
          const distDiff = ((ath - currentPrice) / ath) * 100;
          pctAth = distDiff <= ATH_BASE_CONFIG.TOLERANCE_NEAR_ATH ? 0.00 : parseFloat((((currentPrice - ath) / ath) * 100).toFixed(2));
        }

        let pctLow52 = null;
        if (low52 && low52 > 0) {
          pctLow52 = currentPrice <= low52 ? 0.00 : parseFloat((((currentPrice - low52) / low52) * 100).toFixed(2));
        }

        return {
          ...cached.data,
          currentPrice: parseFloat(currentPrice.toFixed(2)),
          allTimeHigh: parseFloat(ath.toFixed(2)),
          ath: parseFloat(ath.toFixed(2)),
          week52Low: low52 ? parseFloat(low52.toFixed(2)) : cached.data.week52Low,
          pctFromATH: pctAth,
          pctFrom52WLow: pctLow52,
          distanceFromATHPercent: pctAth,
          recoveryFromBasePercent: pctLow52
        };
      }
      return cached.data;
    }

    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const now = new Date();
        const p5yDate = new Date(now.getFullYear() - 5, now.getMonth() - 2, now.getDate());

        const [dailyChart, monthlyChart] = await Promise.all([
          withTimeout(
            yahooFinance.chart(sym, { period1: p5yDate, period2: now, interval: '1d' }).catch(() => ({ quotes: [] })),
            10000,
            { quotes: [] }
          ),
          withTimeout(
            yahooFinance.chart(sym, { period1: 0, period2: now, interval: '1mo' }).catch(() => ({ quotes: [] })),
            10000,
            { quotes: [] }
          )
        ]);

        const result = this.computeAthAndBase(dailyChart?.quotes || [], monthlyChart?.quotes || [], currentPrice, sym);

        if (result && result.allTimeHigh !== null) {
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        }
        return result;
      } catch (err) {
        console.warn(`AthBaseService error for ${sym}:`, err.message);
        return {
          symbol: sym,
          currentPrice: typeof currentPrice === 'number' ? parseFloat(currentPrice.toFixed(2)) : null,
          week52Low: null,
          week52LowDate: null,
          allTimeHigh: null,
          allTimeHighDate: null,
          ath: null,
          pctFrom52WLow: null,
          pctFromATH: null,
          recoveryFromBasePercent: null,
          distanceFromATHPercent: null,
          baseLow: null,
          baseLowDate: null,
          longTermBaseLow: null,
          longTermBaseLowDate: null,
          baseStatus: 'UNAVAILABLE',
          positionDataSource: 'UNAVAILABLE',
          dataSource: 'YAHOO_FINANCE_UNAVAILABLE',
          dataStatus: 'UNAVAILABLE',
          historicalAsOf: null,
          calculatedAt: new Date().toISOString(),
          priceAsOf: null
        };
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    this.inFlight.set(cacheKey, fetchPromise);
    return fetchPromise;
  }
}

export const athBaseService = new AthBaseService();
export default athBaseService;
