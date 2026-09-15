import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

async function mapBarodaSchemes() {
  const amfiRaw = fs.readFileSync('backend/data/amfi_active_schemes.json', 'utf8');
  const amfiData = JSON.parse(amfiRaw);
  const barodaAmfi = (amfiData.schemes || []).filter(s => 
    s.amc && s.amc.toLowerCase().includes('baroda') &&
    s.plan === 'Direct' &&
    s.option === 'Growth'
  );
  console.log(`Baroda BNP Direct Growth schemes in AMFI: ${barodaAmfi.length}`);

  const filePath = path.resolve('backend/data/amc_disclosures/BOBBNPMF_Monthly_Portfolio_31-08-2026.xls');
  const wb = xlsx.readFile(filePath);
  const indexSheet = wb.Sheets['Index'];
  const rows = xlsx.utils.sheet_to_json(indexSheet, { header: 1 });

  const simplify = (str) => str.toLowerCase()
    .replace(/baroda/g, '')
    .replace(/bnp/g, '')
    .replace(/paribas/g, '')
    .replace(/fund/g, '')
    .replace(/direct/g, '')
    .replace(/growth/g, '')
    .replace(/plan/g, '')
    .replace(/option/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const matched = [];
  // rows start from 1
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1] || !r[2]) continue;
    const sheetCode = String(r[1]).trim();
    const schemeName = String(r[2]).trim();
    const cleanKey = simplify(schemeName);

    const match = barodaAmfi.find(s => {
      const sKey = simplify(s.schemeName);
      return (cleanKey.length > 4 && sKey.includes(cleanKey)) || (sKey.length > 4 && cleanKey.includes(sKey));
    });

    matched.push({
      sheetCode,
      schemeName,
      matchedScheme: match ? {
        schemeCode: match.schemeCode,
        schemeName: match.schemeName,
        category: match.category,
        amc: match.amc,
        isin: match.isinGrowth || match.isin
      } : null
    });
  }

  console.log(`Total Baroda sheets: ${rows.length - 1}`);
  const matchedCount = matched.filter(m => m.matchedScheme !== null);
  console.log(`Matched to AMFI Direct Growth: ${matchedCount.length}`);
  matchedCount.forEach(m => console.log(` - [${m.matchedScheme.schemeCode}] Sheet: ${m.sheetCode} -> ${m.matchedScheme.schemeName}`));
}

mapBarodaSchemes().catch(e => console.error(e));
