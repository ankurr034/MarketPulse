import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

function testParser(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const schemes = Object.values(manifest.schemes);

  console.log(`Loaded ${schemes.length} schemes in manifest.`);

  // Test 1 from each AMC
  const amcs = ['PPFAS Mutual Fund', 'HDFC Mutual Fund', 'Baroda BNP Paribas Mutual Fund'];
  for (const amc of amcs) {
    const s = schemes.find(x => x.amc === amc);
    if (!s) {
      console.warn(`No scheme found for AMC ${amc}`);
      continue;
    }

    const fullPath = path.resolve('backend/data/amc_disclosures', s.fileName);
    console.log(`\n--- Testing AMC: ${amc} ---`);
    console.log(`Scheme: [${s.schemeCode}] ${s.schemeName}`);
    console.log(`File: ${fullPath}, Sheet: ${s.sheetName || 'default'}`);

    const wb = xlsx.readFile(fullPath);
    const sheetName = s.sheetName && wb.Sheets[s.sheetName] ? s.sheetName : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Dynamic header finder
    let headerRowIdx = -1, isinIdx = -1, nameIdx = -1, indIdx = -1, qtyIdx = -1, valIdx = -1, wtIdx = -1;
    for (let rIdx = 0; rIdx < Math.min(rows.length, 12); rIdx++) {
      const row = rows[rIdx];
      if (!row || row.length === 0) continue;

      let foundIsin = -1, foundName = -1, foundInd = -1, foundQty = -1, foundVal = -1, foundWt = -1;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim().toLowerCase();
        if (!cell) continue;

        if (cell === 'isin' || cell.startsWith('isin')) foundIsin = c;
        else if ((cell.includes('name of') || cell.includes('instrument') || cell.includes('company')) && !cell.includes('rating')) foundName = c;
        else if (cell.includes('industry') || cell.includes('rating') || cell.includes('sector')) foundInd = c;
        else if (cell === 'quantity' || cell.startsWith('quantity') || cell.startsWith('qty')) foundQty = c;
        else if (cell.includes('market') || cell.includes('fair value') || cell.includes('value (rs') || cell.includes('market/fair value')) foundVal = c;
        else if (cell === '% to nav' || cell === '% to net assets' || cell.startsWith('% to nav') || cell.startsWith('% to net') || cell.includes('weight')) {
          if (!cell.includes('derivative') && !cell.includes('unhedged')) foundWt = c;
        }
      }

      if (foundName !== -1 && (foundIsin !== -1 || foundWt !== -1)) {
        headerRowIdx = rIdx;
        isinIdx = foundIsin;
        nameIdx = foundName;
        indIdx = foundInd;
        qtyIdx = foundQty;
        valIdx = foundVal;
        wtIdx = foundWt;
        break;
      }
    }

    console.log('Cols:', { headerRowIdx, isinIdx, nameIdx, indIdx, qtyIdx, valIdx, wtIdx });

    // Parse positions
    const positions = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const rawName = String(r[nameIdx] || '').trim();
      if (!rawName) continue;

      const upper = rawName.toUpperCase();
      if (upper === 'GRAND TOTAL' || upper === 'TOTAL NET ASSETS' || upper === 'SUB TOTAL' || upper === 'TOTAL' || rawName.startsWith('(a) Listed') || rawName.startsWith('(b) Listed') || rawName.startsWith('(c) Unlisted')) continue;

      const rawIsin = isinIdx !== -1 && r[isinIdx] ? String(r[isinIdx]).trim().toUpperCase() : null;
      const cleanIsin = (rawIsin && /^[A-Z0-9]{12}$/.test(rawIsin)) ? rawIsin : null;

      const rawVal = valIdx !== -1 ? r[valIdx] : null;
      const valLakhs = typeof rawVal === 'number' ? rawVal : (typeof rawVal === 'string' ? parseFloat(rawVal.replace(/,/g, '')) : null);

      const rawWt = wtIdx !== -1 ? r[wtIdx] : null;
      let weight = typeof rawWt === 'number' ? rawWt : (typeof rawWt === 'string' ? parseFloat(rawWt.replace(/,/g, '')) : null);

      if (valLakhs === null || isNaN(valLakhs) || weight === null || isNaN(weight)) continue;

      const weightPercent = (Math.abs(weight) <= 1.0 && weight !== 0) 
        ? Number((weight * 100).toFixed(4)) 
        : Number(weight.toFixed(4));
      
      const cleanName = rawName.replace(/[\*£#\^~]/g, '').trim();

      positions.push({
        name: cleanName,
        isin: cleanIsin,
        industry: indIdx !== -1 ? String(r[indIdx] || '').replace(/##/g, '').trim() : '',
        quantity: qtyIdx !== -1 && typeof r[qtyIdx] === 'number' ? r[qtyIdx] : null,
        valueCr: Number((valLakhs / 100).toFixed(2)),
        weightPercent
      });
    }

    console.log(`Parsed ${positions.length} positions.`);
    console.log('Top 3 positions:', positions.slice(0, 3));
    const hdfcBankPos = positions.find(p => p.isin === 'INE040A01034' || p.name.toLowerCase().includes('hdfc bank'));
    console.log('HDFC Bank position:', hdfcBankPos);
  }
}

testParser('backend/data/amc_disclosures/manifest.json');
