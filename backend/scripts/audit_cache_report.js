import fs from 'fs';
import stockWeightageService from '../services/StockWeightageService.js';

async function auditCache() {
  await stockWeightageService.init();
  const raw = fs.readFileSync('data/verified_fund_holdings_cache.json', 'utf8');
  const cache = JSON.parse(raw);
  const schemes = Object.values(cache.schemes || {});

  const eligibleMap = stockWeightageService.eligibleFundUniverseMap;
  console.log(`=======================================================`);
  console.log(`AUDIT REPORT: VERIFIED FUND HOLDINGS DISCLOSURES`);
  console.log(`=======================================================`);
  console.log(`Total Schemes in Cache: ${schemes.length}`);
  console.log(`Eligible Schemes in 5 Target Categories: ${eligibleMap.size}`);

  const withHoldings = schemes.filter(s => s.holdingsAvailable && s.positions?.length > 0);
  const awaiting = schemes.filter(s => !s.holdingsAvailable || !s.positions || s.positions.length === 0);

  console.log(`Funds with Verified Statutory Holdings: ${withHoldings.length}`);
  console.log(`Funds Awaiting Statutory Publication: ${awaiting.length}`);

  const amcSet = new Set();
  const categoryCounts = {};
  let totalPositions = 0;
  const uniqueStocksSet = new Set();

  for (const s of withHoldings) {
    amcSet.add(s.amc);
    const cat = stockWeightageService.normalizeTargetCategory(s.category, s.schemeName) || s.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    totalPositions += (s.positions || []).length;
    for (const p of s.positions) {
      const sym = (p.symbol || p.stock || p.name).toUpperCase();
      uniqueStocksSet.add(sym);
    }
  }

  console.log(`\nUnique AMCs Covered with Verified Holdings: ${amcSet.size}`);
  console.log(`Total Unique Stocks Disclosed Across Portfolios: ${uniqueStocksSet.size}`);
  console.log(`Total Position Records Disclosed: ${totalPositions}`);
  console.log(`\nCategory-wise Verified Holdings Coverage:`);
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`  - ${cat}: ${count} funds`);
  }

  console.log(`\nAMCs Represented:`);
  console.log([...amcSet].join(', '));
  console.log(`=======================================================`);
}

auditCache().catch(console.error);
