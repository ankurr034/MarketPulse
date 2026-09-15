import axios from 'axios';

async function parseLinks() {
  try {
    const res = await axios.get('https://www.sbimf.com/en-us/portfolios', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    const html = res.data;
    // Find all links ending with xls or xlsx
    const matches = html.match(/https?:\/\/[^"'\s]+\.(?:xlsx|xls|csv)/gi) || [];
    const relMatches = html.match(/href="([^"']+\.(?:xlsx|xls|csv))"/gi) || [];
    console.log('SBI Absolute Excel links:', matches.slice(0, 10));
    console.log('SBI Relative Excel links:', relMatches.slice(0, 10));
  } catch (e) {
    console.log('SBI err:', e.message);
  }

  try {
    const res2 = await axios.get('https://www.miraeassetmf.co.in/downloads/portfolio', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    const html2 = res2.data;
    const matches2 = html2.match(/https?:\/\/[^"'\s]+\.(?:xlsx|xls|csv)/gi) || [];
    const relMatches2 = html2.match(/href="([^"']+\.(?:xlsx|xls|csv))"/gi) || [];
    console.log('Mirae Absolute Excel links:', matches2.slice(0, 10));
    console.log('Mirae Relative Excel links:', relMatches2.slice(0, 10));
  } catch (e) {
    console.log('Mirae err:', e.message);
  }
}

parseLinks();
