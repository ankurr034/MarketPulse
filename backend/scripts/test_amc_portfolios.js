import axios from 'axios';

async function testAmcUrls() {
  const targets = [
    { name: 'HDFC MF', url: 'https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio' },
    { name: 'SBI MF', url: 'https://www.sbimf.com' },
    { name: 'ICICI Pru MF', url: 'https://www.icicipruamc.com/downloads/monthly-portfolio' },
    { name: 'Kotak MF', url: 'https://www.kotakmf.com/statutory-disclosures' },
    { name: 'Axis MF', url: 'https://www.axismf.com/statutory-disclosures' },
    { name: 'UTI MF API', url: 'https://www.utimf.com' },
    { name: 'Tata MF', url: 'https://www.tatamutualfund.com' }
  ];

  for (const t of targets) {
    try {
      const res = await axios.get(t.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 8000
      });
      console.log(`[${t.name}] Status: ${res.status} (Length: ${res.data.length})`);
    } catch (err) {
      console.log(`[${t.name}] Error: ${err.message}`);
    }
  }
}

testAmcUrls();
