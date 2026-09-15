import axios from 'axios';

async function checkDspAll() {
  const url = 'https://www.dspim.com/mandatory-disclosures/portfolio-disclosures';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
  console.log(`Total DSP links: ${matches.length}`);
  // print links containing 'equity', 'flexi', 'top', 'mid', 'small', 'index', 'nifty', 'portfolio'
  const interesting = matches.filter(m => {
    const l = m.toLowerCase();
    return l.includes('equity') || l.includes('flexi') || l.includes('small') || l.includes('mid') || l.includes('portfolio') || l.includes('fund');
  });
  console.log(`Interesting links (${interesting.length}):`);
  interesting.slice(0, 30).forEach(l => console.log('  -', l));
}

checkDspAll().catch(e => console.error(e));
