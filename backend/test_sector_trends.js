// backend/test_sector_trends.js

import sectorTrendsService from './services/SectorTrendsService.js';
import sectorIndexMap from './config/sectorIndexMap.js';

async function runTests() {
  console.log('--- STARTING SECTOR TRENDS TESTS ---');
  
  // 1. Smoke test Nifty tickers
  console.log('\n[TEST 1] Smoke testing sector index tickers resolution...');
  for (const [sector, ticker] of Object.entries(sectorIndexMap)) {
    try {
      console.log(`Checking ${sector} (ticker: ${ticker})...`);
      const trends = await sectorTrendsService.getSectorTrends(sector, '1y');
      if (trends.indexAvailable && trends.indexHistory.length > 0) {
        console.log(`✅ ${sector} index resolved. Data points: ${trends.indexHistory.length}`);
      } else {
        console.warn(`❌ ${sector} index failed to resolve or has no history.`);
      }
    } catch (err) {
      console.error(`❌ Error resolving ${sector}:`, err.message);
    }
  }

  // 2. Verify compareSectors logic
  console.log('\n[TEST 2] Verifying compareSectors base-100 indexing...');
  try {
    const compareResults = await sectorTrendsService.compareSectors(['Technology', 'Financials'], '1y');
    
    if (compareResults.length !== 2) {
      throw new Error(`Expected 2 results, got ${compareResults.length}`);
    }

    for (const res of compareResults) {
      console.log(`Sector: ${res.sector}, Index History length: ${res.indexHistory.length}`);
      if (res.indexHistory.length > 0) {
        const firstVal = res.indexHistory[0].value;
        if (firstVal !== 100) {
          throw new Error(`Expected first base-100 value to be 100, got ${firstVal}`);
        }
        console.log(`✅ Base-100 check passed for ${res.sector}. First point is 100.`);
      }
    }
  } catch (err) {
    console.error('❌ compareSectors test failed:', err.message);
  }

  console.log('\n--- TESTS COMPLETE ---');
}

runTests();
