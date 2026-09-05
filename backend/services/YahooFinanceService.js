import YahooFinance from 'yahoo-finance2';
import { getIndianMarketSession, getUSMarketSession, isFinancialEntity, validateAndSanitizeQuote } from './MarketDataValidator.js';
import athBaseService from './AthBaseService.js';
import quarterlyRevenueService from './QuarterlyRevenueService.js';

export const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false, logOptionsErrors: false }
});

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
    if (!yahooSym) return { 
      ebit: null, 
      revenue: null,
      revenueYoY: null,
      revenueQuarterly: {
        symbol: sym,
        companyName: null,
        currentQuarterRevenue: null,
        currentQuarterPeriodEnd: null,
        previousYearSameQuarterRevenue: null,
        previousYearSameQuarterPeriodEnd: null,
        revenueYoYPercent: null,
        revenueDataStatus: 'NO_SYMBOL',
        revenueFetchedAt: Date.now()
      },
      revenueSource: '—',
      netProfit: null, 
      netProfitYoY: null,
      netProfitQuarterly: {
        symbol: sym,
        currentQuarterNetProfit: null,
        currentQuarterPeriodEnd: null,
        previousYearSameQuarterNetProfit: null,
        previousYearSameQuarterPeriodEnd: null,
        netProfitYoYPercent: null,
        netProfitDataStatus: 'NO_SYMBOL',
        netProfitFetchedAt: Date.now()
      },
      ebitSource: '—', 
      ebitType: '—', 
      netProfitSource: '—', 
      reportingPeriod: 'TTM' 
    };

    const cached = this.financialsCache.get(yahooSym);
    if (cached && (Date.now() - cached.timestamp < this.FINANCIALS_CACHE_TTL)) {
      return cached.data;
    }

    if (this.inFlightFinancials.has(yahooSym)) {
      return this.inFlightFinancials.get(yahooSym);
    }

    const fetchPromise = (async () => {
      try {
        const [summary, timeseries] = await Promise.all([
          withTimeout(
            yahooFinance.quoteSummary(yahooSym, {
              modules: ['financialData', 'defaultKeyStatistics', 'assetProfile']
            }).catch(() => ({})),
            20000,
            {}
          ),
          withTimeout(
            yahooFinance.fundamentalsTimeSeries(yahooSym, { period1: '2023-01-01', module: 'financials', type: 'quarterly' }).catch(() => null),
            20000,
            null
          )
        ]);

        let timeseriesData = timeseries;
        const KNOWN_ALT_SCRIPS = {
          'LTIM.NS': '540005.BO',
          'LTIM': '540005.BO',
          'LTIM.BO': '540005.BO',
          'JIOFIN.NS': '543940.BO',
          'JIOFIN': '543940.BO',
          'JIOFIN.BO': '543940.BO'
        };

        if ((!Array.isArray(timeseriesData) || timeseriesData.length === 0) && KNOWN_ALT_SCRIPS[yahooSym]) {
          const altSym = KNOWN_ALT_SCRIPS[yahooSym];
          const altTs = await withTimeout(
            yahooFinance.fundamentalsTimeSeries(altSym, { period1: '2023-01-01', module: 'financials', type: 'quarterly' }).catch(() => null),
            20000,
            null
          );
          if (Array.isArray(altTs) && altTs.length > 0) {
            timeseriesData = altTs;
          }
        }

        const fd = summary.financialData || {};
        const ks = summary.defaultKeyStatistics || {};
        const ap = summary.assetProfile || {};
        const stmt = summary.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];

        const isFinancial = isFinancialEntity(yahooSym) || (
          ap.sector?.includes('Financial') ||
          ap.industry?.includes('Bank') ||
          ap.industry?.includes('Financial') ||
          ap.industry?.includes('Insurance')
        );

        let rate = 1;
        if (fd.financialCurrency === 'USD' && (yahooSym.endsWith('.NS') || yahooSym.endsWith('.BO'))) {
          rate = 86.5; // USD to INR conversion
        }

        // statementRate is determined after timeseries data is analyzed
        // to handle inconsistencies where some Indian tickers (e.g., HCLTECH.NS)
        // have fundamentalsTimeSeries already in INR despite financialCurrency=USD,
        // while others (e.g., INFY.NS) have timeseries genuinely in USD.
        let statementRate = rate;

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

        // 2. Build Quarterly Statement Series (Revenue & Net Income) from Genuine Statement Feeds
        const quarterMap = new Map();

        if (Array.isArray(timeseriesData)) {
          timeseriesData.forEach(q => {
            if (q && q.date) {
              const dStr = new Date(q.date).toISOString().split('T')[0];
              const netVal = (typeof q.netIncome === 'number' && !isNaN(q.netIncome)) ? q.netIncome : 
                             (typeof q.netIncomeCommonStockholders === 'number' && !isNaN(q.netIncomeCommonStockholders)) ? q.netIncomeCommonStockholders : null;
              const revVal = (typeof q.totalRevenue === 'number' && !isNaN(q.totalRevenue)) ? q.totalRevenue :
                             (typeof q.operatingRevenue === 'number' && !isNaN(q.operatingRevenue)) ? q.operatingRevenue : null;
              if (dStr && (netVal !== null || revVal !== null)) {
                quarterMap.set(dStr, { dateStr: dStr, rawNetIncome: netVal, rawRevenue: revVal });
              }
            }
          });
        }

        if (Array.isArray(stmt)) {
          stmt.forEach(q => {
            if (q && q.endDate) {
              const dStr = new Date(q.endDate).toISOString().split('T')[0];
              const netVal = (typeof q.netIncome === 'number' && !isNaN(q.netIncome)) ? q.netIncome : 
                             (typeof q.netIncomeApplicableToCommonShares === 'number' && !isNaN(q.netIncomeApplicableToCommonShares)) ? q.netIncomeApplicableToCommonShares : null;
              const revVal = (typeof q.totalRevenue === 'number' && !isNaN(q.totalRevenue)) ? q.totalRevenue :
                             (typeof q.operatingRevenue === 'number' && !isNaN(q.operatingRevenue)) ? q.operatingRevenue : null;
              if (dStr) {
                if (quarterMap.has(dStr)) {
                  const existing = quarterMap.get(dStr);
                  if (existing.rawNetIncome === null && netVal !== null) existing.rawNetIncome = netVal;
                  if (existing.rawRevenue === null && revVal !== null) existing.rawRevenue = revVal;
                } else if (netVal !== null || revVal !== null) {
                  quarterMap.set(dStr, { dateStr: dStr, rawNetIncome: netVal, rawRevenue: revVal });
                }
              }
            }
          });
        }

        const quarters = Array.from(quarterMap.values());
        quarters.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

        // Smart currency detection for statementRate:
        // Some Indian tickers (e.g., HCLTECH.NS) report financialCurrency=USD but
        // their fundamentalsTimeSeries values are already in INR. Others (e.g., INFY.NS)
        // genuinely have timeseries in USD. Compare raw quarterly values with TTM revenue
        // from quoteSummary (which is in financialCurrency) to detect.
        if (rate > 1 && quarters.length > 0 && typeof fd.totalRevenue === 'number' && fd.totalRevenue > 0) {
          const latestWithRev = quarters.find(q => typeof q.rawRevenue === 'number' && !isNaN(q.rawRevenue) && q.rawRevenue > 0);
          if (latestWithRev) {
            const ttmQuarterlyEstimate = fd.totalRevenue / 4;
            const ratio = latestWithRev.rawRevenue / ttmQuarterlyEstimate;
            // If timeseries quarterly value is >10x the TTM quarterly estimate,
            // the timeseries is already in local currency (INR), not financialCurrency (USD)
            if (ratio > 10) {
              statementRate = 1;
            }
          }
        }

        // --- REVENUE: Authoritative Quarterly Resolution via QuarterlyRevenueService ---
        const resolvedRevObj = await quarterlyRevenueService.resolveQuarterlyRevenue(
          sym,
          yahooSym,
          summary,
          timeseriesData
        );

        const currentQuarterRevenue = (typeof resolvedRevObj.revenueCr === 'number') ? resolvedRevObj.revenueCr : 
                                      (typeof resolvedRevObj.revenue === 'number') ? resolvedRevObj.revenue : null;
        const currentQuarterRevenuePeriodEnd = resolvedRevObj.currentPeriod?.periodEnd || resolvedRevObj.currentQuarterPeriodEnd || null;
        const previousYearSameQuarterRevenue = (typeof resolvedRevObj.previousYearSameQuarterRevenue === 'number') ? resolvedRevObj.previousYearSameQuarterRevenue : null;
        const previousYearSameQuarterRevenuePeriodEnd = resolvedRevObj.previousYearPeriod?.periodEnd || resolvedRevObj.previousYearSameQuarterPeriodEnd || null;
        const revenueYoYPercent = (typeof resolvedRevObj.revenueYoY === 'number') ? resolvedRevObj.revenueYoY : null;
        const revenueDataStatus = resolvedRevObj.dataStatus || 'NO_DATA';

        const revenueQuarterly = resolvedRevObj.revenueQuarterly || {
          symbol: sym,
          companyName: ap.longName || null,
          currentQuarterRevenue,
          currentQuarterPeriodEnd: currentQuarterRevenuePeriodEnd,
          previousYearSameQuarterRevenue,
          previousYearSameQuarterPeriodEnd: previousYearSameQuarterRevenuePeriodEnd,
          revenueYoYPercent,
          revenueDataStatus,
          revenueFetchedAt: Date.now()
        };

        // --- NET PROFIT: Accounting preservation ---
        const netIncomeQuarters = quarters.filter(q => typeof q.rawNetIncome === 'number' && !isNaN(q.rawNetIncome));
        let currentQuarterNetProfit = null;
        let currentQuarterPeriodEnd = null;
        let previousYearSameQuarterNetProfit = null;
        let previousYearSameQuarterPeriodEnd = null;
        let netProfitYoYPercent = null;
        let netProfitDataStatus = 'NO_DATA';

        if (netIncomeQuarters.length > 0) {
          const curr = netIncomeQuarters[0];
          currentQuarterPeriodEnd = curr.dateStr;
          currentQuarterNetProfit = Math.round((curr.rawNetIncome * statementRate) / 10000000);

          const currDate = new Date(curr.dateStr);
          const targetYear = currDate.getUTCFullYear() - 1;
          const targetMonth = currDate.getUTCMonth();

          const prior = netIncomeQuarters.find(q => {
            const d = new Date(q.dateStr);
            return d.getUTCFullYear() === targetYear && Math.abs(d.getUTCMonth() - targetMonth) <= 1;
          });

          if (prior) {
            previousYearSameQuarterPeriodEnd = prior.dateStr;
            previousYearSameQuarterNetProfit = Math.round((prior.rawNetIncome * statementRate) / 10000000);

            if (previousYearSameQuarterNetProfit !== 0) {
              const rawYoY = ((currentQuarterNetProfit - previousYearSameQuarterNetProfit) / Math.abs(previousYearSameQuarterNetProfit)) * 100;
              if (!isNaN(rawYoY) && isFinite(rawYoY)) {
                netProfitYoYPercent = parseFloat(rawYoY.toFixed(2));
                netProfitDataStatus = 'VALID_SAME_QUARTER_YOY';
              }
            } else {
              netProfitDataStatus = 'ZERO_PRIOR_YEAR_DENOMINATOR';
            }
          } else {
            netProfitDataStatus = 'MISSING_PRIOR_YEAR_SAME_QUARTER';
          }
        }

        // Fallback for reported Net Profit ONLY if quarterly entries unavailable
        let netProfit = currentQuarterNetProfit;
        let netProfitSource = 'Quarterly Statement';

        if (netProfit === null) {
          if (typeof ks.netIncomeToCommon === 'number' && !isNaN(ks.netIncomeToCommon)) {
            netProfit = Math.round((ks.netIncomeToCommon * rate) / 10000000);
            netProfitSource = 'defaultKeyStatistics.netIncomeToCommon (TTM)';
          }
        }

        const netProfitQuarterly = {
          symbol: sym,
          currentQuarterNetProfit,
          currentQuarterPeriodEnd,
          previousYearSameQuarterNetProfit,
          previousYearSameQuarterPeriodEnd,
          netProfitYoYPercent,
          netProfitDataStatus,
          netProfitFetchedAt: Date.now()
        };

        const res = { 
          ebit: (typeof ebit === 'number' && ebit > 0) ? ebit : null, 
          revenue: (typeof currentQuarterRevenue === 'number') ? currentQuarterRevenue : null,
          revenueCr: (typeof currentQuarterRevenue === 'number') ? currentQuarterRevenue : null,
          revenueYoY: revenueYoYPercent,
          revenueQuarterly,
          revenueSource: resolvedRevObj.source || (currentQuarterRevenuePeriodEnd ? 'Quarterly Statement' : '—'),
          netProfit: (typeof netProfit === 'number') ? netProfit : null,
          netProfitYoY: netProfitYoYPercent,
          netProfitQuarterly,
          ebitSource,
          ebitType,
          netProfitSource,
          reportingPeriod: currentQuarterRevenuePeriodEnd ? `Q (${currentQuarterRevenuePeriodEnd})` : (currentQuarterPeriodEnd ? `Q (${currentQuarterPeriodEnd})` : 'TTM')
        };

        if (res.revenue !== null || res.revenueYoY !== null || res.netProfit !== null || res.netProfitYoY !== null) {
          this.financialsCache.set(yahooSym, { data: res, timestamp: Date.now() });
          this.financialsCache.set(sym, { data: res, timestamp: Date.now() });
          if (yahooSym.endsWith('.NS')) {
            this.financialsCache.set(yahooSym.replace('.NS', ''), { data: res, timestamp: Date.now() });
          }
          if (yahooSym.endsWith('.BO')) {
            this.financialsCache.set(yahooSym.replace('.BO', ''), { data: res, timestamp: Date.now() });
          }
        }
        return res;
      } catch (e) {
        const fallback = { 
          ebit: null, 
          revenue: null,
          revenueYoY: null,
          revenueQuarterly: {
            symbol: sym,
            companyName: null,
            currentQuarterRevenue: null,
            currentQuarterPeriodEnd: null,
            previousYearSameQuarterRevenue: null,
            previousYearSameQuarterPeriodEnd: null,
            revenueYoYPercent: null,
            revenueDataStatus: 'ERROR',
            revenueFetchedAt: Date.now()
          },
          revenueSource: '—',
          netProfit: null, 
          netProfitYoY: null,
          netProfitQuarterly: {
            symbol: sym,
            currentQuarterNetProfit: null,
            currentQuarterPeriodEnd: null,
            previousYearSameQuarterNetProfit: null,
            previousYearSameQuarterPeriodEnd: null,
            netProfitYoYPercent: null,
            netProfitDataStatus: 'ERROR',
            netProfitFetchedAt: Date.now()
          },
          ebitSource: '—', 
          ebitType: '—', 
          netProfitSource: '—', 
          reportingPeriod: 'TTM' 
        };
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
              const rawQuotes = await withTimeout(yahooFinance.quote(chunk, {}, { validateResult: false }), 10000, []);
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

                let fin = this.financialsCache.get(sym)?.data || 
                          (sym.endsWith('.NS') ? this.financialsCache.get(sym.replace('.NS', ''))?.data : null) ||
                          (sym.endsWith('.BO') ? this.financialsCache.get(sym.replace('.BO', ''))?.data : null);
                let revenue = (typeof fin?.revenue === 'number') ? fin.revenue : null;
                let revenueYoY = (typeof fin?.revenueYoY === 'number') ? fin.revenueYoY : null;
                let revenueQuarterly = fin?.revenueQuarterly || null;
                let netProfit = (typeof fin?.netProfit === 'number') ? fin.netProfit : null;
                let netProfitYoY = (typeof fin?.netProfitYoY === 'number') ? fin.netProfitYoY : null;
                let netProfitQuarterly = fin?.netProfitQuarterly || null;
                let ebit = (typeof fin?.ebit === 'number') ? fin.ebit : null;

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
                  revenue: revenue,
                  revenueYoY: revenueYoY,
                  revenueQuarterly: revenueQuarterly,
                  netProfit: netProfit,
                  netProfitYoY: netProfitYoY,
                  netProfitQuarterly: netProfitQuarterly,
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
