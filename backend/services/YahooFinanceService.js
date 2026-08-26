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
      // Fetch complete monthly chart history from inception (period1: 0) to now
      const chart = await yahooFinance.chart(sym, { period1: 0, period2: now, interval: '1mo' });
      const quotes = (chart.quotes || []).filter(q => q.close !== null && q.close !== undefined);
      if (quotes.length === 0) {
        return { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
      }

      const latestPrice = chart.meta.regularMarketPrice || quotes[quotes.length - 1]?.close;

      const calcReturn = (pastPrice) => {
        if (!pastPrice || !latestPrice || pastPrice <= 0) return null;
        return parseFloat((((latestPrice - pastPrice) / pastPrice) * 100).toFixed(2));
      };

      const getMonthsAgoPrice = (months) => {
        if (quotes.length <= months) return quotes[0]?.close;
        const targetIdx = quotes.length - 1 - months;
        return quotes[Math.max(0, targetIdx)]?.close;
      };

      // 1W return: try short 10d daily chart
      const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      let p1w = null;
      try {
        const chart1w = await yahooFinance.chart(sym, { period1: d10, period2: now, interval: '1d' });
        const dQuotes = (chart1w.quotes || []).filter(q => q.close);
        if (dQuotes.length >= 5) {
          p1w = dQuotes[0].close;
        }
      } catch(e) {}

      const p1m = getMonthsAgoPrice(1);
      const p6m = getMonthsAgoPrice(6);
      const p1y = getMonthsAgoPrice(12);
      const p3y = getMonthsAgoPrice(36);
      const p5y = getMonthsAgoPrice(60);
      const pAll = quotes[0]?.close;

      const returns = {
        '1W': p1w ? calcReturn(p1w) : null,
        '1M': calcReturn(p1m),
        '6M': calcReturn(p6m),
        '1Y': calcReturn(p1y),
        '3Y': calcReturn(p3y),
        '5Y': calcReturn(p5y),
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
