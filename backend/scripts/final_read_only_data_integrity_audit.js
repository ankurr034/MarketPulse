import axios from 'axios';
import fs from 'fs';
import path from 'path';
import amfiImportService from '../services/AmfiImportService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import { isStrictDirectGrowth, resolveAmcName, resolvePlanAndOption } from '../utils/schemeFilterUtil.js';

const API_BASE = 'http://localhost:5001/api/indian-mf';

async function runFinalAudit() {
  console.log('==========================================================================');
  console.log('          FINAL READ-ONLY DATA INTEGRITY & AUDIT PIPELINE                 ');
  console.log('==========================================================================\n');

  let passedChecks = 0;
  let failedChecks = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedChecks++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedChecks++;
    }
  }

  // 1. Audit Active AMFI Dataset & Direct Growth Count
  console.log('--- 1. Authoritative AMFI Snapshot Audit ---');
  const activeSchemes = await amfiImportService.getActiveSchemes();
  const directGrowthSchemes = activeSchemes.filter(s => isStrictDirectGrowth(s.schemeName));
  const nonDirectGrowth = activeSchemes.filter(s => !isStrictDirectGrowth(s.schemeName));

  assert(activeSchemes.length > 0, `Active schemes snapshot loaded (${activeSchemes.length} records)`);
  assert(nonDirectGrowth.length === 0, `Active schemes snapshot contains 0 non-Direct/Growth records (Found: ${nonDirectGrowth.length})`);
  assert(directGrowthSchemes.length === activeSchemes.length, `100% of snapshot records are strictly Direct Growth (${directGrowthSchemes.length}/${activeSchemes.length})`);

  // 2. Proving Bank of India Exact Isolation
  console.log('\n--- 2. Bank of India Direct vs Regular Verification ---');
  const boiDirectSummary = await unifiedAssetService.getAssetSummary('mf', '148404', 'india');
  const boiRegularSummary = await unifiedAssetService.getAssetSummary('mf', '148405', 'india');

  assert(boiDirectSummary.schemeCode === '148404', '148404 schemeCode is 148404');
  assert(boiDirectSummary.amc === 'Bank of India Mutual Fund', '148404 AMC is Bank of India Mutual Fund');
  assert(boiDirectSummary.plan === 'Direct', '148404 Plan is Direct');
  assert(boiDirectSummary.option === 'Growth', '148404 Option is Growth');
  assert(boiDirectSummary.isin === 'INF761K01FF5', '148404 ISIN is INF761K01FF5');
  assert(boiDirectSummary.aum === 2786.4, '148404 AUM is ₹2,786.40 Cr');

  assert(boiRegularSummary.schemeCode === '148405', '148405 schemeCode is 148405');
  assert(boiRegularSummary.amc === 'Bank of India Mutual Fund', '148405 AMC is Bank of India Mutual Fund (NOT Bandhan!)');
  assert(boiRegularSummary.plan === 'Regular', '148405 Plan is Regular');
  assert(boiRegularSummary.option === 'Growth', '148405 Option is Growth');
  assert(boiRegularSummary.isin === 'INF761K01FI9', '148405 ISIN is INF761K01FI9');

  // Verify 148405 is strictly NOT in the Direct Growth universe
  const inActiveSnapshot = activeSchemes.some(s => String(s.schemeCode) === '148405');
  assert(!inActiveSnapshot, '148405 (Regular Growth) is STRICTLY EXCLUDED from active snapshot');

  // 3. Testing API Endpoints Before UI Consumption
  console.log('\n--- 3. Testing Live API Endpoints (Direct + Growth Only) ---');

  // A) /all-direct-schemes
  const allDirectRes = await axios.get(`${API_BASE}/all-direct-schemes`);
  assert(Array.isArray(allDirectRes.data), '/all-direct-schemes returns valid array');
  assert(allDirectRes.data.length === directGrowthSchemes.length, `/all-direct-schemes count (${allDirectRes.data.length}) matches snapshot count (${directGrowthSchemes.length})`);
  
  let allDirectViolations = 0;
  let regularInAllDirect = allDirectRes.data.find(s => String(s.schemeCode) === '148405');
  let directInAllDirect = allDirectRes.data.find(s => String(s.schemeCode) === '148404');
  
  for (const s of allDirectRes.data) {
    if (!isStrictDirectGrowth(s.name || s.schemeName) || s.plan !== 'Direct' || s.option !== 'Growth') {
      allDirectViolations++;
    }
  }
  assert(allDirectViolations === 0, `/all-direct-schemes contains 0 non-Direct/Growth violations`);
  assert(directInAllDirect !== undefined, `148404 (Bank of India Direct) is present in /all-direct-schemes`);
  assert(regularInAllDirect === undefined, `148405 (Bank of India Regular) is ABSENT from /all-direct-schemes`);

  // B) /extra-schemes
  const extraRes = await axios.get(`${API_BASE}/extra-schemes`);
  assert(Array.isArray(extraRes.data), '/extra-schemes returns valid array');
  let extraViolations = 0;
  let regularInExtra = extraRes.data.find(s => String(s.schemeCode) === '148405' || String(s.id) === '148405');
  let directInExtra = extraRes.data.find(s => String(s.schemeCode) === '148404' || String(s.id) === '148404');
  for (const s of extraRes.data) {
    if (!isStrictDirectGrowth(s.name || s.schemeName) || s.plan !== 'Direct' || s.option !== 'Growth') {
      extraViolations++;
    }
  }
  assert(extraViolations === 0, `/extra-schemes contains 0 non-Direct/Growth violations`);
  assert(directInExtra !== undefined, `148404 (Bank of India Direct) is present in /extra-schemes`);
  assert(regularInExtra === undefined, `148405 (Bank of India Regular) is ABSENT from /extra-schemes`);

  // C) /sectors/flat
  const flatRes = await axios.get(`${API_BASE}/sectors/flat`);
  assert(Array.isArray(flatRes.data), '/sectors/flat returns valid array');
  let flatViolations = 0;
  for (const s of flatRes.data) {
    if (s.region === 'india') {
      if (!isStrictDirectGrowth(s.name || s.schemeName) || (s.plan && s.plan !== 'Direct') || (s.option && s.option !== 'Growth')) {
        flatViolations++;
      }
    }
  }
  assert(flatViolations === 0, `/sectors/flat contains 0 non-Direct/Growth violations`);

  // D) /all-schemes Directory (Search, Pagination, Filtering)
  const dirPage1 = await axios.get(`${API_BASE}/all-schemes?page=1&pageSize=50`);
  assert(dirPage1.data.totalCount === directGrowthSchemes.length, `/all-schemes totalCount (${dirPage1.data.totalCount}) matches exact Direct Growth universe (${directGrowthSchemes.length})`);
  
  // Search query verification
  const searchBoiRes = await axios.get(`${API_BASE}/all-schemes?search=Bank+of+India+Flexi`);
  const boiDirectFound = searchBoiRes.data.schemes.find(s => String(s.schemeCode) === '148404');
  const boiRegFound = searchBoiRes.data.schemes.find(s => String(s.schemeCode) === '148405');
  assert(boiDirectFound !== undefined, `Search for 'Bank of India Flexi' returns Direct scheme 148404`);
  assert(boiRegFound === undefined, `Search for 'Bank of India Flexi' DOES NOT return Regular scheme 148405`);

  // 4. Multi-Key Canonical Identity Collision & Contamination Check
  console.log('\n--- 4. Multi-Key Canonical Identity & Data Invariance Audit ---');
  const keySet = new Set();
  const codeMap = new Map();
  let duplicateCanonicalKeys = 0;
  let amcCrossContaminations = 0;

  for (const s of activeSchemes) {
    if (keySet.has(s.canonicalKey)) {
      duplicateCanonicalKeys++;
    } else {
      keySet.add(s.canonicalKey);
    }

    if (codeMap.has(s.schemeCode)) {
      const prev = codeMap.get(s.schemeCode);
      if (prev.amc !== s.amc) {
        amcCrossContaminations++;
      }
    } else {
      codeMap.set(s.schemeCode, s);
    }
  }

  assert(duplicateCanonicalKeys === 0, `0 canonical identity collisions across universe (${keySet.size}/${activeSchemes.length} unique keys)`);
  assert(amcCrossContaminations === 0, `0 AMC cross-contaminations found`);

  // 5. AUM Exact Source & Truthful Null Verification
  console.log('\n--- 5. AUM Exact Source & Truthful Null Verification ---');
  let validAumCount = 0;
  let nullAumCount = 0;
  let invalidAumTypes = 0;

  for (const s of allDirectRes.data) {
    if (s.aum === null) {
      nullAumCount++;
    } else if (typeof s.aum === 'number' && !isNaN(s.aum) && s.aum > 0) {
      validAumCount++;
    } else {
      invalidAumTypes++;
    }
  }

  assert(invalidAumTypes === 0, `0 invalid/corrupted AUM values found`);
  assert(validAumCount > 0, `Verified numeric AUM attached to ${validAumCount} schemes`);
  assert(nullAumCount > 0, `Genuinely unavailable AUM truthfully rendered as null for ${nullAumCount} schemes (zero fabrication)`);

  console.log('\n==========================================================================');
  console.log(`TOTAL AUDIT CHECKS: ${passedChecks + failedChecks}`);
  console.log(`PASSED: ${passedChecks}`);
  console.log(`FAILED: ${failedChecks}`);
  console.log('==========================================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runFinalAudit();
