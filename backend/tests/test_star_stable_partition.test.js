import assert from 'assert';

console.log('🧪 Running Comprehensive Top 10 5Y & Inception Star with Top 10 5Y AUM Fallback Unit Test Suite...\n');

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

// Function mirroring rankCategoryTop5 logic from MfRankingTable.jsx
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

  return { display5, fullList, sharpeRange, sortinoRange, commonFunds, top3Starred, starredFunds, nonStarredFunds };
};

console.log('--- Test Group 1: 3 or more common funds ---');

it('When >= 3 funds are common in Top 10 5Y & Inception, selects Top 3 by AUM and arranges rest by AUM', () => {
  const input = [
    { name: 'Fund A', aum: 50000, returns: { '5Y': 25, 'All': 20 } },
    { name: 'Fund B', aum: 40000, returns: { '5Y': 24, 'All': 19 } },
    { name: 'Fund C', aum: 30000, returns: { '5Y': 23, 'All': 18 } },
    { name: 'Fund D', aum: 20000, returns: { '5Y': 22, 'All': 17 } },
    { name: 'Fund E', aum: 10000, returns: { '5Y': 21, 'All': 16 } }
  ];

  const { fullList, top3Starred } = rankCategoryTop5(input);
  const starredNames = top3Starred.map(f => f.name);

  assert.deepStrictEqual(starredNames, ['Fund A', 'Fund B', 'Fund C']);
  assert.strictEqual(fullList[0].name, 'Fund A');
  assert.strictEqual(fullList[0].isStarred, true);
  assert.strictEqual(fullList[1].name, 'Fund B');
  assert.strictEqual(fullList[1].isStarred, true);
  assert.strictEqual(fullList[2].name, 'Fund C');
  assert.strictEqual(fullList[2].isStarred, true);
  // Non-starred funds in Top 10 arranged by AUM large to small: Fund D (20k), Fund E (10k)
  assert.strictEqual(fullList[3].name, 'Fund D');
  assert.strictEqual(fullList[3].isStarred, false);
  assert.strictEqual(fullList[4].name, 'Fund E');
  assert.strictEqual(fullList[4].isStarred, false);
});

console.log('\n--- Test Group 2: Fallback when only 1 or 2 funds are common ---');

it('When only 1 fund is common in Top 10 5Y & Inception, fills up to 3 from Top 10 5Y by AUM', () => {
  const input = [
    { name: 'Common Fund', aum: 10000, returns: { '5Y': 30, 'All': 30 } }, // 1 Common
    { name: 'Top 5Y High AUM 1', aum: 90000, returns: { '5Y': 29, 'All': 1 } },
    { name: 'Top 5Y High AUM 2', aum: 80000, returns: { '5Y': 28, 'All': 2 } },
    { name: 'Top 5Y Low AUM', aum: 5000, returns: { '5Y': 27, 'All': 3 } },
    { name: 'Top 5Y 4', aum: 6000, returns: { '5Y': 26, 'All': 4 } },
    { name: 'Top 5Y 5', aum: 6000, returns: { '5Y': 25, 'All': 5 } },
    { name: 'Top 5Y 6', aum: 6000, returns: { '5Y': 24, 'All': 6 } },
    { name: 'Top 5Y 7', aum: 6000, returns: { '5Y': 23, 'All': 7 } },
    { name: 'Top 5Y 8', aum: 6000, returns: { '5Y': 22, 'All': 8 } },
    { name: 'Top 5Y 9', aum: 6000, returns: { '5Y': 21, 'All': 9 } },
    // 9 Inception only funds
    { name: 'Inc 1', aum: 7000, returns: { '5Y': 1, 'All': 29 } },
    { name: 'Inc 2', aum: 7000, returns: { '5Y': 2, 'All': 28 } },
    { name: 'Inc 3', aum: 7000, returns: { '5Y': 3, 'All': 27 } },
    { name: 'Inc 4', aum: 7000, returns: { '5Y': 4, 'All': 26 } },
    { name: 'Inc 5', aum: 7000, returns: { '5Y': 5, 'All': 25 } },
    { name: 'Inc 6', aum: 7000, returns: { '5Y': 6, 'All': 24 } },
    { name: 'Inc 7', aum: 7000, returns: { '5Y': 7, 'All': 23 } },
    { name: 'Inc 8', aum: 7000, returns: { '5Y': 8, 'All': 22 } },
    { name: 'Inc 9', aum: 7000, returns: { '5Y': 9, 'All': 21 } }
  ];

  const { fullList, starredFunds } = rankCategoryTop5(input);
  assert.strictEqual(starredFunds.length, 3);
  
  // All 3 starred funds are arranged by AUM large to small
  assert.strictEqual(fullList[0].name, 'Top 5Y High AUM 1'); // 90k
  assert.strictEqual(fullList[0].isStarred, true);
  assert.strictEqual(fullList[1].name, 'Top 5Y High AUM 2'); // 80k
  assert.strictEqual(fullList[1].isStarred, true);
  assert.strictEqual(fullList[2].name, 'Common Fund');        // 10k
  assert.strictEqual(fullList[2].isStarred, true);

  // Non-starred funds in Top 10 5Y by AUM
  assert.strictEqual(fullList[3].name, 'Top 5Y 4');
  assert.strictEqual(fullList[3].isStarred, false);
});

console.log('\n--- Test Group 3: Data Validation ---');

it('Fund with missing AUM does not qualify as starred', () => {
  const input = [
    { name: 'Missing AUM', aum: null, returns: { '5Y': 30, 'All': 30 } },
    { name: 'Valid 1', aum: 5000, returns: { '5Y': 25, 'All': 25 } },
    { name: 'Valid 2', aum: 4000, returns: { '5Y': 24, 'All': 24 } },
    { name: 'Valid 3', aum: 3000, returns: { '5Y': 23, 'All': 23 } }
  ];

  const { fullList } = rankCategoryTop5(input);
  const missingAum = fullList.find(f => f.name === 'Missing AUM');
  assert.strictEqual(missingAum.isStarred, false);
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
