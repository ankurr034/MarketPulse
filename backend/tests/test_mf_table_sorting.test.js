import assert from 'assert';

console.log('🧪 Running Comprehensive MF Table Column Sorting Unit Test Suite...\n');

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

// Emulate getFieldValue & sortFundsList logic from MfRankingTable.jsx
const getFieldValue = (fund, field) => {
  if (!fund) return null;
  if (field === 'aum') {
    const val = fund.aum != null ? Number(fund.aum) : null;
    return val != null && !isNaN(val) && val > 0 ? val : null;
  }
  if (field === 'nav') {
    const val = fund.nav != null ? Number(fund.nav) : null;
    return val != null && !isNaN(val) && val > 0 ? val : null;
  }
  if (field === 'return_1W') {
    const val = fund.returns?.['1W'] ?? fund.oneWeekChangePct;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_1M') {
    const val = fund.returns?.['1M'] ?? fund.oneMonthChangePct;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_3M') {
    const val = fund.returns?.['3M'] ?? fund.threeMonthChangePct;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_6M') {
    const val = fund.returns?.['6M'] ?? fund.sixMonthChangePct;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_1Y') {
    const val = fund.returns?.['1Y'] ?? fund.oneYearChangePct ?? fund.oneYrReturn;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_3Y') {
    const val = fund.returns?.['3Y'] ?? fund.threeYearCagr;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_5Y') {
    const val = fund.returns?.['5Y'] ?? fund.fiveYearCagr;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'return_All') {
    const val = fund.returns?.['All'] ?? fund.inceptionCagr ?? fund.sinceInceptionReturn;
    return val != null && !isNaN(val) ? Number(val) : null;
  }
  if (field === 'sharpeRatio') {
    const val = fund.sharpeRatio != null ? Number(fund.sharpeRatio) : null;
    return val != null && !isNaN(val) ? val : null;
  }
  if (field === 'sortinoRatio') {
    const val = fund.sortinoRatio != null ? Number(fund.sortinoRatio) : null;
    return val != null && !isNaN(val) ? val : null;
  }
  if (field === 'name') {
    const n = fund.name || fund.schemeName;
    return n ? String(n).trim() : null;
  }
  return null;
};

const sortFundsList = (list, sortField, sortOrder) => {
  if (!list || list.length === 0) return [];
  if (!sortField || !sortOrder) return list;

  const copy = [...list];
  copy.sort((a, b) => {
    const aVal = getFieldValue(a, sortField);
    const bVal = getFieldValue(b, sortField);

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1; // nulls last
    if (bVal == null) return -1; // nulls last

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
  return copy;
};

// 3-click state transition simulation
function createSortState() {
  let sortField = null;
  let sortOrder = null;

  return {
    click: (field) => {
      if (sortField === field) {
        if (sortOrder === 'desc') {
          sortOrder = 'asc';
        } else if (sortOrder === 'asc') {
          sortField = null;
          sortOrder = null;
        } else {
          sortOrder = 'desc';
        }
      } else {
        sortField = field;
        sortOrder = field === 'name' ? 'asc' : 'desc';
      }
      return { sortField, sortOrder };
    },
    getState: () => ({ sortField, sortOrder })
  };
}

console.log('--- Test Group 1: Three-Click Sorting State Cycle ---');

it('Initial state is null / un-sorted (default ordering preserved)', () => {
  const sorter = createSortState();
  assert.deepStrictEqual(sorter.getState(), { sortField: null, sortOrder: null });
});

it('First click on AUM sets sortField=aum, sortOrder=desc', () => {
  const sorter = createSortState();
  const state = sorter.click('aum');
  assert.deepStrictEqual(state, { sortField: 'aum', sortOrder: 'desc' });
});

it('Second click on AUM reverses sortOrder to asc', () => {
  const sorter = createSortState();
  sorter.click('aum');
  const state = sorter.click('aum');
  assert.deepStrictEqual(state, { sortField: 'aum', sortOrder: 'asc' });
});

it('Third click on AUM resets sortField=null, sortOrder=null (exact default order restored)', () => {
  const sorter = createSortState();
  sorter.click('aum');
  sorter.click('aum');
  const state = sorter.click('aum');
  assert.deepStrictEqual(state, { sortField: null, sortOrder: null });
});

it('Fourth click on AUM restarts cycle with desc', () => {
  const sorter = createSortState();
  sorter.click('aum');
  sorter.click('aum');
  sorter.click('aum');
  const state = sorter.click('aum');
  assert.deepStrictEqual(state, { sortField: 'aum', sortOrder: 'desc' });
});

it('Switching columns resets cycle to first click (desc for numeric)', () => {
  const sorter = createSortState();
  sorter.click('aum'); // 1st click desc
  sorter.click('aum'); // 2nd click asc
  const state = sorter.click('return_1Y'); // switch to 1Y
  assert.deepStrictEqual(state, { sortField: 'return_1Y', sortOrder: 'desc' });
});

console.log('\n--- Test Group 2: Numeric Sorting vs String Comparison ---');

const sampleFunds = [
  { schemeCode: '1', name: 'Fund A', aum: 8000, nav: 45.2, returns: { '1W': 1.2, '1M': 3.5, '3M': 7.1, '6M': 12.0, '1Y': 18.5, '3Y': 14.5, '5Y': 16.2, 'All': 18.2 }, sharpeRatio: 0.89, sortinoRatio: 1.37 },
  { schemeCode: '2', name: 'Fund B', aum: 2000, nav: 120.5, returns: { '1W': -0.5, '1M': 1.2, '3M': 4.2, '6M': 8.5, '1Y': 12.0, '3Y': 11.2, '5Y': 13.0, 'All': 15.0 }, sharpeRatio: 0.63, sortinoRatio: 0.94 },
  { schemeCode: '3', name: 'Fund C', aum: 12000, nav: 15.8, returns: { '1W': 2.1, '1M': 4.8, '3M': 9.0, '6M': 15.2, '1Y': 24.5, '3Y': 19.1, '5Y': 21.0, 'All': 22.5 }, sharpeRatio: 1.12, sortinoRatio: 1.85 },
  { schemeCode: '4', name: 'Fund D', aum: 500, nav: 250.0, returns: { '1W': 0.1, '1M': 0.8, '3M': 2.1, '6M': 5.0, '1Y': 8.5, '3Y': 9.0, '5Y': 10.5, 'All': 12.0 }, sharpeRatio: 0.45, sortinoRatio: 0.65 },
  { schemeCode: '5', name: 'Fund E', aum: 5000, nav: 88.0, returns: { '1W': 0.8, '1M': 2.5, '3M': 5.5, '6M': 10.1, '1Y': 16.0, '3Y': 13.8, '5Y': 15.0, 'All': 16.5 }, sharpeRatio: 0.75, sortinoRatio: 1.15 },
  { schemeCode: '6', name: 'Fund F (Unavailable)', aum: null, nav: null, returns: {}, sharpeRatio: null, sortinoRatio: null }
];

it('AUM Descending sorts: C(12k) -> A(8k) -> E(5k) -> B(2k) -> D(500) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'aum', 'desc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['3', '1', '5', '2', '4', '6']);
});

it('AUM Ascending sorts: D(500) -> B(2k) -> E(5k) -> A(8k) -> C(12k) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'aum', 'asc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['4', '2', '5', '1', '3', '6']);
});

it('Default (null/null) returns original exact order: A -> B -> C -> D -> E -> F', () => {
  const sorted = sortFundsList(sampleFunds, null, null);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['1', '2', '3', '4', '5', '6']);
});

it('NAV Descending sorts: D(250) -> B(120.5) -> E(88) -> A(45.2) -> C(15.8) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'nav', 'desc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['4', '2', '5', '1', '3', '6']);
});

it('1Y Return Descending sorts: C(24.5%) -> A(18.5%) -> E(16.0%) -> B(12.0%) -> D(8.5%) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'return_1Y', 'desc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['3', '1', '5', '2', '4', '6']);
});

it('3Y CAGR Descending sorts: C(19.1%) -> A(14.5%) -> E(13.8%) -> B(11.2%) -> D(9.0%) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'return_3Y', 'desc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['3', '1', '5', '2', '4', '6']);
});

it('Inception CAGR Descending sorts: C(22.5%) -> A(18.2%) -> E(16.5%) -> B(15.0%) -> D(12.0%) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'return_All', 'desc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['3', '1', '5', '2', '4', '6']);
});

it('Sharpe Ratio Descending sorts: C(1.12) -> A(0.89) -> E(0.75) -> B(0.63) -> D(0.45) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'sharpeRatio', 'desc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['3', '1', '5', '2', '4', '6']);
});

it('Sortino Ratio Ascending sorts: D(0.65) -> B(0.94) -> E(1.15) -> A(1.37) -> C(1.85) -> F(null last)', () => {
  const sorted = sortFundsList(sampleFunds, 'sortinoRatio', 'asc');
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['4', '2', '5', '1', '3', '6']);
});

console.log('\n--- Test Group 3: Null & Unavailable Values Always Placed Last ---');

it('Nulls placed last on descending sort', () => {
  const listWithNulls = [
    { schemeCode: '1', aum: null },
    { schemeCode: '2', aum: 500 },
    { schemeCode: '3', aum: null },
    { schemeCode: '4', aum: 1000 }
  ];
  const sorted = sortFundsList(listWithNulls, 'aum', 'desc');
  assert.strictEqual(sorted[0].schemeCode, '4'); // 1000
  assert.strictEqual(sorted[1].schemeCode, '2'); // 500
  assert.ok(sorted[2].aum === null && sorted[3].aum === null);
});

it('Nulls placed last on ascending sort', () => {
  const listWithNulls = [
    { schemeCode: '1', aum: null },
    { schemeCode: '2', aum: 500 },
    { schemeCode: '3', aum: null },
    { schemeCode: '4', aum: 1000 }
  ];
  const sorted = sortFundsList(listWithNulls, 'aum', 'asc');
  assert.strictEqual(sorted[0].schemeCode, '2'); // 500
  assert.strictEqual(sorted[1].schemeCode, '4'); // 1000
  assert.ok(sorted[2].aum === null && sorted[3].aum === null);
});

console.log('\n====================================================');
console.log('TOTAL TESTS: ' + (passedTests + failedTests));
console.log('PASSED: ' + passedTests);
console.log('FAILED: ' + failedTests);
console.log('====================================================\n');

if (failedTests > 0) process.exit(1);
