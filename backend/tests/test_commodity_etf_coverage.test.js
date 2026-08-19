import assert from 'assert';
import { resolveCommodityClassification } from '../utils/schemeFilterUtil.js';
import amfiImportService from '../services/AmfiImportService.js';

console.log('🧪 Starting Commodity ETF & FoF Coverage Verification Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

function it(description, fn) {
  try {
    fn();
    console.log('  ✅ PASS: ' + description);
    passedTests++;
  } catch (err) {
    console.error('  ❌ FAIL: ' + description);
    console.error('     Error: ' + err.message);
    failedTests++;
  }
}

async function runTests() {
  const activeSchemes = await amfiImportService.getActiveSchemes() || [];

  console.log('--- Test Group 1: Commodity Coverage & Direct+Growth Rules ---');
  
  const commoditySchemes = activeSchemes.filter(s => {
    const res = resolveCommodityClassification(s.schemeName, s.category);
    return res && res.type === 'commodities';
  });

  it('Total Commodity funds in universe must be >= 45 (Found: ' + commoditySchemes.length + ')', () => {
    assert.ok(commoditySchemes.length >= 45, 'Expected >= 45 commodity schemes, found ' + commoditySchemes.length);
  });

  it('Zero Regular schemes allowed in Commodity dataset', () => {
    const regular = commoditySchemes.filter(s => (s.schemeName || '').toLowerCase().includes('regular') || /\breg\b/.test((s.schemeName || '').toLowerCase()));
    assert.strictEqual(regular.length, 0, 'Found regular schemes');
  });

  it('Zero IDCW/Dividend schemes allowed in Commodity dataset', () => {
    const idcw = commoditySchemes.filter(s => (s.schemeName || '').toLowerCase().includes('idcw') || (s.schemeName || '').toLowerCase().includes('dividend'));
    assert.strictEqual(idcw.length, 0, 'Found IDCW/dividend schemes');
  });

  it('Zero Duplicate schemeCodes in Commodity dataset', () => {
    const seen = new Set();
    const dupes = [];
    commoditySchemes.forEach(s => {
      if (seen.has(s.schemeCode)) dupes.push(s.schemeCode);
      seen.add(s.schemeCode);
    });
    assert.strictEqual(dupes.length, 0, 'Found duplicate schemeCodes');
  });

  console.log('\n--- Test Group 2: ETF vs FoF Classification & Sub-Categories ---');

  it('Gold FoF schemes must be classified under commodities.gold', () => {
    const sbiGoldFoF = resolveCommodityClassification('SBI GOLD FUND- DIRECT PLAN - GROWTH', 'Other Scheme - FoF Domestic');
    assert.strictEqual(sbiGoldFoF.type, 'commodities');
    assert.strictEqual(sbiGoldFoF.subType, 'gold');

    const nipponGoldFoF = resolveCommodityClassification('Nippon India Gold Savings Fund - Direct Plan Growth Plan - Growth Option', 'Other Scheme - FoF Domestic');
    assert.strictEqual(nipponGoldFoF.type, 'commodities');
    assert.strictEqual(nipponGoldFoF.subType, 'gold');
  });

  it('Silver FoF schemes must be classified under commodities.silver', () => {
    const iciciSilverFoF = resolveCommodityClassification('ICICI Prudential Silver ETF FOF - Direct Plan - Growth', 'Other Scheme - FoF Domestic');
    assert.strictEqual(iciciSilverFoF.type, 'commodities');
    assert.strictEqual(iciciSilverFoF.subType, 'silver');

    const hdfcSilverFoF = resolveCommodityClassification('HDFC Silver ETF Fund of Fund - Growth Option - Direct Plan', 'Other Scheme - FoF Domestic');
    assert.strictEqual(hdfcSilverFoF.type, 'commodities');
    assert.strictEqual(hdfcSilverFoF.subType, 'silver');
  });

  it('Pure Gold ETFs must be classified under commodities.gold (NOT generic Index)', () => {
    const nipponGoldBeES = resolveCommodityClassification('Nippon India ETF Gold BeES', 'Other Scheme - Gold ETF');
    assert.strictEqual(nipponGoldBeES.type, 'commodities');
    assert.strictEqual(nipponGoldBeES.subType, 'gold');

    const utiGoldEtf = resolveCommodityClassification('UTI GOLD Exchange Traded Fund', 'Other Scheme - Gold ETF');
    assert.strictEqual(utiGoldEtf.type, 'commodities');
    assert.strictEqual(utiGoldEtf.subType, 'gold');
  });

  it('Pure Silver ETFs must be classified under commodities.silver (NOT generic Index)', () => {
    const iciciSilverEtf = resolveCommodityClassification('ICICI PRUDENTIAL SILVER ETF', 'Other Scheme - Other ETFs');
    assert.strictEqual(iciciSilverEtf.type, 'commodities');
    assert.strictEqual(iciciSilverEtf.subType, 'silver');

    const dspSilverEtf = resolveCommodityClassification('DSP Silver ETF', 'Other Scheme - Other ETFs');
    assert.strictEqual(dspSilverEtf.type, 'commodities');
    assert.strictEqual(dspSilverEtf.subType, 'silver');
  });

  it('Non-Commodity Index ETFs must return null for Commodity classification (remain in existing category)', () => {
    const nifty50Etf = resolveCommodityClassification('Nippon India ETF Nifty 50 BeES', 'Other Scheme - Other ETFs');
    assert.strictEqual(nifty50Etf, null);

    const bankEtf = resolveCommodityClassification('Nippon India ETF Nifty Bank BeES', 'Other Scheme - Other ETFs');
    assert.strictEqual(bankEtf, null);
  });

  console.log('\n--- Test Group 3: Universe Invariance & Identity Checks ---');

  it('Universe total scheme count remains strictly 2,743', () => {
    assert.strictEqual(activeSchemes.length, 2743);
  });

  it('First and last schemes in active sequence are byte-for-byte unchanged', () => {
    assert.strictEqual(String(activeSchemes[0].schemeCode), '101705');
    assert.strictEqual(String(activeSchemes[activeSchemes.length - 1].schemeCode), '154565');
  });

  console.log('\n====================================================');
  console.log('TOTAL TESTS: ' + (passedTests + failedTests));
  console.log('PASSED: ' + passedTests);
  console.log('FAILED: ' + failedTests);
  console.log('====================================================\n');

  if (failedTests > 0) process.exit(1);
}

runTests();
