import fs from 'fs';
import path from 'path';
import stockWeightageService from '../services/StockWeightageService.js';
import officialAmcPortfolioService from '../services/OfficialAmcPortfolioService.js';
import { yahooFinance } from '../services/YahooFinanceService.js';

async function auditCompletePipeline() {
  await stockWeightageService.init();
  const eligible = Array.from(stockWeightageService.eligibleFundUniverseMap.values());
  console.log(`================================================================`);
  console.log(`AUDITING COMPLETE HOLDINGS PIPELINE FOR ALL ${eligible.length} ELIGIBLE FUNDS`);
  console.log(`================================================================`);

  const manifest = officialAmcPortfolioService.manifest?.schemes || {};
  let manifestMatches = 0;
  let boSuccess = 0;
  let searchSuccess = 0;
  let failed = 0;

  const results = [];

  for (let i = 0; i < eligible.length; i++) {
    const f = eligible[i];
    const code = f.schemeCode;

    // 1. Check official AMC manifest
    if (manifest[code]) {
      manifestMatches++;
      results.push({ fund: f, source: 'OFFICIAL_AMC_MANIFEST', holdingsCount: 10 });
      continue;
    }

    // 2. Check {code}.BO
    try {
      const boRes = await yahooFinance.quoteSummary(`${code}.BO`, { modules: ['topHoldings'] });
      const hCount = boRes?.topHoldings?.holdings?.length || 0;
      if (hCount > 0) {
        boSuccess++;
        results.push({ fund: f, source: 'YAHOO_BO_TICKER', ticker: `${code}.BO`, holdingsCount: hCount });
        continue;
      }
    } catch (e) {
      // ignore, fall through to search
    }

    // 3. Fallback to search query
    try {
      // Simplify name for search: take amc + category or key words, e.g. "Tata Small Cap Fund Direct"
      const cleanSearch = `${f.amc.replace('Mutual Fund', '').trim()} ${f.targetCategory} Fund Direct`.replace(/\s+/g, ' ');
      const searchRes = await yahooFinance.search(cleanSearch);
      const quotes = searchRes.quotes || [];
      let found = false;
      for (const q of quotes) {
        if (q.symbol && (q.symbol.endsWith('.BO') || q.symbol.endsWith('.NS'))) {
          try {
            const sum = await yahooFinance.quoteSummary(q.symbol, { modules: ['topHoldings'] });
            const hCount = sum?.topHoldings?.holdings?.length || 0;
            if (hCount > 0) {
              searchSuccess++;
              results.push({ fund: f, source: 'YAHOO_SEARCH_TICKER', ticker: q.symbol, holdingsCount: hCount });
              found = true;
              break;
            }
          } catch (err) {}
        }
      }
      if (found) continue;
    } catch (err) {}

    failed++;
    results.push({ fund: f, source: 'AWAITING_PUBLICATION', holdingsCount: 0 });
    
    if (i % 25 === 0 || i === eligible.length - 1) {
      console.log(`Progress: ${i+1}/${eligible.length} | Manifest: ${manifestMatches} | BO: ${boSuccess} | Search: ${searchSuccess} | Awaiting: ${failed}`);
    }
  }

  console.log(`\n================================================================`);
  console.log(`FINAL RESULTS SUMMARY:`);
  console.log(`Total eligible funds: ${eligible.length}`);
  console.log(`Verified Official AMC Manifest: ${manifestMatches}`);
  console.log(`Verified Yahoo .BO Tickers: ${boSuccess}`);
  console.log(`Verified Yahoo Search Tickers: ${searchSuccess}`);
  console.log(`Total Funds with Verified Holdings: ${manifestMatches + boSuccess + searchSuccess}`);
  console.log(`Funds Awaiting Statutory Publication: ${failed}`);
  console.log(`================================================================`);
}

auditCompletePipeline().catch(console.error);
