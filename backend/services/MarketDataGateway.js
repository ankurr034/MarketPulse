import yahooFinanceService from "./YahooFinanceService.js";
import upstoxInstrumentService from "./UpstoxInstrumentService.js";
import { validateAndSanitizeQuote, getIndianMarketSession } from "./MarketDataValidator.js";

class MarketDataGateway {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Fetch quotes strictly from Yahoo Finance (sole market data provider).
   * If Yahoo fails or is unavailable, return structured nulls with YAHOO_FINANCE_UNAVAILABLE.
   * Zero snapshot, zero simulator, zero synthetic prices, zero Upstox.
   * @param {string[]} symbols - Array of stock symbols
   */
  async getQuotes(symbols = []) {
    if (!symbols || symbols.length === 0) {
      return { available: true, data: [] };
    }

    const uniqueSymbols = [...new Set(symbols)];
    const finalQuotes = [];
    const session = getIndianMarketSession();

    let yahooQuotesMap = new Map();
    try {
      const yahooRes = await yahooFinanceService.getQuotes(uniqueSymbols);
      if (yahooRes && yahooRes.available && yahooRes.data) {
        yahooRes.data.forEach(q => {
          if (q && q.symbol) {
            yahooQuotesMap.set(q.symbol, q);
            if (q.symbol.endsWith(".NS")) {
              yahooQuotesMap.set(q.symbol.replace(".NS", ""), q);
            }
          }
        });
      }
    } catch (err) {
      console.warn("MarketDataGateway: Yahoo Finance fetch error:", err.message);
    }

    for (const sym of uniqueSymbols) {
      const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
      const canonical = upstoxInstrumentService.resolveCanonicalInstrument(sym) || upstoxInstrumentService.resolveCanonicalInstrument(yahooSym);
      const yahooQuote = yahooQuotesMap.get(sym) || yahooQuotesMap.get(yahooSym) || (sym.endsWith('.NS') ? yahooQuotesMap.get(sym.replace('.NS', '')) : null);

      let merged = null;

      if (yahooQuote && typeof yahooQuote.ltp === "number" && yahooQuote.ltp > 0) {
        // YAHOO FINANCE AUTHORITATIVE DATA
        merged = {
          ...yahooQuote,
          symbol: sym,
          tradingSymbol: canonical?.tradingSymbol || sym.replace('.NS', '').replace('.BO', ''),
          isin: canonical?.isin || null,
          exchange: canonical?.exchange || (sym.endsWith('.BO') ? 'BSE' : (sym.endsWith('.NS') || yahooSym.endsWith('.NS') ? 'NSE' : 'US')),
          exchangeSegment: canonical?.exchangeSegment || (sym.startsWith('^') ? 'NSE_INDEX' : 'NSE_EQ'),
          instrumentKey: canonical?.instrumentKey || null,
          name: yahooQuote.name || sym,
          source: "YAHOO_FINANCE",
          sourceType: "YAHOO_QUOTE",
          isLive: session.isOpen,
          priceAsOf: yahooQuote.priceAsOf || new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          dataStatus: session.isOpen ? "LIVE" : "EOD"
        };
      } else {
        // HONEST YAHOO UNAVAILABLE (ZERO FABRICATION)
        merged = {
          symbol: sym,
          tradingSymbol: canonical?.tradingSymbol || sym.replace('.NS', '').replace('.BO', ''),
          isin: canonical?.isin || null,
          exchange: canonical?.exchange || (sym.endsWith('.BO') ? 'BSE' : (sym.endsWith('.NS') || yahooSym.endsWith('.NS') ? 'NSE' : 'US')),
          exchangeSegment: canonical?.exchangeSegment || (sym.startsWith('^') ? 'NSE_INDEX' : 'NSE_EQ'),
          instrumentKey: canonical?.instrumentKey || null,
          name: sym,
          ltp: null,
          open: null,
          previousClose: null,
          change: null,
          changePercent: null,
          dayHigh: null,
          dayLow: null,
          high52: null,
          low52: null,
          marketCap: null,
          pe: null,
          pb: null,
          eps: null,
          ebit: null,
          revenue: null,
          revenueYoY: null,
          revenueQuarterly: null,
          netProfit: null,
          netProfitYoY: null,
          netProfitQuarterly: null,
          dividendYield: null,
          volume: null,
          vwap: null,
          returns: { "1W": null, "1M": null, "6M": null, "1Y": null, "3Y": null, "5Y": null, "ALL": null },
          source: "YAHOO_FINANCE_UNAVAILABLE",
          sourceType: "UNAVAILABLE",
          isLive: false,
          priceAsOf: null,
          lastUpdatedAt: new Date().toISOString(),
          dataStatus: "UNAVAILABLE"
        };
      }

      const validated = validateAndSanitizeQuote(merged);
      if (validated) {
        finalQuotes.push(validated);
      }
    }

    return {
      available: finalQuotes.some(q => q.dataStatus !== "UNAVAILABLE"),
      data: finalQuotes,
      sourceBreakdown: {
        yahooCount: finalQuotes.filter(q => q.source === "YAHOO_FINANCE").length,
        unavailableCount: finalQuotes.filter(q => q.dataStatus === "UNAVAILABLE").length,
        total: finalQuotes.length
      }
    };
  }

  /**
   * Get single stock detail with live quotes and chart history
   */
  async getQuoteDetail(symbol) {
    const yahooSym = yahooFinanceService.resolveYahooSymbol(symbol);
    const quotesRes = await this.getQuotes([symbol, yahooSym]);
    const quote = quotesRes.available && quotesRes.data.length > 0 ? (quotesRes.data.find(q => q.symbol === symbol || q.symbol === yahooSym) || quotesRes.data[0]) : null;

    let detailRes = null;
    try {
      detailRes = await yahooFinanceService.getQuoteDetail(yahooSym);
    } catch (e) {
      console.warn(`MarketDataGateway: Quote detail fetch failed for ${symbol}:`, e.message);
    }
    const baseDetail = detailRes?.available ? detailRes.data : {};

    if (!quote && (!baseDetail || Object.keys(baseDetail).length === 0)) {
      const unavail = validateAndSanitizeQuote({ symbol, ltp: null, source: "YAHOO_FINANCE_UNAVAILABLE", dataStatus: "UNAVAILABLE" });
      return { available: false, data: unavail };
    }

    const merged = {
      ...(quote || {}),
      ...baseDetail,
      returns: (baseDetail?.returns && Object.values(baseDetail.returns).some(v => v !== null)) ? baseDetail.returns : (quote?.returns || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null }),
      ebit: baseDetail?.ebit ?? quote?.ebit ?? null,
      revenue: baseDetail?.revenue ?? quote?.revenue ?? null,
      revenueYoY: baseDetail?.revenueYoY ?? quote?.revenueYoY ?? null,
      revenueQuarterly: baseDetail?.revenueQuarterly ?? quote?.revenueQuarterly ?? null,
      netProfit: baseDetail?.netProfit ?? quote?.netProfit ?? null,
      netProfitYoY: baseDetail?.netProfitYoY ?? quote?.netProfitYoY ?? null,
      netProfitQuarterly: baseDetail?.netProfitQuarterly ?? quote?.netProfitQuarterly ?? null,
      symbol,
      name: quote?.name || baseDetail?.name || symbol,
      ltp: quote?.ltp ?? baseDetail?.ltp ?? null,
      open: quote?.open ?? baseDetail?.open ?? null,
      previousClose: quote?.previousClose ?? baseDetail?.previousClose ?? null,
      change: quote?.change ?? baseDetail?.change ?? null,
      changePercent: quote?.changePercent ?? baseDetail?.changePercent ?? null,
      dayHigh: quote?.dayHigh ?? baseDetail?.dayHigh ?? null,
      dayLow: quote?.dayLow ?? baseDetail?.dayLow ?? null,
      volume: quote?.volume ?? baseDetail?.volume ?? null,
      source: quote?.source || "YAHOO_FINANCE",
      sourceType: quote?.sourceType || "YAHOO_QUOTE",
      isLive: quote?.isLive ?? baseDetail?.isLive ?? false,
      priceAsOf: quote?.priceAsOf || baseDetail?.priceAsOf || null,
      lastUpdatedAt: new Date().toISOString(),
      dataStatus: quote?.dataStatus || baseDetail?.dataStatus || "UNAVAILABLE"
    };

    const validated = validateAndSanitizeQuote(merged);
    return { available: validated.ltp !== null, data: validated };
  }

  /**
   * Get chart data from authentic Yahoo Finance historical candles
   */
  async getChartData(symbol, timeframe = "1D") {
    try {
      const yahooSym = yahooFinanceService.resolveYahooSymbol(symbol);
      const yChart = await yahooFinanceService.getChartData(yahooSym, timeframe);
      if (yChart && yChart.available && yChart.data && yChart.data.length > 0) {
        const session = getIndianMarketSession();
        return {
          ...yChart,
          symbol,
          source: "YAHOO_FINANCE",
          dataStatus: session.isOpen ? "LIVE" : "EOD"
        };
      }
    } catch (e) {
      console.warn(`MarketDataGateway: Yahoo chart failed for ${symbol}:`, e.message);
    }

    return {
      available: false,
      data: [],
      source: "YAHOO_FINANCE_UNAVAILABLE",
      dataStatus: "UNAVAILABLE",
      priceAsOf: null,
      lastUpdatedAt: new Date().toISOString()
    };
  }
}

export default new MarketDataGateway();
