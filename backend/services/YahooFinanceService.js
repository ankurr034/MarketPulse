import YahooFinance from 'yahoo-finance2';
import { getIndianMarketSession, getUSMarketSession, isFinancialEntity, validateAndSanitizeQuote } from './MarketDataValidator.js';
import athBaseService from './AthBaseService.js';

export const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
try {
  yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
} catch (e) {}

const KNOWN_GLOBAL_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'CRM', 'ADBE', 'AMD', 'ORCL', 'CSCO', 'INTU', 'IBM', 'QCOM', 'TXN', 'NOW', 'AMAT',
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'PFE', 'ABT', 'DHR', 'SYK', 'AMGN', 'ISRG', 'MDT', 'VRTX',
  'BRK-B', 'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SPGI', 'AXP', 'BLK', 'C', 'SCHW', 'PGR',
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'PXD', 'OXY', 'WMB', 'HES', 'KMI',
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'TGT', 'LULU', 'MAR', 'F', 'GM',
  'PG', 'COST', 'PEP', 'KO', 'WMT', 'PM', 'MDLZ', 'MO', 'CL', 'EL', 'KMB', 'GIS', 'SYY', 'ADM',
  'GE', 'CAT', 'UNP', 'HON', 'UPS', 'RTX', 'BA', 'DE', 'LMT', 'ETN', 'WM', 'GD', 'ITW', 'FDX',
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'CTVA', 'DOW', 'DD', 'ALB', 'PPG', 'VMC', 'MLM',
  'NEE', 'SO', 'DUK', 'CEG', 'SRE', 'AEP', 'D', 'PEG', 'ED', 'EXC', 'XEL', 'PCG', 'WEC',
  'PLD', 'AMT', 'EQIX', 'CCI', 'PSA', 'O', 'SPG', 'VICI', 'WELL', 'DLR', 'AVB', 'EQR', 'SBAC',
  'GOOGL', 'GOOG', 'META', 'NFLX', 'DIS', 'CMCSA', 'TMUS', 'VZ', 'T', 'CHTR', 'EA', 'WBD', 'TTWO',
  'XLK', 'XLV', 'XLF', 'XLE', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'SPY', 'QQQ', 'DIA', 'IWM', 'VGHCX', 'FSPHX'
]);

const withTimeout = (promise, ms = 10000, fallbackValue = null) => {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
};

const SYMBOL_ALIASES = {
  'TATAMOTORS': 'TMPV.NS',
  'TATAMOTORS.NS': 'TMPV.NS',
  'M&M': 'M&M.NS',
  'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
  'BAJAJAUTO': 'BAJAJ-AUTO.NS',
  'M&MFIN': 'M&MFIN.NS'
};

class YahooFinanceService {
  constructor() {
    this.coreSymbols = [
      'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 
      'SBIN.NS', 'TMPV.NS', 'TMCV.NS', 'ITC.NS', 'SUNPHARMA.NS', 'TATASTEEL.NS', 
      'DLF.NS', 'AAPL', 'MSFT', 'TSLA', 'NVDA',
      '^NSEI', '^CNX100', '^NSMIDCP', '^NSEMDCP50', '^CNXSC', '^CRSLDX'
    ];

    // Short-lived quote cache (3 minutes freshness window)
    this.quoteCache = new Map();
    this.QUOTE_CACHE_TTL = 180000; // 3 minutes

    // Fundamentals cache (1 hour)
    this.financialsCache = new Map();
    this.FINANCIALS_CACHE_TTL = 3600000; // 1 hour

    // Unified Historical analysis cache (1 hour)
    this.historicalCache = new Map();
    this.HISTORICAL_CACHE_TTL = 3600000; // 1 hour

    // Request deduplication in-flight maps
    this.inFlightQuotes = new Map();
    this.inFlightHistorical = new Map();
    this.inFlightFinancials = new Map();
  }

  resolveYahooSymbol(sym) {
    if (!sym) return '';
    const upper = sym.toUpperCase().trim();
    if (SYMBOL_ALIASES[upper]) {
      return SYMBOL_ALIASES[upper];
    }
    if (upper.startsWith('^') || upper.endsWith('.NS') || upper.endsWith('.BO')) {
      return upper;
    }
    if (KNOWN_GLOBAL_SYMBOLS.has(upper)) {
      return upper;
    }
    return `${upper}.NS`;
  }

  /**
   * Unified historical analysis pipeline:
   * Single historical fetch retrieves 5Y daily + lifetime monthly candles once, computing:
   * 1. Multi-period returns: 1W, 1M, 6M, 1Y, 3Y, 5Y, ALL
   * 2. 52W Low (and date) from preceding 252 daily sessions
   * 3. ATH (and date) across all historical candles
   * 4. pctFrom52WLow and pctFromATH
   */
  async getHistoricalAnalysis(sym, currentPrice = null) {
    const yahooSym = this.resolveYahooSymbol(sym);
    if (!yahooSym) {
      return {
        returns: { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
        athBase: null
      };
    }

    const cached = this.historicalCache.get(yahooSym);
    if (cached && (Date.now() - cached.timestamp < this.HISTORICAL_CACHE_TTL)) {
      let athBase = cached.data.athBase;
      if (typeof currentPrice === 'number' && currentPrice > 0 && athBase && athBase.allTimeHigh) {
        // Re-evaluate instantaneous distance with current live price
        const ath = Math.max(athBase.allTimeHigh, currentPrice);
        const low52 = (athBase.week52Low && currentPrice < athBase.week52Low) ? currentPrice : athBase.week52Low;
        const pctAth = currentPrice >= ath ? 0.00 : parseFloat((((currentPrice - ath) / ath) * 100).toFixed(2));
        const pctLow52 = (low52 && low52 > 0) ? (currentPrice <= low52 ? 0.00 : parseFloat((((currentPrice - low52) / low52) * 100).toFixed(2))) : null;
        athBase = {
          ...athBase,
          currentPrice: parseFloat(currentPrice.toFixed(2)),
          allTimeHigh: parseFloat(ath.toFixed(2)),
          ath: parseFloat(ath.toFixed(2)),
          week52Low: low52 ? parseFloat(low52.toFixed(2)) : athBase.week52Low,
          pctFromATH: pctAth,
          pctFrom52WLow: pctLow52,
          distanceFromATHPercent: pctAth,
          recoveryFromBasePercent: pctLow52
        };
      }
      return { returns: cached.data.returns, athBase };
    }

    if (this.inFlightHistorical.has(yahooSym)) {
      return this.inFlightHistorical.get(yahooSym);
    }

    const fetchPromise = (async () => {
      try {
        const now = new Date();
        const p5yDate = new Date(now.getFullYear() - 5, now.getMonth() - 2, now.getDate());
        const session = getIndianMarketSession();

        // Single shared fetch for both daily (5Y) and monthly (lifetime)
        const [dailyChart, monthlyChart] = await Promise.all([
          withTimeout(
            yahooFinance.chart(yahooSym, { period1: p5yDate, period2: now, interval: '1d' }).catch(() => ({ quotes: [] })),
            10000,
            { quotes: [] }
          ),
          withTimeout(
            yahooFinance.chart(yahooSym, { period1: 0, period2: now, interval: '1mo' }).catch(() => ({ quotes: [] })),
            10000,
            { quotes: [] }
          )
        ]);

        const dQuotes = (dailyChart?.quotes || []).filter(q => typeof q.close === 'number' && !isNaN(q.close) && q.close > 0);
        const mQuotes = (monthlyChart?.quotes || []).filter(q => typeof q.close === 'number' && !isNaN(q.close) && q.close > 0);

        if (dQuotes.length === 0 && mQuotes.length === 0) {
          const emptyResult = {
            returns: { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
            athBase: null
          };
          return emptyResult;
        }

        const latestCandle = dQuotes[dQuotes.length - 1] || mQuotes[mQuotes.length - 1];
        const latestPrice = (typeof currentPrice === 'number' && currentPrice > 0) ? currentPrice : latestCandle.close;
        const latestPriceDate = new Date(latestCandle.date).toISOString().split('T')[0];

        // 1. Calculate Multi-period Returns
        const findQuoteOnOrBefore = (targetDate) => {
          if (!dQuotes || dQuotes.length === 0) return null;
          const targetTime = targetDate.getTime();
          const earliestTime = new Date(dQuotes[0].date).getTime();
          if (targetTime < earliestTime) return null;
          let best = null;
          for (const q of dQuotes) {
            const t = new Date(q.date).getTime();
            if (t <= targetTime) {
              best = q;
            } else {
              break;
            }
          }
          return best ? { date: new Date(best.date).toISOString().split('T')[0], price: best.close } : null;
        };

        const d1w = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        const d1m = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const d6m = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        const d1y = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const d3y = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
        const d5y = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

        const p1w = findQuoteOnOrBefore(d1w);
        const p1m = findQuoteOnOrBefore(d1m);
        const p6m = findQuoteOnOrBefore(d6m);
        const p1y = findQuoteOnOrBefore(d1y);
        const p3y = findQuoteOnOrBefore(d3y);
        const p5y = findQuoteOnOrBefore(d5y);

        let pAll = null;
        if (mQuotes.length >= 2) {
          const earliestM = mQuotes[0];
          if (earliestM && typeof earliestM.close === 'number' && earliestM.close >= 1.00) {
            pAll = { date: new Date(earliestM.date).toISOString().split('T')[0], price: earliestM.close };
          }
        }

        const calcReturn = (baseline) => {
          if (!baseline || typeof baseline.price !== 'number' || baseline.price <= 0 || !latestPrice || latestPrice <= 0) {
            return null;
          }
          // Exact formula: ((currentPrice / baselinePrice) - 1) * 100
          return parseFloat((((latestPrice - baseline.price) / baseline.price) * 100).toFixed(2));
        };

        const returns = {
          '1W': calcReturn(p1w),
          '1M': calcReturn(p1m),
          '6M': calcReturn(p6m),
          '1Y': calcReturn(p1y),
          '3Y': calcReturn(p3y),
          '5Y': calcReturn(p5y),
          'ALL': calcReturn(pAll)
        };

        // 2. Calculate ATH & 52W Low from the exact same dataset
        const athBase = athBaseService.computeAthAndBase(dQuotes, mQuotes, latestPrice, yahooSym);

        const result = { returns, athBase };
        this.historicalCache.set(yahooSym, { data: result, timestamp: Date.now() });
        if (athBase && athBase.allTimeHigh !== null) {
          athBaseService.cache.set(`ATH_52W_V5:${yahooSym.toUpperCase()}`, { data: athBase, timestamp: Date.now() });
        }

        return result;
      } catch (e) {
        console.warn(`YahooFinanceService: Historical analysis error for ${yahooSym}:`, e.message);
        return {
          returns: { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
          athBase: null
        };
      } finally {
        this.inFlightHistorical.delete(yahooSym);
      }
    })();

    this.inFlightHistorical.set(yahooSym, fetchPromise);
    return fetchPromise;
  }

  async getHistoricalReturns(sym) {
    const analysis = await this.getHistoricalAnalysis(sym);
    return analysis.returns;
  }

  async getStockFinancials(sym) {
    const yahooSym = this.resolveYahooSymbol(sym);
    if (!yahooSym) return { ebit: null, netProfit: null, ebitSource: '—', ebitType: '—', netProfitSource: '—', reportingPeriod: 'TTM' };

    const cached = this.financialsCache.get(yahooSym);
    if (cached && (Date.now() - cached.timestamp < this.FINANCIALS_CACHE_TTL)) {
      return cached.data;
    }

    if (this.inFlightFinancials.has(yahooSym)) {
      return this.inFlightFinancials.get(yahooSym);
    }

    const fetchPromise = (async () => {
      try {
        const summary = await withTimeout(
          yahooFinance.quoteSummary(yahooSym, {
            modules: ['financialData', 'defaultKeyStatistics', 'assetProfile']
          }).catch(() => ({})),
          10000,
          {}
        );

        const fd = summary.financialData || {};
        const ks = summary.defaultKeyStatistics || {};
        const ap = summary.assetProfile || {};

        const isFinancial = isFinancialEntity(yahooSym) || (
          ap.sector?.includes('Financial') ||
          ap.industry?.includes('Bank') ||
          ap.industry?.includes('Financial') ||
          ap.industry?.includes('Insurance')
        );

        let rate = 1;
        if (fd.financialCurrency === 'USD' && yahooSym.endsWith('.NS')) {
          rate = 86.5; // USD to INR conversion
        }

        // 1. EBIT / Operating Income (N/A for Financial Institutions)
        let ebit = null;
        let ebitSource = '—';
        let ebitType = '—';

        if (isFinancial) {
          ebit = null;
          ebitSource = 'N/A (Financial Institution)';
          ebitType = 'N/A';
        } else if (typeof fd.operatingIncome === 'number' && !isNaN(fd.operatingIncome)) {
          ebit = Math.round((fd.operatingIncome * rate) / 10000000);
          ebitSource = 'financialData.operatingIncome';
          ebitType = 'Reported';
        } else if (typeof fd.ebit === 'number' && !isNaN(fd.ebit) && fd.ebit > 0) {
          ebit = Math.round((fd.ebit * rate) / 10000000);
          ebitSource = 'financialData.ebit';
          ebitType = 'Reported';
        } else if (
          typeof fd.totalRevenue === 'number' && 
          typeof fd.operatingMargins === 'number' && 
          fd.totalRevenue > 0 && 
          !isNaN(fd.operatingMargins)
        ) {
          ebit = Math.round((fd.totalRevenue * rate * fd.operatingMargins) / 10000000);
          ebitSource = 'financialData.totalRevenue * operatingMargins';
          ebitType = 'Derived from reported inputs';
        }

        // 2. Net Profit (Reported Net Income)
        let netProfit = null;
        let netProfitSource = '—';
        if (typeof ks.netIncomeToCommon === 'number' && !isNaN(ks.netIncomeToCommon)) {
          netProfit = Math.round((ks.netIncomeToCommon * rate) / 10000000);
          netProfitSource = 'defaultKeyStatistics.netIncomeToCommon';
        }

        const res = { 
          ebit: (typeof ebit === 'number' && ebit > 0) ? ebit : null, 
          netProfit: (typeof netProfit === 'number' && netProfit > 0) ? netProfit : null,
          ebitSource,
          ebitType,
          netProfitSource,
          reportingPeriod: 'TTM'
        };

        this.financialsCache.set(yahooSym, { data: res, timestamp: Date.now() });
        return res;
      } catch (e) {
        const fallback = { ebit: null, netProfit: null, ebitSource: '—', ebitType: '—', netProfitSource: '—', reportingPeriod: 'TTM' };
        return fallback;
      } finally {
        this.inFlightFinancials.delete(yahooSym);
      }
    })();

    this.inFlightFinancials.set(yahooSym, fetchPromise);
    return fetchPromise;
  }

  async search(query) {
    try {
      if (!query || query.trim().length === 0) return [];
      const res = await yahooFinance.search(query, { newsCount: 0 });
      const data = (res.quotes || [])
        .filter(q => q.quoteType === 'EQUITY')
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          sector: q.sector || 'General',
          type: 'STOCK',
          exchange: q.exchange || 'NSE'
        }));
      return { available: true, data };
    } catch (err) {
      console.error('Yahoo Finance search error:', err.message);
      return { available: false, data: [] };
    }
  }

  /**
   * Fast Batch Quote Fetching:
   * - Checks short-lived in-memory quote cache (20s TTL)
   * - Deduplicates requests in-flight
   * - Chunks uncached symbols by 25
   * - Validates each quote with MarketDataValidator
   * - Returns structured array
   */
  async getQuotes(symbols = this.coreSymbols) {
    if (!symbols || symbols.length === 0) {
      return { available: true, data: [] };
    }

    try {
      const now = Date.now();
      const uniqueSymbols = [...new Set(symbols.map(s => this.resolveYahooSymbol(s)).filter(Boolean))];
      const resultsMap = new Map();
      const uncached = [];

      for (const sym of uniqueSymbols) {
        const cached = this.quoteCache.get(sym);
        if (cached && (now - cached.timestamp < this.QUOTE_CACHE_TTL)) {
          resultsMap.set(sym, cached.data);
        } else {
          uncached.push(sym);
        }
      }

      if (uncached.length > 0) {
        const chunkSize = 25;
        const chunks = [];
        for (let i = 0; i < uncached.length; i += chunkSize) {
          chunks.push(uncached.slice(i, i + chunkSize));
        }

        const session = getIndianMarketSession();

        const chunkPromises = chunks.map(async (chunk) => {
          const chunkKey = chunk.sort().join(',');
          if (this.inFlightQuotes.has(chunkKey)) {
            return this.inFlightQuotes.get(chunkKey);
          }

          const promise = (async () => {
            try {
              const rawQuotes = await withTimeout(yahooFinance.quote(chunk), 10000, []);
              const quotesList = Array.isArray(rawQuotes) ? rawQuotes : (rawQuotes ? [rawQuotes] : []);

              for (const q of quotesList) {
                if (!q || !q.symbol) continue;
                const price = typeof q?.regularMarketPrice === 'number' ? q.regularMarketPrice : (typeof q?.currentPrice === 'number' ? q.currentPrice : (typeof q?.price === 'number' ? q.price : null));
                if (price === null) continue;

                const sym = q.symbol;
                const rawMarketCap = q.marketCap || 0;
                const marketCapCr = rawMarketCap ? Math.floor(rawMarketCap / 10000000) : null;
                const pe = q.trailingPE || q.forwardPE || null;
                const eps = q.epsTrailingTwelveMonths || null;

                let fin = this.financialsCache.get(sym)?.data;
                let netProfit = fin?.netProfit || null;
                let ebit = fin?.ebit || null;

                if (!netProfit && typeof q.sharesOutstanding === 'number' && q.sharesOutstanding > 0 && typeof eps === 'number' && !isNaN(eps)) {
                  netProfit = Math.round((q.sharesOutstanding * eps) / 10000000);
                }

                const ltp = price;
                const previousClose = typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : ltp;
                const change = parseFloat((ltp - previousClose).toFixed(4));
                const changePercent = previousClose > 0 ? parseFloat((((ltp - previousClose) / previousClose) * 100).toFixed(4)) : 0;

                const isSessionLive = session.isOpen && q.regularMarketTime && (Date.now() - new Date(q.regularMarketTime).getTime() < 30 * 60 * 1000);
                const fetchedAt = new Date().toISOString();

                const quoteObj = {
                  symbol: sym,
                  name: q.shortName || q.longName || sym,
                  price: ltp,
                  ltp,
                  open: typeof q.regularMarketOpen === 'number' ? q.regularMarketOpen : previousClose,
                  previousClose,
                  change,
                  changePercent,
                  dayHigh: typeof q.regularMarketDayHigh === 'number' ? q.regularMarketDayHigh : ltp,
                  dayLow: typeof q.regularMarketDayLow === 'number' ? q.regularMarketDayLow : ltp,
                  high52: typeof q.fiftyTwoWeekHigh === 'number' ? q.fiftyTwoWeekHigh : null,
                  low52: typeof q.fiftyTwoWeekLow === 'number' ? q.fiftyTwoWeekLow : null,
                  marketCap: marketCapCr,
                  pe: (typeof pe === 'number' && pe > 0) ? parseFloat(pe.toFixed(2)) : null,
                  pb: (typeof q.priceToBook === 'number' && q.priceToBook > 0) ? parseFloat(q.priceToBook.toFixed(2)) : null,
                  eps: (typeof eps === 'number') ? parseFloat(eps.toFixed(2)) : null,
                  ebit: ebit,
                  netProfit: netProfit,
                  dividendYield: typeof q.dividendYield === 'number' ? q.dividendYield : null,
                  volume: typeof q.regularMarketVolume === 'number' ? q.regularMarketVolume : null,
                  vwap: ltp,
                  returns: { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
                  source: "YAHOO_FINANCE",
                  sourceType: "YAHOO_QUOTE",
                  isLive: isSessionLive,
                  priceAsOf: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : fetchedAt,
                  fetchedAt,
                  lastUpdatedAt: fetchedAt,
                  dataStatus: session.isOpen ? "LIVE" : "EOD"
                };

                const validated = validateAndSanitizeQuote(quoteObj);
                if (validated && validated.ltp !== null) {
                  this.quoteCache.set(sym, { data: validated, timestamp: now });
                  resultsMap.set(sym, validated);
                }
              }
            } catch (err) {
              console.warn('Yahoo chunk quote fetch error:', err.message);
            } finally {
              this.inFlightQuotes.delete(chunkKey);
            }
          })();

          this.inFlightQuotes.set(chunkKey, promise);
          return promise;
        });

        await Promise.allSettled(chunkPromises);
      }

      // Build final list in original requested symbol order
      const finalQuotes = [];
      for (const sym of uniqueSymbols) {
        if (resultsMap.has(sym)) {
          finalQuotes.push(resultsMap.get(sym));
        } else {
          // Honest UNAVAILABLE quote (zero snapshot, zero fabricated price)
          const unavail = validateAndSanitizeQuote({
            symbol: sym,
            name: sym,
            price: null,
            ltp: null,
            source: "YAHOO_FINANCE_UNAVAILABLE",
            dataStatus: "UNAVAILABLE",
            isLive: false,
            priceAsOf: null,
            fetchedAt: new Date().toISOString()
          });
          if (unavail) finalQuotes.push(unavail);
        }
      }

      return { available: finalQuotes.some(q => q.dataStatus !== 'UNAVAILABLE'), data: finalQuotes };
    } catch (err) {
      console.warn('YahooFinanceService: batch quotes error:', err.message);
      return { available: false, reason: err.message, data: [] };
    }
  }

  async getQuote(symbol) {
    try {
      const res = await this.getQuotes([symbol]);
      if (res && res.available && res.data && res.data.length > 0) {
        return { available: true, data: res.data[0] };
      }
      return { available: false, data: null };
    } catch (e) {
      return { available: false, data: null, error: e.message };
    }
  }

  async getQuoteDetail(symbol) {
    const yahooSym = this.resolveYahooSymbol(symbol);
    try {
      const qRes = await this.getQuotes([yahooSym]);
      const baseQuote = (qRes.available && qRes.data.length > 0) ? qRes.data[0] : null;

      let sector = 'General';
      let industry = null;

      try {
        const summary = await withTimeout(yahooFinance.quoteSummary(yahooSym, { modules: ['assetProfile'] }), 5000, null);
        if (summary && summary.assetProfile) {
          if (summary.assetProfile.sector) sector = summary.assetProfile.sector;
          if (summary.assetProfile.industry) industry = summary.assetProfile.industry;
        }
      } catch (profileErr) {
        console.warn(`Profile fetch fallback for ${yahooSym}: ${profileErr.message}`);
      }

      const [fin, analysis] = await Promise.all([
        this.getStockFinancials(yahooSym),
        this.getHistoricalAnalysis(yahooSym, baseQuote?.ltp)
      ]);

      const ltp = baseQuote?.ltp || null;
      const support = ltp ? parseFloat((ltp * 0.965).toFixed(2)) : null;
      const resistance = ltp ? parseFloat((ltp * 1.035).toFixed(2)) : null;
      const session = getIndianMarketSession();

      const result = {
        ...(baseQuote || {}),
        symbol: yahooSym,
        name: baseQuote?.name || yahooSym,
        ltp,
        price: ltp,
        ebit: fin.ebit,
        netProfit: fin.netProfit || baseQuote?.netProfit || null,
        returns: analysis.returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
        athBaseMetrics: analysis.athBase,
        week52Low: analysis.athBase?.week52Low ?? baseQuote?.low52 ?? null,
        week52LowDate: analysis.athBase?.week52LowDate ?? null,
        allTimeHigh: analysis.athBase?.allTimeHigh ?? null,
        allTimeHighDate: analysis.athBase?.allTimeHighDate ?? null,
        ath: analysis.athBase?.allTimeHigh ?? null,
        ATH: analysis.athBase?.allTimeHigh ?? null,
        ATHDate: analysis.athBase?.allTimeHighDate ?? null,
        percentFrom52WLow: analysis.athBase?.percentFrom52WLow ?? analysis.athBase?.pctFrom52WLow ?? null,
        percentFromATH: analysis.athBase?.percentFromATH ?? analysis.athBase?.pctFromATH ?? null,
        pctFrom52WLow: analysis.athBase?.pctFrom52WLow ?? null,
        pctFromATH: analysis.athBase?.pctFromATH ?? null,
        support,
        resistance,
        sector,
        industry,
        source: baseQuote?.source || (ltp ? "YAHOO_FINANCE" : "YAHOO_FINANCE_UNAVAILABLE"),
        sourceType: "YAHOO_QUOTE",
        isLive: session.isOpen && ltp !== null,
        priceAsOf: baseQuote?.priceAsOf || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        dataStatus: ltp ? (session.isOpen ? "LIVE" : "EOD") : "UNAVAILABLE"
      };

      return { available: ltp !== null, data: result };
    } catch (err) {
      console.error(`Yahoo Finance getQuoteDetail error for ${yahooSym}:`, err.message);
      return { available: false, reason: err.message, data: null };
    }
  }

  async getChartData(symbol, interval = '1d') {
    const yahooSym = this.resolveYahooSymbol(symbol);
    try {
      const { resolveRangeToDates } = await import('../utils/dateRangeUtils.js');
      const parsedRange = resolveRangeToDates(interval);
      const period1 = parsedRange.start;

      const res = await withTimeout(
        yahooFinance.chart(yahooSym, {
          period1: Math.floor(period1.getTime() / 1000),
          period2: Math.floor(Date.now() / 1000),
          interval: '1d'
        }),
        10000,
        null
      );

      if (!res || !res.quotes || res.quotes.length === 0) {
        return { available: false, reason: 'No historical candle data', data: [] };
      }

      const data = res.quotes
        .filter(candle => candle.close !== null && candle.close !== undefined)
        .map(candle => ({
          time: new Date(candle.date).getTime(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume || 0
        }))
        .sort((a, b) => a.time - b.time);

      return { available: true, data };
    } catch (err) {
      console.error(`Yahoo Finance chart error for ${yahooSym}:`, err.message);
      return { available: false, reason: err.message, data: [] };
    }
  }
}

export default new YahooFinanceService();
