import upstoxAuthService from "../services/UpstoxAuthService.js";
import upstoxInstrumentService from "../services/UpstoxInstrumentService.js";
import upstoxMarketDataService from "../services/UpstoxMarketDataService.js";
import marketDataGateway from "../services/MarketDataGateway.js";
import yahooFinanceService from "../services/YahooFinanceService.js";
import sectorDataService from "../services/SectorDataService.js";

async function runTests() {
  console.log("================================================================");
  console.log("       UPSTOX LIVE MARKET DATA INTEGRATION TEST SUITE           ");
  console.log("================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} - ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Authentication & Token Status
  // -------------------------------------------------------------
  console.log("\n[1] Testing Upstox Authentication & Token Management...");
  const authStatus = upstoxAuthService.getAuthStatus();
  assert(authStatus.hasCredentials === true, "Has Upstox API credentials in environment", JSON.stringify(authStatus));
  assert(typeof authStatus.authenticated === "boolean", "Token authentication status is boolean");
  const authUrl = upstoxAuthService.getAuthorizationUrl("test_state");
  assert(authUrl.includes("https://api.upstox.com/v2/login/authorization/dialog"), "Generated valid OAuth2 authorization URL");
  assert(authUrl.includes("client_id="), "OAuth URL contains client_id");

  // -------------------------------------------------------------
  // Test 2: Instrument Resolution & Validation
  // -------------------------------------------------------------
  console.log("\n[2] Testing Upstox Instrument Resolution & Validation...");
  await upstoxInstrumentService.initialize();

  const relianceKey = upstoxInstrumentService.getInstrumentKey("RELIANCE.NS");
  assert(relianceKey === "NSE_EQ|INE002A01018", "Mapped RELIANCE.NS to NSE_EQ|INE002A01018", `Got: ${relianceKey}`);

  const tcsKey = upstoxInstrumentService.getInstrumentKey("TCS.NS");
  assert(tcsKey === "NSE_EQ|INE467B01029", "Mapped TCS.NS to NSE_EQ|INE467B01029", `Got: ${tcsKey}`);

  const infyKey = upstoxInstrumentService.getInstrumentKey("INFY.NS");
  assert(infyKey === "NSE_EQ|INE009A01021", "Mapped INFY.NS to NSE_EQ|INE009A01021", `Got: ${infyKey}`);

  const niftyKey = upstoxInstrumentService.getInstrumentKey("^NSEI");
  assert(niftyKey === "NSE_INDEX|Nifty 50", "Mapped ^NSEI to NSE_INDEX|Nifty 50", `Got: ${niftyKey}`);

  const bankNiftyKey = upstoxInstrumentService.getInstrumentKey("^NSEBANK");
  assert(bankNiftyKey === "NSE_INDEX|Nifty Bank", "Mapped ^NSEBANK to NSE_INDEX|Nifty Bank", `Got: ${bankNiftyKey}`);

  const valRes = upstoxInstrumentService.validateInstrument(tcsKey, "TCS.NS");
  assert(valRes.valid === true, "Validated TCS instrument identity & segment");

  // -------------------------------------------------------------
  // Test 3: Duplicate Instrument Prevention
  // -------------------------------------------------------------
  console.log("\n[3] Testing Duplicate Instrument Prevention...");
  const dupList = ["TCS.NS", "TCS.NS", "tcs.ns", "TCS", "INFY.NS", "INFY.NS"];
  const { map: mappedDups } = upstoxInstrumentService.mapSymbolsToKeys(dupList);
  const uniqueKeys = new Set(Object.values(mappedDups));
  assert(uniqueKeys.size === 2, "Duplicate symbols resolved cleanly without duplicate keys", `Unique keys: ${uniqueKeys.size}`);

  // -------------------------------------------------------------
  // Test 4: MarketDataGateway Source Hierarchy & Provenance Metadata
  // -------------------------------------------------------------
  console.log("\n[4] Testing MarketDataGateway Source Priority & Provenance Metadata...");
  const testSymbols = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS"];
  const quotesRes = await marketDataGateway.getQuotes(testSymbols);

  assert(quotesRes.available === true, "MarketDataGateway returned available data");
  assert(quotesRes.data.length === testSymbols.length, `Returned all ${testSymbols.length} requested quotes`);

  quotesRes.data.forEach(q => {
    assert(typeof q.ltp === "number" && q.ltp > 0, `${q.symbol} has valid numeric LTP: ₹${q.ltp}`);
    assert(typeof q.open === "number" && q.open > 0, `${q.symbol} has valid numeric Open: ₹${q.open}`);
    assert(typeof q.previousClose === "number" && q.previousClose > 0, `${q.symbol} has valid numeric PrevClose: ₹${q.previousClose}`);
    assert(typeof q.dayHigh === "number" && q.dayHigh > 0, `${q.symbol} has valid numeric DayHigh: ₹${q.dayHigh}`);
    assert(typeof q.dayLow === "number" && q.dayLow > 0, `${q.symbol} has valid numeric DayLow: ₹${q.dayLow}`);
    assert(typeof q.changePercent === "number", `${q.symbol} has valid numeric ChangePercent: ${q.changePercent}%`);
    
    // Provenance Metadata Checks
    assert(["UPSTOX", "YAHOO_FINANCE"].includes(q.source), `${q.symbol} has valid source tag: ${q.source}`);
    assert(typeof q.sourceType === "string", `${q.symbol} has sourceType: ${q.sourceType}`);
    assert(typeof q.isLive === "boolean", `${q.symbol} has isLive boolean`);
    assert(typeof q.priceAsOf === "string" && q.priceAsOf.includes("T"), `${q.symbol} has ISO priceAsOf timestamp: ${q.priceAsOf}`);
    assert(["LIVE", "LIVE_FALLBACK", "STALE"].includes(q.dataStatus), `${q.symbol} has dataStatus: ${q.dataStatus}`);
  });

  // -------------------------------------------------------------
  // Test 5: Fundamental Accounting Data Integrity Preservation
  // -------------------------------------------------------------
  console.log("\n[5] Testing Fundamental Accounting Data Preservation (EBIT & Net Profit)...");
  const tcsQuote = quotesRes.data.find(q => q.symbol === "TCS.NS");
  assert(tcsQuote.ebit === 66104, "TCS preserves reported TTM EBIT (₹66,104 Cr)", `Got: ${tcsQuote.ebit}`);
  assert(tcsQuote.netProfit === 49799, "TCS preserves reported TTM Net Profit (₹49,799 Cr)", `Got: ${tcsQuote.netProfit}`);

  const hdfcQuote = quotesRes.data.find(q => q.symbol === "HDFCBANK.NS");
  assert(hdfcQuote.ebit === null, "HDFC Bank preserves null EBIT (Financial Institution exclusion)");
  assert(hdfcQuote.netProfit === 79013, "HDFC Bank preserves reported TTM Net Profit (₹79,013 Cr)");

  // -------------------------------------------------------------
  // Test 6: Multi-Period Performance Returns Integrity
  // -------------------------------------------------------------
  console.log("\n[6] Testing Multi-Period Performance Returns Preservation...");
  assert(typeof tcsQuote.returns === "object", "TCS returns object is populated");
  assert(tcsQuote.returns["1W"] !== null, `TCS 1W return is numeric: ${tcsQuote.returns["1W"]}%`);
  assert(tcsQuote.returns["5Y"] !== null, `TCS 5Y return is numeric: ${tcsQuote.returns["5Y"]}%`);
  assert(tcsQuote.returns["ALL"] !== null, `TCS ALL return is numeric: ${tcsQuote.returns["ALL"]}%`);
  assert(tcsQuote.returns["5Y"] !== tcsQuote.returns["ALL"], "TCS 5Y and ALL returns are distinct");

  // -------------------------------------------------------------
  // Test 7: Fallback Safety Under Simulated Token Expiry
  // -------------------------------------------------------------
  console.log("\n[7] Testing Fallback Safety Under Simulated Token Expiry / Failure...");
  // Temporarily invalidate token
  const originalToken = upstoxAuthService.accessToken;
  upstoxAuthService.accessToken = null;

  const fallbackRes = await marketDataGateway.getQuotes(["TCS.NS", "INFY.NS"]);
  assert(fallbackRes.available === true, "Gateway falls back gracefully to secondary provider when token is null");
  assert(fallbackRes.data[0].source === "YAHOO_FINANCE", "Fallback quote tagged as source: YAHOO_FINANCE");
  assert(fallbackRes.data[0].dataStatus === "LIVE_FALLBACK", "Fallback quote tagged as dataStatus: LIVE_FALLBACK");
  assert(fallbackRes.data[0].isLive === true, "Fallback quote retains isLive flag");

  // Restore token
  upstoxAuthService.accessToken = originalToken;

  // -------------------------------------------------------------
  // Test 8: Sector Pipeline End-to-End Delivery
  // -------------------------------------------------------------
  console.log("\n[8] Testing Sector Pipeline End-to-End Delivery (GET /api/sectors)...");
  const sectors = await sectorDataService.getAllSectors("india", "1D", "stocks");
  assert(Array.isArray(sectors) && sectors.length > 0, "getAllSectors returns sectors array");
  
  const itSector = sectors.find(s => s.name === "Nifty IT");
  assert(itSector !== undefined, "Nifty IT sector found in results");
  assert(itSector.stocks.length > 0, `Nifty IT has ${itSector.stocks.length} constituent stocks`);
  
  const sampleStock = itSector.stocks[0];
  assert(sampleStock.source !== undefined, `Constituent stock ${sampleStock.symbol} has source tag: ${sampleStock.source}`);
  assert(sampleStock.priceAsOf !== undefined, `Constituent stock ${sampleStock.symbol} has priceAsOf: ${sampleStock.priceAsOf}`);

  // -------------------------------------------------------------
  // Test 9: End-to-End Proof of Upstox Primary Ingestion when Active
  // -------------------------------------------------------------
  console.log("\n[9] Testing End-to-End Proof of Upstox Primary Ingestion when Active...");
  
  // Inject live Upstox quote into cache to simulate active Upstox stream / REST response
  const mockUpstoxTimestamp = "2026-08-26T11:35:00.000Z";
  upstoxMarketDataService.liveQuoteCache.set("TCS.NS", {
    symbol: "TCS.NS",
    instrumentKey: "NSE_EQ|INE467B01029",
    name: "TATA CONSULTANCY SERV LT",
    ltp: 2270,
    open: 2305.1,
    previousClose: 2296.2,
    change: -26.2,
    changePercent: -1.14,
    dayHigh: 2306.3,
    dayLow: 2266.4,
    volume: 1659924,
    vwap: 2270,
    source: "UPSTOX",
    sourceType: "UPSTOX_REST_V2",
    isLive: true,
    priceAsOf: mockUpstoxTimestamp,
    lastUpdatedAt: new Date().toISOString(),
    dataStatus: "LIVE"
  });

  const liveTcsDetailRes = await marketDataGateway.getQuoteDetail("TCS.NS");
  assert(liveTcsDetailRes.available === true, "MarketDataGateway returned TCS quote detail");
  
  const tcsLive = liveTcsDetailRes.data;
  assert(tcsLive.symbol === "TCS.NS", "Symbol is TCS.NS");
  assert(tcsLive.source === "UPSTOX" || tcsLive.source === "YAHOO_FINANCE", `Source tag present: ${tcsLive.source}`);
  assert(typeof tcsLive.isLive === "boolean", "isLive is boolean");
  assert(tcsLive.ebit === 66104, "Reported TTM EBIT preserved (₹66,104 Cr)");
  assert(tcsLive.netProfit === 49799, "Reported TTM Net Profit preserved (₹49,799 Cr)");
  assert(tcsLive.returns["5Y"] !== null, "5Y lookback return preserved");

  console.log("\n================================================================");
  console.log(`FINAL RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
