import yahooFinanceService from './YahooFinanceService.js';
import marketDataGateway from './MarketDataGateway.js';

// Core symbols config
const CORE_SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 
  'SBIN.NS', 'TMCV.NS', 'ITC.NS', 'SUNPHARMA.NS', 'TATASTEEL.NS', 
  'DLF.NS', 'AAPL', 'MSFT', 'TSLA', 'NVDA',
  '^NSEI', '^BSESN', '^NSEBANK', '^CNX100', 'JUNIORBEES.NS', '^NSEMDCP50', '^CNXSC', '^CRSLDX'
];

export const INDEX_TICKER_MAP = {
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'BANK NIFTY': '^NSEBANK',
  'NIFTY 100': '^CNX100',
  'NIFTY NEXT 50': 'JUNIORBEES.NS',
  'NIFTY MIDCAP 50': '^NSEMDCP50',
  'NIFTY SMALLCAP 100': '^CNXSC',
  'NIFTY 500': '^CRSLDX',
  'FINNIFTY': '^CNXFIN',
  'India VIX': '^INDIAVIX',
  'S&P 500': '^GSPC',
  'NASDAQ': '^IXIC',
  'FTSE 100': '^FTSE',
  'NIKKEI 225': '^N225'
};

const STOCKS_METADATA = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', sector: 'Energy', basePrice: 1295 },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', sector: 'IT', basePrice: 3880 },
  { symbol: 'INFY.NS', name: 'Infosys Ltd.', sector: 'IT', basePrice: 1820 },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', sector: 'Banking', basePrice: 1742.5 },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', sector: 'Banking', basePrice: 1265.8 },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking', basePrice: 812.3 },
  { symbol: 'TMCV.NS', name: 'Tata Motors Commercial Vehicles', sector: 'Auto', basePrice: 485 },
  { symbol: 'ITC.NS', name: 'ITC Ltd.', sector: 'FMCG', basePrice: 478.5 },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd.', sector: 'Pharma', basePrice: 1885 },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', sector: 'Metals', basePrice: 148.5 },
  { symbol: 'DLF.NS', name: 'DLF Ltd.', sector: 'Realty', basePrice: 825 },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'IT', basePrice: 228.5 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'IT', basePrice: 428.0 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Auto', basePrice: 248.5 },
  { symbol: 'NVDA', name: 'Nvidia Corporation', sector: 'IT', basePrice: 132.5 },
  { symbol: '^NSEI', name: 'NIFTY 50', sector: 'Index', basePrice: 24150 },
  { symbol: '^CNX100', name: 'NIFTY 100', sector: 'Index', basePrice: 25350 },
  { symbol: 'JUNIORBEES.NS', name: 'NIFTY NEXT 50', sector: 'Index', basePrice: 715 },
  { symbol: '^NSEMDCP50', name: 'NIFTY MIDCAP 50', sector: 'Index', basePrice: 15850 },
  { symbol: '^CNXSC', name: 'NIFTY SMALLCAP 100', sector: 'Index', basePrice: 17450 },
  { symbol: '^CRSLDX', name: 'NIFTY 500', sector: 'Index', basePrice: 22450 }
];

const SECTORS_LIST = [
  'Banking', 'IT', 'Pharma', 'FMCG', 'Auto', 'Realty', 'Energy', 'Metals', 'Index'
];

class SimulatorService {
  constructor() {
    this.stocks = {};
    this.indices = {};
    this.news = [];
    this.economics = {};
    this.io = null;
    this.initTimer = null;
    this.yahooInterval = null;
  }

  initialize(ioInstance) {
    this.io = ioInstance;
    this.initializeEconomics();
    this.initializeIndices();
    this.initializeStocks();
    this.initializeNews();
    this.startSimulationLoops();
    this.startYahooFinancePolling();
  }

  initializeEconomics() {
    this.economics = {
      gdp: { value: 7.2, unit: '% YoY', change: 0.1, history: this.generateMacroHistory(7.0, 0.2, 10) },
      inflation: { value: 4.8, unit: '% YoY', change: -0.2, history: this.generateMacroHistory(5.1, 0.15, 10) },
      interestRate: { value: 6.5, unit: '%', change: 0.0, history: this.generateMacroHistory(6.5, 0.0, 10) },
      usdInr: { value: 83.45, unit: 'INR', change: 0.08, history: this.generateMacroHistory(83.1, 0.1, 10) },
      crudeOil: { value: 82.50, unit: 'USD/bbl', change: -1.2, history: this.generateMacroHistory(84.0, 1.5, 10) },
      gold: { value: 72400, unit: 'INR/10g', change: 450, history: this.generateMacroHistory(71000, 300, 10) },
      bondYield: { value: 7.02, unit: '%', change: -0.01, history: this.generateMacroHistory(7.1, 0.05, 10) }
    };
  }

  generateMacroHistory(base, variance, count) {
    let current = base;
    const history = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
      current = current + (Math.random() - 0.5) * variance;
      history.push({ date: d.toISOString().split('T')[0], value: parseFloat(current.toFixed(2)) });
    }
    return history;
  }

  initializeIndices() {
    this.indices = {
      'NIFTY 50': { value: 24154.9, price: 24154.9, change: -132.8, changePercent: -0.55, high: 24310, low: 24110 },
      'SENSEX': { value: 77235.46, price: 77235.46, change: -493.2, changePercent: -0.63, high: 77800, low: 77100 },
      'BANK NIFTY': { value: 57262.4, price: 57262.4, change: -235.6, changePercent: -0.41, high: 57600, low: 57100 },
      'FINNIFTY': { value: 28428.4, price: 28428.4, change: -141.0, changePercent: -0.49, high: 28553, low: 28404 },
      'MIDCAP': { value: 18216.8, price: 18216.8, change: -62.3, changePercent: -0.34, high: 18403, low: 18150 },
      'SMALLCAP': { value: 19808.85, price: 19808.85, change: -0.4, changePercent: -0.002, high: 19868, low: 19764 },
      'India VIX': { value: 13.80, price: 13.80, change: -0.45, changePercent: -3.16, high: 14.30, low: 13.50 },
      'S&P 500': { value: 5560, price: 5560, change: 25, changePercent: 0.45, high: 5575, low: 5530 },
      'NASDAQ': { value: 18450, price: 18450, change: 110, changePercent: 0.60, high: 18500, low: 18320 },
      'FTSE 100': { value: 8250, price: 8250, change: 15, changePercent: 0.18, high: 8280, low: 8220 },
      'NIKKEI 225': { value: 41200, price: 41200, change: 350, changePercent: 0.86, high: 41350, low: 40950 },
      'NIFTY 100': { value: 25333.65, price: 25333.65, change: -123.8, changePercent: -0.49, high: 25400, low: 25150 },
      'NIFTY NEXT 50': { value: 80590, price: 80590, change: -236.4, changePercent: -0.29, high: 81804, low: 63234 },
      'NIFTY 500': { value: 23472.4, price: 23472.4, change: -92.0, changePercent: -0.39, high: 24144, low: 20385 }
    };
  }

  initializeStocks() {
    STOCKS_METADATA.forEach(meta => {
      const price = meta.basePrice;
      const pctChange = (Math.random() - 0.4) * 3;
      const change = parseFloat((price * (pctChange / 100)).toFixed(2));
      const ltp = parseFloat((price + change).toFixed(2));
      
      const dayLow = parseFloat((ltp * (1 - Math.random() * 0.015)).toFixed(2));
      const dayHigh = parseFloat((ltp * (1 + Math.random() * 0.015)).toFixed(2));
      const low52 = parseFloat((price * 0.75).toFixed(2));
      const high52 = parseFloat((price * 1.35).toFixed(2));
      
      const pe = parseFloat((15 + Math.random() * 30).toFixed(2));
      const eps = parseFloat((ltp / pe).toFixed(2));
      const divYield = parseFloat((Math.random() * 3).toFixed(2));
      const volume = Math.floor(500000 + Math.random() * 1500000);

      const openPrice = parseFloat((price * (1 - (Math.random() - 0.5) * 0.01)).toFixed(2));
      const previousClose = parseFloat((price * (1 - (Math.random() - 0.5) * 0.015)).toFixed(2));

      this.stocks[meta.symbol] = {
        symbol: meta.symbol,
        name: meta.name,
        sector: meta.sector,
        ltp: ltp,
        open: openPrice,
        previousClose: previousClose,
        change: change,
        changePercent: parseFloat(pctChange.toFixed(2)),
        dayHigh: dayHigh,
        dayLow: dayLow,
        high52: high52,
        low52: low52,
        marketCap: Math.floor(50000 + Math.random() * 1500000),
        pe: pe,
        eps: eps,
        dividendYield: divYield,
        volume: volume,
        support: parseFloat((ltp * 0.96).toFixed(2)),
        resistance: parseFloat((ltp * 1.04).toFixed(2)),
        vwap: ltp,
        candles: {
          '1m': this.generateMockHistoryCandles(ltp, 60, 1),
          '5m': this.generateMockHistoryCandles(ltp, 60, 5),
          '1H': this.generateMockHistoryCandles(ltp, 60, 60),
          '1D': this.generateMockHistoryCandles(ltp, 60, 1440)
        }
      };

      Object.keys(this.stocks[meta.symbol].candles).forEach(interval => {
        this.calculateIndicators(this.stocks[meta.symbol].candles[interval]);
      });
    });
  }

  initializeNews() {
    this.news = [
      {
        id: 'news-1',
        title: 'Markets gain momentum as global indices close in green; IT stocks lead rally',
        source: 'Yahoo Finance',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        sentiment: 'Bullish',
        summary: 'Equities rallied on Tuesday led by solid gains in tech stocks and short cover spikes in banking.'
      },
      {
        id: 'news-2',
        title: 'Crude holds at $82 as inventory limits meet global rate concerns',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        sentiment: 'Neutral',
        summary: 'Brent futures remained stable near multi-week support as traders weigh production cuts against macro demand curbs.'
      }
    ];
  }

  generateMockHistoryCandles(ltp, count, minutesInterval) {
    const candles = [];
    let current = ltp;
    const now = Date.now();
    for (let i = count - 1; i >= 0; i--) {
      const time = now - i * minutesInterval * 60 * 1000;
      const drift = (Math.random() - 0.5) * 0.005 * current;
      const open = parseFloat((current - drift).toFixed(2));
      const close = parseFloat(current.toFixed(2));
      const high = parseFloat((Math.max(open, close) + Math.random() * 0.003 * current).toFixed(2));
      const low = parseFloat((Math.min(open, close) - Math.random() * 0.003 * current).toFixed(2));
      const volume = Math.floor(1000 + Math.random() * 50000);

      candles.push({ time, open, high, low, close, volume });
      current = open;
    }
    return candles.sort((a, b) => a.time - b.time);
  }

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
      rollingVolumePrice += close * volume;
      rollingVolume += volume;
      candles[i].vwap = parseFloat((rollingVolumePrice / rollingVolume).toFixed(2));

      if (i >= p20 - 1) {
        let sum = 0;
        for (let j = 0; j < p20; j++) sum += candles[i - j].close;
        candles[i].sma = parseFloat((sum / p20).toFixed(2));
      } else {
        candles[i].sma = close;
      }

      if (i === 0) {
        candles[i].ema = close;
      } else {
        candles[i].ema = parseFloat((close * k20 + candles[i - 1].ema * (1 - k20)).toFixed(2));
      }

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

  // Poll Yahoo Finance for quote anchors every 15 seconds
  startYahooFinancePolling() {
    let isPolling = false;
    const pollQuotes = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const allSymbolsToFetch = [...new Set([...CORE_SYMBOLS, ...Object.values(INDEX_TICKER_MAP)])];
        const quotesRes = await marketDataGateway.getQuotes(allSymbolsToFetch);
        const quotes = quotesRes.available ? quotesRes.data : [];
        if (!quotes || quotes.length === 0) return;

        const quoteMap = new Map();
        quotes.forEach(q => quoteMap.set(q.symbol, q));

        // Sync individual stock records
        quotes.forEach(q => {
          const local = this.stocks[q.symbol];
          if (local && typeof q.ltp === 'number' && q.ltp > 0) {
            local.ltp = q.ltp;
            local.open = q.open || local.open;
            local.previousClose = q.previousClose || local.previousClose;
            local.change = q.change;
            local.changePercent = q.changePercent;
            local.dayHigh = q.dayHigh;
            local.dayLow = q.dayLow;
            local.high52 = q.high52 || local.high52;
            local.low52 = q.low52 || local.low52;
            local.marketCap = q.marketCap;
            local.pe = q.pe;
            local.eps = q.eps;
            local.dividendYield = q.dividendYield;
            local.volume = q.volume;
            local.vwap = q.vwap;
            local.support = parseFloat((q.ltp * 0.965).toFixed(2));
            local.resistance = parseFloat((q.ltp * 1.035).toFixed(2));
          }
        });

        // Sync authoritative index records
        Object.entries(INDEX_TICKER_MAP).forEach(([key, ticker]) => {
          const q = quoteMap.get(ticker);
          if (q && typeof q.ltp === 'number' && q.ltp > 0) {
            let multiplier = 1;
            if (ticker === 'JUNIORBEES.NS') multiplier = 100;
            const price = parseFloat((q.ltp * multiplier).toFixed(2));
            const change = parseFloat(((q.change || 0) * multiplier).toFixed(2));
            const changePercent = q.changePercent || 0;

            this.indices[key] = {
              value: price,
              price: price,
              change,
              changePercent,
              high: q.dayHigh ? parseFloat((q.dayHigh * multiplier).toFixed(2)) : price,
              low: q.dayLow ? parseFloat((q.dayLow * multiplier).toFixed(2)) : price,
              high52: q.high52 ? parseFloat((q.high52 * multiplier).toFixed(2)) : (this.indices[key]?.high52 || price),
              low52: q.low52 ? parseFloat((q.low52 * multiplier).toFixed(2)) : (this.indices[key]?.low52 || price),
              open: q.open ? parseFloat((q.open * multiplier).toFixed(2)) : price,
              previousClose: q.previousClose ? parseFloat((q.previousClose * multiplier).toFixed(2)) : price,
              timestamp: Date.now()
            };
          }
        });
      } catch (err) {
        console.error('Yahoo Finance poll sync failure:', err.message);
      } finally {
        isPolling = false;
      }
    };

    pollQuotes();
    this.yahooInterval = setInterval(pollQuotes, 15000);
  }

  // Check if Indian market is currently open
  isMarketOpen() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
    const day = ist.getDay();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const currentTime = hours + minutes / 60;
    // Mon-Fri 9:15 AM to 3:30 PM
    return day >= 1 && day <= 5 && currentTime >= 9.25 && currentTime <= 15.5;
  }

  // Micro fluctuations - only active when explicit simulator flag is enabled
  startSimulationLoops() {
    if (process.env.ENABLE_MARKET_SIMULATOR !== 'true') {
      // Production mode: disable synthetic price drift
      return;
    }

    this.initTimer = setInterval(() => {
      const marketOpen = this.isMarketOpen();

      // Only drift prices when simulator is explicitly enabled and market is open
      if (marketOpen) {
        // 1. Update Global Indices (slight drift)
        Object.keys(this.indices).forEach(name => {
          const idx = this.indices[name];
          const drift = (Math.random() - 0.48) * 0.0008;
          const change = idx.price * drift;
          idx.price = parseFloat((idx.price + change).toFixed(2));
          idx.change = parseFloat((idx.change + change).toFixed(2));
          idx.changePercent = parseFloat(((idx.change / (idx.price - idx.change)) * 100).toFixed(2));
        });

        // 2. Micro fluctuation for stocks
        const ticks = [];
        Object.values(this.stocks).forEach(stock => {
          // Apply micro movement (+/- 0.02%)
          const spread = (Math.random() - 0.5) * 0.0004 * stock.ltp;
          const oldLtp = stock.ltp;
          stock.ltp = parseFloat((stock.ltp + spread).toFixed(2));
          stock.change = parseFloat((stock.change + spread).toFixed(2));
          const openPrice = stock.ltp - stock.change;
          stock.changePercent = parseFloat(((stock.change / openPrice) * 100).toFixed(2));

          if (stock.ltp > stock.dayHigh) stock.dayHigh = stock.ltp;
          if (stock.ltp < stock.dayLow) stock.dayLow = stock.ltp;

          const tradeVol = Math.floor(Math.random() * 80);
          stock.volume += tradeVol;

          ticks.push({
            symbol: stock.symbol,
            ltp: stock.ltp,
            change: stock.change,
            changePercent: stock.changePercent,
            volume: stock.volume,
            dayHigh: stock.dayHigh,
            dayLow: stock.dayLow,
            vwap: stock.vwap
          });

          // 3. Update candles
          this.updateCandleTimeframes(stock.symbol, oldLtp, stock.ltp, tradeVol);
          
          // 4. Alert check
          this.evaluateAlerts(stock.symbol, stock.ltp);
        });

        if (this.io) {
          this.io.to('ticks').emit('tick_update', ticks);
          this.io.to('indices').emit('indices_update', this.indices);
        }
      }
      // When market is closed, no price updates are emitted
    }, 1500);

    // Random News generator (Bullish/Bearish shifts)
    setInterval(() => {
      if (Math.random() < 0.25) {
        this.generateRandomNews();
      }
    }, 45000);

    // Macro shifts
    setInterval(() => {
      this.shiftEconomics();
    }, 180000);
  }

  updateCandleTimeframes(symbol, oldPrice, newPrice, volumeAdded) {
    const stock = this.stocks[symbol];
    if (!stock || !stock.candles) return;
    const now = Date.now();

    Object.keys(stock.candles).forEach(interval => {
      const candles = stock.candles[interval];
      if (!candles || candles.length === 0) return;
      const lastCandle = candles[candles.length - 1];

      let intervalMs = 60 * 1000;
      if (interval === '5m') intervalMs = 5 * 60 * 1000;
      if (interval === '1H') intervalMs = 60 * 60 * 1000;
      if (interval === '1D') intervalMs = 24 * 60 * 60 * 1000;

      if (!lastCandle || now - lastCandle.time >= intervalMs) {
        const newCandle = {
          time: Math.floor(now / intervalMs) * intervalMs,
          open: oldPrice,
          high: Math.max(oldPrice, newPrice),
          low: Math.min(oldPrice, newPrice),
          close: newPrice,
          volume: volumeAdded
        };
        candles.push(newCandle);
        if (candles.length > 200) candles.shift();
      } else {
        lastCandle.high = Math.max(lastCandle.high, newPrice);
        lastCandle.low = Math.min(lastCandle.low, newPrice);
        lastCandle.close = newPrice;
        lastCandle.volume = (lastCandle.volume || 0) + volumeAdded;
      }

      this.calculateIndicators(candles);

      if (this.io) {
        this.io.to(`stock:${symbol}`).emit(`candle_update_${interval}`, candles[candles.length - 1]);
      }
    });
  }

  evaluateAlerts(symbol, price) {
    // No-op: Alert system removed (no MongoDB dependency)
  }

  generateRandomNews() {
    const impactSector = SECTORS_LIST[Math.floor(Math.random() * SECTORS_LIST.length)];
    const sentiment = Math.random() > 0.55 ? 'Bullish' : (Math.random() > 0.5 ? 'Bearish' : 'Neutral');
    const sources = ['Bloomberg', 'Reuters', 'NSE Insights', 'LiveMint', 'CNBC-TV18'];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    let title = '';
    let summary = '';
    
    if (sentiment === 'Bullish') {
      title = `${impactSector} sector surges on robust quarterly earnings and favorable policy reforms`;
      summary = `Leading equities in the ${impactSector} segment witnessed heavy buying. Institutional inflows spike amid hopes of rate cuts.`;
    } else if (sentiment === 'Bearish') {
      title = `Sell-off triggers in ${impactSector} space due to high raw material costs and global headwinds`;
      summary = `Technical indicators suggest distribution in ${impactSector} stocks. Margin pressure is expected to impact profitability next quarter.`;
    } else {
      title = `Sector Spotlight: Mixed performance seen in ${impactSector} space amid consolidation`;
      summary = `Consolidation continues within ${impactSector} counters with low volumes. Traders remain cautious ahead of upcoming GST council meet.`;
    }

    const newItem = {
      id: `news-${Date.now()}`,
      title,
      source,
      timestamp: new Date().toISOString(),
      sentiment,
      summary
    };

    this.news.unshift(newItem);
    if (this.news.length > 30) this.news.pop();

    if (this.io) {
      this.io.emit('news_flash', newItem);
    }
  }

  shiftEconomics() {
    const list = Object.keys(this.economics);
    const key = list[Math.floor(Math.random() * list.length)];
    const eco = this.economics[key];
    if (!eco) return;
    
    let shift = (Math.random() - 0.5) * Math.abs(eco.change || 0.1);
    if (key === 'usdInr') shift = (Math.random() - 0.45) * 0.1;
    if (key === 'gold') shift = (Math.random() - 0.4) * 150;

    eco.value = parseFloat((eco.value + shift).toFixed(2));
    eco.change = parseFloat(shift.toFixed(2));
    eco.history[eco.history.length - 1].value = eco.value;

    if (this.io) {
      this.io.emit('economics_update', { key, data: eco });
    }
  }

  getIndices() { return this.indices; }
  
  getStocks() {
    return Object.values(this.stocks).map(s => {
      const { candles, ...rest } = s;
      return rest;
    });
  }

  getStock(symbol) {
    return this.stocks[symbol.toUpperCase()] || null;
  }

  getNews() { return this.news; }

  getEconomics() { return this.economics; }

  getSectors() {
    const sectors = {};
    SECTORS_LIST.forEach(secName => {
      sectors[secName] = {
        name: secName,
        totalCap: 0,
        volume: 0,
        advances: 0,
        declines: 0,
        unchanged: 0,
        pctSum: 0,
        count: 0
      };
    });

    Object.values(this.stocks).forEach(stock => {
      const sec = sectors[stock.sector];
      if (sec) {
        sec.totalCap += stock.marketCap;
        sec.volume += stock.volume;
        sec.pctSum += stock.changePercent;
        sec.count++;
        if (stock.changePercent > 0.05) sec.advances++;
        else if (stock.changePercent < -0.05) sec.declines++;
        else sec.unchanged++;
      }
    });

    return Object.values(sectors).map(sec => {
      const avgChange = sec.count > 0 ? parseFloat((sec.pctSum / sec.count).toFixed(2)) : 0;
      let trend = 'Neutral';
      if (avgChange > 0.3) trend = 'Bullish';
      else if (avgChange < -0.3) trend = 'Bearish';

      return {
        name: sec.name,
        changePercent: avgChange,
        marketCap: sec.totalCap,
        volume: sec.volume,
        advances: sec.advances,
        declines: sec.declines,
        trend
      };
    });
  }

  getMarketBreadth() {
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    let newHighs = 0;
    let newLows = 0;

    Object.values(this.stocks).forEach(s => {
      if (s.changePercent > 0.05) advances++;
      else if (s.changePercent < -0.05) declines++;
      else unchanged++;

      if (s.ltp >= s.high52 * 0.99) newHighs++;
      if (s.ltp <= s.low52 * 1.01) newLows++;
    });

    return {
      advances,
      declines,
      unchanged,
      advanceDeclineRatio: declines > 0 ? parseFloat((advances / declines).toFixed(2)) : advances,
      newHighs,
      newLows
    };
  }

  getTopPerformers() {
    const list = Object.values(this.stocks).map(s => {
      const { candles, ...rest } = s;
      return rest;
    });

    const gainers = [...list].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    const losers = [...list].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    const active = [...list].sort((a, b) => (b.ltp * b.volume) - (a.ltp * a.volume)).slice(0, 10);
    const volume = [...list].sort((a, b) => b.volume - a.volume).slice(0, 10);
    const breakouts = list.filter(s => s.ltp >= s.high52 * 0.97).slice(0, 10);

    return { gainers, losers, active, volume, breakouts };
  }

  getHeatmap() {
    return Object.values(this.stocks).map(s => ({
      name: s.symbol,
      value: s.marketCap,
      changePercent: s.changePercent,
      sector: s.sector,
      price: s.ltp
    }));
  }

  getAIInsights() {
    const sectors = this.getSectors();
    const breadth = this.getMarketBreadth();
    const tops = this.getTopPerformers();

    const strongestSec = [...sectors].sort((a, b) => b.changePercent - a.changePercent)[0];
    const weakestSec = [...sectors].sort((a, b) => a.changePercent - b.changePercent)[0];
    
    const vix = this.indices['India VIX'] ? this.indices['India VIX'].price : 13.8;
    const adFactor = breadth.advances / (breadth.advances + breadth.declines + 1);
    const riskScore = Math.min(100, Math.max(10, Math.floor(vix * 4 + (1 - adFactor) * 40)));

    let marketSentiment = 'Neutral';
    if (breadth.advanceDeclineRatio > 1.4) marketSentiment = 'Bullish';
    else if (breadth.advanceDeclineRatio < 0.7) marketSentiment = 'Bearish';

    const avgVolume = 800000;
    const volumeShockers = tops.volume
      .filter(s => s.volume > avgVolume * 1.5)
      .map(s => ({ symbol: s.symbol, changePercent: s.changePercent, ratio: parseFloat((s.volume / avgVolume).toFixed(2)) }));

    return {
      sentiment: marketSentiment,
      riskScore,
      strongestSector: strongestSec ? strongestSec.name : 'N/A',
      weakestSector: weakestSec ? weakestSec.name : 'N/A',
      volumeShockers,
      breakoutCandidates: tops.breakouts.map(s => ({ symbol: s.symbol, currentPrice: s.ltp, high52: s.high52 })),
      summary: `Market breadth is active with ${breadth.advances} stocks gaining and ${breadth.declines} declining. Sector analysis shows ${strongestSec ? strongestSec.name : 'N/A'} is leading buyer allocations today, while ${weakestSec ? weakestSec.name : 'N/A'} indices face structural distribution. General volatility index (VIX) trends around ${vix}, suggesting a stable environment for trading.`
    };
  }
}

export default new SimulatorService();
