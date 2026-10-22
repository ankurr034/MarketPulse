// backend/scripts/audit_external_pipelines.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import amfiImportService from '../services/AmfiImportService.js';
import amfiAumImportService from '../services/AmfiAumImportService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import upstoxAuthService from '../services/UpstoxAuthService.js';
import upstoxMarketDataService from '../services/UpstoxMarketDataService.js';
import upstoxInstrumentService from '../services/UpstoxInstrumentService.js';
import yahooFinanceService, { yahooFinance } from '../services/YahooFinanceService.js';
import macroDataService from '../services/MacroDataService.js';
import macroEconomicService from '../services/MacroEconomicService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function measureCall(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    return { name, success: true, duration, result, error: null };
  } catch (err) {
    const duration = Date.now() - start;
    return { name, success: false, duration, result: null, error: err.message };
  }
}

async function runComprehensiveAudit() {
  console.log('======================================================================');
  console.log('    MARKETPULSE EXTERNAL API & DATA PIPELINE DIAGNOSTIC AUDIT        ');
  console.log('======================================================================\n');
  const auditResults = [];

  // 1. AMFI NAV Master (portal.amfiindia.com/spages/NAVAll.txt)
  console.log('[1/9] Testing AMFI NAV Master Feed (NAVAll.txt)...');
  const amfiNavRes = await measureCall('AMFI NAVAll.txt Direct HTTP', async () => {
    const res = await axios.get('https://portal.amfiindia.com/spages/NAVAll.txt', { timeout: 15000 });
    const lines = res.data.split('\n');
    let firstSchemeLine = '';
    let navDateFound = '';
    for (const l of lines) {
      if (/^\d+;/.test(l.trim())) {
        firstSchemeLine = l.trim();
        const parts = l.split(';');
        navDateFound = parts[7] || parts[5] || '';
        break;
      }
    }
    return {
      status: res.status,
      sizeBytes: res.data.length,
      lineCount: lines.length,
      sampleDate: navDateFound.trim()
    };
  });
  auditResults.push(amfiNavRes);
  console.log(`  -> Duration: ${amfiNavRes.duration}ms | Success: ${amfiNavRes.success} | Details:`, amfiNavRes.result || amfiNavRes.error);

  // 2. AMFI SchemeWise AUM
  console.log('\n[2/9] Testing AMFI SchemeWise AUM & Portal Feeds...');
  const amfiAumRes = await measureCall('AMFI SchemeWiseAUM.txt', async () => {
    return await amfiAumImportService.downloadLatestDisclosure();
  });
  auditResults.push(amfiAumRes);
  console.log(`  -> Duration: ${amfiAumRes.duration}ms | Status: ${amfiAumRes.result?.status} | Error: ${amfiAumRes.result?.error || 'None'}`);

  const amfiRssRes = await measureCall('AMFI Portal RSS Feed (Motilal Oswal AMC 55)', async () => {
    return await amfiAumImportService.downloadAmfiPortalFeed(55);
  });
  auditResults.push(amfiRssRes);
  console.log(`  -> Duration: ${amfiRssRes.duration}ms | Status: ${amfiRssRes.result?.status} | Error: ${amfiRssRes.result?.error || 'None'}`);

  // 3. MFAPI (api.mfapi.in)
  console.log('\n[3/9] Testing MFAPI (api.mfapi.in) NAV Time-Series & Caching...');
  const testScheme = '122639'; // Parag Parikh Flexi Cap

  // Test 3a: Direct Network Fetch to api.mfapi.in
  const mfapiDirectRes = await measureCall('api.mfapi.in Direct Network', async () => {
    const res = await axios.get(`https://api.mfapi.in/mf/${testScheme}`, { timeout: 10000 });
    return {
      status: res.status,
      records: res.data.data?.length,
      latestDate: res.data.data?.[0]?.date,
      latestNav: res.data.data?.[0]?.nav
    };
  });
  auditResults.push(mfapiDirectRes);
  console.log(`  -> Direct Network Duration: ${mfapiDirectRes.duration}ms | Latest NAV: ${mfapiDirectRes.result?.latestNav} (${mfapiDirectRes.result?.latestDate})`);

  // Test 3b: MfapiCacheService L1/L2 Performance
  // Clear memory cache for this scheme first to test disk read
  mfapiCacheService.memoryCache.delete(testScheme);
  const mfapiL2Res = await measureCall('MfapiCacheService Disk (L2) Read', async () => {
    return await mfapiCacheService.getSchemeData(testScheme);
  });
  auditResults.push(mfapiL2Res);
  console.log(`  -> Disk (L2) Duration: ${mfapiL2Res.duration}ms | Found: ${!!mfapiL2Res.result}`);

  const mfapiL1Res = await measureCall('MfapiCacheService Memory (L1) Read', async () => {
    return await mfapiCacheService.getSchemeData(testScheme);
  });
  auditResults.push(mfapiL1Res);
  console.log(`  -> Memory (L1) Duration: ${mfapiL1Res.duration}ms | Found: ${!!mfapiL1Res.result}`);

  const mfapiMetaRes = await measureCall('MfapiCacheService Freshness Metadata Inspection', async () => {
    const withMeta = await mfapiCacheService.getSchemeDataWithMeta(testScheme);
    return {
      source: withMeta?.cacheMetadata?.source,
      isStale: withMeta?.cacheMetadata?.isStale,
      asOfDate: withMeta?.cacheMetadata?.asOfDate,
      retrievedAt: withMeta?.cacheMetadata?.retrievedAt
    };
  });
  auditResults.push(mfapiMetaRes);
  console.log(`  -> Metadata: source=${mfapiMetaRes.result?.source}, isStale=${mfapiMetaRes.result?.isStale}, asOf=${mfapiMetaRes.result?.asOfDate}`);

  // 4. Upstox API & Instrument Directory
  console.log('\n[4/9] Testing Upstox API & Instrument Metadata...');
  const upstoxInstRes = await measureCall('Upstox NSE Instrument Directory (json.gz)', async () => {
    return await upstoxInstrumentService.initialize();
  });
  auditResults.push(upstoxInstRes);
  console.log(`  -> Instrument Directory Init: ${upstoxInstRes.duration}ms | Success: ${upstoxInstRes.result}`);

  const upstoxAuthStatus = upstoxAuthService.getAuthStatus();
  console.log(`  -> Upstox Auth Status: authenticated=${upstoxAuthStatus.authenticated}, configured=${upstoxAuthStatus.configured}`);

  const upstoxQuotesRes = await measureCall('Upstox Market Quotes (RELIANCE, TCS, ^NSEI)', async () => {
    return await upstoxMarketDataService.getQuotes(['RELIANCE.NS', 'TCS.NS', '^NSEI']);
  });
  auditResults.push(upstoxQuotesRes);
  console.log(`  -> Upstox Quotes: ${upstoxQuotesRes.duration}ms | Available: ${upstoxQuotesRes.result?.available} | Reason: ${upstoxQuotesRes.result?.reason || 'OK'}`);

  // 5. Upvaly FinAPI (finapi.upvaly.com)
  console.log('\n[5/9] Testing Upvaly FinAPI (finapi.upvaly.com)...');
  const finapiRes = await measureCall('Upvaly FinAPI Scheme Holdings (122639)', async () => {
    const res = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${testScheme}`, { timeout: 8000 });
    return {
      status: res.status,
      holdingsCount: res.data?.data?.holdings?.length || 0,
      aum: res.data?.data?.aum,
      asOf: res.data?.data?.latestNavDate
    };
  });
  auditResults.push(finapiRes);
  console.log(`  -> FinAPI Duration: ${finapiRes.duration}ms | Success: ${finapiRes.success} | Details:`, finapiRes.result || finapiRes.error);

  // 6. mfdata.in API
  console.log('\n[6/9] Testing mfdata.in (mfdata.in/api/v1/schemes)...');
  const mfdataRes = await measureCall('mfdata.in Scheme Details (122639)', async () => {
    const res = await axios.get(`https://mfdata.in/api/v1/schemes/${testScheme}`, { timeout: 5000 });
    return {
      status: res.status,
      aum: res.data?.aum,
      date: res.data?.date
    };
  });
  auditResults.push(mfdataRes);
  console.log(`  -> mfdata.in Duration: ${mfdataRes.duration}ms | Success: ${mfdataRes.success} | Details:`, mfdataRes.result || mfdataRes.error);

  // 7. Official AMC Portfolio Disclosures (Local Excel parsing)
  console.log('\n[7/9] Testing Official AMC Disclosures (Local Manifest & Parsing)...');
  const amcRes = await measureCall('Official AMC Portfolio Service (122639 PPFAS)', async () => {
    const { default: officialAmc } = await import('../services/OfficialAmcPortfolioService.js');
    return await officialAmc.getSchemeHoldings(testScheme);
  });
  auditResults.push(amcRes);
  console.log(`  -> Official AMC Duration: ${amcRes.duration}ms | Positions: ${amcRes.result?.positions?.length || 0} | Source: ${amcRes.result?.source || 'N/A'}`);

  // 8. Yahoo Finance API
  console.log('\n[8/9] Testing Yahoo Finance (Stock & Sector Quotes + Historical)...');
  const yfQuoteRes = await measureCall('Yahoo Finance Quote (RELIANCE.NS)', async () => {
    return await yahooFinance.quote('RELIANCE.NS');
  });
  auditResults.push(yfQuoteRes);
  console.log(`  -> YF Quote Duration: ${yfQuoteRes.duration}ms | Price: ₹${yfQuoteRes.result?.regularMarketPrice}`);

  const yfHistRes = await measureCall('YahooFinanceService Unified Historical (RELIANCE.NS)', async () => {
    return await yahooFinanceService.getHistoricalAnalysis('RELIANCE.NS');
  });
  auditResults.push(yfHistRes);
  console.log(`  -> YF Historical Duration: ${yfHistRes.duration}ms | Returns: 1Y=${yfHistRes.result?.returns?.['1Y']}%`);

  // Cache hit test for YahooFinanceService
  const yfHistCacheRes = await measureCall('YahooFinanceService Historical Cache Hit', async () => {
    return await yahooFinanceService.getHistoricalAnalysis('RELIANCE.NS');
  });
  auditResults.push(yfHistCacheRes);
  console.log(`  -> YF Historical Cache Hit Duration: ${yfHistCacheRes.duration}ms`);

  // 9. RBI & Macroeconomic Data
  console.log('\n[9/9] Testing RBI & Macroeconomic Data Services...');
  const macroRes = await measureCall('MacroDataService Snapshot & Risk-Free Rate', async () => {
    const snap = await macroDataService.getMacroSnapshot();
    const rf = await macroDataService.getRiskFreeRate();
    return {
      repoRate: snap.repoRate?.value,
      cpi: snap.cpiInflation?.value,
      riskFreeRate: rf?.percentage,
      rfAsOf: rf?.riskFreeRateAsOf
    };
  });
  auditResults.push(macroRes);
  console.log(`  -> Macro Duration: ${macroRes.duration}ms | Repo: ${macroRes.result?.repoRate}% | Risk-Free: ${macroRes.result?.riskFreeRate}% (${macroRes.result?.rfAsOf})`);

  console.log('\n======================================================================');
  console.log('                       AUDIT SUMMARY TABLE                            ');
  console.log('======================================================================');
  console.table(auditResults.map(r => ({
    Provider_Pipeline: r.name,
    Success: r.success ? 'YES' : 'NO',
    Latency_ms: r.duration,
    Error_or_Notes: r.error ? r.error : (r.result?.reason || 'OK')
  })));

  // Save audit output to file for documentation
  const auditReportPath = path.resolve(__dirname, '../data/api_pipeline_audit_report.json');
  fs.writeFileSync(auditReportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: auditResults
  }, null, 2), 'utf8');
  console.log(`\nAudit results written to: ${auditReportPath}`);
}

runComprehensiveAudit().catch(err => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
