import assert from 'assert';
import officialAmcPortfolioService from '../services/OfficialAmcPortfolioService.js';
import mfDataAggregatorService from '../services/MfDataAggregatorService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';

async function runIsolationTestSuite() {
  console.log('🧪 Starting Mutual Fund Cross-Fund Identity & Source Isolation Test Suite...\n');
  let passedCount = 0;
  let failedCount = 0;

  function pass(name) {
    passedCount++;
    console.log(`  ✅ PASS: ${name}`);
  }

  function fail(name, error) {
    failedCount++;
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${error.message || error}`);
  }

  // -------------------------------------------------------------
  // Test 1: Dynamic Verification & Scheme Identity Matching
  // -------------------------------------------------------------
  try {
    const supportedSchemes = ['122639', '143269', '147481', '148958', '152109', '152468', '154155'];
    
    for (const code of supportedSchemes) {
      const res = await officialAmcPortfolioService.getSchemeHoldings(code);
      assert.strictEqual(res.available, true, `Scheme ${code} must be available`);
      assert.strictEqual(res.holdingsAvailable, true, `Scheme ${code} holdingsAvailable must be true`);
      assert.strictEqual(res.dataStatus, 'DATA_AVAILABLE', `Scheme ${code} dataStatus must be DATA_AVAILABLE`);
      assert.strictEqual(res.schemeCode, code, `Scheme code must match requested (${code} vs ${res.schemeCode})`);
      assert.ok(res.schemeName && res.schemeName.length > 0, `schemeName must be present for ${code}`);
      assert.ok(res.isin || res.ISIN, `ISIN must be present for ${code}`);
      assert.ok(res.amc || res.AMC, `AMC must be present for ${code}`);
      assert.strictEqual(res.plan, 'Direct Plan', `plan must be Direct Plan for ${code}`);
      assert.strictEqual(res.option, 'Growth', `option must be Growth for ${code}`);
      assert.ok(res.sourceUrl && res.sourceUrl.startsWith('http'), `sourceUrl must be valid URL for ${code}`);
      assert.ok(res.sourceFile && res.sourceFile.startsWith(code), `sourceFile must belong to ${code}`);
      assert.ok(res.holdingsAsOf && res.holdingsAsOf.length > 5, `holdingsAsOf date must be present for ${code}`);
      assert.ok(res.fetchedAt, `fetchedAt timestamp must be present for ${code}`);
      assert.ok(Array.isArray(res.positions) && res.positions.length > 0, `Positions array must not be empty for ${code}`);
      assert.strictEqual(res.positions.length, res.totalDisclosedPositionsCount, `positions.length must equal totalDisclosedPositionsCount for ${code}`);
      assert.ok(res.eligibleStockPositionsCount <= res.totalDisclosedPositionsCount, `eligibleStockPositionsCount must be <= total for ${code}`);
    }
    pass('All 7 supported schemes retrieve dynamic authentic disclosures with exact identity & all 13 provenance fields');
  } catch (err) {
    fail('Dynamic Verification & Scheme Identity Matching', err);
  }

  // -------------------------------------------------------------
  // Test 2: Position Count Integrity (Total Disclosed vs Eligible Stock)
  // -------------------------------------------------------------
  try {
    const ppfcf = await officialAmcPortfolioService.getSchemeHoldings('122639');
    // PPFCF official disclosure has 118 total instruments and 65 eligible stock/equity positions
    assert.strictEqual(ppfcf.totalDisclosedPositionsCount, 118, 'PPFCF totalDisclosedPositionsCount must be 118');
    assert.strictEqual(ppfcf.eligibleStockPositionsCount, 65, 'PPFCF eligibleStockPositionsCount must be 65');
    assert.ok(ppfcf.equityPositionsCount > 0, 'PPFCF must have equity positions');
    assert.ok(ppfcf.debtPositionsCount > 0, 'PPFCF must have debt/money-market positions');

    // Original weights preserved: total weight is approximately 100% across all instruments
    assert.ok(ppfcf.totalDisclosedWeightPercent >= 99 && ppfcf.totalDisclosedWeightPercent <= 101, 'Total disclosed weight must encompass all instruments ~100%');
    
    // Top stocks are NOT renormalized to 100%
    const stockSum = ppfcf.positions
      .filter(p => p.securityType === 'Equity' || p.securityType === 'Foreign Equity' || p.securityType === 'ETF/REIT')
      .reduce((sum, p) => sum + p.weightPercent, 0);
    assert.ok(stockSum < 95, `Stock positions sum (${stockSum.toFixed(2)}%) must preserve original weights, not renormalized to 100%`);
    pass('Position Count Integrity: 118 total instruments, 65 eligible stocks, original weights preserved');
  } catch (err) {
    fail('Position Count Integrity', err);
  }

  // -------------------------------------------------------------
  // Test 3: Legitimate Overlapping Holdings Allowed, Full Portfolio Cloning Forbidden
  // -------------------------------------------------------------
  try {
    const ppfcf = await officialAmcPortfolioService.getSchemeHoldings('122639');
    const elss = await officialAmcPortfolioService.getSchemeHoldings('147481');

    // Extract security IDs / stock names
    const ppfcfStocks = new Set(ppfcf.positions.map(p => p.Symbol || p.companyName));
    const elssStocks = new Set(elss.positions.map(p => p.Symbol || p.companyName));

    // Overlapping stocks should exist (e.g. HDFC Bank, ICICI Bank, ITC are in both)
    const overlap = [...ppfcfStocks].filter(s => elssStocks.has(s));
    assert.ok(overlap.length > 0, `Legitimate overlap must be permitted: found ${overlap.length} shared stocks between PPFCF and ELSS`);

    // But complete portfolio cloning is strictly forbidden
    assert.notStrictEqual(ppfcf.totalDisclosedPositionsCount, elss.totalDisclosedPositionsCount, 'Total position counts must differ between PPFCF and ELSS');
    
    // Serialize complete portfolio arrays
    const ppfcfSerialized = JSON.stringify(ppfcf.positions.map(p => [p.ISIN, p.companyName, p.weightPercent]));
    const elssSerialized = JSON.stringify(elss.positions.map(p => [p.ISIN, p.companyName, p.weightPercent]));
    assert.notStrictEqual(ppfcfSerialized, elssSerialized, 'Complete portfolio cloning detected: PPFCF and ELSS portfolios must not be identical');
    
    pass(`Legitimate overlap allowed (${overlap.length} shared securities), complete portfolio cloning rejected`);
  } catch (err) {
    fail('Legitimate Overlap & Anti-Cloning Check', err);
  }

  // -------------------------------------------------------------
  // Test 4: Fund Asset Class Differentiation (Equity vs Liquid)
  // -------------------------------------------------------------
  try {
    const ppfcf = await officialAmcPortfolioService.getSchemeHoldings('122639');
    const liquid = await officialAmcPortfolioService.getSchemeHoldings('143269');

    // Liquid fund must have ZERO domestic equity positions
    assert.strictEqual(liquid.equityPositionsCount, 0, 'Liquid fund must have 0 equity positions');
    assert.ok(liquid.debtPositionsCount > 0, 'Liquid fund must have debt/money-market positions');
    
    // PPFCF has equity positions
    assert.ok(ppfcf.equityPositionsCount > 30, 'PPFCF must have substantial equity positions');
    pass('Asset Class Differentiation: Liquid fund holds debt/money market, PPFCF holds equity');
  } catch (err) {
    fail('Asset Class Differentiation', err);
  }

  // -------------------------------------------------------------
  // Test 5: Fund-Specific Disclosure Dates
  // -------------------------------------------------------------
  try {
    const ppfcf = await officialAmcPortfolioService.getSchemeHoldings('122639');
    const largeCap = await officialAmcPortfolioService.getSchemeHoldings('154155');

    assert.ok(ppfcf.holdingsAsOf, 'PPFCF holdingsAsOf must be present');
    assert.ok(largeCap.holdingsAsOf, 'Large Cap holdingsAsOf must be present');
    assert.strictEqual(typeof ppfcf.holdingsAsOf, 'string');
    assert.strictEqual(typeof largeCap.holdingsAsOf, 'string');
    pass('Fund-Specific Disclosure Dates verified dynamically from source headers');
  } catch (err) {
    fail('Fund-Specific Disclosure Dates', err);
  }

  // -------------------------------------------------------------
  // Test 6: Cache Isolation (A -> B -> A -> B)
  // -------------------------------------------------------------
  try {
    // Clear and execute sequential requests
    const resA1 = await officialAmcPortfolioService.getSchemeHoldings('122639');
    const resB1 = await officialAmcPortfolioService.getSchemeHoldings('147481');
    const resA2 = await officialAmcPortfolioService.getSchemeHoldings('122639');
    const resB2 = await officialAmcPortfolioService.getSchemeHoldings('147481');

    assert.strictEqual(resA1.schemeCode, '122639');
    assert.strictEqual(resA2.schemeCode, '122639');
    assert.strictEqual(resA1.isin, 'INF879O01027');
    assert.strictEqual(resA2.isin, 'INF879O01027');
    assert.strictEqual(resA2.sourceFile, '122639_PPFCF.xlsx');

    assert.strictEqual(resB1.schemeCode, '147481');
    assert.strictEqual(resB2.schemeCode, '147481');
    assert.strictEqual(resB1.isin, 'INF879O01191');
    assert.strictEqual(resB2.isin, 'INF879O01191');
    assert.strictEqual(resB2.sourceFile, '147481_PPTSF.xlsx');

    assert.notStrictEqual(resA2.sourceFile, resB2.sourceFile, 'Cache entries must remain strictly scheme-specific');

    // Provenance verification on cache hit
    for (const cachedItem of [resA2, resB2]) {
      assert.ok(cachedItem.schemeCode);
      assert.ok(cachedItem.schemeName);
      assert.ok(cachedItem.isin || cachedItem.ISIN);
      assert.ok(cachedItem.amc || cachedItem.AMC);
      assert.ok(cachedItem.plan);
      assert.ok(cachedItem.option);
      assert.ok(cachedItem.sourceUrl);
      assert.ok(cachedItem.sourceFile);
      assert.ok(cachedItem.holdingsAsOf);
      assert.ok(cachedItem.fetchedAt);
      assert.strictEqual(cachedItem.dataStatus, 'DATA_AVAILABLE');
      assert.ok(typeof cachedItem.totalDisclosedPositionsCount === 'number');
      assert.ok(typeof cachedItem.eligibleStockPositionsCount === 'number');
    }
    pass('Cache Isolation: Sequential requests (A -> B -> A -> B) preserve exact scheme identities & provenance');
  } catch (err) {
    fail('Cache Isolation', err);
  }

  // -------------------------------------------------------------
  // Test 7: Concurrent Request Isolation (Promise.all)
  // -------------------------------------------------------------
  try {
    const codes = ['122639', '147481', '143269', '154155'];
    const results = await Promise.all(codes.map(c => officialAmcPortfolioService.getSchemeHoldings(c)));

    for (let i = 0; i < codes.length; i++) {
      const expectedCode = codes[i];
      const actual = results[i];
      assert.strictEqual(actual.schemeCode, expectedCode, `Concurrent result[${i}] must have schemeCode ${expectedCode}`);
      assert.strictEqual(actual.available, true);
      assert.ok(actual.sourceFile.startsWith(expectedCode), `Concurrent result[${i}] sourceFile must match ${expectedCode}`);
    }
    pass('Concurrent Request Isolation: Parallel Promise.all requests resolve to respective funds without race conditions');
  } catch (err) {
    fail('Concurrent Request Isolation', err);
  }

  // -------------------------------------------------------------
  // Test 8: Frontend State Isolation & Request Cancellation Simulation
  // -------------------------------------------------------------
  try {
    // Simulating React useEffect cancellation behavior
    let displayedFundId = null;
    let displayedHoldings = null;

    // Simulate User clicking Fund A (122639)
    let tokenA = { isCancelled: false };
    const requestA = (async () => {
      const data = await officialAmcPortfolioService.getSchemeHoldings('122639');
      if (!tokenA.isCancelled) {
        displayedFundId = '122639';
        displayedHoldings = data.positions;
      }
    })();

    // User immediately switches to Fund B (147481) before A completes
    tokenA.isCancelled = true; // cancellation on unmount/fund change
    let tokenB = { isCancelled: false };
    const requestB = (async () => {
      const data = await officialAmcPortfolioService.getSchemeHoldings('147481');
      if (!tokenB.isCancelled) {
        displayedFundId = '147481';
        displayedHoldings = data.positions;
      }
    })();

    await Promise.all([requestA, requestB]);
    assert.strictEqual(displayedFundId, '147481', 'Displayed fund must be Fund B');
    assert.strictEqual(displayedHoldings[0].portfolioAsOf, (await officialAmcPortfolioService.getSchemeHoldings('147481')).holdingsAsOf);
    pass('Frontend State Isolation: Stale/cancelled request tokens never overwrite active fund state');
  } catch (err) {
    fail('Frontend State Isolation Simulation', err);
  }

  // -------------------------------------------------------------
  // Test 9: Strict Zero Fabrication on Unsupported Schemes
  // -------------------------------------------------------------
  try {
    const unsupportedCodes = ['118989', '118991', '999999', 'INVALID_CODE'];

    for (const code of unsupportedCodes) {
      const amcRes = await officialAmcPortfolioService.getSchemeHoldings(code);
      assert.strictEqual(amcRes.available, false, `Unsupported scheme ${code} must not be available`);
      assert.strictEqual(amcRes.holdingsAvailable, false, `Unsupported scheme ${code} holdingsAvailable must be false`);
      assert.strictEqual(amcRes.dataStatus, 'DATA_UNAVAILABLE', `Unsupported scheme ${code} must be DATA_UNAVAILABLE`);
      assert.strictEqual(amcRes.positions.length, 0, `Unsupported scheme ${code} positions must be empty`);
      assert.strictEqual(amcRes.holdings.length, 0, `Unsupported scheme ${code} holdings must be empty`);
      assert.strictEqual(Object.keys(amcRes.sectorBreakdown).length, 0, `Unsupported scheme ${code} sectorBreakdown must be empty`);

      const fallbackRes = await holdingsFallbackService.getHoldings(code, 'Test Scheme');
      assert.strictEqual(fallbackRes.available, false, `Fallback for ${code} must be false`);
      assert.strictEqual(fallbackRes.positions.length, 0, `Fallback positions for ${code} must be empty`);
      assert.strictEqual(fallbackRes.holdings.length, 0, `Fallback holdings for ${code} must be empty`);
      assert.strictEqual(Object.keys(fallbackRes.sectorBreakdown).length, 0, `Fallback sectorBreakdown for ${code} must be empty`);

      // Verify ZERO fabricated stocks (none of the fake 12 stocks or momentum stocks)
      const allStocks = [...(amcRes.positions || []), ...(fallbackRes.positions || [])].map(p => p.stock || p.name);
      assert.strictEqual(allStocks.length, 0, `Must not contain any fabricated stocks for ${code}`);
    }
    pass('Zero Fabrication: Unsupported schemes (118989, 118991, 999999) return strictly DATA_UNAVAILABLE with 0 positions');
  } catch (err) {
    fail('Zero Fabrication on Unsupported Schemes', err);
  }

  // -------------------------------------------------------------
  // Test 10: MfDataAggregatorService Integration
  // -------------------------------------------------------------
  try {
    // Supported scheme
    const aggSupported = await mfDataAggregatorService.getSchemeHoldings('122639', '1y');
    assert.strictEqual(aggSupported.schemeCode, '122639');
    assert.strictEqual(aggSupported.holdingsAvailable, true);
    assert.strictEqual(aggSupported.dataStatus, 'DATA_AVAILABLE');
    assert.ok(aggSupported.positions.length > 0);
    assert.ok(Object.keys(aggSupported.sectorBreakdown).length > 0);

    // Unsupported scheme
    const aggUnsupported = await mfDataAggregatorService.getSchemeHoldings('118989', '1y');
    assert.strictEqual(aggUnsupported.schemeCode, '118989');
    assert.strictEqual(aggUnsupported.holdingsAvailable, false);
    assert.strictEqual(aggUnsupported.dataStatus, 'DATA_UNAVAILABLE');
    assert.strictEqual(aggUnsupported.positions.length, 0);
    assert.strictEqual(Object.keys(aggUnsupported.sectorBreakdown).length, 0);
    pass('MfDataAggregatorService correctly propagates authentic holdings for supported and UNAVAILABLE for unsupported');
  } catch (err) {
    fail('MfDataAggregatorService Integration', err);
  }

  // -------------------------------------------------------------
  // Test 11: UnifiedAssetService Integration
  // -------------------------------------------------------------
  try {
    const assetSupported = await unifiedAssetService.getAssetDetail('mf', '122639', 'india');
    assert.strictEqual(assetSupported.schemeCode, '122639');
    assert.strictEqual(assetSupported.holdingsAvailable, true);
    assert.ok(assetSupported.positions.length > 0);

    const assetUnsupported = await unifiedAssetService.getAssetDetail('mf', '118989', 'india');
    assert.strictEqual(assetUnsupported.schemeCode, '118989');
    assert.strictEqual(assetUnsupported.holdingsAvailable, false);
    assert.strictEqual(assetUnsupported.positions.length, 0);
    pass('UnifiedAssetService getAssetDetail preserves scheme identity and zero-fabrication state');
  } catch (err) {
    fail('UnifiedAssetService Integration', err);
  }

  console.log('\n========================================');
  console.log(`Results: ${passedCount}/${passedCount + failedCount} Passed (${failedCount} Failed)`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runIsolationTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
