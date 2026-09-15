import axios from 'axios';
import fs from 'fs';

async function testMO() {
  try {
    const res = await axios.get('https://www.motilaloswalmf.com/downloads/scheme-portfolio-details', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    console.log('MO status:', res.status, 'len:', res.data.length);
    fs.writeFileSync('backend/scripts/mo_sample.html', res.data);
    const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls|pdf))/gi)].map(m => m[1]);
    console.log('MO files count:', matches.length);
    if (matches.length > 0) console.log(matches.slice(0, 10));
  } catch(e) {
    console.log('MO err:', e.message);
  }
}

testMO();
