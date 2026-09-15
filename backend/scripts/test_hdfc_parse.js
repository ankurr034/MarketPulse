import axios from 'axios';
import fs from 'fs';
import xlsx from 'xlsx';

async function testDownloadHdfc() {
  const url = 'https://files.hdfcfund.com/s3fs-public/2026-09/Monthly%20HDFC%20Flexi%20Cap%20Fund%20-%2031%20August%202026.xlsx';
  console.log('Downloading HDFC Flexi Cap disclosure...');
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Downloaded size:', res.data.length, 'bytes');
  fs.writeFileSync('backend/scripts/sample_hdfc_flexi.xlsx', Buffer.from(res.data));

  const wb = xlsx.read(res.data, { type: 'buffer' });
  console.log('Sheet names:', wb.SheetNames);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Total rows:', rows.length);
  console.log('First 15 rows:');
  rows.slice(0, 15).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r)));
}

testDownloadHdfc().catch(e => console.error(e.message));
