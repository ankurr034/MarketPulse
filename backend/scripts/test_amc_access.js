import axios from 'axios';

async function testAmcAccess() {
  const amcs = [
    { name: 'Quantum MF', url: 'https://www.quantumamc.com/downloads/portfolio-disclosure' },
    { name: 'Navi MF', url: 'https://navi.com/mutual-fund/downloads' },
    { name: 'Motilal Oswal', url: 'https://www.motilaloswalmf.com/download/portfolio' },
    { name: 'WhiteOak', url: 'https://whiteoakamc.com/downloads/' },
    { name: 'Samco MF', url: 'https://www.samcomf.com/statutory-disclosure' },
    { name: 'Helios MF', url: 'https://www.heliosmf.in/downloads/' },
    { name: 'JM Financial', url: 'https://www.jmfinancialmf.com/Downloads/MonthlyPortfolio.aspx' },
    { name: 'Taurus MF', url: 'https://www.taurusmutualfund.com/monthly-portfolio' },
    { name: 'ITI MF', url: 'https://www.itiamc.com/downloads/statutory-disclosure' },
    { name: 'Edelweiss MF', url: 'https://www.edelweissmf.com/statutory-reports' },
    { name: 'Canara Robeco', url: 'https://www.canararobeco.com/statutory-disclosures' },
    { name: 'Union MF', url: 'https://www.unionmf.com/downloads/monthly-portfolio' }
  ];

  for (const a of amcs) {
    try {
      const res = await axios.get(a.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 8000
      });
      console.log(`✅ [${res.status}] ${a.name}: ${a.url} (size: ${res.data.length})`);
    } catch (e) {
      console.log(`❌ [${e.response?.status || e.code}] ${a.name}: ${e.message}`);
    }
  }
}

testAmcAccess();
