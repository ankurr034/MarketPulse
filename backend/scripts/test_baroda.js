import axios from 'axios';
import fs from 'fs';
import xlsx from 'xlsx';

async function testBaroda() {
  const url = 'https://www.barodabnpparibasmf.in/assets/download_documents/BOBBNPMF_Monthly_Portfolio_31-08-2026_19961.xls';
  console.log('Downloading Baroda BNP sample...');
  const res = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
  console.log('Baroda size:', res.data.length);
  const wb = xlsx.read(res.data, { type: 'buffer' });
  console.log('Baroda sheets count:', wb.SheetNames.length);
  console.log('Baroda sheet names:', wb.SheetNames.slice(0, 15));
  const sheet0 = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet0, { header: 1 });
  console.log('First sheet rows:', rows.length);
  rows.slice(0, 12).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r)));
}

testBaroda().catch(e => console.error(e.message));
