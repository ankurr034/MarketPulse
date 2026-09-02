import axios from 'axios';
import { getDisplayedMfRank } from '../../frontend/src/utils/rankMutualFunds.js';

const API_BASE = 'http://localhost:5001/api';

async function runLiveVerification() {
  console.log('====================================================');
  console.log('STARTING LIVE MUTUAL FUND RANKING VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, msg, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // Fetch live directory and sector overview
    const [allRes, directRes, overviewRes] = await Promise.all([
      axios.get(`${API_BASE}/indian-mf/all-schemes?pageSize=3000`),
      axios.get(`${API_BASE}/indian-mf/all-direct-schemes`),
      axios.get(`${API_BASE}/indian-mf/sectors-overview`)
    ]);

    const allFunds = allRes.data.schemes || [];
    const directFunds = directRes.data || [];
    const overview = overviewRes.data || [];

    console.log(`Fetched ${allFunds.length} schemes from /all-schemes`);
    console.log(`Fetched ${directFunds.length} direct schemes from /all-direct-schemes\n`);

    // ----------------------------------------------------
    // CHECK 1: ALL MUTUAL FUNDS (global AUM rank 1..N)
    // ----------------------------------------------------
    console.log('--- CHECK 1: ALL MUTUAL FUNDS (global AUM rank 1..N) ---');
    const sortedAll = [...allFunds].filter(f => f.aumCr > 0).sort((a, b) => b.aumCr - a.aumCr);
    const top1 = sortedAll[0];
    const top2 = sortedAll[1];
    const top3 = sortedAll[2];

    assert(
      top1 && getDisplayedMfRank(top1, 'all') === 1,
      `All Funds #1 is ${top1?.name} with indiaMfRank = 1 (AUM: ₹${top1?.aumCr} Cr)`
    );
    assert(
      top2 && getDisplayedMfRank(top2, 'all') === 2,
      `All Funds #2 is ${top2?.name} with indiaMfRank = 2 (AUM: ₹${top2?.aumCr} Cr)`
    );
    assert(
      top3 && getDisplayedMfRank(top3, 'all') === 3,
      `All Funds #3 is ${top3?.name} with indiaMfRank = 3 (AUM: ₹${top3?.aumCr} Cr)`
    );

    // ----------------------------------------------------
    // CHECK 2: EQUITY -> FLEXI CAP (#1..#5)
    // ----------------------------------------------------
    console.log('\n--- CHECK 2: EQUITY -> FLEXI CAP (#1..#5) ---');
    const flexiCapFunds = allFunds.filter(f => 
      (f.category || '').toLowerCase().includes('flexi cap') ||
      (f.name || '').toLowerCase().includes('flexi cap')
    ).sort((a, b) => (b.aumCr || 0) - (a.aumCr || 0));

    console.log(`Found ${flexiCapFunds.length} Flexi Cap schemes in universe`);
    const flexiTop5 = flexiCapFunds.slice(0, 5);

    flexiTop5.forEach((f, idx) => {
      const expectedRank = idx + 1;
      const actualRank = getDisplayedMfRank(f, 'subcategory');
      assert(
        actualRank === expectedRank,
        `Flexi Cap #${expectedRank}: ${f.name} (Subcategory Rank: #${actualRank}, AUM: ₹${f.aumCr} Cr)`
      );
    });

    // ----------------------------------------------------
    // CHECK 3: OTHER SUBCATEGORIES (Large Cap, Mid Cap, Small Cap)
    // ----------------------------------------------------
    console.log('\n--- CHECK 3: OTHER SUBCATEGORIES ---');

    // Large Cap
    const largeCapFunds = allFunds.filter(f => 
      (f.category || '').toLowerCase().includes('large cap fund') ||
      (f.name || '').toLowerCase().includes('large cap')
    ).sort((a, b) => (b.aumCr || 0) - (a.aumCr || 0));

    console.log(`Large Cap Top 3:`);
    largeCapFunds.slice(0, 3).forEach((f, idx) => {
      const expectedRank = idx + 1;
      const actualRank = getDisplayedMfRank(f, 'subcategory');
      assert(
        actualRank === expectedRank,
        `Large Cap #${expectedRank}: ${f.name} (Subcategory Rank: #${actualRank}, AUM: ₹${f.aumCr} Cr)`
      );
    });

    // Mid Cap
    const midCapFunds = allFunds.filter(f => 
      (f.category || '').toLowerCase().includes('mid cap fund') ||
      (f.name || '').toLowerCase().includes('mid cap')
    ).sort((a, b) => (b.aumCr || 0) - (a.aumCr || 0));

    console.log(`Mid Cap Top 3:`);
    midCapFunds.slice(0, 3).forEach((f, idx) => {
      const expectedRank = idx + 1;
      const actualRank = getDisplayedMfRank(f, 'subcategory');
      assert(
        actualRank === expectedRank,
        `Mid Cap #${expectedRank}: ${f.name} (Subcategory Rank: #${actualRank}, AUM: ₹${f.aumCr} Cr)`
      );
    });

    // Small Cap
    const smallCapFunds = allFunds.filter(f => 
      (f.category || '').toLowerCase().includes('small cap fund') ||
      (f.name || '').toLowerCase().includes('small cap')
    ).sort((a, b) => (b.aumCr || 0) - (a.aumCr || 0));

    console.log(`Small Cap Top 3:`);
    smallCapFunds.slice(0, 3).forEach((f, idx) => {
      const expectedRank = idx + 1;
      const actualRank = getDisplayedMfRank(f, 'subcategory');
      assert(
        actualRank === expectedRank,
        `Small Cap #${expectedRank}: ${f.name} (Subcategory Rank: #${actualRank}, AUM: ₹${f.aumCr} Cr)`
      );
    });

    // ----------------------------------------------------
    // CHECK 4: GLOBAL VS LOCAL RANK EXAMPLE
    // ----------------------------------------------------
    console.log('\n--- CHECK 4: GLOBAL VS LOCAL RANK EXAMPLE ---');
    const exampleFund = flexiCapFunds.find(f => f.indiaMfRank !== f.indiaMfSubcategoryRank && f.indiaMfSubcategoryRank !== null);
    if (exampleFund) {
      const globalRank = getDisplayedMfRank(exampleFund, 'all');
      const subRank = getDisplayedMfRank(exampleFund, 'subcategory');
      assert(
        globalRank !== subRank,
        `Global Rank ≠ Subcategory Rank example: ${exampleFund.name} -> All Funds: #${globalRank}, Flexi Cap: #${subRank}`
      );
    } else {
      assert(false, 'No fund found with distinct global vs subcategory rank');
    }

    // ----------------------------------------------------
    // CHECK 5: SEARCH PRESERVES CANONICAL SUBCATEGORY RANK
    // ----------------------------------------------------
    console.log('\n--- CHECK 5: SEARCH VERIFICATION ---');
    const targetFlexiFund = flexiCapFunds[2]; // #3 Flexi Cap fund
    const searchQuery = targetFlexiFund.name.split(' ')[0]; // e.g. "Aditya" or "Motilal"
    const searchResults = flexiCapFunds.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const foundInSearch = searchResults.find(f => f.schemeCode === targetFlexiFund.schemeCode);
    const searchDisplayRank = getDisplayedMfRank(foundInSearch, 'subcategory');

    assert(
      foundInSearch && searchDisplayRank === 3,
      `Search query "${searchQuery}" retains canonical subcategory rank #${searchDisplayRank} (not reset to #1)`
    );

    // ----------------------------------------------------
    // CHECK 6: SORTING PRESERVES CANONICAL SUBCATEGORY RANK
    // ----------------------------------------------------
    console.log('\n--- CHECK 6: SORTING VERIFICATION ---');
    const sortedByNav = [...flexiCapFunds].sort((a, b) => (b.nav || 0) - (a.nav || 0));
    const navTopFund = sortedByNav[0];
    const originalSubRank = navTopFund.indiaMfSubcategoryRank;
    const displayedSubRank = getDisplayedMfRank(navTopFund, 'subcategory');

    assert(
      displayedSubRank === originalSubRank,
      `Sort by NAV DESC preserves subcategory rank #${displayedSubRank} for ${navTopFund.name}`
    );

    // ----------------------------------------------------
    // CHECK 7: PAGINATION / VIEW ALL (Flexi Cap 1..N)
    // ----------------------------------------------------
    console.log('\n--- CHECK 7: PAGINATION / VIEW ALL VERIFICATION ---');
    const flexiCapRanks = flexiCapFunds.map(f => getDisplayedMfRank(f, 'subcategory')).filter(r => r !== null);
    const isSequential = flexiCapRanks.every((r, idx) => r === idx + 1);

    assert(
      isSequential && flexiCapRanks.length >= 30,
      `Flexi Cap universe (${flexiCapRanks.length} schemes) has unbroken sequential subcategory ranks #1 to #${flexiCapRanks.length}`
    );

    // ----------------------------------------------------
    // CHECK 8: SECTOR / THEME VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- CHECK 8: SECTOR / THEME VERIFICATION ---');
    const sectorList = Array.isArray(overview) ? overview : (overview.sectors || overview.data || []);
    const techSector = sectorList.find(s => (s.sectorName || s.name || '').toLowerCase().includes('technology') || (s.sectorId || s.id || '').toLowerCase().includes('technology'));
    if (techSector && techSector.topFunds && techSector.topFunds.length > 0) {
      const topTech = techSector.topFunds[0];
      const sectorRank = getDisplayedMfRank(topTech, 'sector');
      assert(
        sectorRank === 1,
        `Technology Sector #1 fund is ${topTech.name || topTech.schemeName} with indiaMfSectorRank = #1`
      );
    } else {
      const sectorFunds = allFunds.filter(f => f.indiaMfSectorRank !== null && f.indiaMfSectorRank !== undefined);
      assert(sectorFunds.length > 0, `Found ${sectorFunds.length} schemes with valid indiaMfSectorRank`);
    }

    // ----------------------------------------------------
    // CHECK 9: API -> UI CONSISTENCY
    // ----------------------------------------------------
    console.log('\n--- CHECK 9: API -> UI CONSISTENCY ---');
    const testFund = allFunds.find(f => f.indiaMfSubcategoryRank === 1);
    const resolvedRank = getDisplayedMfRank(testFund, 'subcategory');
    assert(
      resolvedRank === testFund.indiaMfSubcategoryRank,
      `UI Rank Resolver strictly binds backend property indiaMfSubcategoryRank (${resolvedRank} === ${testFund.indiaMfSubcategoryRank})`
    );

    // ----------------------------------------------------
    // CHECK 10: NO FALLBACK TO GLOBAL RANK
    // ----------------------------------------------------
    console.log('\n--- CHECK 10: NO FALLBACK TO GLOBAL RANK ---');
    const unrankedSubcategoryFund = { ...testFund, indiaMfSubcategoryRank: null };
    const nullResult = getDisplayedMfRank(unrankedSubcategoryFund, 'subcategory');

    assert(
      nullResult === null,
      `Subcategory context with null indiaMfSubcategoryRank returns null (rendered as '—'), does NOT fall back to indiaMfRank #${unrankedSubcategoryFund.indiaMfRank}`
    );

  } catch (err) {
    console.error('Error during live verification:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveVerification();
