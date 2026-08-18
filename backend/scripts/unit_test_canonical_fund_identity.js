import unifiedAssetService from '../services/UnifiedAssetService.js';
import amfiImportService from '../services/AmfiImportService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import { resolveAmcName, resolvePlanAndOption, buildCanonicalIdentity } from '../utils/schemeFilterUtil.js';

async function runCanonicalFundIdentitySuite() {
  console.log('🧪 Starting Comprehensive Canonical Fund Identity & Data Integrity Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  console.log('--- Test Group 1: Bank of India Direct vs Regular Identity ---');
  const boiDirect = await unifiedAssetService.getAssetSummary('mf', '148404', 'india');
  const boiRegular = await unifiedAssetService.getAssetSummary('mf', '148405', 'india');

  assert(boiDirect.schemeCode === '148404', '148404 schemeCode must be "148404"');
  assert(boiDirect.amc === 'Bank of India Mutual Fund', '148404 AMC must be "Bank of India Mutual Fund"');
  assert(boiDirect.plan === 'Direct', '148404 plan must be "Direct"');
  assert(boiDirect.option === 'Growth', '148404 option must be "Growth"');
  assert(boiDirect.isin === 'INF761K01FF5', '148404 ISIN must be "INF761K01FF5"');
  assert(boiDirect.canonicalKey === '148404_INF761K01FF5_BankofIndiaMutualFund_Direct_Growth', '148404 canonicalKey must match');

  assert(boiRegular.schemeCode === '148405', '148405 schemeCode must be "148405"');
  assert(boiRegular.amc === 'Bank of India Mutual Fund', '148405 AMC must be "Bank of India Mutual Fund" (NOT Bandhan!)');
  assert(boiRegular.plan === 'Regular', '148405 plan must be "Regular" (NOT Direct!)');
  assert(boiRegular.option === 'Growth', '148405 option must be "Growth"');
  assert(boiRegular.isin === 'INF761K01FI9', '148405 ISIN must be "INF761K01FI9"');
  assert(boiRegular.canonicalKey === '148405_INF761K01FI9_BankofIndiaMutualFund_Regular_Growth', '148405 canonicalKey must match');

  console.log('\n--- Test Group 2: Multi-AMC & Multi-Category Scheme Identity Verification ---');
  const testCases = [
    { code: '122639', expectedAmc: 'PPFAS Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Parag Parikh Flexi Cap Direct Growth' },
    { code: '120828', expectedAmc: 'Quant Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Quant Small Cap Direct Growth' },
    { code: '118778', expectedAmc: 'Nippon India Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Nippon India Small Cap Direct Growth' },
    { code: '119835', expectedAmc: 'SBI Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'SBI Contra Direct Growth' },
    { code: '119775', expectedAmc: 'Kotak Mahindra Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Kotak Emerging Equity Direct Growth' },
    { code: '147946', expectedAmc: 'Bandhan Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Bandhan Small Cap Direct Growth' },
    { code: '118481', expectedAmc: 'Bandhan Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Bandhan Value Fund Direct Growth' },
    { code: '118989', expectedAmc: 'HDFC Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'HDFC Mid-Cap Opportunities Direct Growth' },
    { code: '120586', expectedAmc: 'ICICI Prudential Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'ICICI Prudential Bluechip Direct Growth' },
    { code: '118825', expectedAmc: 'Mirae Asset Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Mirae Asset Large Cap Direct Growth' },
    { code: '135800', expectedAmc: 'Tata Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Tata Digital India Direct Growth' },
    { code: '119242', expectedAmc: 'DSP Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'DSP ELSS Tax Saver Direct Growth' },
    { code: '127042', expectedAmc: 'Motilal Oswal Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'Motilal Oswal Midcap Direct Growth' },
    { code: '148703', expectedAmc: 'UTI Mutual Fund', expectedPlan: 'Direct', expectedOption: 'Growth', desc: 'UTI Nifty 200 Momentum 30 Index Direct Growth' }
  ];

  for (const tc of testCases) {
    const summary = await unifiedAssetService.getAssetSummary('mf', tc.code, 'india');
    assert(summary && summary.schemeCode === tc.code, `[${tc.code}] Scheme code matches ${tc.code}`);
    assert(summary && summary.amc === tc.expectedAmc, `[${tc.code}] AMC matches "${tc.expectedAmc}" (${tc.desc})`);
    assert(summary && summary.plan === tc.expectedPlan, `[${tc.code}] Plan matches "${tc.expectedPlan}"`);
    assert(summary && summary.option === tc.expectedOption, `[${tc.code}] Option matches "${tc.expectedOption}"`);
    assert(summary && summary.canonicalKey && summary.canonicalKey.startsWith(tc.code), `[${tc.code}] Canonical Key starts with schemeCode`);
  }

  console.log('\n--- Test Group 3: Canonical Key Uniqueness Across Active Universe ---');
  const activeList = await amfiImportService.getActiveSchemes() || [];
  const keysSet = new Set();
  let duplicates = 0;
  for (const s of activeList) {
    if (s.canonicalKey) {
      if (keysSet.has(s.canonicalKey)) {
        duplicates++;
      } else {
        keysSet.add(s.canonicalKey);
      }
    }
  }
  assert(duplicates === 0, `All active schemes must have unique canonical keys (Duplicates found: ${duplicates})`);
  assert(keysSet.size === activeList.length, `Unique keys count (${keysSet.size}) matches active schemes (${activeList.length})`);

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runCanonicalFundIdentitySuite();
