import xlsx from 'xlsx';

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

      if (cell === 'isin' || cell.startsWith('isin')) {
        isinIdx = c;
      } else if ((cell.includes('name of') || cell.includes('instrument') || cell.includes('company')) && !cell.includes('rating')) {
        nameIdx = c;
      } else if (cell.includes('industry') || cell.includes('rating') || cell.includes('sector')) {
        indIdx = c;
      } else if (cell === 'quantity' || cell.startsWith('quantity') || cell.startsWith('qty')) {
        qtyIdx = c;
      } else if (cell.includes('market') || cell.includes('fair value') || cell.includes('value (rs') || cell.includes('market/fair value')) {
        valIdx = c;
      } else if (cell === '% to nav' || cell === '% to net assets' || cell.startsWith('% to nav') || cell.startsWith('% to net')) {
        if (!cell.includes('derivative') && !cell.includes('unhedged')) {
          wtIdx = c;
        }
      }
    }

    if (nameIdx !== -1 && (isinIdx !== -1 || wtIdx !== -1)) {
      return { headerRowIdx: rIdx, isinIdx, nameIdx, indIdx, qtyIdx, valIdx, wtIdx };
    }
  }
  return null;
}

function test() {
  const hdfcPath = 'backend/data/amc_disclosures/hdfc/Monthly_HDFC_Flexi_Cap_Fund_-_31_August_2026.xlsx';
  const wbH = xlsx.readFile(hdfcPath);
  const rowsH = xlsx.utils.sheet_to_json(wbH.Sheets[wbH.SheetNames[0]], { header: 1 });
  const hCols = findHeaderIndices(rowsH);
  console.log('HDFC refined cols:', hCols);

  const r8 = rowsH[8];
  console.log('Parsed Row 8:', {
    name: r8[hCols.nameIdx],
    isin: r8[hCols.isinIdx],
    industry: r8[hCols.indIdx],
    quantity: r8[hCols.qtyIdx],
    valueLacs: r8[hCols.valIdx],
    weight: r8[hCols.wtIdx]
  });
}

test();
