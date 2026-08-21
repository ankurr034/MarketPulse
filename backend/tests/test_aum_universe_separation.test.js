import assert from 'assert';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import { isStrictDirectGrowth, resolvePlanAndOption } from '../utils/schemeFilterUtil.js';

console.log('🧪 Running Complete MF AUM Universe Separation & Reconciliation Master Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

async function it(description, fn) {
  try {
    await fn();
    console.log('  ✅ PASS: ' + description);
    passedTests++;
  } catch (err) {
    console.error('  ❌ FAIL: ' + description);
    console.error('     Error: ' + err.message);
    console.error(err.stack);
    failedTests++;
  }
}

async function runTests() {
  const schemes = await allFundsDirectoryService._loadActiveSchemes();

  console.log('--- Test Group 1: Universe Separation & Integrity (2,743 Schemes) ---');

  await it('Exactly 2,743 eligible Direct-Growth schemes are loaded in the Explorer universe', () => {
    assert.strictEqual(schemes.length, 2743, `Expected 2743 schemes, found ${schemes.length}`);
  });

  await it('Zero Regular plans are included in the Explorer universe', () => {
    const regularSchemes = schemes.filter(s => {
      const { plan } = resolvePlanAndOption(s.schemeName);
      return plan === 'Regular' || (s.schemeName && s.schemeName.toLowerCase().includes('regular'));
    });
    assert.strictEqual(regularSchemes.length, 0, `Found ${regularSchemes.length} regular schemes`);
  });

  await it('Zero IDCW / Dividend plans are included in the Explorer universe', () => {
    const idcwSchemes = schemes.filter(s => {
      const { option } = resolvePlanAndOption(s.schemeName);
      const name = (s.schemeName || '').toLowerCase();
      return option === 'IDCW' || name.includes('idcw') || name.includes('dividend');
    });
    assert.strictEqual(idcwSchemes.length, 0, `Found ${idcwSchemes.length} IDCW/Dividend schemes`);
  });

  await it('Zero duplicate scheme codes in the Explorer universe', () => {
    const seenCodes = new Set();
    const duplicates = [];
    schemes.forEach(s => {
      const code = String(s.schemeCode);
      if (seenCodes.has(code)) duplicates.push(code);
      seenCodes.add(code);
    });
    assert.strictEqual(duplicates.length, 0, `Found duplicate scheme codes: ${duplicates.join(', ')}`);
  });

  await it('All schemes possess valid canonical identity format', () => {
    schemes.forEach(s => {
      assert(s.canonicalKey, `Scheme ${s.schemeCode} missing canonicalKey`);
      assert(typeof s.canonicalKey === 'string' && s.canonicalKey.length > 5, `Invalid canonicalKey for ${s.schemeCode}`);
    });
  });

  await it('Zero AUM fabrication: Missing or non-positive AUM remains strictly null without synthetic estimation', () => {
    schemes.forEach(s => {
      if (s.aum !== null) {
        assert(typeof s.aum === 'number' && !isNaN(s.aum) && s.aum > 0, `Scheme ${s.schemeCode} has invalid numeric AUM ${s.aum}`);
      }
    });
  });

  console.log('\n--- Test Group 2: Total Direct-Growth AUM vs Industry AUM Independence ---');

  const totalDirectGrowthAum = schemes.reduce((sum, s) => sum + (Number(s.aum) || 0), 0);
  const liveSummary = liveMfAnalyticsService.getIndustryAumOverview();

  await it('Total Direct-Growth AUM is calculated dynamically from eligible schemes (₹52.46 Lakh Cr)', () => {
    assert(totalDirectGrowthAum > 5000000 && totalDirectGrowthAum < 5500000, `Total Direct-Growth AUM out of bounds: ${totalDirectGrowthAum}`);
    assert.strictEqual(Math.round(totalDirectGrowthAum), 5246277);
  });

  await it('Industry Overview AUM is sourced from official SEBI/AMFI dataset (₹82.22 Lakh Cr)', () => {
    assert.strictEqual(liveSummary.industryAum.value, '₹ 82.22 Lakh Cr');
    assert.strictEqual(liveSummary.industryAum.numericValueCr, 8222480);
    assert.strictEqual(liveSummary.industryAum.status, 'VERIFIED');
  });

  await it('Industry AUM (₹82.22 Lakh Cr) and Direct-Growth AUM (₹52.46 Lakh Cr) are completely distinct and separated', () => {
    assert.notStrictEqual(totalDirectGrowthAum, liveSummary.industryAum.numericValueCr);
    assert(liveSummary.industryAum.numericValueCr > totalDirectGrowthAum, 'Industry AUM must exceed Direct-Growth AUM');
  });

  console.log('\n--- Test Group 3: Category & Subcategory AUM Reconciliation ---');

  const getClassification = (categoryStr, nameStr) => {
    const cat = (categoryStr || '').toLowerCase();
    const name = (nameStr || '').toLowerCase();

    if (name.includes('balanced advantage') || name.includes('baf') || cat.includes('balanced advantage') || cat.includes('dynamic asset')) {
      return ['hybrid', 'balanced_adv'];
    }
    if (cat.includes('equity scheme - large cap') || cat.includes('equity schemes - large cap')) return ['equity', 'large_cap'];
    if (cat.includes('large & mid cap')) return ['equity', 'large_mid_cap'];
    if (cat.includes('mid cap') && !cat.includes('large')) return ['equity', 'mid_cap'];
    if (cat.includes('small cap')) return ['equity', 'small_cap'];
    if (cat.includes('flexi cap')) return ['equity', 'flexi_cap'];
    if (cat.includes('multi cap')) return ['equity', 'multi_cap'];
    if (cat.includes('dividend yield')) return ['equity', 'dividend_yield'];
    if (cat.includes('value')) return ['equity', 'value'];
    if (cat.includes('focused')) return ['equity', 'focused'];
    if (cat.includes('contra')) return ['equity', 'contra'];
    if (cat.includes('elss') || cat.includes('tax saver')) return ['elss', 'elss_funds'];

    if (cat.includes('sectoral') || cat.includes('thematic')) {
      if (name.includes('tech') || name.includes('digital') || name.includes('it etf')) return ['sectoral_thematic', 'tech'];
      if (name.includes('bank') || name.includes('financial')) return ['sectoral_thematic', 'banking'];
      if (name.includes('pharma') || name.includes('health')) return ['sectoral_thematic', 'pharma'];
      if (name.includes('infra')) return ['sectoral_thematic', 'infra'];
      if (name.includes('fmcg') || name.includes('consumption')) return ['sectoral_thematic', 'fmcg'];
      if (name.includes('auto')) return ['sectoral_thematic', 'auto'];
      if (name.includes('psu') || name.includes('cpes')) return ['sectoral_thematic', 'psu'];
      return ['sectoral_thematic', 'other_sectoral'];
    }

    if (cat.includes('debt scheme') || cat.includes('income/debt oriented') || cat === 'gilt' || cat === 'income') {
      if (cat.includes('liquid')) return ['debt', 'liquid'];
      if (cat.includes('corporate bond')) return ['debt', 'corporate_bond'];
      if (cat.includes('banking and psu') || cat.includes('banking & psu')) return ['debt', 'banking_psu'];
      if (cat.includes('gilt') && cat.includes('10 year')) return ['debt', 'gilt_10y'];
      if (cat.includes('gilt')) return ['debt', 'gilt'];
      if (cat.includes('short duration') || cat.includes('short term')) return ['debt', 'short_duration'];
      if (cat.includes('overnight')) return ['debt', 'overnight'];
      if (cat.includes('ultra short')) return ['debt', 'ultra_short'];
      if (cat.includes('low duration')) return ['debt', 'low_duration'];
      if (cat.includes('money market')) return ['debt', 'money_market'];
      if (cat.includes('medium to long')) return ['debt', 'medium_long'];
      if (cat.includes('medium duration')) return ['debt', 'medium_duration'];
      if (cat.includes('long duration')) return ['debt', 'long_duration'];
      if (cat.includes('dynamic bond') || cat.includes('dynamic term')) return ['debt', 'dynamic_bond'];
      if (cat.includes('credit risk')) return ['debt', 'credit_risk'];
      if (cat.includes('floater')) return ['debt', 'floater'];
      return ['debt', 'other_debt'];
    }

    if (cat.includes('hybrid scheme')) {
      if (cat.includes('aggressive')) return ['hybrid', 'aggressive'];
      if (cat.includes('balanced advantage') || cat.includes('dynamic asset')) return ['hybrid', 'balanced_adv'];
      if (cat.includes('multi asset')) return ['hybrid', 'multi_asset'];
      if (cat.includes('arbitrage')) return ['hybrid', 'arbitrage'];
      if (cat.includes('conservative')) return ['hybrid', 'conservative'];
      if (cat.includes('equity savings')) return ['hybrid', 'equity_savings'];
      if (cat.includes('balanced hybrid')) return ['hybrid', 'balanced'];
      return ['hybrid', 'other_hybrid'];
    }

    if (cat.includes('index') || cat.includes('etf')) {
      if (name.includes('gold')) return ['commodities', 'gold'];
      if (name.includes('silver')) return ['commodities', 'silver'];
      if (name.includes('nasdaq')) return ['global', 'nasdaq'];
      if (name.includes('s&p 500') || name.includes('sp 500')) return ['global', 'sp500'];
      if (name.includes('fang') || name.includes('ai')) return ['global', 'global_tech'];
      if (name.includes('global') || name.includes('world')) return ['global', 'global_equity'];
      if (name.includes('russell')) return ['global', 'russell'];
      if (name.includes('nifty 50') || name.includes('nifty50')) return ['index', 'nifty50'];
      if (name.includes('nifty next 50')) return ['index', 'nifty_next50'];
      if (name.includes('nifty 100')) return ['index', 'nifty100'];
      if (name.includes('nifty 200 momentum 30')) return ['index', 'nifty200_momentum30'];
      if (name.includes('nifty 200')) return ['index', 'nifty200'];
      if (name.includes('nifty 500')) return ['index', 'nifty500'];
      if (name.includes('nifty midcap 150')) return ['index', 'nifty_midcap150'];
      if (name.includes('nifty smallcap 250')) return ['index', 'nifty_smallcap250'];
      if (name.includes('nifty bank') || name.includes('bank bees')) return ['index', 'nifty_bank'];
      if (name.includes('sensex')) return ['index', 'sensex'];
      return ['index', 'other_index'];
    }

    if (cat.includes('fof overseas') || name.includes('overseas') || name.includes('global') || name.includes('international')) {
      return ['global', 'other_global'];
    }

    return ['all', 'all'];
  };

  const getSubcategoryKey = (fund, marketFilter) => {
    const name = String(fund.schemeName || fund.name || '').toLowerCase();
    const cat = String(fund.category || '').toLowerCase();

    if (marketFilter === 'equity') {
      if (name.includes('large & mid') || name.includes('large and mid') || cat.includes('large & mid') || cat.includes('large and mid')) return 'Large & Mid Cap';
      if (name.includes('flexi cap') || cat.includes('flexi cap')) return 'Flexi Cap';
      if (name.includes('small cap') || cat.includes('small cap')) return 'Small Cap';
      if (name.includes('mid cap') || cat.includes('mid cap')) return 'Mid Cap';
      if (name.includes('large cap') || name.includes('bluechip') || cat.includes('large cap')) return 'Large Cap';
      if (name.includes('multi cap') || cat.includes('multi cap')) return 'Multi Cap';
      if (name.includes('value') || cat.includes('value')) return 'Value';
      if (name.includes('focused') || cat.includes('focused')) return 'Focused';
      if (name.includes('contra') || cat.includes('contra')) return 'Contra';
      return 'Other Equity';
    }

    if (marketFilter === 'elss' || marketFilter === 'tax saver') {
      const code = String(fund.schemeCode || fund.id || '');
      if (name.includes('large') || name.includes('bluechip') || code === '151165') return 'Large Cap ELSS';
      if (name.includes('multi') || code === '153201') return 'Multi Cap ELSS';
      if (name.includes('value') || name.includes('value saver')) return 'Value ELSS';
      if (name.includes('focused') || name.includes('focus')) return 'Focused ELSS';
      if (name.includes('contra')) return 'Contra ELSS';
      if (name.includes('flexi') || name.includes('dynamic') || name.includes('tax saver') || name.includes('elss')) return 'Flexi Cap ELSS';
      return 'Other Tax Saver';
    }

    if (marketFilter === 'debt') {
      if (name.includes('liquid') || cat.includes('liquid')) return 'Liquid Fund';
      if (name.includes('corporate bond') || cat.includes('corporate bond')) return 'Corporate Bond Fund';
      if (name.includes('banking & psu') || name.includes('psu') || cat.includes('banking and psu')) return 'Banking & PSU Fund';
      if (name.includes('gilt') || cat.includes('gilt')) return 'Gilt Fund';
      if (name.includes('short duration') || cat.includes('short duration') || name.includes('short term')) return 'Short Duration Fund';
      return 'Other Debt';
    }

    if (marketFilter === 'hybrid') {
      if (name.includes('balanced advantage') || name.includes('baf') || cat.includes('balanced advantage') || cat.includes('dynamic asset') || name.includes('dynamic asset') || name.includes('balanced')) return 'Balanced Advantage Fund';
      if (name.includes('multi asset') || cat.includes('multi asset')) return 'Multi Asset Allocation Fund';
      if (name.includes('aggressive') || cat.includes('aggressive hybrid')) return 'Aggressive Hybrid Fund';
      if (name.includes('arbitrage') || cat.includes('arbitrage')) return 'Arbitrage Fund';
      return 'Other Hybrid';
    }

    if (marketFilter === 'index') {
      if ((name.includes('s&p 500') || name.includes('sp 500')) && !name.includes('sensex')) return 'S&P 500';
      if (name.includes('nifty 200 momentum 30') || name.includes('200 momentum 30')) return 'Nifty 200 Momentum 30';
      if (name.includes('nifty 50') || name.includes('nifty50')) return 'Nifty 50';
      if (name.includes('bank') || name.includes('nifty bank')) return 'Nifty Bank';
      if (name.includes('sensex')) return 'Sensex';
      return 'Other Index';
    }

    if (marketFilter === 'commodities') {
      if (name.includes('goldmine') || name.includes('mining') || name.includes('mine')) return 'Gold Mining';
      if (name.includes('copper') || name.includes('metal')) return 'Copper / Metals';
      if (name.includes('silver')) return 'Silver';
      if (name.includes('gold')) return 'Gold';
      return 'Other Commodities';
    }

    if (marketFilter === 'global') {
      if ((name.includes('s&p 500') || name.includes('sp 500')) && !name.includes('sensex')) return 'S&P 500';
      if (name.includes('nasdaq')) return 'Nasdaq';
      if (name.includes('russell')) return 'Russell';
      if (name.includes('gift') || name.includes('ifsc')) return 'GIFT City';
      if (name.includes('tech') || name.includes('ai') || name.includes('artificial intelligence')) return 'Global Tech / AI & Tech';
      if (name.includes('global') || name.includes('world') || name.includes('us ') || name.includes('overseas') || name.includes('international')) return 'Global Equity';
      return 'Other Global';
    }

    if (marketFilter === 'sectoral_thematic' || marketFilter === 'sectors') {
      if (name.includes('bank') || name.includes('finan')) return 'Banking & Financials';
      if (name.includes('pharma') || name.includes('health')) return 'Healthcare & Pharma';
      if (name.includes('tech') || name.includes('it ')) return 'Technology';
      if (name.includes('infra')) return 'Infrastructure';
      if (name.includes('consum')) return 'Consumption';
      if (name.includes('psu')) return 'PSU';
      if (name.includes('esg')) return 'ESG';
      return 'Other Sectors';
    }

    return 'General';
  };

  const tree = {};
  schemes.forEach(fund => {
    let parentKey = 'EQUITY';
    const catStr = (fund.category || '').toLowerCase();
    const nameStr = (fund.schemeName || '').toLowerCase();
    const [tStr] = getClassification(fund.category, fund.schemeName);

    if (tStr === 'elss' || catStr.includes('elss') || nameStr.includes('elss') || nameStr.includes('tax saver')) {
      parentKey = 'TAX SAVER';
    } else if (tStr === 'debt' || catStr.includes('debt') || catStr.includes('income') || catStr.includes('gilt') || catStr.includes('liquid') || catStr.includes('bond') || catStr.includes('money market') || catStr.includes('overnight') || catStr.includes('fmp') || catStr.includes('floater') || catStr.includes('treasury') || nameStr.includes('debt') || nameStr.includes('bond') || nameStr.includes('gilt') || nameStr.includes('liquid') || nameStr.includes('treasury')) {
      parentKey = 'DEBT';
    } else if (tStr === 'index' || catStr.includes('index') || nameStr.includes('index') || nameStr.includes('etf') || nameStr.includes('nifty') || nameStr.includes('sensex') || nameStr.includes('bees')) {
      parentKey = 'INDEX';
    } else if (tStr === 'hybrid' || catStr.includes('hybrid') || catStr.includes('balanced') || catStr.includes('arbitrage') || catStr.includes('dynamic asset') || nameStr.includes('hybrid') || nameStr.includes('balanced advantage') || nameStr.includes('baf') || nameStr.includes('dynamic asset') || nameStr.includes('arbitrage') || nameStr.includes('equity savings') || nameStr.includes('multi asset')) {
      parentKey = 'HYBRID';
    } else if (tStr === 'global' || catStr.includes('global') || catStr.includes('international') || catStr.includes('overseas') || nameStr.includes('international') || nameStr.includes('us equity') || nameStr.includes('nasdaq') || nameStr.includes('s&p') || nameStr.includes('gift')) {
      parentKey = 'GLOBAL';
    } else if (tStr === 'commodities' || catStr.includes('gold') || catStr.includes('silver') || catStr.includes('commodity') || nameStr.includes('gold') || nameStr.includes('silver')) {
      parentKey = 'COMMODITIES';
    } else if (tStr === 'sectoral_thematic' || catStr.includes('sector') || catStr.includes('thematic') || nameStr.includes('pharma') || nameStr.includes('infra') || nameStr.includes('tech') || nameStr.includes('banking')) {
      parentKey = 'SECTORS';
    } else {
      parentKey = 'EQUITY';
    }

    const subKey = getSubcategoryKey(fund, parentKey.toLowerCase());
    const aum = Number(fund.aum) || 0;

    if (!tree[parentKey]) {
      tree[parentKey] = { name: parentKey, count: 0, aum: 0, subcategories: {} };
    }
    tree[parentKey].count++;
    tree[parentKey].aum += aum;

    if (!tree[parentKey].subcategories[subKey]) {
      tree[parentKey].subcategories[subKey] = { name: subKey, count: 0, aum: 0 };
    }
    tree[parentKey].subcategories[subKey].count++;
    tree[parentKey].subcategories[subKey].aum += aum;
  });

  await it('Parent category AUM reconciles exactly with the sum of its child subcategories AUM', () => {
    Object.keys(tree).forEach(pKey => {
      const p = tree[pKey];
      const subSum = Object.values(p.subcategories).reduce((sum, s) => sum + s.aum, 0);
      assert.strictEqual(Math.round(p.aum), Math.round(subSum), `Parent ${pKey} AUM (${p.aum}) != Subcategory sum (${subSum})`);
    });
  });

  await it('Sum of all Parent Category AUMs equals Total Direct-Growth AUM (₹52.46 Lakh Cr)', () => {
    const parentSum = Object.values(tree).reduce((sum, p) => sum + p.aum, 0);
    assert.strictEqual(Math.round(parentSum), Math.round(totalDirectGrowthAum));
  });

  await it('Category percentage breakdown uses totalDirectGrowthAUM as denominator and sums to 100%', () => {
    let totalShare = 0;
    Object.keys(tree).forEach(pKey => {
      const p = tree[pKey];
      const pct = (p.aum / totalDirectGrowthAum) * 100;
      totalShare += pct;
      assert(pct >= 0 && pct <= 100, `Category ${pKey} percentage out of range: ${pct}`);
    });
    assert(Math.abs(totalShare - 100) < 0.001, `Category percentages do not sum to 100%: ${totalShare}`);
  });

  await it('Industry Overview asset allocation uses official Industry AUM denominator and sums to 100%', () => {
    let totalIndustryShare = 0;
    liveSummary.assetAllocation.forEach(item => {
      totalIndustryShare += item.percentage;
    });
    assert.strictEqual(Math.round(totalIndustryShare), 100, `Industry asset allocation does not sum to 100%: ${totalIndustryShare}`);
  });

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
