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
      const promises = uniqueSymbols.map(async (sym) => {
        try {
          const q = await yahooFinance.quote(sym);
          if (!q) return null;
          
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
            marketCap: q.marketCap ? Math.floor(q.marketCap / 10000000) : 0,
            pe: q.trailingPE || q.forwardPE || 0,
            pb: q.priceToBook || 0,
            eps: q.epsTrailingTwelveMonths || 0,
            dividendYield: q.dividendYield || 0,
            volume: q.regularMarketVolume || 0,
            vwap: q.regularMarketPrice || 0
          };
        } catch (e) {
          console.error(`Quote error for ${sym}:`, e.message);
          return null;
        }
      });

      const resolved = await Promise.all(promises);
      const data = resolved.filter(Boolean);
      return { available: data.length > 0, data };
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
