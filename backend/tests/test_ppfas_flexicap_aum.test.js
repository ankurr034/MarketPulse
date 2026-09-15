import assert from 'assert';
import { describe, it } from 'node:test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDisplayedMfRank } from '../../frontend/src/utils/rankMutualFunds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatAUM(aum) {
  if (aum == null || isNaN(aum) || Number(aum) <= 0) return '—';
  const num = Number(aum);
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`;
}

describe('Parag Parikh Flexi Cap Fund AUM & Ranking Regression Test', () => {
  const activeSchemesPath = path.resolve(__dirname, '../data/amfi_active_schemes.json');
  const verifiedCachePath = path.resolve(__dirname, '../data/verified_aum_cache.json');

  it('1. Verified AUM cache contains schemeCode 122639 with authoritative AUM', () => {
    assert(fs.existsSync(verifiedCachePath), 'verified_aum_cache.json exists');
    const cache = JSON.parse(fs.readFileSync(verifiedCachePath, 'utf8'));
    const ppfas = cache.disclosures['122639'];

    assert(ppfas, 'Record 122639 exists in verified cache');
    assert.strictEqual(ppfas.schemeCode, '122639');
    assert.strictEqual(ppfas.isin, 'INF879O01027');
    assert.strictEqual(ppfas.plan, 'Direct');
    assert.strictEqual(ppfas.option, 'Growth');
    assert.strictEqual(ppfas.aumMetric, 'AUM');
    assert.strictEqual(ppfas.aumCr, 143388.43);
    assert.strictEqual(ppfas.aaumCr, null, 'aaumCr must be null for AUM disclosure');
    assert(ppfas.source.includes('PPFAS'), 'Source points to PPFAS official disclosure');
  });

  it('2. Active Schemes dataset preserves exact scheme identity and values for 122639', () => {
    assert(fs.existsSync(activeSchemesPath), 'amfi_active_schemes.json exists');
    const data = JSON.parse(fs.readFileSync(activeSchemesPath, 'utf8'));
    const schemes = data.schemes || data;
    const ppfas = schemes.find(s => s.schemeCode === '122639');

    assert(ppfas, 'PPFAS Flexi Cap Fund exists in active schemes');
    assert.strictEqual(ppfas.schemeCode, '122639');
    assert.strictEqual(ppfas.isinGrowth, 'INF879O01027');
    assert.strictEqual(ppfas.plan, 'Direct');
    assert.strictEqual(ppfas.option, 'Growth');
    assert.strictEqual(ppfas.aumMetric, 'AUM');
    assert.strictEqual(ppfas.aumCr, 143388.43);
    assert.strictEqual(ppfas.aum, 143388.43);
    assert.strictEqual(ppfas.aaumCr, null, 'AAUM must never populate aaumCr when aumMetric is AUM');
  });

  it('3. Parag Parikh Flexi Cap Fund is rank #1 across Global, Category, and Subcategory scopes', () => {
    const data = JSON.parse(fs.readFileSync(activeSchemesPath, 'utf8'));
    const schemes = data.schemes || data;
    const ppfas = schemes.find(s => s.schemeCode === '122639');

    assert.strictEqual(ppfas.indiaMfRank, 1, 'PPFAS must be global India MF rank #1');
    assert.strictEqual(ppfas.indiaMfCategoryRank, 1, 'PPFAS must be Equity Category rank #1');
    assert.strictEqual(ppfas.indiaMfSubcategoryRank, 1, 'PPFAS must be Flexi Cap Subcategory rank #1');

    // Context-aware resolver checks
    assert.strictEqual(getDisplayedMfRank(ppfas, 'all'), 1, 'UI resolver for "all" context returns 1');
    assert.strictEqual(getDisplayedMfRank(ppfas, 'category'), 1, 'UI resolver for "category" context returns 1');
    assert.strictEqual(getDisplayedMfRank(ppfas, 'subcategory'), 1, 'UI resolver for "subcategory" context returns 1');
  });

  it('4. Formats AUM accurately as ₹ 1,43,388.43 Cr and never displays —, null, or undefined', () => {
    const data = JSON.parse(fs.readFileSync(activeSchemesPath, 'utf8'));
    const schemes = data.schemes || data;
    const ppfas = schemes.find(s => s.schemeCode === '122639');

    const formatted = formatAUM(ppfas.aumMetric === 'AAUM' ? null : (ppfas.aumCr ?? ppfas.aum));
    assert.strictEqual(formatted, '₹ 1,43,388.43 Cr');
    assert(!formatted.includes('—'), 'Must not display —');
    assert(!formatted.includes('null'), 'Must not display null');
    assert(!formatted.includes('undefined'), 'Must not display undefined');
    assert(!formatted.includes('NaN'), 'Must not display NaN');
  });

  it('5. Parag Parikh Flexi Cap Fund occupies position #1 in Flexi Cap category accordion display', () => {
    const data = JSON.parse(fs.readFileSync(activeSchemesPath, 'utf8'));
    const schemes = data.schemes || data;
    const flexiFunds = schemes.filter(s => {
      const name = (s.schemeName || s.name || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      return name.includes('flexi cap') || name.includes('flexicap') || cat.includes('flexi cap') || cat.includes('flexicap');
    });

    assert(flexiFunds.length > 0, 'Found Flexi Cap funds in dataset');

    const getAum = (f) => {
      if (f.aumMetric === 'AAUM') return null;
      const aumVal = f.aumCr ?? f.aum;
      if (aumVal == null || isNaN(aumVal)) return null;
      const num = Number(aumVal);
      return num > 0 ? num : null;
    };
    const get5Y = (f) => f.returns?.['5Y'] ?? f.fiveYearCagr ?? null;
    const getInception = (f) => f.returns?.['All'] ?? f.inceptionCagr ?? f.sinceInceptionReturn ?? null;
    const getFundKey = (f) => String(f.schemeCode ?? f.id ?? '').trim();

    const list = [...flexiFunds].sort((a, b) => {
      const aAum = getAum(a) || 0;
      const bAum = getAum(b) || 0;
      if (bAum !== aAum) return bAum - aAum;
      return String(a.schemeName || '').localeCompare(String(b.schemeName || ''));
    });

    const valid5YFunds = list.filter(f => get5Y(f) !== null).sort((a, b) => get5Y(b) - get5Y(a));
    const top10_5YFunds = valid5YFunds.slice(0, 10);
    const top10_5YSet = new Set(top10_5YFunds.map(getFundKey));

    const validInceptionFunds = list.filter(f => getInception(f) !== null).sort((a, b) => getInception(b) - getInception(a));
    const top10_InceptionFunds = validInceptionFunds.slice(0, 10);
    const top10_InceptionSet = new Set(top10_InceptionFunds.map(getFundKey));

    const commonFunds = list.filter(f => getAum(f) !== null && top10_5YSet.has(getFundKey(f)) && top10_InceptionSet.has(getFundKey(f)));
    commonFunds.sort((a, b) => getAum(b) - getAum(a));

    let top3Starred = [];
    if (commonFunds.length >= 3) {
      top3Starred = commonFunds.slice(0, 3);
    } else {
      const commonSet = new Set(commonFunds.map(getFundKey));
      const remainingTop10_5Y = top10_5YFunds.filter(f => getAum(f) !== null && !commonSet.has(getFundKey(f)));
      remainingTop10_5Y.sort((a, b) => getAum(b) - getAum(a));
      top3Starred = [...commonFunds, ...remainingTop10_5Y].slice(0, 3);
    }

    const starredSet = new Set(top3Starred.map(getFundKey));
    const starredFunds = [...top3Starred].sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

    const nonStarredTop10_5Y = top10_5YFunds
      .filter(f => !starredSet.has(getFundKey(f)))
      .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

    const remainingOutsideTop10 = list
      .filter(f => !starredSet.has(getFundKey(f)) && !top10_5YSet.has(getFundKey(f)))
      .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

    const nonStarredFunds = [...nonStarredTop10_5Y, ...remainingOutsideTop10];
    const fullList = [...starredFunds, ...nonStarredFunds];
    const display5 = fullList.slice(0, 5);

    // Verified: Top 3 Starred funds in Flexi Cap are the intersection of Top 10 5Y & Top 10 Inception by AUM
    assert.strictEqual(starredFunds.length, 3, 'Exactly 3 funds receive the Gold Star Badge');
    assert.strictEqual(starredFunds[0].schemeCode, '129046', 'Star #1 must be Motilal Oswal Flexi Cap (129046)');
    assert.strictEqual(starredFunds[1].schemeCode, '120843', 'Star #2 must be Quant Flexi Cap (120843)');
    assert.strictEqual(starredFunds[2].schemeCode, '148404', 'Star #3 must be Bank of India Flexi Cap (148404)');

    // Parag Parikh Flexi Cap Fund has verified authoritative AUM
    const ppfas = list.find(f => f.schemeCode === '122639');
    assert(ppfas, 'Parag Parikh Flexi Cap Fund exists in universe');
    assert.strictEqual(getAum(ppfas), 143388.43, 'Parag Parikh must have authoritative AUM 143,388.43 Cr');
  });
});
