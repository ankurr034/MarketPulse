import axios from 'axios';

const amcTestList = [
  // HDFC
  'https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio',
  // ICICI Prudential
  'https://www.icicipruamc.com/downloads/monthly-portfolio',
  // SBI
  'https://www.sbimf.com/en-us/portfolio-disclosures',
  // Kotak
  'https://www.kotakmf.com/downloads/monthly-portfolio',
  // Nippon
  'https://www.nipponindiamf.com/statutory-disclosures/monthly-portfolio',
  // Axis
  'https://www.axismf.com/downloads/portfolio-disclosure',
  // UTI
  'https://www.utimf.com/downloads/statutory-disclosures/monthly-portfolio',
  // Mirae
  'https://www.miraeassetmf.co.in/downloads/statutory-disclosures/portfolios',
  // DSP
  'https://www.dspim.com/mandatory-disclosures/portfolio-disclosures',
  // Bandhan
  'https://bandhanmutual.com/statutory-disclosures/monthly-portfolio',
  // Motilal Oswal
  'https://www.motilaloswalmf.com/downloads/scheme-portfolio-details',
  // Tata
  'https://www.tatamutualfund.com/downloads/portfolio-disclosures',
  // WhiteOak
  'https://whiteoakkapitalmf.com/downloads/statutory-disclosures/monthly-portfolio',
  // Groww
  'https://growwmf.in/statutory-disclosures',
  // Zerodha
  'https://zerodhafundhouse.com/statutory-disclosures',
  // Navi
  'https://navi.com/mutual-fund/statutory-disclosures',
  // Quant
  'https://quantmutual.com/statutory-disclosures',
  // JM Financial
  'https://www.jmfinancialmf.com/Downloads/MonthlyPortfolio.aspx',
  // Taurus
  'https://www.taurusmutualfund.com/statutory-disclosure.php',
  // Edelweiss
  'https://www.edelweissmf.com/downloads/factsheets-and-portfolios'
];

async function run() {
  for (const url of amcTestList) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 7000
      });
      console.log(`[OK ${res.status}] ${url}`);
      // find xlsx
      const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
      if (matches.length > 0) {
        console.log(`  --> Found ${matches.length} xlsx/xls:`, matches[0]);
      }
    } catch (err) {
      console.log(`[ERR ${err.response ? err.response.status : err.code}] ${url}`);
    }
  }
}

run();
