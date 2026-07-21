import assert from 'assert';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import axios from 'axios';
import { yahooFinance } from '../services/YahooFinanceService.js';

async function runTests() {
  console.log('--- Running Tests for HoldingsFallbackService ---');

  // Mock axios and yahooFinance
  const originalAxiosGet = axios.get;
  const originalYfQuoteSummary = yahooFinance.quoteSummary;

  axios.get = async () => { throw new Error('Mocked Network error'); };
  yahooFinance.quoteSummary = async () => { throw new Error('Mocked YF error'); };

  try {
    console.log('Test 1: Global ticker fails in YF');
    const globalRes = await holdingsFallbackService.getHoldings('AAPL');
    assert.strictEqual(globalRes.available, false, 'Global should be unavailable');
    assert.ok(globalRes.reason !== undefined, 'Reason should be provided');
    console.log('✅ Test 1 Passed.');

    console.log('Test 2: Indian ticker fails in FinAPI');
    const indianRes = await holdingsFallbackService.getHoldings('12345', 'Some Fund');
    assert.strictEqual(indianRes.available, false, 'Indian fund should be unavailable');
    assert.ok(indianRes.reason !== undefined, 'Reason should be provided');
    console.log('✅ Test 2 Passed.');
  } finally {
    // Restore
    axios.get = originalAxiosGet;
    yahooFinance.quoteSummary = originalYfQuoteSummary;
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
