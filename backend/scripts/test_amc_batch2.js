import axios from 'axios';

async function testMore() {
  const list = [
    { name: 'Capitalmind', url: 'https://capitalmindmf.com/downloads/' },
    { name: 'JM Financial', url: 'https://www.jmfinancialmf.com/Downloads/MonthlyPortfolio.aspx' },
    { name: 'Baroda BNP', url: 'https://www.barodabnpparibasmf.in/downloads/monthly-portfolio-scheme' },
    { name: 'Quantum', url: 'https://www.quantumamc.com/statutory-disclosures' }
  ];

  for (const item of list) {
    try {
      const res = await axios.get(item.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
      });
      console.log(`[${item.name}] Status: ${res.status}`);
      const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
      console.log(`[${item.name}] Excel matches: ${matches.length}`);
      if (matches.length > 0) {
        console.log(`  Sample:`, matches.slice(0, 3));
      }
    } catch (e) {
      console.log(`[${item.name}] Error: ${e.message}`);
    }
  }
}

testMore();
