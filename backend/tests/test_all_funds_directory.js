import assert from 'assert';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';

async function runTests() {
  console.log('Running test_all_funds_directory.js...');

  // Mock the internal data fetch
  allFundsDirectoryService._loadActiveSchemes = async () => [
    { schemeCode: '1', schemeName: 'HDFC Mid-Cap Opportunities Fund Direct Growth', amc: 'HDFC Mutual Fund', category: 'Equity: Mid Cap' },
    { schemeCode: '2', schemeName: 'SBI Small Cap Fund Direct Growth', amc: 'SBI Mutual Fund', category: 'Equity: Small Cap' },
    { schemeCode: '3', schemeName: 'Axis Bluechip Fund Direct Growth', amc: 'Axis Mutual Fund', category: 'Equity: Large Cap' },
    { schemeCode: '4', schemeName: 'Parag Parikh Flexi Cap Fund Direct Growth', amc: 'PPFAS Mutual Fund', category: 'Equity: Flexi Cap' },
    { schemeCode: '5', schemeName: 'HDFC Small Cap Fund Direct Growth', amc: 'HDFC Mutual Fund', category: 'Equity: Small Cap' }
  ];

  try {
    // 1. Pagination math test
    const page1 = await allFundsDirectoryService.getAllSchemes(1, 2, {});
    assert.strictEqual(page1.totalCount, 5, 'Total count should be 5');
    assert.strictEqual(page1.schemes.length, 2, 'Page 1 should have 2 schemes');
    assert.strictEqual(page1.totalPages, 3, 'Total pages should be 3');
    assert.strictEqual(page1.schemes[0].id, '1');
    assert.strictEqual(page1.schemes[1].id, '2');

    const page2 = await allFundsDirectoryService.getAllSchemes(2, 2, {});
    assert.strictEqual(page2.schemes.length, 2, 'Page 2 should have 2 schemes');
    assert.strictEqual(page2.schemes[0].id, '3');

    const page3 = await allFundsDirectoryService.getAllSchemes(3, 2, {});
    assert.strictEqual(page3.schemes.length, 1, 'Page 3 should have 1 scheme');
    assert.strictEqual(page3.schemes[0].id, '5');

    // 2. Server-side filtering
    const searchRes = await allFundsDirectoryService.getAllSchemes(1, 10, { searchTerm: 'HDFC' });
    assert.strictEqual(searchRes.totalCount, 2, 'Should find 2 HDFC funds');
    assert.strictEqual(searchRes.schemes[0].name, 'HDFC Mid-Cap Opportunities Fund Direct Growth');

    const amcRes = await allFundsDirectoryService.getAllSchemes(1, 10, { amc: 'SBI' });
    assert.strictEqual(amcRes.totalCount, 1, 'Should find 1 SBI fund');
    
    console.log('All tests passed successfully for AllFundsDirectoryService!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTests();
