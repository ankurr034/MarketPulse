import assert from 'assert';
import { describe, it, after } from 'node:test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import indianMfRankingService from '../services/IndianMfRankingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatAUM(aum) {
  if (aum == null || isNaN(aum) || Number(aum) <= 0) return '—';
  const num = Number(aum);
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`;
}

describe('All Mutual Fund Categories AUM Forensic Verification Suite', () => {
  const activeSchemesPath = path.resolve(__dirname, '../data/amfi_active_schemes.json');
  const verifiedCachePath = path.resolve(__dirname, '../data/verified_aum_cache.json');

  it('1. Verified AUM disk cache contains >2,000 official scheme disclosures with AUM metric', () => {
    assert(fs.existsSync(verifiedCachePath), 'verified_aum_cache.json must exist');
    const cache = JSON.parse(fs.readFileSync(verifiedCachePath, 'utf8'));
    assert(cache.disclosures, 'disclosures dictionary must exist');

    const totalDisclosures = Object.keys(cache.disclosures).length;
    assert(totalDisclosures >= 2000, `Expected at least 2,000 disclosures, found ${totalDisclosures}`);

    let aumCount = 0;
    let aaumCount = 0;
    for (const d of Object.values(cache.disclosures)) {
      if (d.aumMetric === 'AUM') aumCount++;
      if (d.aumMetric === 'AAUM') aaumCount++;
      if (d.aumCr != null) {
        assert(typeof d.aumCr === 'number' && d.aumCr > 0, `aumCr must be positive number if present for ${d.schemeCode}`);
      }
    }

    assert(aumCount >= 1950, `Expected at least 1,950 AUM disclosures, found ${aumCount}`);
    assert.strictEqual(aaumCount, 0, `No disclosure in verified cache should retain AAUM metric: found ${aaumCount}`);
  });

  it('2. Active scheme universe achieves >93% AUM coverage across all categories', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    assert(schemes.length >= 2100, `Expected >= 2100 active schemes, found ${schemes.length}`);

    const withAum = schemes.filter(s => s.aumCr != null && s.aumCr > 0);
    const coveragePct = (withAum.length / schemes.length) * 100;

    assert(withAum.length >= 1950, `Expected >= 1950 schemes with AUM, found ${withAum.length}`);
    assert(coveragePct >= 93.0, `Expected >= 93.0% AUM coverage across database, found ${coveragePct.toFixed(2)}%`);

    // Verify all schemes with AUM have aumMetric === 'AUM' and positive numeric aumCr
    for (const s of withAum) {
      assert.strictEqual(s.aumMetric, 'AUM', `Scheme ${s.schemeCode} (${s.name}) must have aumMetric === 'AUM'`);
      assert(typeof s.aumCr === 'number' && s.aumCr > 0, `Scheme ${s.schemeCode} must have numeric aumCr`);
      assert.strictEqual(s.aum, s.aumCr, `Scheme ${s.schemeCode} must have s.aum === s.aumCr`);
      assert(typeof s.indiaMfRank === 'number' && s.indiaMfRank > 0, `Scheme ${s.schemeCode} must have positive numeric indiaMfRank`);
    }
  });

  it('3. High coverage across every major SEBI mutual fund category', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();

    const expectedCategoryThresholds = [
      { name: 'Flexi Cap Fund', minCoverage: 95.0 },
      { name: 'Large Cap Fund', minCoverage: 95.0 },
      { name: 'Mid Cap Fund', minCoverage: 95.0 },
      { name: 'Small Cap Fund', minCoverage: 95.0 },
      { name: 'Multi Cap Fund', minCoverage: 90.0 },
      { name: 'ELSS', minCoverage: 90.0 },
      { name: 'Large & Mid Cap', minCoverage: 90.0 },
      { name: 'Focused Fund', minCoverage: 90.0 },
      { name: 'Value Fund', minCoverage: 80.0 },
      { name: 'Contra Fund', minCoverage: 80.0 },
      { name: 'Index Funds', minCoverage: 90.0 },
      { name: 'Liquid Fund', minCoverage: 90.0 },
      { name: 'Overnight Fund', minCoverage: 90.0 },
      { name: 'Dynamic Asset Allocation', minCoverage: 90.0 },
      { name: 'Arbitrage Fund', minCoverage: 90.0 },
      { name: 'Corporate Bond Fund', minCoverage: 90.0 },
      { name: 'Banking and PSU Fund', minCoverage: 90.0 },
      { name: 'Gold ETF', minCoverage: 95.0 }
    ];

    for (const check of expectedCategoryThresholds) {
      const catSchemes = schemes.filter(s => {
        const cat = (s.category || '') + ' ' + (s.normalizedSubcategory || '');
        return cat.toLowerCase().includes(check.name.toLowerCase());
      });

      assert(catSchemes.length > 0, `Category '${check.name}' must have active schemes`);
      const catWithAum = catSchemes.filter(s => s.aumCr != null && s.aumCr > 0);
      const catPct = (catWithAum.length / catSchemes.length) * 100;

      assert(
        catPct >= check.minCoverage,
        `Category '${check.name}' coverage ${catPct.toFixed(1)}% (${catWithAum.length}/${catSchemes.length}) below threshold ${check.minCoverage}%`
      );
    }
  });

  it('4. Data integrity: Unavailable schemes strictly retain null without fabricated numbers', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    const unavailableSchemes = schemes.filter(s => s.aumCr == null);

    assert(unavailableSchemes.length > 0, 'Unavailable schemes must exist for unclaimed/matured plans');
    assert(unavailableSchemes.length <= 150, `Unavailable schemes (${unavailableSchemes.length}) should not exceed expected unlisted/matured count`);

    for (const s of unavailableSchemes) {
      assert.strictEqual(s.aumCr, null, `Unavailable scheme ${s.schemeCode} must have null aumCr`);
      assert.strictEqual(s.aum, null, `Unavailable scheme ${s.schemeCode} must have null aum`);
      assert.strictEqual(s.indiaMfRank, null, `Unavailable scheme ${s.schemeCode} must have null indiaMfRank`);
      assert.strictEqual(s.indiaMfSubcategoryRank, null, `Unavailable scheme ${s.schemeCode} must have null indiaMfSubcategoryRank`);
      assert.strictEqual(formatAUM(s.aumCr), '—', `Unavailable scheme ${s.schemeCode} must format as dash`);
    }
  });

  it('5. Ranking determinism: Global ranks and subcategory ranks are consecutive and sorted by AUM descending', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    const rankedSchemes = schemes.filter(s => s.aumCr != null && s.aumCr > 0);

    // Global ranks (indiaMfRank) must be 1..N
    const sortedByRank = [...rankedSchemes].sort((a, b) => a.indiaMfRank - b.indiaMfRank);
    for (let i = 0; i < sortedByRank.length; i++) {
      assert.strictEqual(sortedByRank[i].indiaMfRank, i + 1, `Global rank must be consecutive: expected ${i + 1}, got ${sortedByRank[i].indiaMfRank}`);
      if (i > 0) {
        assert(
          sortedByRank[i - 1].aumCr >= sortedByRank[i].aumCr,
          `Scheme #${sortedByRank[i - 1].indiaMfRank} AUM (${sortedByRank[i - 1].aumCr}) must be >= Scheme #${sortedByRank[i].indiaMfRank} AUM (${sortedByRank[i].aumCr})`
        );
      }
    }

    // Subcategory ranks must be 1..M for each subcategory
    const subcatMap = {};
    for (const s of rankedSchemes) {
      const subcat = s.normalizedSubcategory || 'Unknown';
      if (!subcatMap[subcat]) subcatMap[subcat] = [];
      subcatMap[subcat].push(s);
    }

    for (const [subcat, subList] of Object.entries(subcatMap)) {
      subList.sort((a, b) => a.indiaMfSubcategoryRank - b.indiaMfSubcategoryRank);
      for (let j = 0; j < subList.length; j++) {
        assert.strictEqual(
          subList[j].indiaMfSubcategoryRank,
          j + 1,
          `Subcategory rank for ${subcat} must be consecutive: expected ${j + 1}, got ${subList[j].indiaMfSubcategoryRank}`
        );
        if (j > 0) {
          assert(
            subList[j - 1].aumCr >= subList[j].aumCr,
            `In ${subcat}, rank #${subList[j - 1].indiaMfSubcategoryRank} AUM must be >= rank #${subList[j].indiaMfSubcategoryRank} AUM`
          );
        }
      }
    }
  });

  it('6. Frontend table formatting renders valid rupee strings for verified schemes', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    const sampleCodes = ['122639', '118883', '120503', '120716', '125354', '118989', '118834'];

    for (const code of sampleCodes) {
      const scheme = schemes.find(s => String(s.schemeCode) === code);
      assert(scheme, `Scheme ${code} must exist in active schemes`);
      const formatted = formatAUM(scheme.aumCr);
      assert(formatted.startsWith('₹'), `Formatted string for ${code} must start with ₹: got ${formatted}`);
      assert(formatted.endsWith('Cr'), `Formatted string for ${code} must end with Cr: got ${formatted}`);
      assert(!formatted.includes('—'), `Formatted string for ${code} must not contain dash`);
    }
  });

  it('7. Small Cap fund universe: All 36 Small Cap schemes have verified positive numeric AUM and consecutive ranks', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();
    const smallCaps = schemes.filter(s => {
      const cat = (s.category || '') + ' ' + (s.normalizedSubcategory || '');
      return cat.toLowerCase().includes('small cap');
    });

    assert.strictEqual(smallCaps.length, 36, `Expected 36 Small Cap funds, found ${smallCaps.length}`);

    // Sort by subcategory rank
    smallCaps.sort((a, b) => a.indiaMfSubcategoryRank - b.indiaMfSubcategoryRank);

    for (let i = 0; i < smallCaps.length; i++) {
      const s = smallCaps[i];
      assert(typeof s.aumCr === 'number' && s.aumCr > 0, `Small Cap ${s.schemeCode} (${s.name}) must have positive numeric AUM`);
      assert.strictEqual(s.aumMetric, 'AUM', `Small Cap ${s.schemeCode} must have metric AUM`);
      assert.strictEqual(s.indiaMfSubcategoryRank, i + 1, `Small Cap ${s.schemeCode} rank must be ${i + 1}, got ${s.indiaMfSubcategoryRank}`);
      assert(typeof s.indiaMfRank === 'number' && s.indiaMfRank > 0, `Small Cap ${s.schemeCode} must have valid global rank`);
      assert(s.aumProvenance && s.aumProvenance.asOf, `Small Cap ${s.schemeCode} must have provenance reporting date`);

      const formatted = formatAUM(s.aumCr);
      assert(!formatted.includes('—'), `Small Cap ${s.schemeCode} must not render dash`);
      assert(formatted.includes('₹') && formatted.includes('Cr'), `Small Cap ${s.schemeCode} must format as ₹ ... Cr`);
    }
  });

  it('8. Representative funds across all core categories have verified AUM, valid dates, and positive values', async () => {
    const schemes = await allFundsDirectoryService._loadActiveSchemes();

    const representativeCodes = [
      { code: '120586', category: 'Large Cap', expectedMinAum: 50000 },
      { code: '118989', category: 'Mid Cap', expectedMinAum: 50000 },
      { code: '118778', category: 'Small Cap', expectedMinAum: 50000 },
      { code: '122639', category: 'Flexi Cap', expectedMinAum: 50000 },
      { code: '118650', category: 'Multi Cap', expectedMinAum: 30000 },
      { code: '119060', category: 'ELSS', expectedMinAum: 20000 },
      { code: '119721', category: 'Large & Mid Cap', expectedMinAum: 20000 },
      { code: '119727', category: 'Focused', expectedMinAum: 10000 },
      { code: '120323', category: 'Value', expectedMinAum: 30000 },
      { code: '119835', category: 'Contra', expectedMinAum: 30000 },
      { code: '120594', category: 'Sectoral Technology', expectedMinAum: 5000 },
      { code: '118759', category: 'Sectoral Healthcare/Pharma', expectedMinAum: 5000 },
      { code: '120438', category: 'Banking & PSU Debt', expectedMinAum: 5000 },
      { code: '120716', category: 'Index Fund', expectedMinAum: 10000 },
      { code: '135320', category: 'Equity ETF', expectedMinAum: 30000 },
      { code: '140088', category: 'Gold ETF', expectedMinAum: 20000 },
      { code: '119800', category: 'Liquid Fund', expectedMinAum: 30000 },
      { code: '119833', category: 'Overnight Fund', expectedMinAum: 10000 },
      { code: '118968', category: 'Balanced Advantage', expectedMinAum: 50000 },
      { code: '119771', category: 'Arbitrage', expectedMinAum: 20000 },
      { code: '120692', category: 'Corporate Bond', expectedMinAum: 10000 },
      { code: '120590', category: 'Gilt', expectedMinAum: 5000 },
      { code: '136094', category: 'Retirement Fund', expectedMinAum: 500 }
    ];

    for (const item of representativeCodes) {
      const scheme = schemes.find(s => String(s.schemeCode) === item.code);
      assert(scheme, `Representative scheme ${item.code} (${item.category}) must exist in universe`);
      assert(typeof scheme.aumCr === 'number' && scheme.aumCr >= item.expectedMinAum, `Scheme ${item.code} AUM must be >= ${item.expectedMinAum}`);
      assert.strictEqual(scheme.aumMetric, 'AUM', `Scheme ${item.code} must have metric AUM`);
      assert(typeof scheme.indiaMfRank === 'number' && scheme.indiaMfRank > 0, `Scheme ${item.code} must have rank`);
      assert(scheme.aumProvenance && scheme.aumProvenance.asOf, `Scheme ${item.code} must have provenance reporting date`);
      assert.strictEqual(scheme.aumProvenance.status, 'PROVIDER_REPORTED');
      
      const formatted = formatAUM(scheme.aumCr);
      assert(!formatted.includes('—'), `Scheme ${item.code} must not render dash`);
    }
  });

  it('9. Full pipeline integrity check: Source disk cache -> Service -> Route -> UI formatter', async () => {
    const cache = JSON.parse(fs.readFileSync(verifiedCachePath, 'utf8'));
    const testCode = '122639'; // Parag Parikh Flexi Cap

    const cacheEntry = cache.disclosures[testCode];
    assert(cacheEntry, 'Cache entry for 122639 must exist');
    assert.strictEqual(cacheEntry.aumMetric, 'AUM');

    // Load through service
    const dirResult = await allFundsDirectoryService.getAllSchemes(1, 20, { searchTerm: testCode });
    assert(dirResult.schemes.length > 0, 'Service must return scheme 122639');
    const serviceScheme = dirResult.schemes.find(s => s.schemeCode === testCode);
    assert(serviceScheme, 'Scheme 122639 must be found in directory');

    // Assert exact numerical match across pipeline layers
    assert.strictEqual(serviceScheme.aumCr, cacheEntry.aumCr, 'Service AUM must match cache entry');
    assert.strictEqual(serviceScheme.aumMetric, 'AUM');
    assert.strictEqual(serviceScheme.indiaMfRank, 1, 'PPFAS must be rank 1');

    // UI format
    const uiString = formatAUM(serviceScheme.aumCr);
    assert.strictEqual(uiString, '₹ 1,43,388.43 Cr', 'UI format must format rupee string correctly');
  });

  after(() => {
    setTimeout(() => process.exit(0), 50);
  });
});

