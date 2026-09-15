import axios from 'axios';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

async function downloadAndInspectBaroda() {
  const url = 'https://www.barodabnpparibasmf.in/assets/download_documents/BOBBNPMF_Monthly_Portfolio_31-08-2026_19961.xls';
  const targetPath = path.resolve('backend/data/amc_disclosures/BOBBNPMF_Monthly_Portfolio_31-08-2026.xls');

  if (!fs.existsSync(targetPath)) {
    console.log('Downloading Baroda BNP workbook...');
    const res = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 });
    fs.writeFileSync(targetPath, Buffer.from(res.data));
    console.log(`Saved Baroda BNP workbook (${res.data.length} bytes) to ${targetPath}`);
  } else {
    console.log(`Baroda BNP workbook already exists at ${targetPath}`);
  }

  const wb = xlsx.readFile(targetPath);
  const sheet = wb.Sheets['T0ME04']; // Large Cap Fund
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Large Cap Fund rows count:', rows.length);
  console.log('First 15 rows:');
  rows.slice(0, 15).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r)));
}

downloadAndInspectBaroda().catch(e => console.error(e));
