import axios from "axios";
import zlib from "zlib";

class UpstoxInstrumentService {
  constructor() {
    this.symbolToKeyMap = new Map();
    this.keyToSymbolMap = new Map();
    this.metadataMap = new Map();
    this.isInitialized = false;
    this.initPromise = null;
    this.lastDownloadedAt = null;

    // Static fallback index mappings for NSE/BSE indices
    this.indexMap = {
      "^NSEI": "NSE_INDEX|Nifty 50",
      "NIFTY 50": "NSE_INDEX|Nifty 50",
      "NIFTY": "NSE_INDEX|Nifty 50",
      "^BSESN": "BSE_INDEX|SENSEX",
      "SENSEX": "BSE_INDEX|SENSEX",
      "^NSEBANK": "NSE_INDEX|Nifty Bank",
      "BANK NIFTY": "NSE_INDEX|Nifty Bank",
      "BANKNIFTY": "NSE_INDEX|Nifty Bank",
      "^CNXIT": "NSE_INDEX|Nifty IT",
      "NIFTY IT": "NSE_INDEX|Nifty IT",
      "^CNXAUTO": "NSE_INDEX|Nifty Auto",
      "NIFTY AUTO": "NSE_INDEX|Nifty Auto",
      "^CNXPHARMA": "NSE_INDEX|Nifty Pharma",
      "NIFTY PHARMA": "NSE_INDEX|Nifty Pharma",
      "^CNXFMCG": "NSE_INDEX|Nifty FMCG",
      "NIFTY FMCG": "NSE_INDEX|Nifty FMCG",
      "^CNXMETAL": "NSE_INDEX|Nifty Metal",
      "NIFTY METAL": "NSE_INDEX|Nifty Metal",
      "^CNXREALTY": "NSE_INDEX|Nifty Realty",
      "NIFTY REALTY": "NSE_INDEX|Nifty Realty",
      "^CNXENERGY": "NSE_INDEX|Nifty Energy",
      "NIFTY ENERGY": "NSE_INDEX|Nifty Energy",
      "^CNXINFRA": "NSE_INDEX|Nifty Infrastructure",
      "NIFTY INFRA": "NSE_INDEX|Nifty Infrastructure",
      "^CNXMEDIA": "NSE_INDEX|Nifty Media",
      "NIFTY MEDIA": "NSE_INDEX|Nifty Media",
      "^CNXPSUBANK": "NSE_INDEX|Nifty PSU Bank",
      "NIFTY PSU BANK": "NSE_INDEX|Nifty PSU Bank",
      "^CNXFIN": "NSE_INDEX|Nifty Financial Services",
      "FINNIFTY": "NSE_INDEX|Nifty Financial Services",
      "NIFTY FINANCIAL SERVICES": "NSE_INDEX|Nifty Financial Services",
      "^CNX100": "NSE_INDEX|Nifty 100",
      "NIFTY 100": "NSE_INDEX|Nifty 100",
      "^CNX500": "NSE_INDEX|Nifty 500",
      "^CRSLDX": "NSE_INDEX|Nifty 500",
      "NIFTY 500": "NSE_INDEX|Nifty 500",
      "^NSEMDCP50": "NSE_INDEX|Nifty Midcap 50",
      "NIFTY MIDCAP 50": "NSE_INDEX|Nifty Midcap 50",
      "^CNXSC": "NSE_INDEX|Nifty Smallcap 100",
      "NIFTY SMALLCAP 100": "NSE_INDEX|Nifty Smallcap 100",
      "^INDIAVIX": "NSE_INDEX|India VIX",
      "India VIX": "NSE_INDEX|India VIX"
    };

    // Pre-populate index mappings
    Object.entries(this.indexMap).forEach(([sym, key]) => {
      this.symbolToKeyMap.set(sym.toUpperCase(), key);
      this.keyToSymbolMap.set(key, sym.startsWith("^") ? sym : "^" + sym);
      this.metadataMap.set(key, {
        instrument_key: key,
        trading_symbol: sym,
        segment: key.startsWith("NSE_INDEX") ? "NSE_INDEX" : "BSE_INDEX",
        name: sym
      });
    });
  }

  async initialize() {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log("UpstoxInstrumentService: Fetching official Upstox NSE instrument directory...");
        const res = await axios.get("https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz", {
          responseType: "arraybuffer",
          timeout: 15000
        });

        const unzipped = zlib.gunzipSync(res.data);
        const instruments = JSON.parse(unzipped.toString());

        instruments.forEach(inst => {
          if (inst.instrument_key) {
            this.metadataMap.set(inst.instrument_key, inst);

            if (inst.trading_symbol) {
              const symUpper = inst.trading_symbol.toUpperCase();
              this.symbolToKeyMap.set(symUpper, inst.instrument_key);
              this.symbolToKeyMap.set(symUpper + ".NS", inst.instrument_key);
              this.keyToSymbolMap.set(inst.instrument_key, symUpper + ".NS");
            }
          }
        });

        this.lastDownloadedAt = new Date().toISOString();
        this.isInitialized = true;
        console.log("UpstoxInstrumentService: Initialized successfully with " + instruments.length + " NSE instruments.");
        return true;
      } catch (err) {
        console.warn("UpstoxInstrumentService: Could not download live instrument file. Using pre-loaded index & standard mappings:", err.message);
        this.isInitialized = true;
        return false;
      }
    })();

    return this.initPromise;
  }

  getInstrumentKey(symbol) {
    if (!symbol) return null;
    const cleanSym = String(symbol).trim().toUpperCase();
    
    // Direct match
    if (this.symbolToKeyMap.has(cleanSym)) {
      return this.symbolToKeyMap.get(cleanSym);
    }

    // Ticker with .NS stripped
    if (cleanSym.endsWith(".NS")) {
      const bare = cleanSym.replace(".NS", "");
      if (this.symbolToKeyMap.has(bare)) {
        return this.symbolToKeyMap.get(bare);
      }
    }

    // Ticker with .BO stripped
    if (cleanSym.endsWith(".BO")) {
      const bare = cleanSym.replace(".BO", "");
      if (this.symbolToKeyMap.has(bare)) {
        return this.symbolToKeyMap.get(bare);
      }
    }

    // Index mappings
    if (this.indexMap[cleanSym]) {
      return this.indexMap[cleanSym];
    }

    return null;
  }

  getSymbolFromKey(instrumentKey) {
    if (!instrumentKey) return null;
    return this.keyToSymbolMap.get(instrumentKey) || null;
  }

  getInstrumentMetadata(instrumentKey) {
    if (!instrumentKey) return null;
    return this.metadataMap.get(instrumentKey) || null;
  }

  validateInstrument(instrumentKey, expectedSymbol = null) {
    if (!instrumentKey) return { valid: false, reason: "Missing instrument key" };
    const meta = this.metadataMap.get(instrumentKey);
    if (!meta) {
      if (instrumentKey.startsWith("NSE_EQ|") || instrumentKey.startsWith("NSE_INDEX|") || instrumentKey.startsWith("BSE_INDEX|")) {
        return { valid: true, instrumentKey, metadata: null };
      }
      return { valid: false, reason: "Instrument key not found in directory" };
    }

    if (expectedSymbol) {
      const cleanExpected = expectedSymbol.replace(".NS", "").replace(".BO", "").replace("^", "").toUpperCase();
      const metaSym = meta.trading_symbol ? meta.trading_symbol.toUpperCase() : "";
      if (metaSym && metaSym !== cleanExpected && !meta.name?.toUpperCase().includes(cleanExpected)) {
        return { valid: false, reason: "Symbol mismatch: expected " + expectedSymbol + ", found " + metaSym };
      }
    }

    return {
      valid: true,
      instrumentKey,
      tradingSymbol: meta.trading_symbol,
      segment: meta.segment,
      exchange: meta.exchange,
      name: meta.name
    };
  }

  mapSymbolsToKeys(symbols = []) {
    const map = {};
    const unmapped = [];
    symbols.forEach(sym => {
      const key = this.getInstrumentKey(sym);
      if (key) {
        map[sym] = key;
      } else {
        unmapped.push(sym);
      }
    });
    return { map, unmapped };
  }
}

export default new UpstoxInstrumentService();
