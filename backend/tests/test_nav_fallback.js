import assert from 'assert';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import unifiedMfService from '../services/UnifiedMfService.js';

async function runTests() {
  console.log('--- Running Tests for NAV Fallback ---');

  // Backup original method
  const originalGetFundNavHistory = unifiedMfService.getFundNavHistory;
  const originalGetFundProfile = unifiedMfService.getFundProfile;

  // Mock
  unifiedMfService.getFundNavHistory = async (id, region, range) => {
    return []; // Empty history to simulate fetch failure or missing data
  };
  
  unifiedMfService.getFundProfile = async (id, region) => {
    return {
      schemeCode: id,
      schemeName: 'Test Fund',
      nav: null, // No current NAV
      currency: 'INR',
      category: 'Equity'
    };
  };

  try {
    const summary = await unifiedAssetService.getAssetSummary('mf', '999999', 'india');
    
    assert.strictEqual(summary.navAvailable, false, 'navAvailable should be false when data is missing');
    assert.strictEqual(summary.currentPrice_or_nav, null, 'currentPrice_or_nav should be null, not 0');
    assert.strictEqual(summary.oneYearChangePct, null, 'oneYearChangePct should be null, not 0');
    
    console.log('✅ Test 1 Passed: NAV fallback behavior is correct.');
  } finally {
    // Restore
    unifiedMfService.getFundNavHistory = originalGetFundNavHistory;
    unifiedMfService.getFundProfile = originalGetFundProfile;
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
