import assert from 'node:assert';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';

/**
 * Unit Test Suite for Mutual Fund Metrics Accuracy & Validation
 * Spot-checks 3 real, known schemes against live historical NAV from mfapi.in
 */
async function runMfMetricsTests() {
  console.log('🧪 Starting Mutual Fund Metrics Verification Test Suite...');
  
  const testSchemes = [
    {
      code: '118991',
      name: 'HDFC Flexi Cap Fund Direct Growth',
      expectedMin1YReturn: -15.0,
      expectedMax1YReturn: 60.0,
      expectedMinSharpe: -2.5,
      expectedMaxSharpe: 4.0
    },
    {
      code: '119598',
      name: 'SBI Small Cap Fund Direct Growth',
      expectedMin1YReturn: -15.0,
      expectedMax1YReturn: 60.0,
      expectedMinSharpe: -2.5,
      expectedMaxSharpe: 4.0
    },
    {
      code: '120586',
      name: 'ICICI Prudential Bluechip Fund Direct Growth',
      expectedMin1YReturn: -15.0,
      expectedMax1YReturn: 60.0,
      expectedMinSharpe: -2.5,
      expectedMaxSharpe: 4.0
    },
    {
      code: '149450',
      name: 'Samco Flexi Cap Fund Direct Growth',
      expectedMin1YReturn: -20.0,
      expectedMax1YReturn: 10.0,
      expectedMinSharpe: -3.0,
      expectedMaxSharpe: 2.0
    }
  ];

  let passedCount = 0;

  for (const scheme of testSchemes) {
    console.log(`\n🔍 Spot-checking Scheme ${scheme.code}: ${scheme.name}`);
    const history = await liveMfAnalyticsService.fetchSchemeHistory(scheme.code);
    
    assert.ok(history, `NAV history for scheme ${scheme.code} must not be null`);
    assert.ok(Array.isArray(history.data), `NAV history data for scheme ${scheme.code} must be an array`);
    assert.ok(history.data.length > 250, `NAV history for scheme ${scheme.code} must contain at least 250 trading days`);

    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(history.data);
    
    console.log(`   📊 Calculated 1Y Return: ${metrics.return1Y}%`);
    console.log(`   📊 Calculated 3Y CAGR: ${metrics.return3Y}%`);
    console.log(`   📊 Calculated Sharpe Ratio (Rf=6.5%): ${metrics.sharpeRatio}`);
    console.log(`   📊 Calculated Sortino Ratio: ${metrics.sortinoRatio}`);

    // Assert 1Y Return is within expected tolerance
    assert.ok(metrics.return1Y !== null, `1Y Return for ${scheme.name} should not be null`);
    assert.ok(
      metrics.return1Y >= scheme.expectedMin1YReturn && metrics.return1Y <= scheme.expectedMax1YReturn,
      `1Y Return for ${scheme.name} (${metrics.return1Y}%) exceeded expected tolerance range [${scheme.expectedMin1YReturn}%, ${scheme.expectedMax1YReturn}%]`
    );

    // Assert Sharpe Ratio is within expected tolerance
    assert.ok(metrics.sharpeRatio !== null, `Sharpe ratio for ${scheme.name} should not be null`);
    assert.ok(
      metrics.sharpeRatio >= scheme.expectedMinSharpe && metrics.sharpeRatio <= scheme.expectedMaxSharpe,
      `Sharpe ratio for ${scheme.name} (${metrics.sharpeRatio}) exceeded expected tolerance range [${scheme.expectedMinSharpe}, ${scheme.expectedMaxSharpe}]`
    );

    passedCount++;
  }

  // Also test AMFI NAVAll.txt Snapshot Live Fetch
  console.log('\n🔍 Testing AMFI NAVAll.txt Live Snapshot Fetch...');
  const snapshot = await liveMfAnalyticsService.fetchAmfiNavSnapshot();
  assert.ok(snapshot.totalCount > 2000, `AMFI NAVAll.txt active count (${snapshot.totalCount}) must exceed 2000`);
  assert.strictEqual(snapshot.source, 'AMFI NAVAll.txt');
  console.log(`   ✅ AMFI NAVAll.txt verified cleanly! Total active schemes: ${snapshot.totalCount}`);

  console.log(`\n🎉 ALL ${passedCount + 1} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
}

runMfMetricsTests().catch((err) => {
  console.error('\n❌ METRICS VERIFICATION TEST SUITE FAILED:', err.message);
  process.exit(1);
});
