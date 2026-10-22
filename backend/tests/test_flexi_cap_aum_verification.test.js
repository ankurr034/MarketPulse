import assert from 'assert';
import { describe, it, after } from 'node:test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatAUM(aum) {
  if (aum == null || isNaN(aum) || Number(aum) <= 0) return '—';
  const num = Number(aum);
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`;
}

describe('Direct Growth Flexi Cap Schemes AUM Forensic Verification Test Suite', () => {
  const activeSchemesPath = path.resolve(__dirname, '../data/amfi_active_schemes.json');
  const verifiedCachePath = path.resolve(__dirname, '../data/verified_aum_cache.json');

  const TARGET_SCHEMES = [
    { code: '118883', name: 'Taurus Flexi Cap Fund', minAum: 300, expAsOf: '30 Sep 2026' },
    { code: '151917', name: 'NJ Flexi Cap Fund', minAum: 2000, expAsOf: '30 Sep 2026' },
    { code: '144905', name: 'Shriram Flexi Cap Fund', minAum: 100, expAsOf: '30 Sep 2026' },
    { code: '153543', name: 'UNIFI FLEXI CAP FUND', minAum: 200, expAsOf: '30 Sep 2026' },
    { code: '153738', name: 'Capitalmind Flexi Cap Fund', minAum: 400, expAsOf: '30 Sep 2026' },
    { code: '153872', name: 'The Wealth Company Flexi Cap Fund', minAum: 200, expAsOf: '30 Sep 2026' },
    { code: '153859', name: 'JioBlackRock Flexi Cap Fund', minAum: 3000, expAsOf: '30 Sep 2026' },
    { code: '154043', name: 'Abakkus Flexi Cap Fund', minAum: 5000, expAsOf: '30 Sep 2026' },
    { code: '154225', name: 'Old Bridge Flexi Cap Fund', minAum: 300, expAsOf: '30 Sep 2026' },
    { code: '154518', name: 'AlphaGrep Flexi Cap Fund', minAum: 20, expAsOf: '30 Sep 2026' },
    { code: '154515', name: 'Quantum Flexi Cap Fund', minAum: 10, expAsOf: '30 Sep 2026' },
    { code: '149094', name: 'Nippon India Flexi Cap Fund', minAum: 9000, expAsOf: '30 Jun 2026' },
    { code: '129046', name: 'Motilal Oswal Flexi Cap Fund', minAum: 13000, expAsOf: '30 Jun 2026' }
  ];

  it('1. Verified AUM cache exists and contains all 13 target Flexi Cap schemes', () => {
    assert(fs.existsSync(verifiedCachePath), 'verified_aum_cache.json exists');
    const cache = JSON.parse(fs.readFileSync(verifiedCachePath, 'utf8'));
    assert(cache.disclosures, 'disclosures object exists in cache');

    TARGET_SCHEMES.forEach(target => {
      const entry = cache.disclosures[target.code];
      assert(entry, `Scheme ${target.code} (${target.name}) must exist in verified AUM cache`);
      assert.strictEqual(entry.schemeCode, target.code);
      assert.strictEqual(entry.aumMetric, 'AUM', `Metric for ${target.code} must be AUM`);
      assert(typeof entry.aumCr === 'number' && entry.aumCr >= target.minAum, `AUM for ${target.code} must be >= ${target.minAum}`);
      assert.strictEqual(entry.aaumCr, null, `aaumCr must be null for ${target.code} when aumMetric is AUM`);
      assert(entry.asOf, `asOf date must be present for ${target.code}`);
      assert.strictEqual(entry.dataStatus, 'VERIFIED');
    });
  });

  it('2. Active schemes dataset preserves exact identity and positive numeric AUM for all 13 schemes', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();

    TARGET_SCHEMES.forEach(target => {
      const scheme = schemes.find(s => String(s.schemeCode) === target.code);
      assert(scheme, `Scheme ${target.code} (${target.name}) must exist in active schemes universe`);
      assert.strictEqual(scheme.aumMetric, 'AUM', `aumMetric must be AUM for ${target.code}`);
      assert(typeof scheme.aum === 'number' && scheme.aum > 0, `scheme.aum must be positive number for ${target.code}`);
      assert.strictEqual(scheme.aum, scheme.aumCr, `aum and aumCr must match for ${target.code}`);
      assert.strictEqual(scheme.aaumCr ?? null, null, `aaumCr must be null for ${target.code}`);
      assert(typeof scheme.indiaMfRank === 'number' && scheme.indiaMfRank > 0, `indiaMfRank must be positive integer for ${target.code}`);
      assert(typeof scheme.indiaMfSubcategoryRank === 'number' && scheme.indiaMfSubcategoryRank > 0, `Subcategory rank must be positive for ${target.code}`);
    });
  });

  it('3. Formatted AUM in UI never displays —, null, or NaN for any of the 13 schemes', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();

    TARGET_SCHEMES.forEach(target => {
      const scheme = schemes.find(s => String(s.schemeCode) === target.code);
      const formatted = formatAUM(scheme.aumMetric === 'AAUM' ? null : (scheme.aumCr ?? scheme.aum));

      assert(!formatted.includes('—'), `Formatted AUM for ${target.name} must not be —`);
      assert(!formatted.includes('null'), `Formatted AUM for ${target.name} must not contain null`);
      assert(!formatted.includes('undefined'), `Formatted AUM for ${target.name} must not contain undefined`);
      assert(!formatted.includes('NaN'), `Formatted AUM for ${target.name} must not contain NaN`);
      assert(formatted.startsWith('₹'), `Formatted AUM for ${target.name} must start with ₹`);
      assert(formatted.endsWith('Cr'), `Formatted AUM for ${target.name} must end with Cr`);
    });
  });

  it('4. HoldingsFallbackService returns verified AUM details for all 13 schemes with Permanent TTL', async () => {
    holdingsFallbackService.reloadDiskCache();

    for (const target of TARGET_SCHEMES) {
      const details = await holdingsFallbackService.getAumDetails(target.code);
      assert(details, `Details must exist for ${target.code}`);
      assert.strictEqual(details.aumMetric, 'AUM', `aumMetric must be AUM for ${target.code}`);
      assert(typeof details.value === 'number' && details.value > 0, `value must be positive for ${target.code}`);
      assert.strictEqual(details.value, details.aumCr);
      assert.strictEqual(details.aaumCr, null);
      assert(details.source, `Source must be defined for ${target.code}`);
    }
  });

  it('5. Passive FoF Flexi Cap funds also possess verified AUM and ranks', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    const passiveTargets = [
      { code: '148642', name: 'Nippon India Diversified Equity Flexicap Passive FoF', minAum: 200 },
      { code: '154112', name: 'Motilal Oswal Diversified Equity Flexicap Passive FoF', minAum: 40 }
    ];

    passiveTargets.forEach(target => {
      const scheme = schemes.find(s => String(s.schemeCode) === target.code);
      assert(scheme, `Passive FoF ${target.code} must exist in active schemes`);
      assert.strictEqual(scheme.aumMetric, 'AUM');
      assert(typeof scheme.aum === 'number' && scheme.aum >= target.minAum);
      assert(typeof scheme.indiaMfRank === 'number' && scheme.indiaMfRank > 0);
    });
  });

  it('6. Flexi Cap subcategory ranks are strictly ordered by AUM DESC', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    const flexiFunds = schemes.filter(s => {
      const sub = (s.normalizedSubcategory || s.subcategory || '').toLowerCase();
      return sub.includes('flexi cap');
    }).filter(s => typeof s.aum === 'number' && s.aum > 0);

    assert(flexiFunds.length >= 45, `Expected at least 45 ranked Flexi Cap funds, found ${flexiFunds.length}`);

    // Sort by subcategory rank
    const sortedBySubRank = [...flexiFunds].sort((a, b) => a.indiaMfSubcategoryRank - b.indiaMfSubcategoryRank);

    for (let i = 1; i < sortedBySubRank.length; i++) {
      const prev = sortedBySubRank[i - 1];
      const curr = sortedBySubRank[i];
      assert(prev.aum >= curr.aum, `AUM order violation: ${prev.schemeName} (${prev.aum}) vs ${curr.schemeName} (${curr.aum})`);
      assert.strictEqual(curr.indiaMfSubcategoryRank, prev.indiaMfSubcategoryRank + 1, `Subcategory rank must be sequential: ${prev.indiaMfSubcategoryRank} -> ${curr.indiaMfSubcategoryRank}`);
    }
  });

  after(() => {
    setTimeout(() => process.exit(0), 50);
  });
});
