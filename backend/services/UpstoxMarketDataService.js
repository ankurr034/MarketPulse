import axios from "axios";
import UpstoxClient from "upstox-js-sdk";
import config from "../config/upstox.js";
import upstoxAuthService from "./UpstoxAuthService.js";
import upstoxInstrumentService from "./UpstoxInstrumentService.js";

class UpstoxMarketDataService {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.streamer = null;
    this.io = null;
    this.subscribedKeys = new Set();
    this.liveQuoteCache = new Map();
    this.connectionState = "DISCONNECTED"; // DISCONNECTED | CONNECTING | CONNECTED | STANDBY | FAILED
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 5;
  }

  /**
   * Fetch live / snapshot quotes via Upstox REST API v2
   * @param {string[]} symbols - Array of standard stock symbols (e.g. ["RELIANCE.NS", "TCS.NS", "^NSEI"])
   */
  async getQuotes(symbols = []) {
    const token = upstoxAuthService.getValidToken();
    if (!token) {
      return { available: false, reason: "UPSTOX_UNAUTHENTICATED", data: [] };
    }

    if (!symbols || symbols.length === 0) {
      return { available: true, data: [] };
    }

    await upstoxInstrumentService.initialize();

    // Map symbols to instrument keys
    const symbolToKey = {};
    const keyToSymbol = {};
    const validKeys = [];

    symbols.forEach(sym => {
      const key = upstoxInstrumentService.getInstrumentKey(sym);
      if (key) {
        symbolToKey[sym] = key;
        keyToSymbol[key] = sym;
        validKeys.push(key);
      }
    });

    if (validKeys.length === 0) {
      return { available: false, reason: "NO_MATCHING_INSTRUMENTS", data: [] };
    }

    try {
      const uniqueKeys = [...new Set(validKeys)];
      const chunkSize = 400;
      const allMappedQuotes = [];

      for (let i = 0; i < uniqueKeys.length; i += chunkSize) {
        const chunk = uniqueKeys.slice(i, i + chunkSize);
        const url = `${this.baseUrl}/market-quote/quotes?instrument_key=${encodeURIComponent(chunk.join(","))}`;
        
        const res = await axios.get(url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          },
          timeout: 8000
        });

        if (res.data && res.data.status === "success" && res.data.data) {
          const rawData = res.data.data;
          
          Object.entries(rawData).forEach(([rawKey, q]) => {
            const instKey = q.instrument_token || rawKey.replace(":", "|");
            const sym = keyToSymbol[instKey] || keyToSymbol[rawKey] || upstoxInstrumentService.getSymbolFromKey(instKey) || rawKey;

            const ltp = q.last_price || 0;
            const prevClose = q.ohlc?.close || ltp;
            const change = parseFloat((ltp - prevClose).toFixed(2));
            const changePercent = prevClose > 0 ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
            const open = q.ohlc?.open || ltp;
            const high = q.ohlc?.high || ltp;
            const low = q.ohlc?.low || ltp;
            const volume = q.volume || 0;
            const priceAsOf = q.timestamp ? new Date(q.timestamp).toISOString() : new Date().toISOString();

            const mapped = {
              symbol: sym,
              instrumentKey: instKey,
              name: q.symbol || sym,
              ltp,
              open,
              previousClose: prevClose,
              change,
              changePercent,
              dayHigh: high,
              dayLow: low,
              volume,
              vwap: q.average_price || ltp,
              depth: q.depth || null,
              totalBuyQuantity: q.total_buy_quantity || 0,
              totalSellQuantity: q.total_sell_quantity || 0,
              source: "UPSTOX",
              sourceType: "UPSTOX_REST_V2",
              isLive: true,
              priceAsOf,
              lastUpdatedAt: new Date().toISOString(),
              dataStatus: "LIVE"
            };

            this.liveQuoteCache.set(sym, mapped);
            this.liveQuoteCache.set(instKey, mapped);
            allMappedQuotes.push(mapped);
          });
        }
      }

      return { available: allMappedQuotes.length > 0, data: allMappedQuotes };
    } catch (err) {
      const errMsg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || err.message;
      return { available: false, reason: errMsg, data: [] };
    }
  }

  /**
   * Fetch historical candles from Upstox
   */
  async getHistoricalCandles(symbol, interval = "day", toDate = null, fromDate = null) {
    const token = upstoxAuthService.getValidToken();
    if (!token) return null;

    const instrumentKey = upstoxInstrumentService.getInstrumentKey(symbol);
    if (!instrumentKey) return null;

    const now = new Date();
    const to = toDate || now.toISOString().split("T")[0];
    const from = fromDate || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
      const url = `${this.baseUrl}/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${to}/${from}`;
      const res = await axios.get(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        },
        timeout: 8000
      });

      if (res.data && res.data.status === "success" && res.data.data?.candles) {
        return res.data.data.candles.map(c => ({
          time: new Date(c[0]).getTime(),
          date: c[0],
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
          volume: c[5],
          openInterest: c[6] || 0
        }));
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Initialize Upstox Market Data Streamer V3 WebSocket feed
   * @param {object} ioInstance - Socket.io server instance
   * @param {string[]} initialSymbols - Symbols to subscribe to
   */
  async initializeWebSocket(ioInstance, initialSymbols = []) {
    this.io = ioInstance;
    const token = upstoxAuthService.getValidToken();
    if (!token) {
      this.connectionState = "STANDBY";
      console.log("UpstoxMarketDataService: Upstox access token not configured. WebSocket streamer in STANDBY.");
      return false;
    }

    // Verify token with profile endpoint first to avoid 401 loops
    const isValidToken = await upstoxAuthService.verifyToken();
    if (!isValidToken) {
      this.connectionState = "STANDBY";
      console.log("UpstoxMarketDataService: Upstox token is expired or unauthorized (401). WebSocket streamer in STANDBY until re-authentication.");
      return false;
    }

    await upstoxInstrumentService.initialize();

    const keysToSub = [];
    initialSymbols.forEach(sym => {
      const k = upstoxInstrumentService.getInstrumentKey(sym);
      if (k) keysToSub.push(k);
    });

    try {
      const defaultClient = UpstoxClient.ApiClient.instance;
      const OAUTH2 = defaultClient.authentications["OAUTH2"];
      OAUTH2.accessToken = token;

      this.connectionState = "CONNECTING";
      const streamerMode = UpstoxClient.MarketDataStreamerV3.Mode ? UpstoxClient.MarketDataStreamerV3.Mode.FULL : "full";
      
      this.streamer = new UpstoxClient.MarketDataStreamerV3(keysToSub, streamerMode);
      keysToSub.forEach(k => this.subscribedKeys.add(k));

      this.streamer.on("open", () => {
        this.connectionState = "CONNECTED";
        this.reconnectAttempts = 0;
        console.log(`Upstox WebSocket V3 Feed Connected. Subscribed to ${this.subscribedKeys.size} instruments.`);
      });

      this.streamer.on("message", (rawMsg) => {
        this.handleStreamMessage(rawMsg);
      });

      this.streamer.on("error", (err) => {
        console.warn("Upstox WebSocket V3 error:", err?.message || err);
      });

      this.streamer.on("close", () => {
        this.connectionState = "DISCONNECTED";
        console.log("Upstox WebSocket V3 Feed closed.");
      });

      this.streamer.connect();
      return true;
    } catch (err) {
      console.warn("Upstox WebSocket V3 init error:", err.message);
      this.connectionState = "STANDBY";
      return false;
    }
  }

  handleStreamMessage(msg) {
    if (!msg) return;
    try {
      const feeds = msg.feeds || msg.data || msg;
      const ticks = [];

      Object.entries(feeds).forEach(([key, feedData]) => {
        const fullFeed = feedData.ff || feedData.fullFeed || feedData;
        const ltpFeed = fullFeed.marketFF?.ltpc || feedData.ltpc || fullFeed;
        
        const ltp = ltpFeed.ltp || feedData.ltp || feedData.last_price;
        if (typeof ltp === "number" && ltp > 0) {
          const sym = upstoxInstrumentService.getSymbolFromKey(key) || key;
          const prevClose = ltpFeed.cp || feedData.close || ltp;
          const change = parseFloat((ltp - prevClose).toFixed(2));
          const changePercent = prevClose > 0 ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
          const high = ltpFeed.high || fullFeed.marketFF?.eodOHLC?.high || ltp;
          const low = ltpFeed.low || fullFeed.marketFF?.eodOHLC?.low || ltp;
          const volume = ltpFeed.v || feedData.volume || 0;
          const timestamp = ltpFeed.ltt || Date.now();

          const tick = {
            symbol: sym,
            instrumentKey: key,
            ltp,
            change,
            changePercent,
            dayHigh: high,
            dayLow: low,
            volume,
            priceAsOf: new Date(Number(timestamp)).toISOString(),
            source: "UPSTOX",
            sourceType: "UPSTOX_WEBSOCKET_V3",
            isLive: true,
            dataStatus: "LIVE"
          };

          this.liveQuoteCache.set(sym, tick);
          this.liveQuoteCache.set(key, tick);
          ticks.push(tick);
        }
      });

      if (this.io && ticks.length > 0) {
        this.io.to("ticks").emit("tick_update", ticks);
      }
    } catch (e) {
      // Ignore
    }
  }

  subscribe(symbols = []) {
    if (!this.streamer || this.connectionState !== "CONNECTED") return;
    const newKeys = [];
    symbols.forEach(sym => {
      const k = upstoxInstrumentService.getInstrumentKey(sym);
      if (k && !this.subscribedKeys.has(k)) {
        newKeys.push(k);
        this.subscribedKeys.add(k);
      }
    });

    if (newKeys.length > 0) {
      try {
        this.streamer.subscribe(newKeys, "full");
      } catch (err) {
        console.warn("Upstox subscribe error:", err.message);
      }
    }
  }

  getCachedQuote(symbol) {
    return this.liveQuoteCache.get(symbol) || null;
  }

  getStatus() {
    return {
      connectionState: this.connectionState,
      subscribedInstrumentsCount: this.subscribedKeys.size,
      cachedQuotesCount: this.liveQuoteCache.size,
      lastStatusCheck: new Date().toISOString()
    };
  }
}

export default new UpstoxMarketDataService();
