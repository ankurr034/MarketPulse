import axios from 'axios';

async function checkMirae() {
  const url = 'https://www.miraeassetmf.co.in/downloads/portfolios';
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
    console.log(`Mirae excel matches: ${matches.length}`);
    if (matches.length > 0) {
      console.log(matches.slice(0, 5));
    }
  } catch (e) {
    console.log('Mirae err:', e.message);
  }
}

checkMirae();
