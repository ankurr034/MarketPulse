import upstoxMarketDataService from "./UpstoxMarketDataService.js";
import yahooFinanceService from "./YahooFinanceService.js";
import upstoxAuthService from "./UpstoxAuthService.js";

class MarketDataGateway {
  constructor() {
    this.memoryCache = new Map();
    this.CACHE_TTL = 30 * 1000; // 30 seconds
  }

  /**
   * Fetch batch quotes with strict source priority:
   * Upstox (Primary) -> Yahoo Finance (Fallback) -> In-Memory Cache -> Null
   * @param {string[]} symbols - Array of stock symbols
   */
  async getQuotes(symbols = []) {
    if (!symbols || symbols.length === 0) {
      return { available: true, data: [] };
    }

    const uniqueSymbols = [...new Set(symbols)];
    const finalQuotes = [];
    const symbolsNeedingFallback = [];

    // Step 1: Try fetching from Upstox if token is available
    const token = upstoxAuthService.getValidToken();
    let upstoxQuotesMap = new Map();

    if (token) {
      try {
        const upstoxRes = await upstoxMarketDataService.getQuotes(uniqueSymbols);
        if (upstoxRes && upstoxRes.available && upstoxRes.data) {
          upstoxRes.data.forEach(q => {
            if (q && q.symbol && typeof q.ltp === "number" && q.ltp > 0) {
              upstoxQuotesMap.set(q.symbol, q);
              // Also map without .NS if present
              if (q.symbol.endsWith(".NS")) {
                upstoxQuotesMap.set(q.symbol.replace(".NS", ""), q);
              }
            }
          });
        }
      } catch (err) {
        console.warn("MarketDataGateway: Upstox fetch error, continuing to fallback:", err.message);
      }
    }

    // Identify which symbols were successfully retrieved from Upstox vs which need fallback
    uniqueSymbols.forEach(sym => {
      if (upstoxQuotesMap.has(sym)) {
        // Upstox has live price
      } else {
        symbolsNeedingFallback.push(sym);
      }
    });

    // Step 2: Fetch Yahoo Finance data for fundamentals, returns, and fallback pricing
    const yahooRes = await yahooFinanceService.getQuotes(uniqueSymbols);
    const yahooQuotesMap = new Map();
    if (yahooRes && yahooRes.available && yahooRes.data) {
      yahooRes.data.forEach(q => {
        if (q && q.symbol) {
          yahooQuotesMap.set(q.symbol, q);
        }
      });
    }

    // Step 3: Merge Upstox pricing with Yahoo accounting fundamentals and multi-period returns
    for (const sym of uniqueSymbols) {
      const upstoxQuote = upstoxQuotesMap.get(sym);
      const yahooQuote = yahooQuotesMap.get(sym);
      const cachedQuote = this.memoryCache.get(sym);

      let merged = null;

      if (upstoxQuote) {
        // PRIMARY: UPSTOX LIVE DATA
        merged = {
          symbol: sym,
          name: yahooQuote?.name || upstoxQuote.name || sym,
          ltp: upstoxQuote.ltp,
          open: upstoxQuote.open || yahooQuote?.open || upstoxQuote.ltp,
          previousClose: upstoxQuote.previousClose || yahooQuote?.previousClose || upstoxQuote.ltp,
          change: upstoxQuote.change !== undefined ? upstoxQuote.change : (yahooQuote?.change || 0),
          changePercent: upstoxQuote.changePercent !== undefined ? upstoxQuote.changePercent : (yahooQuote?.changePercent || 0),
          dayHigh: upstoxQuote.dayHigh || yahooQuote?.dayHigh || upstoxQuote.ltp,
          dayLow: upstoxQuote.dayLow || yahooQuote?.dayLow || upstoxQuote.ltp,
          high52: yahooQuote?.high52 || 0,
          low52: yahooQuote?.low52 || 0,
          marketCap: yahooQuote?.marketCap || 0,
          pe: yahooQuote?.pe || 0,
          pb: yahooQuote?.pb || 0,
          eps: yahooQuote?.eps || 0,
          ebit: yahooQuote?.ebit !== undefined ? yahooQuote.ebit : null,
          netProfit: yahooQuote?.netProfit !== undefined ? yahooQuote.netProfit : null,
          dividendYield: yahooQuote?.dividendYield || 0,
          volume: upstoxQuote.volume || yahooQuote?.volume || 0,
          vwap: upstoxQuote.vwap || yahooQuote?.vwap || upstoxQuote.ltp,
          returns: yahooQuote?.returns || { "1W": null, "1M": null, "6M": null, "1Y": null, "3Y": null, "5Y": null, "ALL": null },
          
          // Source & Provenance Metadata
          source: "UPSTOX",
          sourceType: upstoxQuote.sourceType || "UPSTOX_REST_V2",
          isLive: true,
          priceAsOf: upstoxQuote.priceAsOf || new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          dataStatus: "LIVE"
        };
      } else if (yahooQuote && typeof yahooQuote.ltp === "number" && yahooQuote.ltp > 0) {
        // SECONDARY: YAHOO FINANCE FALLBACK
        merged = {
          ...yahooQuote,
          source: "YAHOO_FINANCE",
          sourceType: "YAHOO_QUOTE_FALLBACK",
          isLive: true,
          priceAsOf: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          dataStatus: "LIVE_FALLBACK"
        };
      } else if (cachedQuote) {
        // TERTIARY: IN-MEMORY CACHE (STALE)
        merged = {
          ...cachedQuote,
          dataStatus: "STALE",
          isLive: false,
          lastUpdatedAt: new Date().toISOString()
        };
      }

      if (merged) {
        this.memoryCache.set(sym, merged);
        finalQuotes.push(merged);
      }
    }

    return {
      available: finalQuotes.length > 0,
      data: finalQuotes,
      sourceBreakdown: {
        upstoxCount: finalQuotes.filter(q => q.source === "UPSTOX").length,
        fallbackCount: finalQuotes.filter(q => q.source === "YAHOO_FINANCE").length,
        staleCount: finalQuotes.filter(q => q.dataStatus === "STALE").length,
        total: finalQuotes.length
      }
    };
  }

  /**
   * Get single stock detail with live quotes and chart history
   */
  async getQuoteDetail(symbol) {
    const quotesRes = await this.getQuotes([symbol]);
    const quote = quotesRes.available && quotesRes.data.length > 0 ? quotesRes.data[0] : null;
    const detailRes = await yahooFinanceService.getQuoteDetail(symbol);
    const baseDetail = detailRes.available ? detailRes.data : {};

    if (!quote && !baseDetail) return { available: false, data: null };

    const merged = {
      ...baseDetail,
      ...(quote || {}),
      symbol,
      name: quote?.name || baseDetail.name || symbol,
      ltp: quote?.ltp || baseDetail.ltp || 0,
      open: quote?.open || baseDetail.open || 0,
      previousClose: quote?.previousClose || baseDetail.previousClose || 0,
      change: quote?.change !== undefined ? quote.change : (baseDetail.change || 0),
      changePercent: quote?.changePercent !== undefined ? quote.changePercent : (baseDetail.changePercent || 0),
      dayHigh: quote?.dayHigh || baseDetail.dayHigh || 0,
      dayLow: quote?.dayLow || baseDetail.dayLow || 0,
      volume: quote?.volume || baseDetail.volume || 0,
      source: quote?.source || "YAHOO_FINANCE",
      sourceType: quote?.sourceType || "YAHOO_QUOTE_FALLBACK",
      isLive: quote?.isLive ?? true,
      priceAsOf: quote?.priceAsOf || new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      dataStatus: quote?.dataStatus || "LIVE_FALLBACK"
    };

    return { available: true, data: merged };
  }

  /**
   * Get chart data
   */
  async getChartData(symbol, timeframe = "1D") {
    // Try Upstox historical candles first
    if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M" || timeframe === "1Y") {
      const intervalMap = { "1D": "30minute", "1W": "day", "1M": "day", "1Y": "day" };
      const candles = await upstoxMarketDataService.getHistoricalCandles(symbol, intervalMap[timeframe] || "day");
      if (candles && candles.length > 0) {
        return { available: true, data: candles, source: "UPSTOX" };
      }
    }

    // Fallback to Yahoo Finance chart
    return yahooFinanceService.getChartData(symbol, timeframe);
  }
}

export default new MarketDataGateway();
