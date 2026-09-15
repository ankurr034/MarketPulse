import axios from 'axios';

async function testUrls() {
  const urls = [
    // SBI MF Portfolios
    'https://www.sbimf.com/en-us/portfolios',
    // Nippon India MF
    'https://mf.nipponindiaim.com/investor-services/downloads/portfolio-disclosures',
    // Mirae Asset
    'https://www.miraeassetmf.co.in/downloads/portfolio',
    // Kotak MF
    'https://www.kotakmf.com/downloads/portfolio-disclosures',
    // Bandhan / IDFC
    'https://bandhanmutual.com/downloads/portfolio-disclosure'
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 8000 
      });
      console.log(`[${res.status}] ${url} (length: ${res.data.length})`);
    } catch (e) {
      console.log(`[ERR ${e.response?.status || e.code}] ${url} - ${e.message}`);
    }
  }
}

testUrls();
