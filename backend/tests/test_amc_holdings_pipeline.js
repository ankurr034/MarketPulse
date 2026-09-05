import assert from 'assert';
import officialAmcPortfolioService from '../services/OfficialAmcPortfolioService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';

async function runTests() {
  console.log('🧪 Starting Official AMC Portfolio Holdings Pipeline Tests...\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // Group 1: Authoritative Disclosure Verification for all 7 PPFAS Schemes
  const PPFAS_SCHEMES = [
    { code: '122639', name: 'Parag Parikh Flexi Cap Fund' },
    { code: '154155', name: 'Parag Parikh Large Cap Fund' },
    { code: '147481', name: 'Parag Parikh ELSS Tax Saver Fund' },
    { code: '148958', name: 'Parag Parikh Conservative Hybrid Fund' },
    { code: '143269', name: 'Parag Parikh Liquid Fund' },
    { code: '152109', name: 'Parag Parikh Arbitrage Fund' },
    { code: '152468', name: 'Parag Parikh Dynamic Asset Allocation Fund' }
  ];

  for (const scheme of PPFAS_SCHEMES) {
    await asyncTest(`Scheme ${scheme.code} (${scheme.name}) retrieves authentic disclosure`, async () => {
      const res = await officialAmcPortfolioService.getSchemeHoldings(scheme.code);
      assert.strictEqual(res.available, true, 'Result must be available');
      assert.strictEqual(res.dataStatus, 'DATA_AVAILABLE', 'Status must be DATA_AVAILABLE');
      assert.strictEqual(res.holdingsAsOf, 'July 31, 2026', 'Statement date must match official disclosure');
      assert.strictEqual(res.source, 'Official AMC Portfolio Disclosure', 'Source must be authentic AMC disclosure');
      assert.ok(Array.isArray(res.positions), 'positions must be an array');
      assert.ok(res.positions.length > 0, 'positions must not be empty');
      assert.ok(res.positionsCount > 0, 'positionsCount must be > 0');
      assert.ok(res.portfolioAumCr > 0, 'portfolioAumCr must be > 0');

      // Weights must sum to approximately 100%
      assert.ok(res.totalDisclosedWeightPercent >= 99.0 && res.totalDisclosedWeightPercent <= 101.0, 
        `Weights must sum to ~100%, got ${res.totalDisclosedWeightPercent}%`);

      // Positions must be strictly sorted by weightPercent descending
      for (let i = 0; i < res.positions.length - 1; i++) {
        const curr = res.positions[i].weightPercent;
        const next = res.positions[i + 1].weightPercent;
        assert.ok(curr >= next, `Positions must be sorted descending by weightPercent: index ${i} (${curr}%) < index ${i+1} (${next}%)`);
      }

      // Each position must have valid structure
      for (const p of res.positions.slice(0, 10)) {
        assert.ok(p.name && typeof p.name === 'string', 'Position must have name string');
        assert.ok(typeof p.weightPercent === 'number', 'Position must have weightPercent number');
        assert.ok(typeof p.valueCr === 'number', 'Position must have valueCr number');
        assert.ok(p.securityType, 'Position must have securityType');
      }

      // Sector breakdown must exist and have entries
      assert.ok(typeof res.sectorBreakdown === 'object', 'sectorBreakdown must be an object');
      assert.ok(Object.keys(res.sectorBreakdown).length > 0, 'sectorBreakdown must have sectors');
    });
  }

  // Group 2: End-to-End Asset Detail Integration
  await asyncTest('UnifiedAssetService getAssetDetail integrates authentic holdings for 122639', async () => {
    const detail = await unifiedAssetService.getAssetDetail('mf', '122639', 'india', 'all');
    assert.strictEqual(detail.dataStatus, 'DATA_AVAILABLE');
    assert.strictEqual(detail.holdingsAsOf, 'July 31, 2026');
    assert.ok(detail.holdings.length >= 100, `Expected >= 100 holdings, got ${detail.holdings.length}`);
    assert.ok(detail.positions.length >= 100, `Expected >= 100 positions, got ${detail.positions.length}`);
    assert.ok(detail.sectorBreakdown && Object.keys(detail.sectorBreakdown).length > 0);

    // Verify top holding has rank 1 and highest weight
    const top = detail.holdings[0];
    assert.strictEqual(top.rank, 1);
    assert.ok(top.weightPercent > 5.0, `Top holding weight must be > 5%, got ${top.weightPercent}%`);
  });

  // Group 3: Zero-Fabrication Rule for Unsupported Funds
  await asyncTest('Unsupported fund (118989) returns DATA_UNAVAILABLE with ZERO fabrication', async () => {
    const res = await officialAmcPortfolioService.getSchemeHoldings('118989');
    assert.strictEqual(res.available, false, 'Available must be false');
    assert.strictEqual(res.dataStatus, 'DATA_UNAVAILABLE', 'Status must be DATA_UNAVAILABLE');
    assert.strictEqual(res.positions.length, 0, 'positions must be empty array');
    assert.strictEqual(res.holdings.length, 0, 'holdings must be empty array');
    assert.deepStrictEqual(res.sectorBreakdown, {}, 'sectorBreakdown must be empty object');
    assert.ok(res.reason.includes('unavailable'), 'reason must state data is unavailable');
  });

  await asyncTest('UnifiedAssetService preserves UNAVAILABLE state for unsupported funds', async () => {
    const detail = await unifiedAssetService.getAssetDetail('mf', '118989', 'india', 'all');
    assert.strictEqual(detail.dataStatus, 'DATA_UNAVAILABLE');
    assert.strictEqual(detail.holdingsAvailable, false);
    assert.strictEqual(detail.holdings.length, 0);
    assert.deepStrictEqual(detail.sectorBreakdown, {});
    assert.ok(detail.holdingsReason.includes('unavailable'));
  });

  // Summary
  console.log(`\n========================================`);
  console.log(`Results: ${passed}/${total} Passed (${total - passed} Failed)`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
