import axios from 'axios';

async function inspectDsp() {
  const url = 'https://www.dspim.com/mandatory-disclosures/portfolio-disclosures';
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const regex = /(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi;
  let m;
  const links = [];
  while ((m = regex.exec(res.data)) !== null) {
    links.push(m[1]);
  }
  console.log(`Total DSP links: ${links.length}`);
  const equityLinks = links.filter(l => !l.toLowerCase().includes('debt'));
  console.log(`Non-debt links (${equityLinks.length}):`);
  equityLinks.slice(0, 20).forEach(l => console.log(' -', l));
}

inspectDsp();
