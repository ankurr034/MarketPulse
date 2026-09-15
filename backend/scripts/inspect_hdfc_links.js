import axios from 'axios';

async function inspectHdfcLinks() {
  const res = await axios.get('https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
  const unique = [...new Set(matches)];
  console.log(`HDFC Unique Excel links count: ${unique.length}`);
  unique.forEach((u, i) => console.log(`${i+1}: ${u}`));
}

inspectHdfcLinks();
