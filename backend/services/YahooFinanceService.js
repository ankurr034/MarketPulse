import YahooFinance from 'yahoo-finance2';

export let yahooFinance;
try {
  yahooFinance = new YahooFinance();
  try { yahooFinance.setGlobalConfig({ validation: { logErrors: false } }); } catch(e) {}
} catch(e) {
  console.error('YahooFinance instantiation error, trying default import:', e.message);
  yahooFinance = YahooFinance;
}

class YahooFinanceService {
  constructor() {
    this.coreSymbols = [
      'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 
      'SBIN.NS', 'TATAMOTORS.NS', 'ITC.NS', 'SUNPHARMA.NS', 'TATASTEEL.NS', 
      'DLF.NS', 'AAPL', 'MSFT', 'TSLA', 'NVDA',
      '^NSEI', '^CNX100', 'JUNIORBEES.NS', '^NSEMDCP50', '^CNXSC', '^CRSLDX'
    ];
    this.financialsCache = new Map();
    this.FINANCIALS_CACHE_TTL = 3600000; // 1 hour TTL
    this.returnsCache = new Map();
    this.RETURNS_CACHE_TTL = 3600000; // 1 hour TTL
  }

  async getHistoricalReturns(sym) {
    if (!sym) return { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
    const cached = this.returnsCache.get(sym);
    if (cached && (Date.now() - cached.timestamp < this.RETURNS_CACHE_TTL)) {
      return cached.data;
    }

    try {
      const now = new Date();
      const p5y = new Date(now.getFullYear() - 5, now.getMonth() - 2, now.getDate());

      // Fetch 5Y daily chart (for 1W, 1M, 6M, 1Y, 3Y, 5Y) and lifetime monthly chart (for ALL inception)
      const [dailyChart, monthlyChart] = await Promise.all([
        yahooFinance.chart(sym, { period1: p5y, period2: now, interval: '1d' }),
        yahooFinance.chart(sym, { period1: 0, period2: now, interval: '1mo' })
      ]);

      const dQuotes = (dailyChart.quotes || []).filter(q => (q.close || q.adjclose) !== null && (q.close || q.adjclose) !== undefined);
      const mQuotes = (monthlyChart.quotes || []).filter(q => (q.close || q.adjclose) !== null && (q.close || q.adjclose) !== undefined);
      
      if (dQuotes.length === 0 && mQuotes.length === 0) {
        return { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
      }

      const latestQuote = dQuotes[dQuotes.length - 1] || mQuotes[mQuotes.length - 1];
      const latestPrice = dailyChart.meta?.regularMarketPrice || latestQuote?.close || latestQuote?.adjclose;

      const calcReturn = (pastPrice) => {
        if (!pastPrice || !latestPrice || pastPrice <= 0) return null;
        return parseFloat((((latestPrice - pastPrice) / pastPrice) * 100).toFixed(2));
      };

      // Broker standard (Upstox / Groww): find the latest trading day closing price on or before target date
      const findQuoteOnOrBefore = (targetDate) => {
        if (dQuotes.length === 0) return null;
        const targetTime = targetDate.getTime();
        let best = null;
        for (const q of dQuotes) {
          const t = new Date(q.date).getTime();
          if (t <= targetTime) {
            best = q;
          } else {
            break;
          }
        }
        return best ? (best.close || best.adjclose) : (dQuotes[0]?.close || dQuotes[0]?.adjclose);
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
      const p5yPrice = findQuoteOnOrBefore(d5y);
      const pAll = mQuotes.length > 0 ? (mQuotes[0]?.close || mQuotes[0]?.adjclose) : (dQuotes[0]?.close || dQuotes[0]?.adjclose);

      const returns = {
        '1W': calcReturn(p1w),
        '1M': calcReturn(p1m),
        '6M': calcReturn(p6m),
        '1Y': calcReturn(p1y),
        '3Y': calcReturn(p3y),
        '5Y': calcReturn(p5yPrice),
        'ALL': calcReturn(pAll)
      };

      this.returnsCache.set(sym, { data: returns, timestamp: Date.now() });
      return returns;
    } catch (e) {
      const fallback = { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
      this.returnsCache.set(sym, { data: fallback, timestamp: Date.now() });
      return fallback;
    }
  }

  async getStockFinancials(sym) {
    // Check if symbol is an index or benchmark ticker (starts with ^ or is an ETF)
    if (sym.startsWith('^') || sym === 'JUNIORBEES.NS') {
      return { ebit: null, netProfit: null };
    }

    const cached = this.financialsCache.get(sym);
    if (cached && (Date.now() - cached.timestamp < this.FINANCIALS_CACHE_TTL)) {
      return cached.data;
    }

    try {
      const qs = await yahooFinance.quoteSummary(sym, { modules: ['financialData', 'defaultKeyStatistics', 'assetProfile'] });
      const fd = qs.financialData || {};
      const ks = qs.defaultKeyStatistics || {};
      const ap = qs.assetProfile || {};

      const isFinancialInstitution = (
        ap.sector === 'Financial Services' || 
        ap.industry?.includes('Bank') ||
        ap.industry?.includes('Financial') ||
        ap.industry?.includes('Insurance') ||
        sym.includes('BANK') || 
        sym.includes('FINANCE') ||
        sym.includes('FINSERV') ||
        sym.includes('HDFCLIFE') ||
        sym.includes('SBILIFE') ||
        sym.includes('ICICIPRULI') ||
        sym.includes('MUTHOOT')
      );

      let rate = 1;
      if (fd.financialCurrency === 'USD' && sym.endsWith('.NS')) {
        rate = 86.5; // USD to INR conversion
      }

      // 1. EBIT / Operating Income:
      // For Banks & Financial Institutions, EBIT is economically non-applicable (interest is an operating cost of funds).
      let ebit = null;
      let ebitSource = '—';
      let ebitType = '—';

      if (isFinancialInstitution) {
        ebit = null;
        ebitSource = 'N/A (Financial Institution)';
        ebitType = 'N/A';
      } else if (typeof fd.operatingIncome === 'number' && !isNaN(fd.operatingIncome)) {
        // Priority 1: Explicit reported operating income
        ebit = Math.round((fd.operatingIncome * rate) / 10000000);
        ebitSource = 'financialData.operatingIncome';
        ebitType = 'Reported';
      } else if (typeof fd.ebit === 'number' && !isNaN(fd.ebit) && fd.ebit > 0) {
        // Priority 2: Explicit reported EBIT
        ebit = Math.round((fd.ebit * rate) / 10000000);
        ebitSource = 'financialData.ebit';
        ebitType = 'Reported';
      } else if (
        typeof fd.totalRevenue === 'number' && 
        typeof fd.operatingMargins === 'number' && 
        fd.totalRevenue > 0 && 
        !isNaN(fd.operatingMargins)
      ) {
        // Priority 3: Derived from reported financial statement TTM inputs (Total Revenue × Operating Margin)
        ebit = Math.round((fd.totalRevenue * rate * fd.operatingMargins) / 10000000);
        ebitSource = 'financialData.totalRevenue * operatingMargins';
        ebitType = 'Derived from reported inputs';
      }

      // 2. Net Profit (Reported Net Income):
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

      this.financialsCache.set(sym, { data: res, timestamp: Date.now() });
      return res;
    } catch (e) {
      const fallback = { ebit: null, netProfit: null, ebitSource: '—', ebitType: '—', netProfitSource: '—', reportingPeriod: 'TTM' };
      this.financialsCache.set(sym, { data: fallback, timestamp: Date.now() });
      return fallback;
    }
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
          exchange: q.exchange
        }));
      return { available: true, data };
    } catch (err) {
      console.error('Yahoo Finance search error:', err.message);
      return { available: false, reason: err.message, data: [] };
    }
  }

  async getQuotes(symbols = this.coreSymbols) {
    try {
      const uniqueSymbols = [...new Set(symbols)];
      const chunkSize = 15;
      const results = [];

      for (let i = 0; i < uniqueSymbols.length; i += chunkSize) {
        const chunk = uniqueSymbols.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (sym) => {
          try {
            const q = await yahooFinance.quote(sym);
            if (!q) return null;
            
            const rawMarketCap = q.marketCap || 0;
            const marketCapCr = rawMarketCap ? Math.floor(rawMarketCap / 10000000) : 0;
            const pe = q.trailingPE || q.forwardPE || 0;
            const eps = q.epsTrailingTwelveMonths || 0;

            // Fetch reported financial statements (EBIT & Net Income) and historical returns
            const [fin, returns] = await Promise.all([
              this.getStockFinancials(sym),
              this.getHistoricalReturns(sym)
            ]);

            let netProfit = fin.netProfit;
            if (!netProfit && typeof q.sharesOutstanding === 'number' && q.sharesOutstanding > 0 && typeof eps === 'number' && !isNaN(eps)) {
              netProfit = Math.round((q.sharesOutstanding * eps) / 10000000);
            }

            let ebit = fin.ebit;

            return {
              symbol: sym,
              name: q.shortName || q.longName || sym,
              ltp: q.regularMarketPrice || 0,
              open: q.regularMarketOpen || q.regularMarketPreviousClose || 0,
              previousClose: q.regularMarketPreviousClose || 0,
              change: parseFloat((q.regularMarketChange || 0).toFixed(2)),
              changePercent: parseFloat((q.regularMarketChangePercent || 0).toFixed(2)),
              dayHigh: q.regularMarketDayHigh || 0,
              dayLow: q.regularMarketDayLow || 0,
              high52: q.fiftyTwoWeekHigh || 0,
              low52: q.fiftyTwoWeekLow || 0,
              marketCap: marketCapCr,
              pe: pe ? parseFloat(pe.toFixed(2)) : 0,
              pb: q.priceToBook || 0,
              eps: eps ? parseFloat(eps.toFixed(2)) : 0,
              ebit: (typeof ebit === 'number' && ebit > 0) ? ebit : null,
              netProfit: (typeof netProfit === 'number' && netProfit > 0) ? netProfit : null,
              dividendYield: q.dividendYield || 0,
              volume: q.regularMarketVolume || 0,
              vwap: q.regularMarketPrice || 0,
              returns: returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null }
            };
          } catch (e) {
            console.error(`Quote error for ${sym}:`, e.message);
            return null;
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.filter(Boolean));
      }

      return { available: results.length > 0, data: results };
    } catch (err) {
      console.error('Yahoo Finance batch quotes error:', err.message);
      return { available: false, reason: err.message, data: [] };
    }
  }

  async getQuoteDetail(symbol) {
    try {
      const q = await yahooFinance.quote(symbol);
      if (!q) return null;

      let sector = 'General';
      let industry = null;

      try {
        const summary = await yahooFinance.quoteSummary(symbol, { modules: ['assetProfile'] });
        if (summary && summary.assetProfile) {
          if (summary.assetProfile.sector) sector = summary.assetProfile.sector;
          if (summary.assetProfile.industry) industry = summary.assetProfile.industry;
        }
      } catch (profileErr) {
        console.warn(`Profile fetch fallback for ${symbol}: ${profileErr.message}`);
      }

      const ltp = q.regularMarketPrice || 0;
      const support = parseFloat((ltp * 0.965).toFixed(2));
      const resistance = parseFloat((ltp * 1.035).toFixed(2));

      const result = {
        symbol,
        name: q.shortName || q.longName || symbol,
        ltp,
        open: q.regularMarketOpen || q.regularMarketPreviousClose || 0,
        previousClose: q.regularMarketPreviousClose || 0,
        change: parseFloat((q.regularMarketChange || 0).toFixed(2)),
        changePercent: parseFloat((q.regularMarketChangePercent || 0).toFixed(2)),
        dayHigh: q.regularMarketDayHigh || 0,
        dayLow: q.regularMarketDayLow || 0,
        high52: q.fiftyTwoWeekHigh || 0,
        low52: q.fiftyTwoWeekLow || 0,
        marketCap: q.marketCap ? Math.floor(q.marketCap / 10000000) : 0,
        pe: q.trailingPE || q.forwardPE || 0,
        pb: q.priceToBook || 0,
        eps: q.epsTrailingTwelveMonths || 0,
        dividendYield: q.dividendYield || 0,
        volume: q.regularMarketVolume || 0,
        vwap: q.regularMarketPrice || 0,
        earliestDate: q.firstTradeDateMilliseconds || null,
        support,
        resistance,
        sector,
        industry
      };
      return { available: true, data: result };
    } catch (err) {
      console.error(`Yahoo Finance getQuoteDetail error for ${symbol}:`, err.message);
      return { available: false, reason: err.message, data: null };
    }
  }

  async getChartData(symbol, interval = '1d') {
    try {
      const { resolveRangeToDates } = await import('../utils/dateRangeUtils.js');
      const parsedRange = resolveRangeToDates(interval);
      const period1 = parsedRange.start;

      const res = await yahooFinance.chart(symbol, {
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
      console.error(`Yahoo Finance chart error for ${symbol}:`, err.message);
      return { available: false, reason: err.message, data: [] };
    }
  }
}

export default new YahooFinanceService();
