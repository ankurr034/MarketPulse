// backend/services/UpstoxInstrumentService.js
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
      "^CNXCONSUM": "NSE_INDEX|Nifty India Consumption",
      "NIFTY CONSUMPTION": "NSE_INDEX|Nifty India Consumption",
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
      "India VIX": "NSE_INDEX|India VIX",
      "JUNIORBEES.NS": "NSE_EQ|INF732E01045",
      "JUNIORBEES": "NSE_EQ|INF732E01045"
    };

    // Static fallback official NSE equity ISIN mappings for Indian equities
    this.equityIsinMap = {
      "TCS": "NSE_EQ|INE467B01029",
      "RELIANCE": "NSE_EQ|INE002A01018",
      "INFY": "NSE_EQ|INE009A01021",
      "HDFCBANK": "NSE_EQ|INE040A01034",
      "ICICIBANK": "NSE_EQ|INE090A01021",
      "SBIN": "NSE_EQ|INE062A01020",
      "BHARTIARTL": "NSE_EQ|INE397D01024",
      "ITC": "NSE_EQ|INE154A01025",
      "KOTAKBANK": "NSE_EQ|INE237A01028",
      "LT": "NSE_EQ|INE018A01030",
      "HINDUNILVR": "NSE_EQ|INE030A01027",
      "AXISBANK": "NSE_EQ|INE238A01034",
      "BAJFINANCE": "NSE_EQ|INE296A01024",
      "MARUTI": "NSE_EQ|INE585B01010",
      "M&M": "NSE_EQ|INE101A01026",
      "SUNPHARMA": "NSE_EQ|INE044A01036",
      "TATASTEEL": "NSE_EQ|INE081A01020",
      "TATAMOTORS": "NSE_EQ|INE155A01022",
      "TMCV": "NSE_EQ|INE155A01022",
      "TMPV": "NSE_EQ|INE155A01022",
      "DLF": "NSE_EQ|INE271C01023",
      "TITAN": "NSE_EQ|INE280A01028",
      "ULTRACEMCO": "NSE_EQ|INE481G01011",
      "ADANIENT": "NSE_EQ|INE423A01024",
      "ADANIPORTS": "NSE_EQ|INE742F01042",
      "ASIANPAINT": "NSE_EQ|INE021A01026",
      "COALINDIA": "NSE_EQ|INE522F01014",
      "NTPC": "NSE_EQ|INE733E01010",
      "POWERGRID": "NSE_EQ|INE752E01010",
      "ONGC": "NSE_EQ|INE213A01029",
      "HCLTECH": "NSE_EQ|INE860A01027",
      "WIPRO": "NSE_EQ|INE075A01022",
      "TECHM": "NSE_EQ|INE669C01036",
      "NESTLEIND": "NSE_EQ|INE239A01024",
      "BRITANNIA": "NSE_EQ|INE216A01030",
      "GRASIM": "NSE_EQ|INE047A01021",
      "JSWSTEEL": "NSE_EQ|INE019A01038",
      "HINDALCO": "NSE_EQ|INE038A01020",
      "DRREDDY": "NSE_EQ|INE089A01023",
      "CIPLA": "NSE_EQ|INE059A01026",
      "DIVISLAB": "NSE_EQ|INE361B01024",
      "APOLLOHOSP": "NSE_EQ|INE437A01024",
      "BAJAJ-AUTO": "NSE_EQ|INE917I01010",
      "EICHERMOT": "NSE_EQ|INE066A01021",
      "HEROMOTOCO": "NSE_EQ|INE158A01026",
      "VEDL": "NSE_EQ|INE205A01025",
      "INDUSINDBK": "NSE_EQ|INE095A01012",
      "BANKBARODA": "NSE_EQ|INE077A01010",
      "PNB": "NSE_EQ|INE160A01022",
      "IDFCFIRSTB": "NSE_EQ|INE092T01019",
      "FEDERALBNK": "NSE_EQ|INE171A01029",
      "GODREJPROP": "NSE_EQ|INE484J01027",
      "OBEROIRLTY": "NSE_EQ|INE093I01010",
      "PRESTIGE": "NSE_EQ|INE411L01011",
      "PHOENIXLTD": "NSE_EQ|INE211B01039",
      "BRIGADE": "NSE_EQ|INE791I01019",
      "SOBHA": "NSE_EQ|INE671H01015",
      "TATAPOWER": "NSE_EQ|INE245A01021",
      "ADANIGREEN": "NSE_EQ|INE364U01010",
      "GAIL": "NSE_EQ|INE129A01019",
      "SIEMENS": "NSE_EQ|INE003A01024",
      "LUPIN": "NSE_EQ|INE326A01037",
      "AUROPHARMA": "NSE_EQ|INE406A01037",
      "BIOCON": "NSE_EQ|INE376G01013",
      "MANKIND": "NSE_EQ|INE634S01028",
      "ZYDUSLIFE": "NSE_EQ|INE010B01027",
      "GODREJCP": "NSE_EQ|INE102D01028",
      "DABUR": "NSE_EQ|INE016A01026",
      "MARICO": "NSE_EQ|INE196A01026",
      "COLPAL": "NSE_EQ|INE162A01010",
      "TATACONSUM": "NSE_EQ|INE192A01025",
      "VBL": "NSE_EQ|INE200M01021",
      "PERSISTENT": "NSE_EQ|INE262H01013",
      "COFORGE": "NSE_EQ|INE591G01017",
      "MPHASIS": "NSE_EQ|INE356A01018",
      "LTTS": "NSE_EQ|INE010V01017",
      "TATAELXSI": "NSE_EQ|INE670A01012",
      "BALKRISIND": "NSE_EQ|INE787D01026",
      "ASHOKLEY": "NSE_EQ|INE214T01019",
      "TVSMOTOR": "NSE_EQ|INE494B01023",
      "NMDC": "NSE_EQ|INE584A01023",
      "SAIL": "NSE_EQ|INE114A01011",
      "NATIONALUM": "NSE_EQ|INE139A01034",
      "JINDALSTEL": "NSE_EQ|INE749A01030",
      "NDTV": "NSE_EQ|INE155G01029",
      "NAZARA": "NSE_EQ|INE418L01021",
      "BPCL": "NSE_EQ|INE029A01011",
      "IOC": "NSE_EQ|INE242A01010",
      "CANBK": "NSE_EQ|INE476A01014",
      "UNIONBANK": "NSE_EQ|INE692A01016",
      "IOB": "NSE_EQ|INE565A01014",
      "INDIANB": "NSE_EQ|INE562A01011",
      "MAHABANK": "NSE_EQ|INE457A01014",
      "BAJAJFINSV": "NSE_EQ|INE918I01026",
      "SBILIFE": "NSE_EQ|INE123W01016",
      "HDFCLIFE": "NSE_EQ|INE795G01014",
      "CHOLAFIN": "NSE_EQ|INE121A01024",
      "MUTHOOTFIN": "NSE_EQ|INE414G01012",
      "ZEEL": "NSE_EQ|INE256A01028",
      "PVRINOX": "NSE_EQ|INE191H01014",
      "SUNTV": "NSE_EQ|INE424H01027",
      "NETWORK18": "NSE_EQ|INE886H01027",
      "HAVELLS": "NSE_EQ|INE176B01034",
      "VOLTAS": "NSE_EQ|INE226A01021",
      "WHIRLPOOL": "NSE_EQ|INE616A01013",
      "BLUESTARCO": "NSE_EQ|INE472A01039",
      "CROMPTON": "NSE_EQ|INE299U01018",
      "BATAINDIA": "NSE_EQ|INE176A01028",
      "DIXON": "NSE_EQ|INE935N01020",
      "KALYANKJIL": "NSE_EQ|INE303R01014",
      "LTIM": "NSE_EQ|INE214X01020",
      "SHRIRAMFIN": "NSE_EQ|INE721A01013",
      "DISHTV": "NSE_EQ|INE836F01026",
      "TV18BRDCST": "NSE_EQ|INE886H01027"
    };

    this._populateStaticMappings();
  }

  _populateStaticMappings() {
    // Pre-populate index mappings
    Object.entries(this.indexMap).forEach(([sym, key]) => {
      const uSym = sym.toUpperCase();
      this.symbolToKeyMap.set(uSym, key);
      if (uSym.endsWith(".NS")) this.symbolToKeyMap.set(uSym.replace(".NS", ""), key);
      else this.symbolToKeyMap.set(uSym + ".NS", key);
      
      this.keyToSymbolMap.set(key, sym.startsWith("^") ? sym : (sym.endsWith(".NS") ? sym : sym + ".NS"));
      this.metadataMap.set(key, {
        instrument_key: key,
        trading_symbol: sym,
        segment: key.startsWith("NSE_INDEX") ? "NSE_INDEX" : (key.startsWith("BSE_INDEX") ? "BSE_INDEX" : "NSE_EQ"),
        exchange: key.startsWith("BSE") ? "BSE" : "NSE",
        instrument_type: key.includes("INDEX") ? "INDEX" : "EQUITY",
        name: sym
      });
    });

    // Pre-populate official NSE ISIN equity mappings
    Object.entries(this.equityIsinMap).forEach(([bareSym, isinKey]) => {
      const uBare = bareSym.toUpperCase();
      const dotNs = uBare + ".NS";
      this.symbolToKeyMap.set(uBare, isinKey);
      this.symbolToKeyMap.set(dotNs, isinKey);
      this.keyToSymbolMap.set(isinKey, dotNs);
      this.metadataMap.set(isinKey, {
        instrument_key: isinKey,
        trading_symbol: uBare,
        segment: "NSE_EQ",
        exchange: "NSE",
        instrument_type: "EQUITY",
        name: uBare
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

  /**
   * Audit all given symbols and produce a detailed audit mapping table:
   * symbol -> instrument_key -> exchange -> segment -> status
   */
  auditSymbolMappings(symbols = []) {
    return symbols.map(sym => {
      const key = this.getInstrumentKey(sym);
      const meta = key ? this.metadataMap.get(key) : null;
      const isMapped = Boolean(key);
      const isIndex = sym.startsWith("^") || (key && key.includes("INDEX"));
      const exchange = meta?.exchange || (sym.endsWith(".BO") || sym.includes("BSE") ? "BSE" : (sym.endsWith(".NS") || sym.startsWith("^") ? "NSE" : "US"));
      const segment = meta?.segment || (isIndex ? `${exchange}_INDEX` : `${exchange}_EQ`);

      return {
        symbol: sym,
        instrument_key: key || "UNRESOLVED",
        exchange,
        segment,
        status: isMapped ? "RESOLVED" : "UNMAPPED"
      };
    });
  }

  /**
   * Resolve an authentic canonical instrument model for a given symbol or instrument key.
   */
  resolveCanonicalInstrument(symbol) {
    if (!symbol) return null;
    const cleanSym = String(symbol).trim().toUpperCase();
    const isIndex = cleanSym.startsWith("^") || cleanSym.includes("INDEX") || cleanSym.includes("NIFTY") || cleanSym.includes("SENSEX");
    
    let exchange = "US";
    if (cleanSym.endsWith(".BO") || cleanSym.includes("BSE")) {
      exchange = "BSE";
    } else if (cleanSym.endsWith(".NS") || isIndex || cleanSym.startsWith("NSE")) {
      exchange = "NSE";
    }

    const instrumentKey = this.getInstrumentKey(cleanSym);
    const meta = instrumentKey ? this.metadataMap.get(instrumentKey) : null;
    const tradingSymbol = meta?.trading_symbol || cleanSym.replace(".NS", "").replace(".BO", "").replace("^", "");
    const isin = (instrumentKey && instrumentKey.startsWith("NSE_EQ|")) ? instrumentKey.split("|")[1] : null;
    const exchangeSegment = isIndex ? `${exchange}_INDEX` : `${exchange}_EQ`;

    return {
      symbol: cleanSym.includes(".") || isIndex ? cleanSym : `${cleanSym}.NS`,
      tradingSymbol,
      isin: isin || null,
      exchange: meta?.exchange || exchange,
      exchangeSegment: meta?.segment || exchangeSegment,
      instrumentKey: instrumentKey || (exchange === 'NSE' && isin ? `NSE_EQ|${isin}` : null)
    };
  }
}

export default new UpstoxInstrumentService();
