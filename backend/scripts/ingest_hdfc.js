import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function ingestHdfcDisclosures() {
  const amfiRaw = fs.readFileSync('backend/data/amfi_active_schemes.json', 'utf8');
  const amfiData = JSON.parse(amfiRaw);
  const hdfcAmfi = (amfiData.schemes || []).filter(s => 
    s.amc && s.amc.toLowerCase().includes('hdfc') &&
    s.plan === 'Direct' && 
    s.option === 'Growth'
  );

  const res = await axios.get('https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
  const uniqueUrls = [...new Set(matches)];

  const simplify = (str) => str.toLowerCase()
    .replace(/hdfc/g, '')
    .replace(/fund/g, '')
    .replace(/direct/g, '')
    .replace(/growth/g, '')
    .replace(/plan/g, '')
    .replace(/option/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const targetDir = path.resolve('backend/data/amc_disclosures/hdfc');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Filter for equity, hybrid, solution, index files (skip pure debt/overnight/liquid if desired, or include equity & hybrid)
  // Let's identify files that have "Flexi", "Large", "Mid", "Small", "Balanced", "Equity", "ELSS", "Focused", "Index", "ETF", "Opportunities", "Advantage", "Multi", "Dividend", "MNC", "Value", "Capital", "Banking", "Defence", "Innovation", "Transportation", "Pharma", "Manufacturing", "Housing", "Consumption", "Business", "Arbitrage"
  const equityKeywords = [
    'flexi', 'large', 'mid', 'small', 'cap', 'balanced', 'equity', 'elss', 'focused',
    'index', 'etf', 'advantage', 'multi', 'dividend', 'mnc', 'value', 'banking',
    'defence', 'innovation', 'transportation', 'pharma', 'manufacturing', 'housing',
    'consumption', 'business', 'arbitrage', 'technology', 'realty', 'infrastructure'
  ];

  const equityUrls = uniqueUrls.filter(u => {
    const fn = decodeURIComponent(u).toLowerCase();
    return equityKeywords.some(k => fn.includes(k));
  });

  console.log(`Total HDFC equity/hybrid disclosure files to ingest: ${equityUrls.length}`);

  const hdfcEntries = [];
  for (let i = 0; i < equityUrls.length; i++) {
    const u = equityUrls[i];
    const originalFilename = decodeURIComponent(path.basename(u));
    const cleaned = originalFilename.replace(/^Monthly\s+/i, '')
                                    .replace(/\s+-\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}\.xlsx$/i, '')
                                    .replace(/\.xlsx$/i, '')
                                    .trim();
    const cleanKey = simplify(cleaned);

    let match = hdfcAmfi.find(s => simplify(s.schemeName) === cleanKey);
    if (!match) {
      match = hdfcAmfi.find(s => {
        const sKey = simplify(s.schemeName);
        return (cleanKey.length > 5 && sKey.includes(cleanKey)) || (sKey.length > 5 && cleanKey.includes(sKey));
      });
    }

    const safeName = originalFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const localPath = path.join(targetDir, safeName);

    // Download if not already downloaded
    if (!fs.existsSync(localPath)) {
      try {
        console.log(`[${i+1}/${equityUrls.length}] Downloading ${originalFilename}...`);
        const dlRes = await axios.get(u, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
        fs.writeFileSync(localPath, Buffer.from(dlRes.data));
      } catch (err) {
        console.warn(`Failed downloading ${u}:`, err.message);
        continue;
      }
    }

    const stat = fs.statSync(localPath);
    hdfcEntries.push({
      schemeCode: match ? String(match.schemeCode) : `HDFC_${cleaned.replace(/[^a-zA-Z0-9]/g, '_')}`,
      isin: match ? (match.isinGrowth || match.isin) : null,
      schemeName: match ? match.schemeName : cleaned,
      category: match ? match.category : 'Equity Scheme',
      amc: 'HDFC Mutual Fund',
      fileFormat: 'hdfc',
      fileName: path.relative(path.resolve('backend/data/amc_disclosures'), localPath).replace(/\\/g, '/'),
      sourceUrl: u,
      fileSizeBytes: stat.size,
      fetchedAt: new Date().toISOString(),
      verified: true
    });
  }

  console.log(`Successfully ingested ${hdfcEntries.length} HDFC disclosure workbooks.`);
  return hdfcEntries;
}

ingestHdfcDisclosures().catch(e => console.error(e));
