import axios from 'axios';

const BASE = 'http://localhost:5001/api';

async function testSectorIntegrity() {
  console.log('================================================================');
  console.log('🔍 STARTING COMPREHENSIVE SECTOR DATA INTEGRITY AUDIT');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  // 1. Audit Market Indices
  console.log('\n--- 1. Testing /api/market/indices ---');
  try {
    const res = await axios.get(`${BASE}/market/indices`);
    const indices = res.data;
    const requiredIndices = ['NIFTY 50', 'SENSEX', 'BANK NIFTY', 'NIFTY 100', 'NIFTY NEXT 50', 'NIFTY 500'];
    
    for (const key of requiredIndices) {
      const idx = indices[key];
      if (idx && typeof idx.value === 'number' && typeof idx.price === 'number' && typeof idx.changePercent === 'number') {
        console.log(`  ✅ Index ${key}: Value=${idx.value} | Price=${idx.price} | 1D%=${idx.changePercent}% | PrevClose=${idx.previousClose}`);
        passed++;
      } else {
        console.error(`  ❌ Index ${key} missing or malformed:`, idx);
        failed++;
      }
    }
  } catch (e) {
    console.error('  ❌ /api/market/indices error:', e.message);
    failed++;
  }

  // 2. Audit All Indian Sectors
  console.log('\n--- 2. Testing /api/sectors?region=india&timeframe=1D ---');
  try {
    const res = await axios.get(`${BASE}/sectors?region=india&timeframe=1D`);
    const sectors = res.data;
    console.log(`  Received ${sectors.length} Indian sectors.`);
    
    if (sectors.length >= 13) {
      passed++;
      console.log('  ✅ Found all 13+ Indian sectors');
    } else {
      console.error(`  ❌ Expected at least 13 Indian sectors, got ${sectors.length}`);
      failed++;
    }

    for (const sec of sectors) {
      const { id, name, changePercent, advances, declines, validStocks, totalStocks, fiftyTwoWeekHigh, fiftyTwoWeekLow, indexPrice } = sec;
      const constituentSum = advances + declines;
      
      console.log(`  • [${id}] ${name} | Change%: ${changePercent?.toFixed(2)}% | Advances: ${advances} | Declines: ${declines} | Valid: ${validStocks}/${totalStocks} | 52W High: ${fiftyTwoWeekHigh} | 52W Low: ${fiftyTwoWeekLow} | IndexPrice: ${indexPrice}`);
      
      // Verify no NaN or undefined
      if (typeof changePercent === 'number' && !isNaN(changePercent) && typeof advances === 'number' && typeof declines === 'number') {
        passed++;
      } else {
        console.error(`    ❌ Invalid numbers in sector ${id}`);
        failed++;
      }
    }
  } catch (e) {
    console.error('  ❌ /api/sectors error:', e.message);
    failed++;
  }

  // 3. Audit Sector Detail (Nifty Bank & Nifty IT)
  console.log('\n--- 3. Testing /api/sectors/:sectorId detail view ---');
  for (const sectorId of ['nifty-bank', 'nifty-it', 'nifty-energy']) {
    try {
      const res = await axios.get(`${BASE}/sectors/${sectorId}?timeframe=1D`);
      const detail = res.data;
      
      console.log(`\n  Sector: ${detail.name} (${detail.id})`);
      console.log(`  Index Symbol: ${detail.indexSymbol} | Sector Change%: ${detail.changePercent}% | Trend: ${detail.trend}`);
      console.log(`  Constituents count: ${detail.stocks?.length} | Gainers count: ${detail.gainers?.length} | Losers count: ${detail.losers?.length}`);
      
      if (detail.gainers && detail.gainers.length > 0) {
        console.log(`  Top Gainer: ${detail.gainers[0].symbol} (+${detail.gainers[0].changePercent}%) | LTP: ₹${detail.gainers[0].ltp}`);
      }
      if (detail.losers && detail.losers.length > 0) {
        console.log(`  Top Loser: ${detail.losers[0].symbol} (${detail.losers[0].changePercent}%) | LTP: ₹${detail.losers[0].ltp}`);
      }

      // Check key individual constituents
      const relStock = detail.stocks.find(s => s.symbol === 'RELIANCE.NS' || s.symbol === 'HDFCBANK.NS' || s.symbol === 'TCS.NS');
      if (relStock) {
        console.log(`  Sample Stock [${relStock.symbol}]: LTP=₹${relStock.ltp} | PrevClose=₹${relStock.previousClose} | 1D%=${relStock.changePercent}% | 52W High=₹${relStock.high52} | 52W Low=₹${relStock.low52}`);
      }

      if (detail.stocks && detail.stocks.length > 0 && typeof detail.changePercent === 'number') {
        passed++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error(`  ❌ /api/sectors/${sectorId} error:`, e.message);
      failed++;
    }
  }

  // 4. Audit Top Movers
  console.log('\n--- 4. Testing /api/sectors/top-movers ---');
  try {
    const res = await axios.get(`${BASE}/sectors/top-movers?count=5`);
    const { gainers, losers } = res.data;
    
    console.log(`  Top 5 Gainers:`);
    gainers.forEach((g, idx) => {
      console.log(`    ${idx + 1}. ${g.symbol} | LTP: ₹${g.ltp} | 1D%: +${g.changePercent}%`);
    });

    console.log(`  Top 5 Losers:`);
    losers.forEach((l, idx) => {
      console.log(`    ${idx + 1}. ${l.symbol} | LTP: ₹${l.ltp} | 1D%: ${l.changePercent}%`);
    });

    if (gainers.length > 0 && losers.length > 0) {
      passed++;
    } else {
      failed++;
    }
  } catch (e) {
    console.error('  ❌ /api/sectors/top-movers error:', e.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`AUDIT COMPLETE | PASSED CHECKS: ${passed} | FAILED CHECKS: ${failed}`);
  console.log('================================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

testSectorIntegrity();
