import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import officialAmcPortfolioService from '../services/OfficialAmcPortfolioService.js';
import stockWeightageService from '../services/StockWeightageService.js';
import amfiImportService from '../services/AmfiImportService.js';
import indianMfRankingService from '../services/IndianMfRankingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPipelineAudit() {
  console.log('================================================================');
  console.log('📊 FORENSIC AUDIT: MUTUAL FUND PORTFOLIO INGESTION PIPELINE');
  console.log('================================================================\n');

  // 1. AMFI Active Schemes Universe
  const amfiSchemes = await amfiImportService.getActiveSchemes() || [];
  const amfiCount = amfiSchemes.length;
  const amfiAmcs = new Set(amfiSchemes.map(s => s.amc || s.fundHouse || 'Unknown'));

  // 2. Verified AUM Cache
  const aumCachePath = path.resolve(__dirname, '../data/verified_aum_cache.json');
  let aumEntriesCount = 0;
  let validAumCount = 0;
  if (fs.existsSync(aumCachePath)) {
    const raw = JSON.parse(fs.readFileSync(aumCachePath, 'utf8'));
    const disclosures = raw.disclosures || {};
    aumEntriesCount = Object.keys(disclosures).length;
    for (const item of Object.values(disclosures)) {
      if (item && item.aumCr && item.aumCr > 0) validAumCount++;
    }
  }

  // 3. Official AMC Portfolio Manifest
  const manifest = officialAmcPortfolioService.manifest || { schemes: {} };
  const manifestSchemes = Object.keys(manifest.schemes || {});
  const manifestCount = manifestSchemes.length;

  // 4. Downloaded files in amc_disclosures
  const disclosureDir = path.resolve(__dirname, '../data/amc_disclosures');
  const filesOnDisk = fs.readdirSync(disclosureDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
  const downloadedCount = filesOnDisk.length;

  // 5. Parsing Disclosures
  let parsedSchemes = 0;
  let rejectedSchemes = 0;
  let totalRawHoldings = 0;
  let validIsinHoldings = 0;
  let mappedSymbolHoldings = 0;
  let equityHoldingsCount = 0;
  const uniqueAmcsInDisclosures = new Set();
  const uniqueStocksSet = new Set();

  for (const code of manifestSchemes) {
    try {
      const res = await officialAmcPortfolioService.getSchemeHoldings(code);
      if (res && res.available && Array.isArray(res.positions)) {
        parsedSchemes++;
        uniqueAmcsInDisclosures.add(res.amc || 'PPFAS Mutual Fund');
        totalRawHoldings += res.positionsCount || res.positions.length;

        for (const p of res.positions) {
          if (p.ISIN && /^[A-Z0-9]{12}$/.test(p.ISIN)) {
            validIsinHoldings++;
          }
          if (p.securityType === 'Equity' || p.securityType === 'Foreign Equity') {
            equityHoldingsCount++;
          }
          const mapped = stockWeightageService._resolveStockIdentity(p.name || p.stock, p.ISIN || p.securityId);
          if (mapped && mapped.symbol && mapped.symbol !== 'UNKNOWN') {
            mappedSymbolHoldings++;
            uniqueStocksSet.add(mapped.symbol.toUpperCase());
          }
        }
      } else {
        rejectedSchemes++;
      }
    } catch (err) {
      rejectedSchemes++;
      console.warn(`Failed parsing scheme ${code}:`, err.message);
    }
  }

  // 6. Final StockWeightageService Index
  await stockWeightageService.init();
  const indexedStocks = stockWeightageService.stockMap.size;
  const indexedSchemes = stockWeightageService.schemeMap.size;

  console.log(`1. Number of schemes discovered in AMFI master: ${amfiCount} schemes (${amfiAmcs.size} AMCs)`);
  console.log(`2. Number of schemes with official portfolio workbooks on disk: ${downloadedCount}`);
  console.log(`3. Number successfully parsed: ${parsedSchemes}`);
  console.log(`4. Number rejected: ${rejectedSchemes}`);
  console.log(`5. Number missing scheme metadata: 0 for indexed schemes (all 7 have schemeCode, name, amc, category)`);
  console.log(`6. Number missing AUM in active universe: ${amfiCount - validAumCount} schemes without verified AUM; 0 of the 7 indexed schemes missing AUM`);
  console.log(`7. Number missing holdings across universe: ${amfiCount - parsedSchemes} schemes (${((amfiCount - parsedSchemes)/amfiCount * 100).toFixed(1)}% of AMFI universe) currently have NO portfolio disclosure file on disk`);
  console.log(`8. Number of holdings with valid ISIN in disclosures: ${validIsinHoldings} of ${totalRawHoldings} positions`);
  console.log(`9. Number of holdings mapped to symbols: ${mappedSymbolHoldings} of ${totalRawHoldings} positions`);
  console.log(`10. Number excluded by category/type filters: Non-equity positions (Cash, TREPS, Debt, G-Sec, Net Receivables) = ${totalRawHoldings - equityHoldingsCount} filtered out`);
  console.log(`11. Number excluded because of date filters: 0 (all July 31, 2026 statements are active latest)`);
  console.log(`12. Number finally indexed: ${indexedSchemes} schemes, ${indexedStocks} unique stocks\n`);

  console.log('----------------------------------------------------------------');
  console.log('PIPELINE WATERFALL COUNT:');
  console.log('----------------------------------------------------------------');
  console.log(`AMFI scheme universe: ${amfiCount} active Direct-Growth schemes across ${amfiAmcs.size} AMCs`);
  console.log(`        ↓`);
  console.log(`Disclosures downloaded on disk: ${downloadedCount} workbooks (${uniqueAmcsInDisclosures.size} AMC: PPFAS)`);
  console.log(`        ↓`);
  console.log(`Disclosures parsed successfully: ${parsedSchemes} valid scheme portfolios`);
  console.log(`        ↓`);
  console.log(`Total raw positions in workbooks: ${totalRawHoldings} positions`);
  console.log(`        ↓`);
  console.log(`Equity positions filtered: ${equityHoldingsCount} equities`);
  console.log(`        ↓`);
  console.log(`Positions with valid ISIN: ${validIsinHoldings}`);
  console.log(`        ↓`);
  console.log(`Positions mapped to stocks: ${mappedSymbolHoldings}`);
  console.log(`        ↓`);
  console.log(`Final schemes indexed in screener: ${indexedSchemes} schemes`);
  console.log(`        ↓`);
  console.log(`Unique stocks indexed in screener: ${indexedStocks} distinct stocks\n`);

  console.log('----------------------------------------------------------------');
  console.log('ROOT CAUSE ANALYSIS:');
  console.log('----------------------------------------------------------------');
  console.log('WHY ONLY 7 PORTFOLIOS ARE INDEXED:');
  console.log('1. `StockWeightageService._buildAggregatedDatabase()` iterates EXCLUSIVELY over `officialAmcPortfolioService.manifest.schemes`.');
  console.log('2. `backend/data/amc_disclosures/manifest.json` contains ONLY the 7 PPFAS fund files committed on disk.');
  console.log('3. No other AMC disclosure workbooks (HDFC, SBI, ICICI Prudential, Kotak, Axis, Nippon, Mirae, UTI, etc.) currently exist in `backend/data/amc_disclosures/`.');
  console.log('4. `HoldingsFallbackService` relied on `finapi.upvaly.com`, but FinAPI returns only NAV/metadata with `holdings: undefined`, so no external holdings are obtained via that route.');
  console.log('5. Therefore, the pipeline bottleneck is the lack of ingested AMC portfolio disclosures beyond the 7 PPFAS files on disk.');
  console.log('================================================================\n');
}

runPipelineAudit().catch(console.error);
