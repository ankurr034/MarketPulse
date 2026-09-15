import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function mapHdfcSchemes() {
  const amfiRaw = fs.readFileSync('backend/data/amfi_active_schemes.json', 'utf8');
  const amfiData = JSON.parse(amfiRaw);
  const amfiSchemes = amfiData.schemes || [];
  console.log(`Loaded ${amfiSchemes.length} AMFI schemes.`);

  // Filter HDFC direct growth schemes
  const hdfcDirectGrowth = amfiSchemes.filter(s => 
    (s.amc && s.amc.toLowerCase().includes('hdfc')) &&
    s.plan === 'Direct' && 
    s.option === 'Growth'
  );
  console.log(`HDFC Direct Growth schemes in AMFI: ${hdfcDirectGrowth.length}`);

  const res = await axios.get('https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const matches = [...res.data.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi)].map(m => m[1]);
  const uniqueUrls = [...new Set(matches)];
  console.log(`Unique HDFC disclosure URLs: ${uniqueUrls.length}`);

  const matched = [];
  for (const u of uniqueUrls) {
    const filename = decodeURIComponent(path.basename(u));
    // E.g. "Monthly HDFC Flexi Cap Fund - 31 August 2026.xlsx"
    const cleaned = filename.replace(/^Monthly\s+/i, '')
                            .replace(/\s+-\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}\.xlsx$/i, '')
                            .replace(/\.xlsx$/i, '')
                            .trim();

    // Clean comparison string
    const simplify = (str) => str.toLowerCase()
      .replace(/hdfc/g, '')
      .replace(/fund/g, '')
      .replace(/direct/g, '')
      .replace(/growth/g, '')
      .replace(/plan/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    const cleanKey = simplify(cleaned);

    let match = hdfcDirectGrowth.find(s => simplify(s.schemeName) === cleanKey);
    if (!match) {
      match = hdfcDirectGrowth.find(s => {
        const sKey = simplify(s.schemeName);
        return (cleanKey.length > 5 && sKey.includes(cleanKey)) || (sKey.length > 5 && cleanKey.includes(sKey));
      });
    }

    matched.push({
      url: u,
      filename,
      cleaned,
      matchedScheme: match ? {
        schemeCode: match.schemeCode,
        schemeName: match.schemeName,
        category: match.category,
        amc: match.amc,
        isin: match.isinGrowth || match.isin
      } : null
    });
  }

  const successfullyMatched = matched.filter(m => m.matchedScheme !== null);
  console.log(`Successfully matched ${successfullyMatched.length} of ${uniqueUrls.length} files to AMFI Direct-Growth schemes!`);
  console.log('Sample matched:');
  successfullyMatched.slice(0, 15).forEach(m => {
    console.log(` - [${m.matchedScheme.schemeCode}] ${m.matchedScheme.schemeName} -> ${m.filename}`);
  });

  const unmatched = matched.filter(m => m.matchedScheme === null);
  console.log(`Unmatched (${unmatched.length}):`);
  unmatched.slice(0, 10).forEach(m => console.log('  unmatched:', m.filename));
}

mapHdfcSchemes().catch(e => console.error(e));
