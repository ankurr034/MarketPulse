import axios from 'axios';
import fs from 'fs';
import xlsx from 'xlsx';

async function testDspDownload() {
  const url = 'https://www.dspim.com/media/pages/mandatory-disclosures/portfolio-disclosures/2482bd2343-1788621582/dsp-isin-debt-portfolio-as-on-31-aug-2026.xlsx';
  console.log('Downloading DSP sample...');
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('DSP size:', res.data.length);
  const wb = xlsx.read(res.data, { type: 'buffer' });
  console.log('DSP sheets:', wb.SheetNames.slice(0, 10));
}

testDspDownload().catch(e => console.error(e.message));
