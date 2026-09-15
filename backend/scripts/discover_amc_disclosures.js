import axios from 'axios';

async function testPages() {
  const targets = [
    { name: 'Motilal Oswal', url: 'https://www.motilaloswalmf.com/download/month-end-portfolio' },
    { name: 'Bandhan MF', url: 'https://bandhanmutual.com/statutory-disclosures/monthly-portfolio' },
    { name: 'Nippon India MF', url: 'https://www.nipponindiamf.com/investor-service/downloads/factsheets-portfolio-disclosures' },
    { name: 'DSP MF', url: 'https://www.dspim.com/mandatory-disclosures/portfolio-disclosures' },
    { name: 'Mirae Asset', url: 'https://www.miraeassetmf.co.in/downloads/portfolios' },
    { name: 'UTI MF', url: 'https://www.utimf.com/downloads/portfolio-disclosures' },
    { name: 'PPFAS', url: 'https://amc.ppfas.com/downloads/portfolio-disclosure/' }
  ];

  for (const t of targets) {
    try {
      const res = await axios.get(t.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000
      });
      console.log(`[${t.name}] Status: ${res.status}`);
      const regex = /(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi;
      let m;
      const found = [];
      while ((m = regex.exec(res.data)) !== null) {
        found.push(m[1]);
      }
      console.log(`[${t.name}] Found ${found.length} direct xlsx/xls links`);
      if (found.length > 0) {
        console.log(` Sample:`, found.slice(0, 3));
      }
    } catch (err) {
      console.log(`[${t.name}] Failed: ${err.message}`);
    }
  }
}

testPages();
