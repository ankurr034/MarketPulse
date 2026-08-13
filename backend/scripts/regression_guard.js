import mfapiCacheService from '../services/MfapiCacheService.js';
import indianMfSectorService from '../services/IndianMfSectorService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import { readFileSync } from 'fs';

async function runRegressionGuard() {
  console.log("==========================================================================================");
  console.log("             AUTOMATED FULL REGRESSION GUARD (PRE-DEPLOYMENT VALIDATION)                  ");
  console.log("==========================================================================================");

  // 1. Fetch FULL fund list (flatFunds + extra-schemes)
  const routeCode = readFileSync('./routes/indianMf.js', 'utf8');
  const match = routeCode.match(/const EXTRA_SCHEMES_REGISTRY = (\[[\s\S]*?\]);/);
  let extraRegistry = [];
  if (match) {
    try {
      extraRegistry = eval(match[1]);
    } catch (e) {
      console.error('Failed to parse EXTRA_SCHEMES_REGISTRY:', e.message);
    }
  }

  const flatFunds = await indianMfSectorService.getAllFundsFlat();
  
  // Combine & Deduplicate
  const fullFundMap = new Map();
  [...flatFunds, ...extraRegistry].forEach(f => {
    const code = String(f.id || f.schemeCode);
    if (code && /^\d+$/.test(code)) {
      if (!fullFundMap.has(code)) {
        fullFundMap.set(code, f);
      }
    }
  });

  const fullFundList = Array.from(fullFundMap.values());
  const totalFundCount = fullFundList.length;
  console.log(`Auditing FULL list of ${totalFundCount} funds...`);

  let validAmfiCount = 0;
  let nullFieldCount = 0;
  
  const navValueCounts = new Map();
  const aumValueCounts = new Map();
  
  const checkFailures = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < fullFundList.length; i += BATCH_SIZE) {
    const batch = fullFundList.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (fund) => {
      const code = String(fund.id || fund.schemeCode);
      const name = fund.name || fund.schemeName;

      let nav = null;
      let aum = null;

      try {
        const summary = await unifiedAssetService.getAssetSummary('mf', code, 'india');
        const detail = await holdingsFallbackService.getHoldings(code, name);
        
        nav = summary?.currentPrice_or_nav || null;
        aum = summary?.aum || detail?.aum || null;

        // Check C: AMFI Master Match via local cache service
        const resData = await mfapiCacheService.getSchemeData(code);
        if (resData && resData.meta && resData.meta.scheme_name) {
          validAmfiCount++;
        } else {
          checkFailures.push(`[Check C Failed] Scheme Code ${code} (${name}) does not exist in AMFI master.`);
        }

        // Check D: List view vs Detail view consistency
        const profile = await unifiedAssetService.getAssetDetail('mf', code, 'india');
        if (summary && profile) {
          if (summary.currentPrice_or_nav !== profile.nav && summary.currentPrice_or_nav !== null && profile.nav !== null) {
            checkFailures.push(`[Check D Failed] List view NAV (${summary.currentPrice_or_nav}) vs Detail view NAV (${profile.nav}) mismatch for ${code}`);
          }
        }

        // Check B: Sector allocation sum check (for funds with holdings, accounting for cash/debt allocations)
        if (detail && detail.sector_weightings && Object.keys(detail.sector_weightings).length > 0) {
          const sectorSum = Object.values(detail.sector_weightings).reduce((sum, w) => sum + w, 0);
          if (sectorSum < 60 || sectorSum > 120) {
            checkFailures.push(`[Check B Failed] Sector allocation sum is ${sectorSum.toFixed(2)}% (outside valid 60-120% range) for ${code} (${name})`);
          }
        }
      } catch (e) {
        checkFailures.push(`[Check C Failed] Scheme Code ${code} (${name}) fetch error: ${e.message}`);
      }

      if (nav === null || aum === null) {
        nullFieldCount++;
      }

      // Record value frequencies for duplicate check
      if (nav !== null) {
        const key = nav.toFixed(2);
        navValueCounts.set(key, (navValueCounts.get(key) || 0) + 1);
      }
      if (aum !== null) {
        const key = aum.toFixed(2);
        aumValueCounts.set(key, (aumValueCounts.get(key) || 0) + 1);
      }
    }));
  }

  // Check A: No single AUM or NAV value shared by > 2 unrelated schemes
  let duplicateValueFailed = false;
  for (const [val, count] of navValueCounts.entries()) {
    if (count > 2) {
      checkFailures.push(`[Check A Failed] NAV value ₹${val} repeated across ${count} unrelated funds (> 2 limit)!`);
      duplicateValueFailed = true;
    }
  }
  for (const [val, count] of aumValueCounts.entries()) {
    if (count > 2) {
      checkFailures.push(`[Check A Failed] AUM value ₹${val} Cr repeated across ${count} unrelated funds (> 2 limit)!`);
      duplicateValueFailed = true;
    }
  }

  console.log("\n==========================================================================================");
  console.log("                               REGRESSION AUDIT SUMMARY                                   ");
  console.log("==========================================================================================");
  console.log(`• Total Fund Count: ${totalFundCount}`);
  console.log(`• Count of Funds with Valid AMFI Scheme Code Match: ${validAmfiCount}`);
  console.log(`• Count of Funds with any Null / "Data Unavailable" Field: ${nullFieldCount}`);
  console.log(`• Duplicate NAV/AUM Repeat Violation (>2 funds): ${duplicateValueFailed ? "YES (FAIL)" : "NO (PASS)"}`);
  console.log("==========================================================================================");

  if (checkFailures.length > 0) {
    console.error("\n❌ REGRESSION GUARD FAILED WITH THE FOLLOWING VIOLATIONS:");
    checkFailures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log("\n✅ ALL REGRESSION CHECKS PASSED 100%! READY FOR DEPLOYMENT.");
    process.exit(0);
  }
}

runRegressionGuard();
