import xlsx from 'xlsx';
import path from 'path';

function findHeaderIndices(rows) {
  for (let rIdx = 0; rIdx < Math.min(rows.length, 12); rIdx++) {
    const row = rows[rIdx];
    if (!row || row.length === 0) continue;

    let isinIdx = -1;
    let nameIdx = -1;
    let indIdx = -1;
    let qtyIdx = -1;
    let valIdx = -1;
    let wtIdx = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (!cell) continue;

      if (cell === 'isin' || cell.includes('isin')) {
        isinIdx = c;
      } else if (cell.includes('name of') || cell.includes('instrument') || cell.includes('company')) {
        nameIdx = c;
      } else if (cell.includes('industry') || cell.includes('rating')) {
        indIdx = c;
      } else if (cell === 'quantity' || cell.includes('quantity')) {
        qtyIdx = c;
      } else if (cell.includes('market') || cell.includes('fair value') || cell.includes('value (rs')) {
        valIdx = c;
      } else if (cell.includes('% to nav') || cell.includes('% to net') || cell.includes('weight')) {
        wtIdx = c;
      }
    }

    if (nameIdx !== -1 && (isinIdx !== -1 || wtIdx !== -1)) {
      return { headerRowIdx: rIdx, isinIdx, nameIdx, indIdx, qtyIdx, valIdx, wtIdx };
    }
  }
  return null;
}

function testHeaderDetection() {
  // 1. PPFAS
  const ppfasPath = 'backend/data/amc_disclosures/122639_PPFCF.xlsx';
  const wbP = xlsx.readFile(ppfasPath);
  const rowsP = xlsx.utils.sheet_to_json(wbP.Sheets[wbP.SheetNames[0]], { header: 1 });
  console.log('PPFAS columns:', findHeaderIndices(rowsP));

  // 2. HDFC
  const hdfcPath = 'backend/data/amc_disclosures/hdfc/Monthly_HDFC_Flexi_Cap_Fund_-_31_August_2026.xlsx';
  const wbH = xlsx.readFile(hdfcPath);
  const rowsH = xlsx.utils.sheet_to_json(wbH.Sheets[wbH.SheetNames[0]], { header: 1 });
  console.log('HDFC columns:', findHeaderIndices(rowsH));

  // 3. Baroda BNP
  const barodaPath = 'backend/data/amc_disclosures/BOBBNPMF_Monthly_Portfolio_31-08-2026.xls';
  const wbB = xlsx.readFile(barodaPath);
  const rowsB = xlsx.utils.sheet_to_json(wbB.Sheets['T0ME04'], { header: 1 });
  console.log('Baroda BNP columns:', findHeaderIndices(rowsB));
}

testHeaderDetection();
