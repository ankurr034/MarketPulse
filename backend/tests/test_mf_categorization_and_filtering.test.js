// backend/tests/test_mf_categorization_and_filtering.test.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  resolveSchemeClassification, 
  matchesCategoryFilter,
  isStrictDirectGrowth 
} from '../utils/schemeFilterUtil.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import unifiedMfService from '../services/UnifiedMfService.js';
import { CATEGORY_GROUPS } from '../config/mfTaxonomy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCategorizationAndFilteringTests() {
  console.log('================================================================');
  console.log('MASTER AUDIT: MUTUAL FUND CATEGORIZATION & FILTERING VERIFICATION');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Verify amfi_active_schemes.json universe
  const amfiPath = path.resolve(__dirname, '../data/amfi_active_schemes.json');
  assert(fs.existsSync(amfiPath), `AMFI active schemes file exists at ${amfiPath}`);

  const rawData = JSON.parse(fs.readFileSync(amfiPath, 'utf8'));
  const schemesList = rawData.schemes || (Array.isArray(rawData) ? rawData : []);
  const activeSchemes = schemesList.filter(s => isStrictDirectGrowth(s.schemeName));
  console.log(`Auditing ${activeSchemes.length} direct growth active schemes from AMFI master...\n`);

  // 2. Strict Parent Category Separation
  console.log('--- 1. AUDITING STRICT PARENT CATEGORY ISOLATION ---');
  let elssCount = 0;
  let elssLeakedIntoEquity = 0;
  let sectoralCount = 0;
  let sectoralLeakedIntoEquity = 0;
  let hybridCount = 0;
  let hybridLeakedIntoEquity = 0;
  let debtCount = 0;
  let debtLeakedIntoEquity = 0;
  let pureEquityCount = 0;

  const validEquitySubTypes = new Set([
    'flexi_cap', 'mid_cap', 'small_cap', 'large_cap', 
    'large_mid_cap', 'multi_cap', 'value', 'contra', 
    'focused', 'dividend_yield'
  ]);

  for (const s of activeSchemes) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls != null, `Classification resolved for scheme ${s.schemeCode}: ${s.schemeName}`);

    const isELSS = (s.schemeName.toLowerCase().includes('elss') || 
                    s.schemeName.toLowerCase().includes('tax saver') || 
                    (s.category && s.category.toLowerCase().includes('elss')));

    const isActMom = (s.schemeName.toLowerCase().includes('momentum') || s.schemeName.toLowerCase().includes('active momentum')) && !s.schemeName.toLowerCase().includes('index') && !s.schemeName.toLowerCase().includes('etf');
    const isSectoral = (s.category && (s.category.toLowerCase().includes('sectoral') || s.category.toLowerCase().includes('thematic'))) && !isActMom;
    const isHybrid = (s.category && (s.category.toLowerCase().includes('hybrid') || s.category.toLowerCase().includes('arbitrage') || s.category.toLowerCase().includes('dynamic asset') || s.category.toLowerCase().includes('balanced'))) || isActMom;
    const isDebt = (s.category && (s.category.toLowerCase().includes('debt') || s.category.toLowerCase().includes('liquid') || s.category.toLowerCase().includes('gilt') || s.category.toLowerCase().includes('money market') || s.category.toLowerCase().includes('overnight')));

    if (isELSS) {
      elssCount++;
      if (cls.parentCategory === 'EQUITY' || cls.type === 'equity') {
        elssLeakedIntoEquity++;
        console.error(`Leakage detected! ELSS fund mapped to EQUITY: ${s.schemeCode} - ${s.schemeName}`);
      }
      assert(cls.parentCategory === 'TAX SAVER', `ELSS scheme ${s.schemeCode} has parentCategory 'TAX SAVER' (got: ${cls.parentCategory})`);
      assert(cls.type === 'elss', `ELSS scheme ${s.schemeCode} has type 'elss' (got: ${cls.type})`);
    }

    if (isSectoral) {
      sectoralCount++;
      if (cls.parentCategory === 'EQUITY' || cls.type === 'equity') {
        sectoralLeakedIntoEquity++;
        console.error(`Leakage detected! Sectoral fund mapped to EQUITY: ${s.schemeCode} - ${s.schemeName}`);
      }
      assert(cls.parentCategory === 'SECTORAL_THEMATIC', `Sectoral scheme ${s.schemeCode} has parentCategory 'SECTORAL_THEMATIC' (got: ${cls.parentCategory})`);
      assert(cls.type === 'sectoral_thematic', `Sectoral scheme ${s.schemeCode} has type 'sectoral_thematic' (got: ${cls.type})`);
    }

    if (isHybrid) {
      hybridCount++;
      if (cls.parentCategory === 'EQUITY' || cls.type === 'equity') {
        hybridLeakedIntoEquity++;
        console.error(`Leakage detected! Hybrid fund mapped to EQUITY: ${s.schemeCode} - ${s.schemeName}`);
      }
      assert(cls.parentCategory === 'HYBRID', `Hybrid scheme ${s.schemeCode} has parentCategory 'HYBRID' (got: ${cls.parentCategory})`);
      assert(cls.type === 'hybrid', `Hybrid scheme ${s.schemeCode} has type 'hybrid' (got: ${cls.type})`);
    }

    if (isDebt) {
      debtCount++;
      if (cls.parentCategory === 'EQUITY' || cls.type === 'equity') {
        debtLeakedIntoEquity++;
        console.error(`Leakage detected! Debt fund mapped to EQUITY: ${s.schemeCode} - ${s.schemeName}`);
      }
    }

    if (cls.parentCategory === 'EQUITY') {
      pureEquityCount++;
      assert(validEquitySubTypes.has(cls.subType), `Pure Equity scheme ${s.schemeCode} (${s.schemeName}) has valid equity subType: ${cls.subType}`);
    }
  }

  console.log(`Total ELSS schemes found: ${elssCount}`);
  assert(elssLeakedIntoEquity === 0, `ZERO ELSS schemes leaked into Equity (actual leaks: ${elssLeakedIntoEquity})`);

  console.log(`Total Sectoral schemes found: ${sectoralCount}`);
  assert(sectoralLeakedIntoEquity === 0, `ZERO Sectoral schemes leaked into Equity (actual leaks: ${sectoralLeakedIntoEquity})`);

  console.log(`Total Hybrid schemes found: ${hybridCount}`);
  assert(hybridLeakedIntoEquity === 0, `ZERO Hybrid schemes leaked into Equity (actual leaks: ${hybridLeakedIntoEquity})`);

  console.log(`Total Debt schemes found: ${debtCount}`);
  assert(debtLeakedIntoEquity === 0, `ZERO Debt schemes leaked into Equity (actual leaks: ${debtLeakedIntoEquity})`);

  console.log(`Total Pure Equity schemes: ${pureEquityCount}\n`);

  // 3. Filtering Logic Verification (matchesCategoryFilter)
  console.log('--- 2. AUDITING FILTERING LOGIC (matchesCategoryFilter) ---');

  // Test Equity filter
  const equityMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'equity'));
  console.log(`Total funds matching 'equity' filter: ${equityMatches.length}`);
  for (const s of equityMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'EQUITY', `Fund ${s.schemeName} matched 'equity' and has parentCategory 'EQUITY'`);
    assert(cls.type === 'equity', `Fund ${s.schemeName} matched 'equity' and has type 'equity'`);
  }

  // Test ELSS filter
  const elssMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'ELSS (Tax Savings)'));
  console.log(`Total funds matching 'ELSS (Tax Savings)' filter: ${elssMatches.length}`);
  assert(elssMatches.length === elssCount, `ELSS filter count matches actual ELSS schemes (${elssMatches.length} vs ${elssCount})`);
  for (const s of elssMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'TAX SAVER', `Fund ${s.schemeName} matched ELSS and has parentCategory 'TAX SAVER'`);
  }

  // Test Sectoral filter
  const sectoralMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'Sector / Thematic'));
  console.log(`Total funds matching 'Sector / Thematic' filter: ${sectoralMatches.length}`);
  for (const s of sectoralMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'SECTORAL_THEMATIC', `Fund ${s.schemeName} matched Sectoral and has parentCategory 'SECTORAL_THEMATIC'`);
  }

  // Test Hybrid Arbitrage filter
  const arbitrageMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'Arbitrage Fund'));
  console.log(`Total funds matching 'Arbitrage Fund' filter: ${arbitrageMatches.length}`);
  assert(arbitrageMatches.length > 0, `Found ${arbitrageMatches.length} Arbitrage funds`);
  for (const s of arbitrageMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'HYBRID', `Arbitrage fund ${s.schemeName} has parentCategory 'HYBRID'`);
    assert(cls.subType === 'arbitrage', `Arbitrage fund ${s.schemeName} has subType 'arbitrage'`);
  }

  // Test Hybrid Balanced Advantage filter
  const bafMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'Balanced Advantage Funds'));
  console.log(`Total funds matching 'Balanced Advantage Funds' filter: ${bafMatches.length}`);
  assert(bafMatches.length > 0, `Found ${bafMatches.length} Balanced Advantage funds`);
  for (const s of bafMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'HYBRID', `BAF fund ${s.schemeName} has parentCategory 'HYBRID'`);
    assert(cls.subType === 'balanced_adv', `BAF fund ${s.schemeName} has subType 'balanced_adv'`);
  }

  // Test Hybrid Dynamic Asset Allocation filter
  const dynamicAssetMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'Dynamic Asset Allocation Funds'));
  console.log(`Total funds matching 'Dynamic Asset Allocation Funds' filter: ${dynamicAssetMatches.length}`);
  assert(dynamicAssetMatches.length > 0, `Found ${dynamicAssetMatches.length} Dynamic Asset Allocation funds`);
  for (const s of dynamicAssetMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'HYBRID', `Dynamic Asset fund ${s.schemeName} has parentCategory 'HYBRID'`);
    assert(cls.subType === 'dynamic_asset', `Dynamic Asset fund ${s.schemeName} has subType 'dynamic_asset'`);
  }

  // Test Hybrid Active Momentum filter
  const activeMomentumMatches = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, 'Active Momentum Funds'));
  console.log(`Total funds matching 'Active Momentum Funds' filter: ${activeMomentumMatches.length}`);
  assert(activeMomentumMatches.length > 0, `Found ${activeMomentumMatches.length} Active Momentum funds`);
  for (const s of activeMomentumMatches) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'HYBRID', `Active Momentum fund ${s.schemeName} has parentCategory 'HYBRID'`);
    assert(cls.type === 'hybrid', `Active Momentum fund ${s.schemeName} has type 'hybrid'`);
    assert(cls.subType === 'active_momentum', `Active Momentum fund ${s.schemeName} has subType 'active_momentum'`);
  }

  // Test Equity Subcategories
  const subCategoryTests = [
    { name: 'Flexi Cap', subType: 'flexi_cap' },
    { name: 'Mid-Cap', subType: 'mid_cap' },
    { name: 'Small-Cap', subType: 'small_cap' },
    { name: 'Large-Cap', subType: 'large_cap' },
    { name: 'Large & Mid-Cap', subType: 'large_mid_cap' },
    { name: 'Multi-Cap', subType: 'multi_cap' },
    { name: 'Value', subType: 'value' },
    { name: 'Contra', subType: 'contra' },
    { name: 'Focused Fund', subType: 'focused' }
  ];

  for (const sub of subCategoryTests) {
    const matched = activeSchemes.filter(s => matchesCategoryFilter(s.schemeName, s.category, sub.name));
    console.log(`Subcategory '${sub.name}': found ${matched.length} schemes`);
    assert(matched.length > 0, `Subcategory '${sub.name}' has active schemes`);
    for (const s of matched) {
      const cls = resolveSchemeClassification(s.schemeName, s.category);
      assert(cls.parentCategory === 'EQUITY', `Scheme ${s.schemeName} in '${sub.name}' has parentCategory 'EQUITY'`);
      assert(cls.subType === sub.subType, `Scheme ${s.schemeName} in '${sub.name}' has subType '${sub.subType}' (got: ${cls.subType})`);
    }
  }

  // 4. Directory Service Integration Test
  console.log('\n--- 3. AUDITING ALL FUNDS DIRECTORY SERVICE API ---');
  const equityDirResult = await allFundsDirectoryService.getAllSchemes(1, 100, { category: 'Equity' });
  assert(equityDirResult.schemes.length > 0, `AllFundsDirectoryService returned ${equityDirResult.schemes.length} schemes for 'Equity'`);
  for (const s of equityDirResult.schemes) {
    assert(s.parentCategory === 'EQUITY', `Directory scheme ${s.schemeName} has parentCategory 'EQUITY'`);
    assert(s.type === 'equity', `Directory scheme ${s.schemeName} has type 'equity'`);
    assert(!s.name.toLowerCase().includes('elss') && !s.name.toLowerCase().includes('tax saver'), 
      `Directory scheme ${s.schemeName} under Equity is not an ELSS scheme`);
  }

  const elssDirResult = await allFundsDirectoryService.getAllSchemes(1, 100, { category: 'ELSS (Tax Savings)' });
  assert(elssDirResult.schemes.length > 0, `AllFundsDirectoryService returned ${elssDirResult.schemes.length} schemes for 'ELSS (Tax Savings)'`);
  for (const s of elssDirResult.schemes) {
    assert(s.parentCategory === 'TAX SAVER', `Directory scheme ${s.schemeName} has parentCategory 'TAX SAVER'`);
    assert(s.type === 'elss', `Directory scheme ${s.schemeName} has type 'elss'`);
  }

  // 5. Unified Mf Service Filter Test
  console.log('\n--- 4. AUDITING UNIFIED MF SERVICE FILTER API ---');
  const unifiedEquity = await unifiedMfService.getFilteredFunds('', 'Equity', '', '', 'india');
  assert(unifiedEquity.length > 0, `UnifiedMfService returned ${unifiedEquity.length} schemes for 'Equity'`);
  for (const s of unifiedEquity) {
    const cls = resolveSchemeClassification(s.schemeName, s.category);
    assert(cls.parentCategory === 'EQUITY', `UnifiedMfService scheme ${s.schemeName} has parentCategory 'EQUITY'`);
    assert(cls.type === 'equity', `UnifiedMfService scheme ${s.schemeName} has type 'equity'`);
  }

  // 6. Config Taxonomy Verification
  console.log('\n--- 5. AUDITING CATEGORY_GROUPS CONFIG TAXONOMY ---');
  assert(CATEGORY_GROUPS.Equity != null, 'CATEGORY_GROUPS has Equity');
  assert(CATEGORY_GROUPS['Tax Saver (ELSS)'] != null, 'CATEGORY_GROUPS has Tax Saver (ELSS)');
  assert(CATEGORY_GROUPS['Sectoral & Thematic'] != null, 'CATEGORY_GROUPS has Sectoral & Thematic');
  assert(CATEGORY_GROUPS.Hybrid != null, 'CATEGORY_GROUPS has Hybrid');
  assert(!CATEGORY_GROUPS.Equity.includes('ELSS'), 'ELSS is NOT under Equity');
  assert(!CATEGORY_GROUPS.Equity.includes('Sectoral'), 'Sectoral is NOT under Equity');
  assert(!CATEGORY_GROUPS.Equity.includes('Thematic'), 'Thematic is NOT under Equity');
  assert(!CATEGORY_GROUPS.Equity.includes('Arbitrage'), 'Arbitrage is NOT under Equity');
  assert(CATEGORY_GROUPS.Hybrid.includes('Arbitrage'), 'Arbitrage is under Hybrid');

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions succeeded)`);
  console.log('Zero cross-category leakage confirmed across entire mutual fund universe.');
  console.log('================================================================\n');
}

runCategorizationAndFilteringTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
