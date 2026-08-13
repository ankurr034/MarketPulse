import axios from 'axios';

async function verifyApiResponseWiring() {
  console.log("==========================================================================");
  console.log("        VERIFYING API RESPONSE WIRING FOR ALL DIRECT SCHEMES              ");
  console.log("==========================================================================\n");

  const startTime = Date.now();
  const res = await axios.get('http://localhost:5001/api/indian-mf/all-direct-schemes');
  const schemes = res.data;

  console.log(`Fetched ${schemes.length} schemes from /api/indian-mf/all-direct-schemes in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  // Sample equity schemes from Mid Cap, Flexi Cap, Small Cap, Large Cap, etc.
  const sampleCodes = ['118955', '119775', '118668', '119716', '120586', '120828', '118777', '120823', '119605', '120595'];

  console.log("\nSpot-checking returns map & timeframe properties on returned scheme objects:\n");

  sampleCodes.forEach(code => {
    const found = schemes.find(s => String(s.schemeCode || s.id) === code);
    if (!found) {
      console.error(`❌ Code ${code} NOT FOUND in response!`);
    } else {
      console.log(`Code ${code} [${found.name.substring(0, 35).padEnd(35)}]:`);
      console.log(`   1W: ${found.returns?.['1W']}% | 1M: ${found.returns?.['1M']}% | 3M: ${found.returns?.['3M']}% | 6M: ${found.returns?.['6M']}%`);
      console.log(`   1Y: ${found.returns?.['1Y']}% | 3Y: ${found.returns?.['3Y']}% | 5Y: ${found.returns?.['5Y']}% | Incep: ${found.returns?.['All']}%`);
      console.log(`   Sharpe: ${found.sharpeRatio} | Sortino: ${found.sortinoRatio} | AUM: ${found.aum ? '₹' + found.aum + ' Cr' : '—'}`);
      console.log('');
    }
  });
}

verifyApiResponseWiring().catch(console.error);
