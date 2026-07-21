import axios from 'axios';

async function testFinAPI() {
  const schemes = [
    'ICICI Prudential Technology Fund',
    'Tata Digital India Fund',
    'SBI Banking & Financial Services Fund'
  ];

  for (const scheme of schemes) {
    console.log(`\n--- Testing Scheme: ${scheme} ---`);
    try {
      console.log(`Searching FinAPI for schemeCode...`);
      const searchRes = await axios.get("https://finapi.upvaly.com/api/mf/search", {
        params: { schemeName: scheme },
        timeout: 15000
      });
      const results = searchRes.data?.data || [];
      if (results.length === 0) {
        console.log(`No results found for ${scheme}.`);
        continue;
      }
      
      const finapiCode = results[0].schemeCode;
      console.log(`Found finapiCode: ${finapiCode}`);
      
      console.log(`Fetching details for finapiCode: ${finapiCode}...`);
      const detailRes = await axios.get(`https://finapi.upvaly.com/api/mf/scheme-code/${finapiCode}`, {
        params: { fields: "holdings,sectors,nav" },
        timeout: 15000
      });
      
      const finapiData = detailRes.data?.data || {};
      
      const holdings = finapiData.holdings || [];
      const sectors = finapiData.sectors || [];
      const nav = finapiData.nav || null;
      const allKeys = Object.keys(finapiData);
      
      console.log(`Holdings count: ${holdings.length}`);
      if (holdings.length > 0) {
        console.log(`Sample holding:`, holdings[0]);
      }
      
      console.log(`Sectors count: ${sectors.length}`);
      if (sectors.length > 0) {
        console.log(`Sample sector:`, sectors[0]);
      }
      
      console.log(`Available keys:`, allKeys);
      console.log(`NAV field:`, nav ? 'Exists (maybe array/object)' : 'Does not exist');
      if (nav) {
        console.log(`Sample NAV item:`, Array.isArray(nav) ? nav[0] : nav);
      }
    } catch (e) {
      console.error(`Error for ${scheme}:`, e.message);
      if (e.response) {
        console.error(`Response status: ${e.response.status}`);
      }
    }
  }
}

async function testMfapi() {
  console.log(`\n--- Testing mfdata.in ---`);
  try {
    const res = await axios.get("https://mfdata.in/api/v1/schemes/120594", { timeout: 4000 });
    console.log("mfdata.in returned:", res.status);
  } catch (e) {
    console.log("mfdata.in error:", e.message);
  }
}

async function run() {
  await testFinAPI();
  await testMfapi();
}

run();
