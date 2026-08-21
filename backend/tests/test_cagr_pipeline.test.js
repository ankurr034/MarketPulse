import assert from 'assert';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';

console.log('🧪 Running Comprehensive Indian MF CAGR Data Pipeline & Mathematical Verification Test Suite...\n');

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
  console.log('--- Test Group 1: Exact Mathematical CAGR Formula & Date Selection ---');

  await it('Exact CAGR Formula: ((Ending NAV / Starting NAV) ^ (365.25 / NumberOfDays)) - 1', () => {
    const startNav = 100.0;
    const endNav = 172.8; // 20% annual growth over 3 years: 100 * (1.2)^3 = 172.8
    const days = 1095.75; // exactly 3 * 365.25 days
    const yrs = days / 365.25;
    const cagr = (Math.pow(endNav / startNav, 1 / yrs) - 1) * 100;
    assert.strictEqual(parseFloat(cagr.toFixed(2)), 20.00);
  });

  await it('3Y Target Date Selection uses deterministic nearest-on-or-before trading day (never in future)', () => {
    // Valuation date: 2026-08-18 (Tuesday)
    // 3Y Target date: 2023-08-18 (Friday)
    const mockNavData = [
      { date: '18-08-2026', nav: '180.00' },
      { date: '17-08-2026', nav: '179.50' },
      { date: '19-08-2023', nav: '102.00' }, // Saturday (Future relative to target!) - MUST BE IGNORED
      { date: '18-08-2023', nav: '100.00' }, // Exact target date!
      { date: '17-08-2023', nav: '99.50' },
      { date: '18-08-2020', nav: '50.00' },
      { date: '01-01-2013', nav: '10.00' }
    ];

    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockNavData);
    assert(metrics.return3Y !== null, '3Y return should not be null');
    // From 18-08-2023 (100.00) to 18-08-2026 (180.00) over 1096 days (3.00068 years)
    // CAGR = (180/100)^(1/3.00068) - 1 = 21.64%
    assert.strictEqual(metrics.return3Y, 21.64);
  });

  await it('Previous-Trading-Day Selection: picks previous Friday when target date falls on Sunday/holiday', () => {
    // Valuation date: 2026-08-13 (Thursday)
    // 3Y Target date: 2023-08-13 (Sunday) -> Should select 2023-08-11 (Friday)
    const mockNavData = [
      { date: '13-08-2026', nav: '200.00' },
      { date: '14-08-2023', nav: '105.00' }, // Monday (Future!) - MUST NOT BE CHOSEN
      { date: '11-08-2023', nav: '100.00' }, // Friday (Nearest on or before) - MUST BE CHOSEN
      { date: '10-08-2023', nav: '99.00' },
      { date: '13-08-2021', nav: '60.00' },
      { date: '01-01-2013', nav: '10.00' }
    ];

    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockNavData);
    assert(metrics.return3Y !== null);
    // From 11-08-2023 (100.00) to 13-08-2026 (200.00) over 1098 days (3.00616 years)
    // CAGR = (200/100)^(1/3.00616) - 1 = 25.93%
    assert.strictEqual(metrics.return3Y, 25.93);
  });

  await it('Since-Inception CAGR uses true launch NAV and elapsed time', () => {
    const mockNavData = [
      { date: '28-05-2026', nav: '90.00' },
      { date: '28-05-2013', nav: '10.00' } // Inception date: 13 years exactly
    ];

    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockNavData);
    assert(metrics.returnAll !== null);
    // From 28-05-2013 (10.00) to 28-05-2026 (90.00) over 4748 days (12.9993 years, with leap years)
    // CAGR = (90/10)^(1/12.9993) - 1 = 18.42%
    assert.strictEqual(metrics.returnAll, 18.42);
  });

  await it('Zero Fabrication: Returns null for 5Y CAGR when scheme has less than 5 years of history', () => {
    // Scheme launched 3.5 years ago
    const mockNavData = [
      { date: '18-08-2026', nav: '150.00' },
      { date: '18-08-2023', nav: '100.00' },
      { date: '18-02-2023', nav: '80.00' } // Inception
    ];

    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockNavData);
    assert.strictEqual(metrics.return5Y, null, '5Y CAGR must be null for fund with < 5 years history');
    assert(metrics.return3Y !== null, '3Y CAGR should be computed');
  });

  await it('Invalid / Zero NAV handling: returns null and does not throw NaN or Infinity', () => {
    const mockNavData = [
      { date: '18-08-2026', nav: '0.00' },
      { date: '18-08-2023', nav: '100.00' }
    ];

    const metrics = liveMfAnalyticsService.calculateSchemeMetrics(mockNavData);
    assert.strictEqual(metrics.return3Y, null);
    assert.strictEqual(metrics.return1Y, null);
    assert.strictEqual(metrics.returnAll, null);
  });

  console.log('\n--- Test Group 2: Real Production Funds CAGR Verification ---');

  const sampleFunds = [
    { code: '122639', name: 'Parag Parikh Flexi Cap', expIncepGte: 15 },
    { code: '118955', name: 'HDFC Flexi Cap', expIncepGte: 14 },
    { code: '129046', name: 'Motilal Oswal Flexi Cap', expIncepGte: 15 },
    { code: '120843', name: 'Quant Flexi Cap', expIncepGte: 16 },
    { code: '119718', name: 'SBI Flexicap', expIncepGte: 12 },
    { code: '141925', name: 'Axis Flexi Cap', expIncepGte: 12 },
    { code: '120662', name: 'UTI Flexi Cap', expIncepGte: 11 },
    { code: '149094', name: 'Nippon India Flexi Cap', exp5YNull: true }
  ];

  for (const fund of sampleFunds) {
    await it(`Real Fund CAGR Audit: ${fund.name} (${fund.code})`, async () => {
      const data = await mfapiCacheService.getSchemeData(fund.code);
      assert(data && data.data && data.data.length > 0, `Failed to load cached NAV data for ${fund.code}`);
      const metrics = liveMfAnalyticsService.calculateSchemeMetrics(data.data);

      assert(metrics.return3Y !== null, `${fund.name} must have valid 3Y CAGR`);
      assert(typeof metrics.return3Y === 'number' && !isNaN(metrics.return3Y), `${fund.name} 3Y CAGR is not a valid number`);

      if (fund.exp5YNull) {
        assert.strictEqual(metrics.return5Y, null, `${fund.name} launched < 5 years ago, 5Y CAGR must be null`);
      } else {
        assert(metrics.return5Y !== null, `${fund.name} must have valid 5Y CAGR`);
        assert(typeof metrics.return5Y === 'number' && !isNaN(metrics.return5Y), `${fund.name} 5Y CAGR is not a valid number`);
      }

      assert(metrics.returnAll !== null, `${fund.name} must have valid Since-Inception CAGR`);
      if (fund.expIncepGte) {
        assert(metrics.returnAll >= fund.expIncepGte, `${fund.name} inception CAGR (${metrics.returnAll}) expected >= ${fund.expIncepGte}`);
      }
    });
  }

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
