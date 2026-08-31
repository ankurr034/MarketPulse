import YahooFinance from 'yahoo-finance2';
import { getIndianMarketSession } from './MarketDataValidator.js';
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
    this.financialsCache = new Map();
    this.FINANCIALS_CACHE_TTL = 3600000; // 1 hour TTL
    this.returnsCache = new Map();
    this.RETURNS_CACHE_TTL = 3600000; // 1 hour TTL
    this.inFlightFinancials = new Map();
    this.inFlightReturns = new Map();
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

  async getHistoricalReturns(sym) {
    const yahooSym = this.resolveYahooSymbol(sym);
    if (!yahooSym) return { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };

    const cached = this.returnsCache.get(yahooSym);
    if (cached && (Date.now() - cached.timestamp < this.RETURNS_CACHE_TTL)) {
      return cached.data;
    }

    if (this.inFlightReturns.has(yahooSym)) {
      return this.inFlightReturns.get(yahooSym);
    }

    const fetchPromise = (async () => {
      try {
        const now = new Date();
        const p5yDate = new Date(now.getFullYear() - 5, now.getMonth() - 2, now.getDate());
        const session = getIndianMarketSession();

        // Fetch 5Y daily chart (for 1W, 1M, 6M, 1Y, 3Y, 5Y) and lifetime monthly chart (for ALL inception) with timeout
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
        const buildEmptyMeta = (p) => ({
          symbol: yahooSym,
          latestPrice: null,
          latestPriceDate: null,
          baselinePrice: null,
          baselineDate: null,
          period: p,
          returnPercent: null,
          source: 'YAHOO_FINANCE',
          dataStatus: 'UNAVAILABLE'
        });
        const emptyReturns = {
          '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null,
          _meta: {
            '1W': buildEmptyMeta('1W'),
            '1M': buildEmptyMeta('1M'),
            '6M': buildEmptyMeta('6M'),
            '1Y': buildEmptyMeta('1Y'),
            '3Y': buildEmptyMeta('3Y'),
            '5Y': buildEmptyMeta('5Y'),
            'ALL': buildEmptyMeta('ALL')
          }
        };
        // Do NOT cache empty failures for 1 hour - allow prompt retry
        return emptyReturns;
      }

      // Use the latest confirmed trading day candle for consistent close-to-close comparison
      const latestCandle = dQuotes[dQuotes.length - 1] || mQuotes[mQuotes.length - 1];
      const latestPrice = latestCandle.close;
      const latestPriceDate = new Date(latestCandle.date).toISOString().split('T')[0];

      // Broker standard: find the latest trading day closing price on or before target date (never future)
      const findQuoteOnOrBefore = (targetDate) => {
        if (!dQuotes || dQuotes.length === 0) return null;
        const targetTime = targetDate.getTime();
        const earliestTime = new Date(dQuotes[0].date).getTime();
        if (targetTime < earliestTime) {
          return null; // Not enough historical data for this period
        }
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

      // ALL Inception validation:
      // Must have valid monthly candles and earliest baseline price must be a genuine traded price (>= 1.00)
      // to avoid pre-split fractional rupee distortion artifacts (< ₹1.00).
      let pAll = null;
      if (mQuotes.length >= 2) {
        const earliestM = mQuotes[0];
        if (earliestM && typeof earliestM.close === 'number' && earliestM.close >= 1.00) {
          pAll = { date: new Date(earliestM.date).toISOString().split('T')[0], price: earliestM.close };
        }
      }

      const buildMeta = (period, baseline) => {
        if (!baseline || typeof baseline.price !== 'number' || baseline.price <= 0 || !latestPrice || latestPrice <= 0) {
          return {
            symbol: yahooSym,
            latestPrice: latestPrice ? parseFloat(latestPrice.toFixed(2)) : null,
            latestPriceDate: latestPriceDate,
            baselinePrice: null,
            baselineDate: null,
            period,
            returnPercent: null,
            source: 'YAHOO_FINANCE',
            dataStatus: 'UNAVAILABLE'
          };
        }
        const ret = parseFloat((((latestPrice - baseline.price) / baseline.price) * 100).toFixed(2));
        return {
          symbol: yahooSym,
          latestPrice: parseFloat(latestPrice.toFixed(2)),
          latestPriceDate: latestPriceDate,
          baselinePrice: parseFloat(baseline.price.toFixed(2)),
          baselineDate: baseline.date,
          period,
          returnPercent: ret,
          source: 'YAHOO_FINANCE',
          dataStatus: session.isOpen ? 'LIVE' : 'EOD'
        };
      };

      const meta1w = buildMeta('1W', p1w);
      const meta1m = buildMeta('1M', p1m);
      const meta6m = buildMeta('6M', p6m);
      const meta1y = buildMeta('1Y', p1y);
      const meta3y = buildMeta('3Y', p3y);
      const meta5y = buildMeta('5Y', p5y);
      const metaAll = buildMeta('ALL', pAll);

      // Debug logging of exact calculations
      if (p1y) console.log(`[HistoricalReturns] ${yahooSym} 1Y: latestDate=${latestPriceDate}, latestPrice=${latestPrice.toFixed(2)}, baselineDate=${p1y.date}, baselinePrice=${p1y.price.toFixed(2)}, return=${meta1y.returnPercent}%`);
      if (pAll) console.log(`[HistoricalReturns] ${yahooSym} ALL: latestDate=${latestPriceDate}, latestPrice=${latestPrice.toFixed(2)}, earliestDate=${pAll.date}, earliestPrice=${pAll.price.toFixed(2)}, return=${metaAll.returnPercent}%`);

      // Data quality detector: flag suspiciously large ALL returns (NOT a correction mechanism)
      if (metaAll.returnPercent !== null && Math.abs(metaAll.returnPercent) > 50000) {
        console.warn(`[DATA QUALITY WARNING] ${yahooSym}: ALL return = ${metaAll.returnPercent}% exceeds 50000%. Baseline: ${pAll?.price} on ${pAll?.date}. This value is passed through unmodified.`);
      }

      const returns = {
        '1W': meta1w.returnPercent,
        '1M': meta1m.returnPercent,
        '6M': meta6m.returnPercent,
        '1Y': meta1y.returnPercent,
        '3Y': meta3y.returnPercent,
        '5Y': meta5y.returnPercent,
        'ALL': metaAll.returnPercent,
        _meta: {
          '1W': meta1w,
          '1M': meta1m,
          '6M': meta6m,
          '1Y': meta1y,
          '3Y': meta3y,
          '5Y': meta5y,
          'ALL': metaAll
        }
      };

      this.returnsCache.set(yahooSym, { data: returns, timestamp: Date.now() });

      // Automatically compute & cache ATH / Base metrics from the same historical OHLC series
      try {
        const athBaseResult = athBaseService.computeAthAndBase(dQuotes, mQuotes, latestPrice, yahooSym);
        if (athBaseResult && athBaseResult.allTimeHigh !== null) {
          athBaseService.cache.set(`ATH_52W_V5:${yahooSym.toUpperCase()}`, { data: athBaseResult, timestamp: Date.now() });
        }
      } catch (athErr) {
        console.warn(`Could not compute ATH/Base during historical returns for ${yahooSym}:`, athErr.message);
      }

      return returns;
    } catch (e) {
      console.warn(`YahooFinanceService: Historical returns error for ${yahooSym}:`, e.message);
      const buildEmptyMeta = (p) => ({
        symbol: yahooSym,
        latestPrice: null,
        latestPriceDate: null,
        baselinePrice: null,
        baselineDate: null,
        period: p,
        returnPercent: null,
        source: 'YAHOO_FINANCE',
        dataStatus: 'UNAVAILABLE'
      });
      const fallbackReturns = {
        '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null,
        _meta: {
          '1W': buildEmptyMeta('1W'),
          '1M': buildEmptyMeta('1M'),
          '6M': buildEmptyMeta('6M'),
          '1Y': buildEmptyMeta('1Y'),
          '3Y': buildEmptyMeta('3Y'),
          '5Y': buildEmptyMeta('5Y'),
          'ALL': buildEmptyMeta('ALL')
        }
      };
      // Do not cache error results for 1 hour so retry can succeed
      return fallbackReturns;
    } finally {
      this.inFlightReturns.delete(yahooSym);
    }
  })();

    this.inFlightReturns.set(yahooSym, fetchPromise);
    return fetchPromise;
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

        const isFinancialInstitution = (
          ap.sector?.includes('Financial') ||
          ap.industry?.includes('Bank') ||
          ap.industry?.includes('Financial') ||
          ap.industry?.includes('Insurance') ||
          yahooSym.includes('BANK') || 
          yahooSym.includes('FINANCE') ||
          yahooSym.includes('FINSERV') ||
          yahooSym.includes('HDFCLIFE') ||
          yahooSym.includes('SBILIFE') ||
          yahooSym.includes('ICICIPRULI') ||
          yahooSym.includes('MUTHOOT')
        );

        let rate = 1;
        if (fd.financialCurrency === 'USD' && yahooSym.endsWith('.NS')) {
          rate = 86.5; // USD to INR conversion
        }

        // 1. EBIT / Operating Income (N/A for Financial Institutions)
        let ebit = null;
        let ebitSource = '—';
        let ebitType = '—';

        if (isFinancialInstitution) {
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

  async getQuotes(symbols = this.coreSymbols) {
    try {
      const uniqueSymbols = [...new Set(symbols.map(s => this.resolveYahooSymbol(s)).filter(Boolean))];
      const chunkSize = 25;
      const chunks = [];
      for (let i = 0; i < uniqueSymbols.length; i += chunkSize) {
        chunks.push(uniqueSymbols.slice(i, i + chunkSize));
      }

      const results = [];
      const session = getIndianMarketSession();

      const chunkResults = await Promise.allSettled(
        chunks.map(chunk => withTimeout(yahooFinance.quote(chunk), 10000, []).catch(() => []))
      );

      for (const chunkRes of chunkResults) {
        if (chunkRes.status === 'fulfilled' && chunkRes.value) {
          const rawQuotes = chunkRes.value;
          const quotesList = Array.isArray(rawQuotes) ? rawQuotes : (rawQuotes ? [rawQuotes] : []);

          for (const q of quotesList) {
            const price = typeof q?.regularMarketPrice === 'number' ? q.regularMarketPrice : (typeof q?.currentPrice === 'number' ? q.currentPrice : (typeof q?.price === 'number' ? q.price : null));
            if (!q || price === null) continue;
            const sym = q.symbol;
            const rawMarketCap = q.marketCap || 0;
            const marketCapCr = rawMarketCap ? Math.floor(rawMarketCap / 10000000) : null;
            const pe = q.trailingPE || q.forwardPE || null;
            const eps = q.epsTrailingTwelveMonths || null;

            // Use cached financials or compute net profit from reported shares & EPS
            let fin = this.financialsCache.get(sym)?.data;
            let netProfit = fin?.netProfit || null;
            let ebit = fin?.ebit || null;

            if (!netProfit && typeof q.sharesOutstanding === 'number' && q.sharesOutstanding > 0 && typeof eps === 'number' && !isNaN(eps)) {
              netProfit = Math.round((q.sharesOutstanding * eps) / 10000000);
            }

            let returns = this.returnsCache.get(sym)?.data || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };

            const ltp = price;
            const previousClose = typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : ltp;
            const change = parseFloat((ltp - previousClose).toFixed(4));
            const changePercent = previousClose > 0 ? parseFloat((((ltp - previousClose) / previousClose) * 100).toFixed(4)) : 0;

            const isSessionLive = session.isOpen && q.regularMarketTime && (Date.now() - new Date(q.regularMarketTime).getTime() < 30 * 60 * 1000);

            results.push({
              symbol: sym,
              name: q.shortName || q.longName || sym,
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
              returns: returns,
              source: "YAHOO_FINANCE",
              sourceType: "YAHOO_QUOTE",
              isLive: isSessionLive,
              priceAsOf: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              dataStatus: session.isOpen ? "LIVE" : "EOD"
            });
          }
        }
      }

      return { available: results.length > 0, data: results };
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

  async getHistoricalPrices(symbol, startDate, endDate) {
    const yahooSym = this.resolveYahooSymbol(symbol);
    try {
      const res = await yahooFinance.chart(yahooSym, {
        period1: startDate instanceof Date ? startDate : new Date(startDate),
        period2: endDate instanceof Date ? endDate : new Date(endDate),
        interval: '1d'
      });
      if (!res || !res.quotes || res.quotes.length === 0) {
        return { available: false, data: [] };
      }
      const data = res.quotes
        .filter(q => (q.close || q.adjclose) !== null && (q.close || q.adjclose) !== undefined)
        .map(q => ({
          date: new Date(q.date).toISOString().split('T')[0],
          timestamp: new Date(q.date).getTime(),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          adjClose: q.adjclose,
          volume: q.volume || 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      return { available: true, data };
    } catch (e) {
      console.warn(`YahooFinanceService: getHistoricalPrices error for ${yahooSym}:`, e.message);
      return { available: false, data: [] };
    }
  }

  async getQuoteDetail(symbol) {
    const yahooSym = this.resolveYahooSymbol(symbol);
    try {
      const q = await yahooFinance.quote(yahooSym);
      if (!q) return null;

      let sector = 'General';
      let industry = null;

      try {
        const summary = await yahooFinance.quoteSummary(yahooSym, { modules: ['assetProfile'] });
        if (summary && summary.assetProfile) {
          if (summary.assetProfile.sector) sector = summary.assetProfile.sector;
          if (summary.assetProfile.industry) industry = summary.assetProfile.industry;
        }
      } catch (profileErr) {
        console.warn(`Profile fetch fallback for ${yahooSym}: ${profileErr.message}`);
      }

      const ltp = q.regularMarketPrice || null;
      const previousClose = typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : ltp;
      const change = ltp && previousClose ? parseFloat((ltp - previousClose).toFixed(4)) : null;
      const changePercent = ltp && previousClose ? parseFloat((((ltp - previousClose) / previousClose) * 100).toFixed(4)) : null;

      const support = ltp ? parseFloat((ltp * 0.965).toFixed(2)) : null;
      const resistance = ltp ? parseFloat((ltp * 1.035).toFixed(2)) : null;
      const session = getIndianMarketSession();

      const [fin, returns] = await Promise.all([
        this.getStockFinancials(yahooSym),
        this.getHistoricalReturns(yahooSym)
      ]);

      let netProfit = fin.netProfit;
      if (!netProfit && typeof q.sharesOutstanding === 'number' && q.sharesOutstanding > 0 && typeof q.epsTrailingTwelveMonths === 'number' && !isNaN(q.epsTrailingTwelveMonths)) {
        netProfit = Math.round((q.sharesOutstanding * q.epsTrailingTwelveMonths) / 10000000);
      }

      const result = {
        symbol: yahooSym,
        name: q.shortName || q.longName || yahooSym,
        ltp,
        open: typeof q.regularMarketOpen === 'number' ? q.regularMarketOpen : previousClose,
        previousClose,
        change,
        changePercent,
        dayHigh: typeof q.regularMarketDayHigh === 'number' ? q.regularMarketDayHigh : ltp,
        dayLow: typeof q.regularMarketDayLow === 'number' ? q.regularMarketDayLow : ltp,
        high52: typeof q.fiftyTwoWeekHigh === 'number' ? q.fiftyTwoWeekHigh : null,
        low52: typeof q.fiftyTwoWeekLow === 'number' ? q.fiftyTwoWeekLow : null,
        marketCap: q.marketCap ? Math.floor(q.marketCap / 10000000) : null,
        pe: q.trailingPE ? parseFloat(q.trailingPE.toFixed(2)) : null,
        pb: q.priceToBook ? parseFloat(q.priceToBook.toFixed(2)) : null,
        eps: q.epsTrailingTwelveMonths ? parseFloat(q.epsTrailingTwelveMonths.toFixed(2)) : null,
        ebit: fin.ebit,
        netProfit: netProfit,
        dividendYield: typeof q.dividendYield === 'number' ? q.dividendYield : null,
        volume: typeof q.regularMarketVolume === 'number' ? q.regularMarketVolume : null,
        vwap: ltp,
        returns: returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
        earliestDate: q.firstTradeDateMilliseconds || null,
        support,
        resistance,
        sector,
        industry,
        source: "YAHOO_FINANCE",
        sourceType: "YAHOO_QUOTE",
        isLive: session.isOpen,
        priceAsOf: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        dataStatus: session.isOpen ? "LIVE" : "EOD"
      };
      return { available: true, data: result };
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

      const res = await yahooFinance.chart(yahooSym, {
        period1: Math.floor(period1.getTime() / 1000),
        period2: Math.floor(Date.now() / 1000),
        interval: '1d'
      });

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
