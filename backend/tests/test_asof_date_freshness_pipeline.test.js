import assert from 'assert';
import amfiImportService from '../services/AmfiImportService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import { isStrictDirectGrowth, buildCanonicalIdentity } from '../utils/schemeFilterUtil.js';

// Replicate frontend formatNavDate for testing
function formatNavDate(dateStr) {
  if (!dateStr || dateStr === 'Data Unavailable') return 'Date unavailable';
  if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d} ${monthName} ${y}`;
  }
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d} ${monthName} ${y}`;
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parsed.getUTCMonth()];
    const year = parsed.getUTCFullYear();
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

async function runAsOfDateFreshnessTests() {
  console.log('================================================================================');
  console.log('📅 AS-OF DATE & FRESHNESS METADATA VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(title, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${title}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const schemes = await amfiImportService.getActiveSchemes() || [];

  await test('1. Every active scheme exposes authoritative navDate and asOfDate', () => {
    assert(schemes.length > 0, 'Scheme universe must not be empty');
    let withNavDate = 0;
    schemes.forEach(s => {
      assert(s.navDate || s.date, `Missing navDate for scheme ${s.schemeCode}`);
      assert(s.asOfDate, `Missing asOfDate for scheme ${s.schemeCode}`);
      assert(s.navAsOfDate, `Missing navAsOfDate for scheme ${s.schemeCode}`);
      assert(s.performanceAsOfDate, `Missing performanceAsOfDate for scheme ${s.schemeCode}`);
      withNavDate++;
    });
    assert.strictEqual(withNavDate, schemes.length, 'All schemes must have navDate');
  });

  await test('2. As-Of dates represent actual underlying source dates (no current-date fabrication)', () => {
    const sample = schemes.find(s => s.nav !== null);
    assert(sample, 'Must find a valid scheme with NAV');
    assert.match(sample.navDate, /^\d{2}-[a-zA-Z]{3}-\d{4}$|^\d{2}-\d{2}-\d{4}$|^\d{4}-\d{2}-\d{2}$/, 'NAV date must be a valid date string');
    assert.strictEqual(sample.asOfDate, sample.navDate, 'asOfDate must match navDate for NAV-bearing schemes');
  });

  await test('3. Schemes with verified AUM expose authoritative aumAsOfDate', () => {
    const withAum = schemes.filter(s => typeof s.aum === 'number' && s.aum > 0);
    assert(withAum.length >= 600, `Expected at least 600 schemes with verified AUM, got ${withAum.length}`);
    withAum.forEach(s => {
      assert(s.aumAsOfDate, `Scheme ${s.schemeCode} with AUM ${s.aum} must have aumAsOfDate`);
      assert(s.aumProvenance, `Scheme ${s.schemeCode} must have aumProvenance`);
    });
  });

  await test('4. AllFundsDirectoryService attaches asOfDate, navAsOfDate, aumAsOfDate', async () => {
    const dirResult = await allFundsDirectoryService.getAllSchemes(1, 20, {});
    assert(dirResult.schemes && dirResult.schemes.length > 0, 'Directory schemes must not be empty');
    dirResult.schemes.forEach(s => {
      assert(s.navDate, `Directory scheme ${s.schemeCode} must have navDate`);
      assert(s.asOfDate, `Directory scheme ${s.schemeCode} must have asOfDate`);
      assert(s.navAsOfDate, `Directory scheme ${s.schemeCode} must have navAsOfDate`);
      assert(s.performanceAsOfDate, `Directory scheme ${s.schemeCode} must have performanceAsOfDate`);
    });
  });

  await test('5. Temporary source failure does not erase valid cached data or asOfDate', async () => {
    const testCode = '120594'; // ICICI Prudential Technology Fund Direct Growth
    const cachedAum = holdingsFallbackService._getCached(`aum_details_${testCode}`);
    assert(cachedAum && cachedAum.value > 0, 'Disk cache must supply valid AUM even offline');
    assert(cachedAum.asOf, 'Disk cache must supply valid asOf date');
  });

  await test('6. Industry AUM (Universe A) retains its explicit As-Of metadata', () => {
    const industrySummary = liveMfAnalyticsService.getIndustryAumOverview();
    assert.strictEqual(industrySummary.industryAum.value, '₹ 82.22 Lakh Cr');
    assert.strictEqual(industrySummary.industryAum.asOf, '30 Jun 2026');
    assert.strictEqual(industrySummary.industryAum.status, 'VERIFIED');
  });

  await test('7. Direct-Growth universe identity strictly preserved with zero leakage', () => {
    schemes.forEach(s => {
      assert(isStrictDirectGrowth(s.schemeName), `Non Direct Growth leaked: ${s.schemeName}`);
      assert.strictEqual(s.plan, 'Direct');
      assert.strictEqual(s.option, 'Growth');
    });
  });

  await test('8. NAV formatNavDate correctly renders DD Mon YYYY format', () => {
    assert.strictEqual(formatNavDate('24-08-2026'), '24 Aug 2026');
    assert.strictEqual(formatNavDate('18-08-2026'), '18 Aug 2026');
    assert.strictEqual(formatNavDate('2026-06-30'), '30 Jun 2026');
    assert.strictEqual(formatNavDate('01-01-2025'), '01 Jan 2025');
  });

  await test('9. Missing NAV date formats to "Date unavailable" without fabricating current date', () => {
    assert.strictEqual(formatNavDate(null), 'Date unavailable');
    assert.strictEqual(formatNavDate(undefined), 'Date unavailable');
    assert.strictEqual(formatNavDate('Data Unavailable'), 'Date unavailable');
    assert.strictEqual(formatNavDate(''), 'Date unavailable');
  });

  await test('10. Tooltip content matches NAV + As of date format', () => {
    const sampleNav = 46.3806;
    const sampleDate = '24-08-2026';
    const formattedNav = `₹ ${sampleNav.toFixed(2)}`;
    const formattedDate = formatNavDate(sampleDate);
    const tooltipText = `NAV: ${formattedNav}\nAs of: ${formattedDate}`;
    assert.strictEqual(tooltipText, 'NAV: ₹ 46.38\nAs of: 24 Aug 2026');
  });

  await test('11. Verified AUM cache entries persist permanently beyond 30 minutes without eviction', () => {
    const testCode = '120586'; // ICICI Prudential Bluechip
    const cachedItem = holdingsFallbackService.cache.get(`aum_details_${testCode}`);
    assert(cachedItem, 'Must have cached entry');
    assert.strictEqual(cachedItem.isPermanent, true, 'Disk AUM cache must be marked permanent');
    assert(cachedItem.data.value > 0, 'Must have positive AUM');
    // Verify _getCached still returns it regardless of time
    const val = holdingsFallbackService._getCached(`aum_details_${testCode}`);
    assert(val && val.value > 0, '_getCached must return permanent disk cache');
  });

  await test('12. Missing AUM is explicitly null (never fabricated, estimated, or synthetic)', () => {
    const withoutAum = schemes.filter(s => s.aum === null);
    assert(withoutAum.length > 0, 'Universe contains schemes without verified AUM');
    withoutAum.forEach(s => {
      assert.strictEqual(s.aum, null, 'Unverified AUM must be strictly null');
      assert.strictEqual(s.aumCr, null, 'aumCr must be strictly null');
      assert.strictEqual(s.aumProvenance.status, 'UNAVAILABLE', 'Status must be UNAVAILABLE');
    });
  });

  await test('13. Sourced AUM carries authentic disclosure provenance', () => {
    const withAum = schemes.filter(s => typeof s.aum === 'number' && s.aum > 0);
    withAum.forEach(s => {
      assert(s.aumProvenance, 'Must have provenance');
      assert.strictEqual(s.aumProvenance.status, 'PROVIDER_REPORTED', 'Status must be PROVIDER_REPORTED');
      assert(s.aumProvenance.source, 'Must have provenance source');
    });
  });

  await test('14. NAV values and dates reflect authoritative AMFI valuation', () => {
    const withNav = schemes.filter(s => typeof s.nav === 'number' && s.nav > 0);
    assert(withNav.length > 0, 'Must have schemes with NAV');
    withNav.forEach(s => {
      assert.match(s.navDate, /^\d{2}-[a-zA-Z]{3}-\d{4}$|^\d{2}-\d{2}-\d{4}$|^\d{4}-\d{2}-\d{2}$/, 'Valid date format');
      assert.strictEqual(s.asOfDate, s.navDate, 'asOfDate matches navDate');
    });
  });

  console.log('\n================================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`STATUS: ${failed === 0 ? '🏆 ALL FRESHNESS & AS-OF TESTS PASSED' : '❌ TESTS FAILED'}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runAsOfDateFreshnessTests();
