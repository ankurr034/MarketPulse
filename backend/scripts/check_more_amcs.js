import axios from 'axios';

async function checkMoreAmcs() {
  const amcs = [
    { name: 'Bandhan', url: 'https://bandhanmutual.com/statutory-disclosures/monthly-portfolio' },
    { name: 'Kotak', url: 'https://www.kotakmf.com/downloads/monthly-portfolio' },
    { name: 'Axis', url: 'https://www.axismf.com/downloads/portfolio-disclosure' },
    { name: 'Edelweiss', url: 'https://www.edelweissmf.com/downloads/factsheets-and-portfolios' },
    { name: 'JM Financial', url: 'https://www.jmfinancialmf.com/Downloads/MonthlyPortfolio.aspx' }
  ];

  for (const a of amcs) {
    try {
      const res = await axios.get(a.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
      });
      console.log(`[${a.name}] Length: ${res.data.length}`);
      const matches = [...res.data.matchAll(/(?:href|src)=[\"']([^\"']+)[\"']/gi)].map(m => m[1]);
      const xlsx = matches.filter(m => m.endsWith('.xlsx') || m.endsWith('.xls'));
      console.log(`[${a.name}] Excel links: ${xlsx.length}`);
      if (xlsx.length > 0) console.log(`[${a.name}] Sample:`, xlsx.slice(0, 3));
    } catch (e) {
      console.log(`[${a.name}] Error: ${e.message}`);
    }
  }
}

checkMoreAmcs();
