import YahooFinance from 'yahoo-finance2';

// yahoo-finance2 v4 instantiation
export let yahooFinance;
try {
  yahooFinance = new YahooFinance();
  // Suppress schema validation errors for .NS tickers
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

  // Autocomplete search wrapper
  async search(query) {
    try {
      if (!query || query.trim().length === 0) return [];
      const res = await yahooFinance.search(query, { newsCount: 0 });
      // Map results to uniform structure
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

  // Fetch quotes for list of symbols
  async getQuotes(symbols = this.coreSymbols) {
    try {
      const uniqueSymbols = [...new Set(symbols)];
      const results = [];
      
      // Batch or map queries
      // yahooFinance.quote can take an array in some versions, or we query in parallel limit
      const promises = uniqueSymbols.map(async (sym) => {
        try {
          const q = await yahooFinance.quote(sym);
          if (!q) return { available: false, reason: 'Quote not found', data: null };
          
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
            marketCap: q.marketCap ? Math.floor(q.marketCap / 10000000) : 0, // in Cr approx if INR, or simple million/billion scaling
            pe: q.trailingPE || q.forwardPE || 0,
            pb: q.priceToBook || 0,
            eps: q.epsTrailingTwelveMonths || 0,
            dividendYield: q.dividendYield || 0,
            volume: q.regularMarketVolume || 0,
            vwap: q.regularMarketPrice || 0 // fallback
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

  // Fetch single quote details
  async getQuoteDetail(symbol) {
    try {
      const q = await yahooFinance.quote(symbol);
      if (!q) return null;

      // support and resistance estimation
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
        sector: 'General'
      };
      return { available: true, data: result };
    } catch (err) {
      console.error(`Yahoo Finance getQuoteDetail error for ${symbol}:`, err.message);
      return { available: false, reason: err.message, data: null };
    }
  }

  // Get historical candles
  async getChartData(symbol, interval = '1d') {
    try {
      let yfInterval = '1d';
      let period1;

      // Import inside the method to avoid circular dependency if dateRangeUtils depends on something
      // or we can import at the top. Let's assume dateRangeUtils is imported at the top.
      const { resolveRangeToDates } = await import('../utils/dateRangeUtils.js');
      
      const parsedRange = resolveRangeToDates(interval);
      period1 = parsedRange.start;

      // Determine if this is a FY/CY range (JSON string starting with '{' or containing fy:/cy: prefix)
      const isFyCyRange = typeof interval === 'string' && (interval.startsWith('{') || interval.startsWith('fy:') || interval.startsWith('cy:'));

      // Adjust yfInterval based on the range type
      if (isFyCyRange) {
        yfInterval = '1d';
      } else if (typeof interval === 'string') {
        if (interval === '1d') yfInterval = '5m';
        else if (interval === '1w') yfInterval = '15m';
        else if (interval === '1mo') yfInterval = '1h';
        else if (interval === '1yr' || interval === '1y') yfInterval = '1d';
        else if (interval === '3y' || interval === '3yr') yfInterval = '1wk';
        else if (interval === '5yr' || interval === '5y') yfInterval = '1wk';
        else if (interval === 'max') yfInterval = '1mo';
        else if (interval === '1m') yfInterval = '1m';
        else if (interval === '5m') yfInterval = '5m';
        else if (interval === '1H') yfInterval = '1h';
      } else if (typeof interval === 'object') {
        yfInterval = '1d';
      }

      const chartOpts = { period1, interval: yfInterval };
      // For FY/CY, pass period2 to restrict the date window
      if (isFyCyRange && parsedRange.end) {
        chartOpts.period2 = parsedRange.end;
      }

      const res = await yahooFinance.chart(symbol, chartOpts);

      if (!res || !res.quotes || res.quotes.length === 0) {
        return { available: false, reason: 'No chart data', data: [] };
      }

      // Format quotes
      const candles = res.quotes
        .filter(q => q.open !== null && q.close !== null)
        .map(q => ({
          time: new Date(q.date).getTime(),
          open: parseFloat(q.open.toFixed(2)),
          high: parseFloat(q.high.toFixed(2)),
          low: parseFloat(q.low.toFixed(2)),
          close: parseFloat(q.close.toFixed(2)),
          volume: q.volume || 0
        }));

      // Calculate indicators on Yahoo pricing
      this.calculateIndicators(candles);
      if (res.meta && res.meta.firstTradeDate) {
        candles.earliestDate = res.meta.firstTradeDate * 1000;
      }
      return { available: true, data: candles };
    } catch (err) {
      console.error(`Yahoo Finance chart data error for ${symbol}:`, err.message);
      return { available: false, reason: err.message, data: [] };
    }
  }

  // Copy indicators calculator helper
  calculateIndicators(candles) {
    if (candles.length === 0) return;
    
    const p20 = 20;
    const k20 = 2 / (p20 + 1);
    
    let avgGain = 0;
    let avgLoss = 0;

    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const k9 = 2 / (9 + 1);

    let ema12 = candles[0].close;
    let ema26 = candles[0].close;
    let emaGP9 = 0;

    let rollingVolumePrice = 0;
    let rollingVolume = 0;

    for (let i = 0; i < candles.length; i++) {
      const close = candles[i].close;
      const volume = candles[i].volume || 1;

      // VWAP
      rollingVolumePrice += close * volume;
      rollingVolume += volume;
      candles[i].vwap = parseFloat((rollingVolumePrice / rollingVolume).toFixed(2));

      // SMA 20
      if (i >= p20 - 1) {
        let sum = 0;
        for (let j = 0; j < p20; j++) sum += candles[i - j].close;
        candles[i].sma = parseFloat((sum / p20).toFixed(2));
      } else {
        candles[i].sma = close;
      }

      // EMA 20
      if (i === 0) {
        candles[i].ema = close;
      } else {
        candles[i].ema = parseFloat((close * k20 + candles[i - 1].ema * (1 - k20)).toFixed(2));
      }

      // Bollinger Bands (20 periods)
      if (i >= p20 - 1) {
        const sma = candles[i].sma;
        let varianceSum = 0;
        for (let j = 0; j < p20; j++) {
          varianceSum += Math.pow(candles[i - j].close - sma, 2);
        }
        const stdDev = Math.sqrt(varianceSum / p20);
        candles[i].bbUpper = parseFloat((sma + 2 * stdDev).toFixed(2));
        candles[i].bbLower = parseFloat((sma - 2 * stdDev).toFixed(2));
      } else {
        candles[i].bbUpper = parseFloat((close * 1.02).toFixed(2));
        candles[i].bbLower = parseFloat((close * 0.98).toFixed(2));
      }

      // RSI 14
      if (i > 0) {
        const change = close - candles[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        if (i <= 14) {
          avgGain += gain;
          avgLoss += loss;
          if (i === 14) {
            avgGain /= 14;
            avgLoss /= 14;
          }
        } else {
          avgGain = (avgGain * 13 + gain) / 14;
          avgLoss = (avgLoss * 13 + loss) / 14;
        }

        if (i >= 14) {
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          candles[i].rsi = parseFloat((100 - 100 / (1 + rs)).toFixed(2));
        } else {
          candles[i].rsi = 50;
        }
      } else {
        candles[i].rsi = 50;
      }

      // MACD (12, 26, 9)
      ema12 = close * k12 + ema12 * (1 - k12);
      ema26 = close * k26 + ema26 * (1 - k26);
      const macdVal = ema12 - ema26;
      candles[i].macd = parseFloat(macdVal.toFixed(2));

      if (i === 0) {
        emaGP9 = macdVal;
        candles[i].macdSignal = parseFloat(emaGP9.toFixed(2));
      } else {
        emaGP9 = macdVal * k9 + emaGP9 * (1 - k9);
        candles[i].macdSignal = parseFloat(emaGP9.toFixed(2));
      }
      candles[i].macdHist = parseFloat((candles[i].macd - candles[i].macdSignal).toFixed(2));
    }
  }
}

export default new YahooFinanceService();
