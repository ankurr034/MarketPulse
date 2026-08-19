import assert from 'assert';

console.log('🧪 Running Comprehensive Multi-Column / Two-Factor Fund Sorting Unit Test Suite...\n');

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

const sortFundsList = (list, sortCriteria) => {
  if (!list || list.length === 0) return [];
  if (!sortCriteria || sortCriteria.length === 0) return list;

  const copy = [...list];
  copy.sort((a, b) => {
    for (let i = 0; i < sortCriteria.length; i++) {
      const { field, order } = sortCriteria[i];
      const aVal = getFieldValue(a, field);
      const bVal = getFieldValue(b, field);

      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1; // nulls last
      if (bVal == null) return -1; // nulls last

      let diff = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        diff = order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        diff = order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  });
  return copy;
};

// 2-Factor Multi-Sort State Manager Simulation
function createMultiSortState() {
  let sortCriteria = [];

  return {
    click: (field) => {
      const existingIndex = sortCriteria.findIndex(c => c.field === field);
      const defaultOrder = field === 'name' ? 'asc' : 'desc';

      if (existingIndex !== -1) {
        const currentOrder = sortCriteria[existingIndex].order;
        if (currentOrder === 'desc') {
          const next = [...sortCriteria];
          next[existingIndex] = { field, order: 'asc' };
          sortCriteria = next;
        } else if (currentOrder === 'asc') {
          sortCriteria = sortCriteria.filter((_, idx) => idx !== existingIndex);
        } else {
          const next = [...sortCriteria];
          next[existingIndex] = { field, order: defaultOrder };
          sortCriteria = next;
        }
      } else {
        const newEntry = { field, order: defaultOrder };
        if (sortCriteria.length < 2) {
          sortCriteria = [...sortCriteria, newEntry];
        } else {
          // Max 2: replace oldest, keep 2nd as primary, new as secondary
          sortCriteria = [sortCriteria[1], newEntry];
        }
      }
      return sortCriteria;
    },
    getState: () => sortCriteria
  };
}

console.log('--- Test Group 1: Two-Factor Multi-Sort State Transitions & Limits ---');

it('Initial state is empty array (0 active sort criteria)', () => {
  const sorter = createMultiSortState();
  assert.deepStrictEqual(sorter.getState(), []);
});

it('Clicking AUM activates AUM desc as Primary (1 active filter)', () => {
  const sorter = createMultiSortState();
  const state = sorter.click('aum');
  assert.deepStrictEqual(state, [{ field: 'aum', order: 'desc' }]);
});

it('Clicking 5Y CAGR adds it as Secondary (2 active filters)', () => {
  const sorter = createMultiSortState();
  sorter.click('aum');
  const state = sorter.click('return_5Y');
  assert.deepStrictEqual(state, [
    { field: 'aum', order: 'desc' },
    { field: 'return_5Y', order: 'desc' }
  ]);
});

it('Clicking 5Y CAGR again toggles its direction to asc in place', () => {
  const sorter = createMultiSortState();
  sorter.click('aum');
  sorter.click('return_5Y');
  const state = sorter.click('return_5Y');
  assert.deepStrictEqual(state, [
    { field: 'aum', order: 'desc' },
    { field: 'return_5Y', order: 'asc' }
  ]);
});

it('Clicking 5Y CAGR 3rd time removes it, leaving AUM desc as sole primary', () => {
  const sorter = createMultiSortState();
  sorter.click('aum');
  sorter.click('return_5Y');
  sorter.click('return_5Y');
  const state = sorter.click('return_5Y');
  assert.deepStrictEqual(state, [{ field: 'aum', order: 'desc' }]);
});

it('Clicking 3rd column shifts out oldest (MAX 2 FILTER RULE)', () => {
  const sorter = createMultiSortState();
  sorter.click('aum'); // Primary = AUM
  sorter.click('return_5Y'); // Secondary = 5Y
  const state = sorter.click('sharpeRatio'); // Click Sharpe
  assert.deepStrictEqual(state, [
    { field: 'return_5Y', order: 'desc' },
    { field: 'sharpeRatio', order: 'desc' }
  ]);
  assert.strictEqual(state.length, 2);
});

console.log('\n--- Test Group 2: Two-Factor Primary & Tie-Breaking Sorting Execution ---');

const testFunds = [
  { schemeCode: 'A', name: 'Fund A', aum: 10000, returns: { '1Y': 18.0, '3Y': 14.0, '5Y': 15.0, 'All': 18.0 }, sharpeRatio: 0.85, sortinoRatio: 1.30 },
  { schemeCode: 'B', name: 'Fund B', aum: 10000, returns: { '1Y': 22.0, '3Y': 16.0, '5Y': 20.0, 'All': 22.0 }, sharpeRatio: 1.10, sortinoRatio: 1.70 },
  { schemeCode: 'C', name: 'Fund C', aum: 8000,  returns: { '1Y': 25.0, '3Y': 19.0, '5Y': 25.0, 'All': 24.0 }, sharpeRatio: 1.25, sortinoRatio: 2.10 },
  { schemeCode: 'D', name: 'Fund D', aum: 5000,  returns: { '1Y': 10.0, '3Y': 11.0, '5Y': 12.0, 'All': 14.0 }, sharpeRatio: 0.60, sortinoRatio: 0.90 },
  { schemeCode: 'E', name: 'Fund E', aum: 5000,  returns: { '1Y': 15.0, '3Y': 13.0, '5Y': 16.0, 'All': 16.0 }, sharpeRatio: 0.90, sortinoRatio: 1.40 },
  { schemeCode: 'F', name: 'Fund F (Null AUM & 5Y)', aum: null, returns: {}, sharpeRatio: null, sortinoRatio: null }
];

it('AUM ↓ + 5Y CAGR ↓ : Fund B (10k/20%) -> Fund A (10k/15%) -> Fund C (8k/25%) -> Fund E (5k/16%) -> Fund D (5k/12%) -> Fund F', () => {
  const criteria = [{ field: 'aum', order: 'desc' }, { field: 'return_5Y', order: 'desc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['B', 'A', 'C', 'E', 'D', 'F']);
});

it('AUM ↓ + 5Y CAGR ↑ : Fund A (10k/15%) -> Fund B (10k/20%) -> Fund C (8k/25%) -> Fund D (5k/12%) -> Fund E (5k/16%) -> Fund F', () => {
  const criteria = [{ field: 'aum', order: 'desc' }, { field: 'return_5Y', order: 'asc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['A', 'B', 'C', 'D', 'E', 'F']);
});

it('AUM ↑ + 5Y CAGR ↓ : Fund E (5k/16%) -> Fund D (5k/12%) -> Fund C (8k/25%) -> Fund B (10k/20%) -> Fund A (10k/15%) -> Fund F', () => {
  const criteria = [{ field: 'aum', order: 'asc' }, { field: 'return_5Y', order: 'desc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['E', 'D', 'C', 'B', 'A', 'F']);
});

it('AUM ↑ + 5Y CAGR ↑ : Fund D (5k/12%) -> Fund E (5k/16%) -> Fund C (8k/25%) -> Fund A (10k/15%) -> Fund B (10k/20%) -> Fund F', () => {
  const criteria = [{ field: 'aum', order: 'asc' }, { field: 'return_5Y', order: 'asc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['D', 'E', 'C', 'A', 'B', 'F']);
});

it('5Y CAGR ↓ + SHARPE ↓ : C(25%) -> B(20%) -> E(16%) -> A(15%) -> D(12%) -> F(null)', () => {
  const criteria = [{ field: 'return_5Y', order: 'desc' }, { field: 'sharpeRatio', order: 'desc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['C', 'B', 'E', 'A', 'D', 'F']);
});

it('5Y CAGR ↓ + SORTINO ↓ : C(25%/2.1) -> B(20%/1.7) -> E(16%/1.4) -> A(15%/1.3) -> D(12%/0.9) -> F', () => {
  const criteria = [{ field: 'return_5Y', order: 'desc' }, { field: 'sortinoRatio', order: 'desc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['C', 'B', 'E', 'A', 'D', 'F']);
});

it('AUM ↓ + INCEP. CAGR ↓ : B(10k/22%) -> A(10k/18%) -> C(8k/24%) -> E(5k/16%) -> D(5k/14%) -> F', () => {
  const criteria = [{ field: 'aum', order: 'desc' }, { field: 'return_All', order: 'desc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['B', 'A', 'C', 'E', 'D', 'F']);
});

it('1Y % ↓ + 5Y CAGR ↓ : C(25%) -> B(22%) -> A(18%) -> E(15%) -> D(10%) -> F', () => {
  const criteria = [{ field: 'return_1Y', order: 'desc' }, { field: 'return_5Y', order: 'desc' }];
  const sorted = sortFundsList(testFunds, criteria);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['C', 'B', 'A', 'E', 'D', 'F']);
});

console.log('\n--- Test Group 3: Default Order Restoration ---');

it('Empty sortCriteria returns exact original default order: A -> B -> C -> D -> E -> F', () => {
  const sorted = sortFundsList(testFunds, []);
  assert.deepStrictEqual(sorted.map(f => f.schemeCode), ['A', 'B', 'C', 'D', 'E', 'F']);
});

console.log('\n====================================================');
console.log('TOTAL TESTS: ' + (passedTests + failedTests));
console.log('PASSED: ' + passedTests);
console.log('FAILED: ' + failedTests);
console.log('====================================================\n');

if (failedTests > 0) process.exit(1);
