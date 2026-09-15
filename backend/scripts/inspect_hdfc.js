import axios from 'axios';
import fs from 'fs';

async function inspectPages() {
  const hdfc = await axios.get('https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  console.log('HDFC response received');
  fs.writeFileSync('backend/scripts/hdfc_sample.html', hdfc.data);

  // Search for links with xlsx, xls, pdf, or api
  const matches = [...hdfc.data.matchAll(/href=[\"']([^\"']+)[\"']/gi)].map(m => m[1]);
  console.log('HDFC total links:', matches.length);
  const relevant = matches.filter(l => l.includes('.xls') || l.includes('portfolio') || l.includes('download'));
  console.log('HDFC relevant links:', relevant.slice(0, 15));
}

inspectPages().catch(e => console.error(e));
