import assert from 'assert';
import { sortComparisonTable } from './src/utils/tableSort.js';

function runTests() {
  console.log('--- Running Tests for ComparisonTable Sort Logic ---');

  const data = [
    { name: 'Fund A', currentPrice_or_nav: 10, navAvailable: true },
    { name: 'Fund B', currentPrice_or_nav: 20, navAvailable: true },
    { name: 'Fund C (Missing)', currentPrice_or_nav: null, navAvailable: false },
    { name: 'Fund D (Missing)', currentPrice_or_nav: null, navAvailable: false },
    { name: 'Fund E', currentPrice_or_nav: 5, navAvailable: true },
  ];

  // Test ASC sort
  const ascSorted = sortComparisonTable(data, 'currentPrice_or_nav', 'asc');
  assert.strictEqual(ascSorted[0].name, 'Fund E', 'ASC 1st should be lowest valid');
  assert.strictEqual(ascSorted[1].name, 'Fund A', 'ASC 2nd');
  assert.strictEqual(ascSorted[2].name, 'Fund B', 'ASC 3rd should be highest valid');
  assert.strictEqual(ascSorted[3].navAvailable, false, 'ASC 4th should be missing');
  assert.strictEqual(ascSorted[4].navAvailable, false, 'ASC 5th should be missing');

  // Test DESC sort
  const descSorted = sortComparisonTable(data, 'currentPrice_or_nav', 'desc');
  assert.strictEqual(descSorted[0].name, 'Fund B', 'DESC 1st should be highest valid');
  assert.strictEqual(descSorted[1].name, 'Fund A', 'DESC 2nd');
  assert.strictEqual(descSorted[2].name, 'Fund E', 'DESC 3rd should be lowest valid');
  assert.strictEqual(descSorted[3].navAvailable, false, 'DESC 4th should be missing');
  assert.strictEqual(descSorted[4].navAvailable, false, 'DESC 5th should be missing');

  console.log('✅ Test Passed: Missing NAV always sorts to the bottom');
}

runTests();
