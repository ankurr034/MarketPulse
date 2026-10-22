import http from 'http';

async function testSearch(q) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5001/api/sectors/search?q=' + encodeURIComponent(q), (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const queries = [
    'Parag Parikh',
    'Active Momentum',
    'Balanced Advantage',
    'Defence',
    'Energy',
    'Flexi Cap',
    'Reliance',
    'Suzlon',
    'Bank'
  ];

  console.log('=== SEARCH API VERIFICATION ===\n');

  for (const q of queries) {
    const res = await testSearch(q);
    console.log(`Query: "${q}"`);
    console.log(`  Subcategories: ${res.subcategories ? res.subcategories.length : 0}`);
    if (res.subcategories && res.subcategories.length > 0) {
      console.log(`    -> Example: ${res.subcategories[0].name} (${res.subcategories[0].parentCategory})`);
    }
    console.log(`  Funds: ${res.funds ? res.funds.length : 0}`);
    if (res.funds && res.funds.length > 0) {
      console.log(`    -> Example: ${res.funds[0].name} (₹${res.funds[0].nav})`);
    }
    console.log(`  Stocks: ${res.stocks ? res.stocks.length : 0}`);
    if (res.stocks && res.stocks.length > 0) {
      console.log(`    -> Example: ${res.stocks[0].symbol} - ${res.stocks[0].name}`);
    }
    console.log(`  Sectors: ${res.sectors ? res.sectors.length : 0}`);
    if (res.sectors && res.sectors.length > 0) {
      console.log(`    -> Example: ${res.sectors[0].name}`);
    }
    console.log('');
  }
}

run().catch(console.error);
