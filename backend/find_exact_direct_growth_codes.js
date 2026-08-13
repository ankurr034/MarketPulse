import axios from 'axios';

const targets = [
  "Nippon India Banking & Financial Services Fund Direct Growth",
  "Nippon India Pharma Fund Direct Growth",
  "Nippon India Power & Infra Fund Direct Growth",
  "Nippon India Small Cap Fund Direct Growth",
  "Motilal Oswal Nifty 200 Momentum 30 Index Fund Direct Growth",
  "ICICI Prudential Gilt Fund Direct Growth",
  "Kotak Banking & PSU Debt Fund Direct Growth"
];

async function findCodes() {
  for (const t of targets) {
    try {
      const res = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(t)}`);
      console.log(`\n======================================================`);
      console.log(`Search results for: "${t}"`);
      if (res.data && Array.isArray(res.data)) {
        res.data.slice(0, 8).forEach(item => {
          const name = item.schemeName;
          const lower = name.toLowerCase();
          const isDirect = lower.includes('direct');
          const isGrowth = lower.includes('growth');
          const isForbidden = lower.includes('idcw') || lower.includes('dividend') || lower.includes('bonus') || lower.includes('regular');
          
          const match = isDirect && isGrowth && !isForbidden;
          console.log(`  ${match ? '✅ MATCH' : '   '} [${item.schemeCode}] ${name}`);
        });
      }
    } catch (e) {
      console.error(`Error searching for ${t}:`, e.message);
    }
  }
}

findCodes();
