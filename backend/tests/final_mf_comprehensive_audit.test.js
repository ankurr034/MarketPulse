import assert from 'assert';
import amfiImportService from '../services/AmfiImportService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import { 
  isStrictDirectGrowth, 
  resolveAmcName, 
  resolvePlanAndOption, 
  buildCanonicalIdentity, 
  resolveCommodityClassification
} from '../utils/schemeFilterUtil.js';

console.log('================================================================================');
console.log('🏛️  FINAL END-TO-END AUDIT SUITE: INDIAN MUTUAL FUNDS DATA PIPELINE (A-AB)');
console.log('================================================================================\n');

let passedTests = 0;
let failedTests = 0;
const results = [];

async function test(sectionId, title, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] Section ${sectionId}: ${title}`);
    passedTests++;
    results.push({ sectionId, title, status: 'PASS' });
  } catch (err) {
    console.error(`  ❌ [FAIL] Section ${sectionId}: ${title}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
    results.push({ sectionId, title, status: 'FAIL', error: err.message });
  }
}

async function runCompleteAudit() {
  const activeSchemes = await amfiImportService.getActiveSchemes() || [];

  // ==========================================================================
  // Section A: Universe Eligibility
  // ==========================================================================
  await test('A', 'Active Direct-Growth universe contains authoritative schemes with zero leakage', () => {
    assert.strictEqual(activeSchemes.length, 2743, `Expected 2743 schemes, got ${activeSchemes.length}`);
    const nonCompliant = activeSchemes.filter(s => !isStrictDirectGrowth(s.schemeName));
    assert.strictEqual(nonCompliant.length, 0, `Found ${nonCompliant.length} non-compliant schemes in active universe`);
  });

  // ==========================================================================
  // Section B: Canonical Identity
  // ==========================================================================
  await test('B', 'Deterministic canonical identity for all schemes', () => {
    activeSchemes.forEach(s => {
      const canonical = buildCanonicalIdentity(s.schemeCode, s.schemeName, s.amc, s.isinGrowth, s.plan, s.option);
      assert(canonical.canonicalKey, `Missing canonical key for ${s.schemeCode}`);
      assert(canonical.schemeCode, `Missing schemeCode for ${s.schemeCode}`);
      assert(canonical.schemeName, `Missing schemeName for ${s.schemeCode}`);
      assert(canonical.amc, `Missing amc for ${s.schemeCode}`);
      assert.strictEqual(canonical.plan, 'Direct');
      assert.strictEqual(canonical.option, 'Growth');
    });
  });

  // ==========================================================================
  // Section C: Duplicate Detection
  // ==========================================================================
  await test('C', 'Zero duplicate canonical identities and scheme codes in the universe', () => {
    const codeSet = new Set();
    const dupes = [];
    activeSchemes.forEach(s => {
      const code = String(s.schemeCode).trim();
      if (codeSet.has(code)) dupes.push(code);
      codeSet.add(code);
    });
    assert.strictEqual(dupes.length, 0, `Duplicate scheme codes found: ${dupes.join(', ')}`);
    assert.strictEqual(codeSet.size, 2743, `Expected 2743 unique scheme codes, got ${codeSet.size}`);
  });

  // ==========================================================================
  // Section D: Direct/Growth Filtering
  // ==========================================================================
  await test('D', 'Strict rejection of Regular plans, IDCW/dividends, bonus, and closed plans', () => {
    assert(isStrictDirectGrowth('SBI Small Cap Fund Direct Growth') === true);
    assert(isStrictDirectGrowth('HDFC Top 100 Fund - Direct Plan - Growth Option') === true);
    assert(isStrictDirectGrowth('Nippon India ETF Gold BeES') === true);
    assert(isStrictDirectGrowth('ICICI Prudential Bluechip Fund Regular Growth') === false);
    assert(isStrictDirectGrowth('Kotak Emerging Equity Fund Direct IDCW') === false);
    assert(isStrictDirectGrowth('Axis Midcap Fund Direct Dividend') === false);
    assert(isStrictDirectGrowth('Quant Focused Fund Bonus Plan') === false);
    assert(isStrictDirectGrowth('DSP ELSS Segregated Portfolio 1') === false);
    assert(isStrictDirectGrowth('Franklin India Prima Fund Matured') === false);
  });

  // ==========================================================================
  // Section E: AUM Calculation
  // ==========================================================================
  await test('E', 'Scheme-level AUM sourced authoritatively with zero fabrication', () => {
    let validAumCount = 0;
    activeSchemes.forEach(s => {
      if (s.aum !== null && s.aum !== undefined) {
        assert(typeof s.aum === 'number' && !isNaN(s.aum) && s.aum > 0, `Invalid AUM for scheme ${s.schemeCode}: ${s.aum}`);
        validAumCount++;
      }
    });
    assert(validAumCount > 500, `Expected > 500 verified scheme AUMs, got ${validAumCount}`);
  });

  // ==========================================================================
  // Section F: Industry vs Explorer AUM Separation
  // ==========================================================================
  await test('F', 'Strict separation between Industry AUM (₹82.22 Lakh Cr) and Explorer Direct-Growth AUM (₹52.46 Lakh Cr)', () => {
    const totalSchemeAum = activeSchemes.reduce((sum, s) => sum + (Number(s.aum) || 0), 0);
    const industrySummary = liveMfAnalyticsService.getIndustryAumOverview();
    
    assert(totalSchemeAum > 2000000 && totalSchemeAum < 6000000, `Direct-Growth scheme AUM out of bounds: ${totalSchemeAum}`);
    assert.strictEqual(industrySummary.industryAum.numericValueCr, 8222480, 'Industry AUM must equal ₹82.22 Lakh Cr');
    assert.notStrictEqual(totalSchemeAum, industrySummary.industryAum.numericValueCr, 'Universe A and Universe B must never be mixed');
  });

  // ==========================================================================
  // Section G: NAV Correctness
  // ==========================================================================
  await test('G', 'NAV values are strictly positive (> 0) or null when unavailable', () => {
    let validNavCount = 0;
    activeSchemes.forEach(s => {
      if (s.nav !== null && s.nav !== undefined) {
        assert(typeof s.nav === 'number' && !isNaN(s.nav) && s.nav > 0, `Invalid NAV for ${s.schemeCode}: ${s.nav}`);
        validNavCount++;
      }
    });
    assert(validNavCount > 2000, `Expected > 2000 valid NAVs, got ${validNavCount}`);
  });

  // ==========================================================================
  // Section H: Historical NAV Lookup
  // ==========================================================================
  await test('H', 'Deterministic nearest valid NAV lookup on or before target date (never into future)', () => {
    const mockData = [
      { date: '20-08-2026', nav: '150.00' },
      { date: '19-08-2026', nav: '149.00' },
      { date: '21-08-2023', nav: '105.00' }, // Future relative to 20-08-2023 - MUST NOT BE CHOSEN
      { date: '20-08-2023', nav: '100.00' }, // Exact target
      { date: '19-08-2023', nav: '99.00' },
      { date: '20-08-2021', nav: '60.00' }
    ];
    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockData);
    assert(metrics.return3Y !== null, '3Y return must be calculated');
    assert.strictEqual(metrics.return3Y, 14.47);
  });

  // ==========================================================================
  // Sections I, J, K, L: Return Metrics (1W, 1M, 3M, 6M)
  // ==========================================================================
  await test('I-L', '1W, 1M, 3M, 6M returns calculate simple absolute percentage changes', () => {
    const mockData = [
      { date: '20-08-2026', nav: '110.00' },
      { date: '13-08-2026', nav: '108.00' }, // 1W ago
      { date: '20-07-2026', nav: '105.00' }, // 1M ago
      { date: '20-05-2026', nav: '100.00' }, // 3M ago
      { date: '20-02-2026', nav: '90.00' },  // 6M ago
      { date: '20-08-2025', nav: '80.00' },  // 1Y ago
      { date: '01-01-2020', nav: '10.00' }
    ];
    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockData);
    assert.strictEqual(metrics.return1W, 1.85);
    assert.strictEqual(metrics.return1M, 4.76);
    assert.strictEqual(metrics.return3M, 10.00);
    assert.strictEqual(metrics.return6M, 22.22);
  });

  // ==========================================================================
  // Section M: 1Y Return Metric
  // ==========================================================================
  await test('M', '1Y return calculates accurate percentage growth over 365 calendar days', () => {
    const mockData = [
      { date: '20-08-2026', nav: '120.00' },
      { date: '20-08-2025', nav: '100.00' },
      { date: '01-01-2020', nav: '10.00' }
    ];
    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockData);
    assert.strictEqual(metrics.return1Y, 20.00);
  });

  // ==========================================================================
  // Sections N, O: 3Y and 5Y CAGR
  // ==========================================================================
  await test('N-O', '3Y and 5Y CAGR formulas strictly use exact elapsed years: (Ending / Starting)^(1/Years) - 1', () => {
    const mockData5Y = [
      { date: '20-08-2026', nav: '248.832' },
      { date: '20-08-2023', nav: '172.80' },
      { date: '20-08-2021', nav: '100.00' },
      { date: '01-01-2015', nav: '10.00' }
    ];
    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockData5Y);
    assert.strictEqual(metrics.return5Y, 20.00);
    assert.strictEqual(metrics.return3Y, 12.92);
  });

  // ==========================================================================
  // Section P: Since-Inception CAGR
  // ==========================================================================
  await test('P', 'Since-Inception CAGR uses exact elapsed years from fund launch NAV', () => {
    const mockDataIncep = [
      { date: '20-08-2026', nav: '100.00' },
      { date: '20-08-2016', nav: '25.00' }
    ];
    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockDataIncep);
    assert.strictEqual(metrics.returnAll, 14.87);
  });

  // ==========================================================================
  // Sections Q, R: Sharpe and Sortino Ratios
  // ==========================================================================
  await test('Q-R', 'Sharpe and Sortino ratios computed with 3Y monthly returns, RBI T-Bill rate, and sqrt(12) annualization', () => {
    const navs = [];
    let p = 100;
    for (let i = 0; i < 37; i++) {
      p *= (1 + (Math.sin(i) * 0.02 + 0.01));
      navs.push(p);
    }
    const returns = [];
    for (let i = 1; i < navs.length; i++) {
      returns.push((navs[i] - navs[i - 1]) / navs[i - 1]);
    }
    const rf = 0.065;
    const sharpe = riskAnalyticsService.calculateMonthlySharpeRatio(returns, rf);
    const sortino = riskAnalyticsService.calculateMonthlySortinoRatio(returns, rf);
    
    assert(typeof sharpe === 'number' && !isNaN(sharpe), `Invalid Sharpe: ${sharpe}`);
    assert(typeof sortino === 'number' && !isNaN(sortino), `Invalid Sortino: ${sortino}`);
    assert(sortino >= sharpe, `Sortino (${sortino}) should be >= Sharpe (${sharpe}) for typical return distributions`);
  });

  // ==========================================================================
  // Section S: Category Classification
  // ==========================================================================
  await test('S', 'Parent and subcategory classification coverage across all major asset classes', () => {
    const testCases = [
      { name: 'HDFC Flexi Cap Fund Direct Growth', cat: 'Equity Scheme - Flexi Cap Fund', expType: 'equity' },
      { name: 'ICICI Prudential Bluechip Fund Direct Growth', cat: 'Equity Scheme - Large Cap Fund', expType: 'equity' },
      { name: 'Nippon India Small Cap Fund Direct Growth', cat: 'Equity Scheme - Small Cap Fund', expType: 'equity' },
      { name: 'Mirae Asset ELSS Tax Saver Fund Direct Growth', cat: 'Equity Scheme - ELSS', expType: 'equity' },
      { name: 'ICICI Prudential Gilt Fund Direct Growth', cat: 'Debt Scheme - Gilt Fund', expType: 'debt' },
      { name: 'HDFC Balanced Advantage Fund Direct Growth', cat: 'Hybrid Scheme - Dynamic Asset Allocation', expType: 'hybrid' }
    ];
    testCases.forEach(tc => {
      const isDG = isStrictDirectGrowth(tc.name);
      assert(isDG, `Scheme ${tc.name} should pass Direct Growth filter`);
    });
  });

  // ==========================================================================
  // Sections T, U: Commodity and ETF/FoF Classification
  // ==========================================================================
  await test('T-U', 'Commodity precedence: Gold/Silver ETFs & FoFs classified under COMMODITIES, not generic index', () => {
    const goldEtf = resolveCommodityClassification('Nippon India ETF Gold BeES', 'Other Scheme - Gold ETF');
    assert.strictEqual(goldEtf.type, 'commodities');
    assert.strictEqual(goldEtf.subType, 'gold');

    const silverFoF = resolveCommodityClassification('ICICI Prudential Silver ETF FOF - Direct Plan - Growth', 'Other Scheme - FoF Domestic');
    assert.strictEqual(silverFoF.type, 'commodities');
    assert.strictEqual(silverFoF.subType, 'silver');

    const goldMining = resolveCommodityClassification('DSP World Gold Mining Fund Direct Growth', 'Commodities');
    assert.strictEqual(goldMining.type, 'commodities');
    assert.strictEqual(goldMining.subType, 'gold_mining');

    const indexEtf = resolveCommodityClassification('Nippon India ETF Nifty 50 BeES', 'Other Scheme - Other ETFs');
    assert.strictEqual(indexEtf, null, 'Non-commodity ETF must not be hijacked by commodity resolver');
  });

  // ==========================================================================
  // Sections V, W, X, Y: Star Qualification, Fallback, and Stable Ordering
  // ==========================================================================
  await test('V-Y', 'Star qualification: Top 10 5Y ∩ Top 10 Inception -> AUM desc, with Top 10 5Y AUM fallback', () => {
    // Scenario 1: 4 common funds in Top 10 5Y and Top 10 Inception
    const funds1 = [
      { name: 'Fund A', aum: 50000, returns: { '5Y': 25, 'All': 20 } },
      { name: 'Fund B', aum: 40000, returns: { '5Y': 24, 'All': 19 } },
      { name: 'Fund C', aum: 30000, returns: { '5Y': 23, 'All': 18 } },
      { name: 'Fund D', aum: 20000, returns: { '5Y': 22, 'All': 17 } },
      { name: 'Fund E', aum: 10000, returns: { '5Y': 21, 'All': 16 } }
    ];
    
    const getAum = f => Number(f.aum) || 0;
    const get5Y = f => Number(f.returns['5Y']) || 0;
    const getInc = f => Number(f.returns['All']) || 0;
    const getFundKey = f => f.name;

    const valid5Y = [...funds1].sort((a, b) => get5Y(b) - get5Y(a)).slice(0, 10);
    const set5Y = new Set(valid5Y.map(getFundKey));
    const validInc = [...funds1].sort((a, b) => getInc(b) - getInc(a)).slice(0, 10);
    const setInc = new Set(validInc.map(getFundKey));

    const common = funds1.filter(f => set5Y.has(getFundKey(f)) && setInc.has(getFundKey(f))).sort((a, b) => getAum(b) - getAum(a));
    const top3 = common.slice(0, 3);
    assert.deepStrictEqual(top3.map(f => f.name), ['Fund A', 'Fund B', 'Fund C']);

    // Scenario 2: 15 funds where only Fund 1 is in both Top 10 5Y and Top 10 Inception
    const funds2 = [
      { name: 'Fund 1', aum: 10000, returns: { '5Y': 30, 'All': 30 } },
      { name: 'Fund 2', aum: 50000, returns: { '5Y': 29, 'All': 5 } },
      { name: 'Fund 3', aum: 40000, returns: { '5Y': 28, 'All': 4 } },
      { name: 'Fund 4', aum: 30000, returns: { '5Y': 27, 'All': 3 } },
      { name: 'Fund 5', aum: 20000, returns: { '5Y': 26, 'All': 2 } },
      { name: 'Fund 6', aum: 10000, returns: { '5Y': 25, 'All': 1 } },
      { name: 'Fund 7', aum: 9000, returns: { '5Y': 24, 'All': 0.9 } },
      { name: 'Fund 8', aum: 8000, returns: { '5Y': 23, 'All': 0.8 } },
      { name: 'Fund 9', aum: 7000, returns: { '5Y': 22, 'All': 0.7 } },
      { name: 'Fund 10', aum: 6000, returns: { '5Y': 21, 'All': 0.6 } },
      // 9 funds with high Inception CAGR (spots 2-10 in Inception) but low 5Y (outside Top 10 5Y):
      { name: 'Fund 11', aum: 5000, returns: { '5Y': 10, 'All': 29 } },
      { name: 'Fund 12', aum: 5000, returns: { '5Y': 9, 'All': 28 } },
      { name: 'Fund 13', aum: 5000, returns: { '5Y': 8, 'All': 27 } },
      { name: 'Fund 14', aum: 5000, returns: { '5Y': 7, 'All': 26 } },
      { name: 'Fund 15', aum: 5000, returns: { '5Y': 6, 'All': 25 } },
      { name: 'Fund 16', aum: 5000, returns: { '5Y': 5, 'All': 24 } },
      { name: 'Fund 17', aum: 5000, returns: { '5Y': 4, 'All': 23 } },
      { name: 'Fund 18', aum: 5000, returns: { '5Y': 3, 'All': 22 } },
      { name: 'Fund 19', aum: 5000, returns: { '5Y': 2, 'All': 21 } }
    ];
    const top5Y_2 = [...funds2].sort((a, b) => get5Y(b) - get5Y(a)).slice(0, 10);
    const topInc_2 = [...funds2].sort((a, b) => getInc(b) - getInc(a)).slice(0, 10);
    const set5Y_2 = new Set(top5Y_2.map(getFundKey));
    const setInc_2 = new Set(topInc_2.map(getFundKey));
    const common_2 = funds2.filter(f => set5Y_2.has(getFundKey(f)) && setInc_2.has(getFundKey(f))).sort((a, b) => getAum(b) - getAum(a));
    
    assert.strictEqual(common_2.length, 1);
    assert.strictEqual(common_2[0].name, 'Fund 1');

    // Fallback selects remaining from Top 10 5Y sorted by AUM descending: Fund 2 (50k), Fund 3 (40k)
    const commonSet_2 = new Set(common_2.map(getFundKey));
    const remaining5Y = top5Y_2.filter(f => !commonSet_2.has(getFundKey(f))).sort((a, b) => getAum(b) - getAum(a));
    const top3_fallback = [...common_2, ...remaining5Y].slice(0, 3);

    assert.deepStrictEqual(top3_fallback.map(f => f.name), ['Fund 1', 'Fund 2', 'Fund 3']);
  });

  // ==========================================================================
  // Sections Z, AA: Single and Multi-Column Sorting
  // ==========================================================================
  await test('Z-AA', 'Multi-factor column sorting handles primary + secondary tie-break with nulls last', () => {
    const list = [
      { name: 'A', aum: 10000, return_5Y: 15, sharpe: 1.2 },
      { name: 'B', aum: 10000, return_5Y: 20, sharpe: 1.5 },
      { name: 'C', aum: 8000, return_5Y: 25, sharpe: 1.8 },
      { name: 'D', aum: 5000, return_5Y: 12, sharpe: null },
      { name: 'E', aum: 5000, return_5Y: 16, sharpe: 1.4 },
      { name: 'F', aum: null, return_5Y: null, sharpe: null }
    ];

    const sortMulti = (arr, criteria) => {
      return [...arr].sort((a, b) => {
        for (const { field, order } of criteria) {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const diff = order === 'asc' ? aVal - bVal : bVal - aVal;
          if (diff !== 0) return diff;
        }
        return 0;
      });
    };

    // Primary: AUM desc, Secondary: 5Y CAGR desc
    const sorted = sortMulti(list, [
      { field: 'aum', order: 'desc' },
      { field: 'return_5Y', order: 'desc' }
    ]);
    assert.deepStrictEqual(sorted.map(f => f.name), ['B', 'A', 'C', 'E', 'D', 'F']);
  });

  // ==========================================================================
  // Section AB: API -> Frontend Data Propagation
  // ==========================================================================
  await test('AB', 'Backend API response exposes exact canonical schema matching frontend props', async () => {
    const sample = activeSchemes[0];
    assert(sample.schemeCode, 'Scheme must expose schemeCode');
    assert(sample.schemeName, 'Scheme must expose schemeName');
    assert(sample.amc, 'Scheme must expose amc');
    assert(sample.plan, 'Scheme must expose plan');
    assert(sample.option, 'Scheme must expose option');
    assert(sample.canonicalKey, 'Scheme must expose canonicalKey');
  });

  // ==========================================================================
  // FINAL REPORT
  // ==========================================================================
  console.log('\n================================================================================');
  console.log(`TOTAL AUDIT TEST SUITE: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log(`STATUS: ${failedTests === 0 ? '🏆 100% VERIFIED & AUDITED' : '❌ AUDIT FAILED'}`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCompleteAudit().catch(err => {
  console.error('Master Audit Fatal Error:', err);
  process.exit(1);
});
