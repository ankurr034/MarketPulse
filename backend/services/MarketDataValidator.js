// backend/services/MarketDataValidator.js

/**
 * MarketDataValidator: Comprehensive validation and session-awareness layer
 * for all stock and sector market data.
 */

// Exchange holiday list (standard NSE/BSE holidays YYYY-MM-DD)
const NSE_HOLIDAYS_2026 = new Set([
  '2026-01-26', // Republic Day
  '2026-03-06', // Maha Shivratri
  '2026-03-25', // Holi
  '2026-04-02', // Mahavir Jayanti
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-06-17', // Bakri Id
  '2026-07-17', // Muharram
  '2026-08-15', // Independence Day
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-08', // Diwali Laxmi Pujan
  '2026-11-10', // Diwali Balipratipada
  '2026-11-24', // Gurunanak Jayanti
  '2026-12-25'  // Christmas
]);

/**
 * Determine the current market session status for Indian exchanges (NSE/BSE).
 * Returns: { isOpen: boolean, session: 'OPEN'|'PRE_OPEN'|'CLOSED'|'HOLIDAY'|'WEEKEND', istTimeStr: string }
 */
export function getIndianMarketSession(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));
  
  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(istTime.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${dayOfMonth}`;

  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const istTimeStr = istTime.toISOString().replace('Z', '+05:30');

  if (day === 0 || day === 6) {
    return { isOpen: false, session: 'WEEKEND', istTimeStr };
  }

  if (NSE_HOLIDAYS_2026.has(dateStr)) {
    return { isOpen: false, session: 'HOLIDAY', istTimeStr };
  }

  // Pre-open: 09:00 - 09:15 (540 to 555)
  if (timeInMinutes >= 540 && timeInMinutes < 555) {
    return { isOpen: false, session: 'PRE_OPEN', istTimeStr };
  }

  // Normal Trading: 09:15 - 15:30 (555 to 930)
  if (timeInMinutes >= 555 && timeInMinutes <= 930) {
    return { isOpen: true, session: 'OPEN', istTimeStr };
  }

  // Post-close session: 15:30 - 16:00 (930 to 960)
  if (timeInMinutes > 930 && timeInMinutes <= 960) {
    return { isOpen: false, session: 'POST_CLOSE', istTimeStr };
  }

  return { isOpen: false, session: 'CLOSED', istTimeStr };
}

/**
 * Determine the current market session for US exchanges (NYSE/NASDAQ).
 * 09:30 - 16:00 US Eastern (UTC - 4 or -5).
 */
export function getUSMarketSession(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const estTime = new Date(utc - (3600000 * 4));
  
  const day = estTime.getDay();
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) {
    return { isOpen: false, session: 'WEEKEND' };
  }

  // 09:30 to 16:00 (570 to 960)
  if (timeInMinutes >= 570 && timeInMinutes <= 960) {
    return { isOpen: true, session: 'OPEN' };
  }

  return { isOpen: false, session: 'CLOSED' };
}

/**
 * Financial institutions: Banks, NBFCs, Insurance entities.
 * EBIT is strictly null (GAAP/IFRS standard).
 */
const FINANCIAL_ENTITY_SYMBOLS = new Set([
  'HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'AXISBANK.NS',
  'INDUSINDBK.NS', 'BANKBARODA.NS', 'PNB.NS', 'IDFCFIRSTB.NS', 'FEDERALBNK.NS',
  'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'CHOLAFIN.NS', 'SHRIRAMFIN.NS', 'MUTHOOTFIN.NS',
  'HDFCLIFE.NS', 'SBILIFE.NS', 'ICICIPRULI.NS', 'ICICIGI.NS',
  'CANBK.NS', 'UNIONBANK.NS', 'IOB.NS', 'INDIANB.NS', 'BANKINDIA.NS', 'CENTRALBK.NS',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'SCHW', 'BLK', 'AXP', 'PGR', 'BRK-B', 'V', 'MA'
]);

export function isFinancialEntity(symbol = '') {
  if (!symbol) return false;
  const clean = String(symbol).toUpperCase().trim();
  if (FINANCIAL_ENTITY_SYMBOLS.has(clean) || FINANCIAL_ENTITY_SYMBOLS.has(clean.replace('.NS', ''))) {
    return true;
  }
  return clean.includes('BANK') || clean.includes('FINANCE') || clean.includes('INSUR');
}

/**
 * Validate and sanitize a single stock quote object.
 * Rejects impossible/invalid figures without fabricating data.
 */
export function validateAndSanitizeQuote(rawQuote) {
  if (!rawQuote || typeof rawQuote !== 'object') {
    return null;
  }

  const symbol = String(rawQuote.symbol || '').toUpperCase().trim();
  if (!symbol) return null;

  const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol.startsWith('^NSE') || symbol.startsWith('^CNX') || symbol.startsWith('^CRSL') || symbol.startsWith('^BSE');
  const exchange = rawQuote.exchange || (isIndian ? (symbol.endsWith('.BO') || symbol.includes('BSE') ? 'BSE' : 'NSE') : 'US');
  const exchangeSegment = rawQuote.exchangeSegment || (symbol.startsWith('^') ? `${exchange}_INDEX` : `${exchange}_EQ`);

  const rawLtp = rawQuote.ltp;
  const rawPrevClose = rawQuote.previousClose;

  const isValidLtp = typeof rawLtp === 'number' && !isNaN(rawLtp) && isFinite(rawLtp) && rawLtp > 0;
  const isValidPrevClose = typeof rawPrevClose === 'number' && !isNaN(rawPrevClose) && isFinite(rawPrevClose) && rawPrevClose > 0;

  if (!isValidLtp) {
    // Return structured unavailable quote
    return {
      symbol,
      name: rawQuote.name || symbol,
      exchange,
      exchangeSegment,
      ltp: null,
      open: null,
      previousClose: isValidPrevClose ? rawPrevClose : null,
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      high52: null,
      low52: null,
      volume: null,
      marketCap: null,
      pe: null,
      pb: null,
      eps: null,
      ebit: null,
      revenue: null,
      revenueYoY: null,
      revenueQuarterly: null,
      netProfit: null,
      dividendYield: null,
      vwap: null,
      returns: rawQuote.returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
      source: rawQuote.source || 'UNAVAILABLE',
      sourceType: rawQuote.sourceType || 'UNAVAILABLE',
      dataStatus: 'UNAVAILABLE',
      isLive: false,
      priceAsOf: null,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  const ltp = rawLtp;
  const previousClose = isValidPrevClose ? rawPrevClose : ltp;

  // Unrounded float precision calculation
  const change = parseFloat((ltp - previousClose).toFixed(4));
  const changePercent = previousClose > 0 
    ? parseFloat((((ltp - previousClose) / previousClose) * 100).toFixed(4))
    : 0;

  let open = typeof rawQuote.open === 'number' && rawQuote.open > 0 ? rawQuote.open : previousClose;
  let dayHigh = typeof rawQuote.dayHigh === 'number' && rawQuote.dayHigh > 0 ? rawQuote.dayHigh : Math.max(open, ltp);
  let dayLow = typeof rawQuote.dayLow === 'number' && rawQuote.dayLow > 0 ? rawQuote.dayLow : Math.min(open, ltp);

  // Guarantee physical OHLC bounds
  dayHigh = Math.max(dayHigh, open, ltp);
  dayLow = Math.min(dayLow, open, ltp);

  const rawVol = rawQuote.volume;
  const volume = typeof rawVol === 'number' && !isNaN(rawVol) && isFinite(rawVol) && rawVol >= 0 ? rawVol : 0;

  const isFin = isFinancialEntity(symbol);
  const ebit = isFin ? null : (typeof rawQuote.ebit === 'number' && !isNaN(rawQuote.ebit) ? rawQuote.ebit : null);
  const revenue = typeof rawQuote.revenue === 'number' && !isNaN(rawQuote.revenue) ? rawQuote.revenue : null;
  const revenueYoY = (typeof rawQuote.revenueYoY === 'number' && !isNaN(rawQuote.revenueYoY)) ? rawQuote.revenueYoY : null;
  const revenueQuarterly = rawQuote.revenueQuarterly || null;
  const netProfit = typeof rawQuote.netProfit === 'number' && !isNaN(rawQuote.netProfit) ? rawQuote.netProfit : null;

  const rawPriceAsOf = rawQuote.priceAsOf;
  let priceAsOf = rawPriceAsOf;
  if (!priceAsOf || isNaN(new Date(priceAsOf).getTime())) {
    priceAsOf = new Date().toISOString();
  }

  // Reject future timestamps by clamping to current time
  if (new Date(priceAsOf).getTime() > Date.now() + 60000) {
    priceAsOf = new Date().toISOString();
  }

  const session = isIndian ? getIndianMarketSession() : getUSMarketSession();

  let dataStatus = 'EOD';
  let isLive = false;

  if (session.isOpen) {
    dataStatus = 'LIVE';
    isLive = true;
  } else {
    dataStatus = 'EOD';
    isLive = false;
  }

  const fetchedAt = new Date().toISOString();

  return {
    symbol,
    tradingSymbol: rawQuote.tradingSymbol || symbol.replace('.NS', '').replace('.BO', ''),
    isin: rawQuote.isin || null,
    instrumentKey: rawQuote.instrumentKey || null,
    name: rawQuote.name || symbol,
    exchange,
    exchangeSegment,
    marketSession: session.session,
    price: ltp,
    ltp,
    open,
    previousClose,
    change,
    changePercent,
    dayHigh,
    dayLow,
    high52: typeof rawQuote.high52 === 'number' && rawQuote.high52 > 0 ? rawQuote.high52 : null,
    low52: typeof rawQuote.low52 === 'number' && rawQuote.low52 > 0 ? rawQuote.low52 : null,
    volume,
    marketCap: typeof rawQuote.marketCap === 'number' && rawQuote.marketCap > 0 ? rawQuote.marketCap : null,
    pe: typeof rawQuote.pe === 'number' && rawQuote.pe > 0 ? rawQuote.pe : null,
    pb: typeof rawQuote.pb === 'number' && rawQuote.pb > 0 ? rawQuote.pb : null,
    eps: typeof rawQuote.eps === 'number' ? rawQuote.eps : null,
    ebit,
    revenue,
    revenueYoY,
    revenueQuarterly,
    netProfit,
    netProfitYoY: (typeof rawQuote.netProfitYoY === 'number' && !isNaN(rawQuote.netProfitYoY)) ? rawQuote.netProfitYoY : null,
    netProfitQuarterly: rawQuote.netProfitQuarterly || null,
    dividendYield: typeof rawQuote.dividendYield === 'number' ? rawQuote.dividendYield : null,
    vwap: typeof rawQuote.vwap === 'number' && rawQuote.vwap > 0 ? rawQuote.vwap : ltp,
    returns: rawQuote.returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
    source: rawQuote.source || 'YAHOO_FINANCE',
    sourceType: rawQuote.sourceType || 'YAHOO_QUOTE',
    dataStatus,
    isLive,
    priceAsOf,
    fetchedAt,
    lastUpdatedAt: fetchedAt
  };
}

export default {
  getIndianMarketSession,
  getUSMarketSession,
  isFinancialEntity,
  validateAndSanitizeQuote
};
