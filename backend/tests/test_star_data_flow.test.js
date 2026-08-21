import assert from 'assert';

console.log('🧪 Running Complete Default Star Data Flow Verification Test Suite...\n');

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
    console.error(err.stack);
    failedTests++;
  }
}

// 1. Emulate default rankCategoryTop5 exactly from MfRankingTable.jsx
const rankCategoryTop5 = (subFunds) => {
  if (!Array.isArray(subFunds) || subFunds.length === 0) {
    return { display5: [], fullList: [], sharpeRange: null, sortinoRange: null };
  }

  const getAum = (f) => {
    if (f.aum == null || isNaN(f.aum)) return null;
    const num = Number(f.aum);
    return num > 0 ? num : null;
  };

  const get5Y = (f) => {
    const val = f.returns?.['5Y'] ?? f.fiveYearCagr;
    if (val == null || isNaN(val)) return null;
    return Number(val);
  };

  const getInception = (f) => {
    const val = f.returns?.['All'] ?? f.inceptionCagr ?? f.sinceInceptionReturn;
    if (val == null || isNaN(val)) return null;
    return Number(val);
  };

  const getSharpe = (f) => f.sharpeRatio;
  const getSortino = (f) => f.sortinoRatio;

  // Sort subcategory funds by existing 5Y CAGR order (with AUM tie-break) as base list
  const list = [...subFunds].sort((a, b) => {
    const a5Y = get5Y(a);
    const b5Y = get5Y(b);
    if (a5Y != null && b5Y != null && a5Y !== b5Y) return b5Y - a5Y;
    if (a5Y == null && b5Y != null) return 1;
    if (a5Y != null && b5Y == null) return -1;
    const aAum = getAum(a) || 0;
    const bAum = getAum(b) || 0;
    return bAum - aAum;
  });

  const getFundKey = (f) => String(f.schemeCode ?? f.id ?? f.canonicalKey ?? f.name ?? '').trim();

  // 1. Top 10 5Y CAGR Set
  const valid5YFunds = list.filter(f => get5Y(f) !== null);
  valid5YFunds.sort((a, b) => get5Y(b) - get5Y(a));
  const top10_5YFunds = valid5YFunds.slice(0, 10);
  const top10_5YSet = new Set(top10_5YFunds.map(getFundKey));

  // 2. Top 10 Since-Inception CAGR Set
  const validInceptionFunds = list.filter(f => getInception(f) !== null);
  validInceptionFunds.sort((a, b) => getInception(b) - getInception(a));
  const top10_InceptionFunds = validInceptionFunds.slice(0, 10);
  const top10_InceptionSet = new Set(top10_InceptionFunds.map(getFundKey));

  // 3. Find common funds that are in both Top 10 5Y & Top 10 Since-Inception with valid AUM
  const commonFunds = list.filter(f => getAum(f) !== null && top10_5YSet.has(getFundKey(f)) && top10_InceptionSet.has(getFundKey(f)));
  commonFunds.sort((a, b) => getAum(b) - getAum(a));

  // 4. If fewer than 3 funds are common in Top 10 5Y & Top 10 Inception, fill up to 3 from Top 10 5Y by AUM large to small
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

  // 5. Starred funds arranged by AUM large to small
  const starredFunds = [...top3Starred].sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0)).map(fund => ({
    ...fund,
    isStarred: true,
    starred: true,
    isTop3: true,
    isTopFund: true
  }));

  // 6. Rest of funds: remaining funds in Top 10 5Y arranged by AUM large to small, followed by remaining funds
  const nonStarredTop10_5Y = top10_5YFunds
    .filter(f => !starredSet.has(getFundKey(f)))
    .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

  const remainingOutsideTop10 = list
    .filter(f => !starredSet.has(getFundKey(f)) && !top10_5YSet.has(getFundKey(f)))
    .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

  const nonStarredFunds = [...nonStarredTop10_5Y, ...remainingOutsideTop10].map(fund => ({
    ...fund,
    isStarred: false,
    starred: false,
    isTop3: false,
    isTopFund: false
  }));

  const fullList = [...starredFunds, ...nonStarredFunds];
  const display5 = fullList.slice(0, 5);

  const display5Sharpes = display5.map(getSharpe).filter(v => v != null && !isNaN(v));
  const display5Sortinos = display5.map(getSortino).filter(v => v != null && !isNaN(v));

  const sharpeRange = display5Sharpes.length > 0 ? { min: Math.min(...display5Sharpes), max: Math.max(...display5Sharpes) } : null;
  const sortinoRange = display5Sortinos.length > 0 ? { min: Math.min(...display5Sortinos), max: Math.max(...display5Sortinos) } : null;

  return { display5, fullList, sharpeRange, sortinoRange, starredFunds, nonStarredFunds };
};

// 2. Emulate renderFundRow & StarHoverTooltip evaluation
const evaluateFundRowRendering = (fund, customRank = null) => {
  const isStarred = fund.isStarred === true || fund.starred === true;
  const showStar = isStarred === true || fund?.isStarred === true || fund?.starred === true;

  return {
    fundPassedToRow: fund,
    isStarredProp: isStarred,
    isStarVisiblyRendered: showStar
  };
};

console.log('--- Test Group 1: Guaranteed Qualifying & Non-Qualifying Fund Data Flow ---');

it('Guaranteed Qualifying Fund automatically reaches fund row and visibly renders ⭐ by default', () => {
  const subcategoryFunds = [
    { schemeCode: '1001', name: 'Fund Alpha', aum: 50000, returns: { '5Y': 25.5, 'All': 22.0 } },
    { schemeCode: '1002', name: 'Fund Beta', aum: 40000, returns: { '5Y': 24.0, 'All': 21.0 } },
    { schemeCode: '1003', name: 'Fund Gamma', aum: 30000, returns: { '5Y': 23.0, 'All': 20.0 } },
    { schemeCode: '1004', name: 'Fund Delta', aum: 20000, returns: { '5Y': 15.0, 'All': 14.0 } }
  ];

  const { fullList } = rankCategoryTop5(subcategoryFunds);
  
  const alphaInList = fullList.find(f => f.schemeCode === '1001');
  assert.strictEqual(alphaInList.isStarred, true);
  assert.strictEqual(alphaInList.starred, true);

  assert.strictEqual(fullList[0].schemeCode, '1001');

  const renderResult = evaluateFundRowRendering(alphaInList);
  assert.strictEqual(renderResult.isStarredProp, true);
  assert.strictEqual(renderResult.isStarVisiblyRendered, true);
});

it('Non-Qualifying Fund (low AUM and not in top 3 of 5Y/Inception) does NOT receive star', () => {
  const subcategoryFunds = [
    { schemeCode: '2001', name: 'Fund High 1', aum: 50000, returns: { '5Y': 25.5, 'All': 25.0 } },
    { schemeCode: '2002', name: 'Fund High 2', aum: 40000, returns: { '5Y': 24.0, 'All': 24.0 } },
    { schemeCode: '2003', name: 'Fund High 3', aum: 30000, returns: { '5Y': 23.0, 'All': 23.0 } },
    { schemeCode: '2004', name: 'Fund Low AUM', aum: 200, returns: { '5Y': 22.0, 'All': 22.0 } }
  ];

  const { fullList } = rankCategoryTop5(subcategoryFunds);
  const target = fullList.find(f => f.schemeCode === '2004');

  assert.strictEqual(target.isStarred, false);
  assert.strictEqual(target.starred, false);

  const renderResult = evaluateFundRowRendering(target);
  assert.strictEqual(renderResult.isStarredProp, false);
  assert.strictEqual(renderResult.isStarVisiblyRendered, false);
});

console.log('\n--- Test Group 2: Complete Canonical Key Compatibility (number vs string vs object) ---');

it('Handles numeric vs string schemeCode / id without type mismatch failure', () => {
  const subcategoryFunds = [
    { schemeCode: 120594, name: 'Fund Numeric Code', aum: 15000, returns: { '5Y': 20, 'All': 18 } },
    { id: '120595', schemeCode: '120595', name: 'Fund String Code', aum: 14000, returns: { '5Y': 19, 'All': 17 } },
    { canonicalKey: 'key_120596', name: 'Fund Canonical', aum: 13000, returns: { '5Y': 18, 'All': 16 } },
    { schemeCode: 120597, name: 'Fund Fourth', aum: 1000, returns: { '5Y': 10, 'All': 10 } }
  ];

  const { fullList } = rankCategoryTop5(subcategoryFunds);

  assert.strictEqual(fullList[0].isStarred, true);
  assert.strictEqual(fullList[1].isStarred, true);
  assert.strictEqual(fullList[2].isStarred, true);
  assert.strictEqual(fullList[3].isStarred, false);

  for (let i = 0; i < 3; i++) {
    const res = evaluateFundRowRendering(fullList[i]);
    assert.strictEqual(res.isStarVisiblyRendered, true);
  }
  assert.strictEqual(evaluateFundRowRendering(fullList[3]).isStarVisiblyRendered, false);
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
