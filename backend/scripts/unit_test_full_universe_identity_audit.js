import unifiedAssetService from '../services/UnifiedAssetService.js';
import amfiImportService from '../services/AmfiImportService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import { resolveAmcName, resolvePlanAndOption, buildCanonicalIdentity } from '../utils/schemeFilterUtil.js';

async function runUniverseAudit() {
  console.log('🧪 Starting Full Universe Identity & Data Integrity Master Audit...\n');

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

  console.log('--- 1. Proving Bank of India Direct ≠ Bank of India Regular Identity ---');
  const boiDirect = await unifiedAssetService.getAssetSummary('mf', '148404', 'india');
  const boiRegular = await unifiedAssetService.getAssetSummary('mf', '148405', 'india');

  assert(boiDirect.schemeCode === '148404', 'Direct schemeCode is 148404');
  assert(boiRegular.schemeCode === '148405', 'Regular schemeCode is 148405');
  assert(boiDirect.schemeCode !== boiRegular.schemeCode, 'Direct schemeCode ≠ Regular schemeCode');

  assert(boiDirect.amc === 'Bank of India Mutual Fund', 'Direct AMC is Bank of India Mutual Fund');
  assert(boiRegular.amc === 'Bank of India Mutual Fund', 'Regular AMC is Bank of India Mutual Fund (NOT Bandhan!)');
  assert(boiDirect.amc === boiRegular.amc, 'Both belong to Bank of India Mutual Fund');

  assert(boiDirect.plan === 'Direct', 'Direct scheme plan is "Direct"');
  assert(boiRegular.plan === 'Regular', 'Regular scheme plan is "Regular"');
  assert(boiDirect.plan !== boiRegular.plan, 'Direct plan ≠ Regular plan');

  assert(boiDirect.isin === 'INF761K01FF5', 'Direct ISIN is INF761K01FF5');
  assert(boiRegular.isin === 'INF761K01FI9', 'Regular ISIN is INF761K01FI9');
  assert(boiDirect.isin !== boiRegular.isin, 'Direct ISIN ≠ Regular ISIN');

  assert(boiDirect.canonicalKey === '148404_INF761K01FF5_BankofIndiaMutualFund_Direct_Growth', 'Direct canonicalKey is exact');
  assert(boiRegular.canonicalKey === '148405_INF761K01FI9_BankofIndiaMutualFund_Regular_Growth', 'Regular canonicalKey is exact');
  assert(boiDirect.canonicalKey !== boiRegular.canonicalKey, 'Direct canonicalKey ≠ Regular canonicalKey');

  console.log('\n--- 2. Auditing 20+ Additional Funds Across 20 Distinct AMCs ---');
  const multiAmcCases = [
    { code: '122639', expectedAmc: 'PPFAS Mutual Fund', name: 'Parag Parikh Flexi Cap Direct' },
    { code: '120828', expectedAmc: 'Quant Mutual Fund', name: 'Quant Small Cap Direct' },
    { code: '118778', expectedAmc: 'Nippon India Mutual Fund', name: 'Nippon India Small Cap Direct' },
    { code: '119835', expectedAmc: 'SBI Mutual Fund', name: 'SBI Contra Direct' },
    { code: '119775', expectedAmc: 'Kotak Mahindra Mutual Fund', name: 'Kotak Emerging Equity Direct' },
    { code: '147946', expectedAmc: 'Bandhan Mutual Fund', name: 'Bandhan Small Cap Direct' },
    { code: '118481', expectedAmc: 'Bandhan Mutual Fund', name: 'Bandhan Value Fund Direct' },
    { code: '118989', expectedAmc: 'HDFC Mutual Fund', name: 'HDFC Mid-Cap Opportunities Direct' },
    { code: '120586', expectedAmc: 'ICICI Prudential Mutual Fund', name: 'ICICI Prudential Bluechip Direct' },
    { code: '118825', expectedAmc: 'Mirae Asset Mutual Fund', name: 'Mirae Asset Large Cap Direct' },
    { code: '135800', expectedAmc: 'Tata Mutual Fund', name: 'Tata Digital India Direct' },
    { code: '119242', expectedAmc: 'DSP Mutual Fund', name: 'DSP ELSS Tax Saver Direct' },
    { code: '127042', expectedAmc: 'Motilal Oswal Mutual Fund', name: 'Motilal Oswal Midcap Direct' },
    { code: '148703', expectedAmc: 'UTI Mutual Fund', name: 'UTI Nifty 200 Momentum 30 Index Direct' },
    { code: '145137', expectedAmc: 'Invesco Mutual Fund', name: 'Invesco India Smallcap Direct' },
    { code: '146196', expectedAmc: 'Edelweiss Mutual Fund', name: 'Edelweiss Small Cap Direct' },
    { code: '120564', expectedAmc: 'Aditya Birla Sun Life Mutual Fund', name: 'Aditya Birla Sun Life Flexi Cap Direct' },
    { code: '118535', expectedAmc: 'Franklin Templeton Mutual Fund', name: 'Franklin India Flexi Cap Direct' },
    { code: '120046', expectedAmc: 'HSBC Mutual Fund', name: 'HSBC Flexi Cap Direct' },
    { code: '120492', expectedAmc: 'JM Financial Mutual Fund', name: 'JM Flexicap Direct' },
    { code: '151379', expectedAmc: 'ITI Mutual Fund', name: 'ITI Flexi Cap Direct' },
    { code: '143793', expectedAmc: 'Navi Mutual Fund', name: 'Navi Flexi Cap Direct' },
    { code: '148474', expectedAmc: 'Baroda BNP Paribas Mutual Fund', name: 'Baroda BNP Paribas Large & Mid Cap Direct' },
    { code: '148567', expectedAmc: 'Mahindra Manulife Mutual Fund', name: 'Mahindra Manulife Focused Direct' },
    { code: '148481', expectedAmc: 'Invesco Mutual Fund', name: 'Invesco India Focused Direct' }
  ];

  for (const tc of multiAmcCases) {
    const summary = await unifiedAssetService.getAssetSummary('mf', tc.code, 'india');
    assert(summary && summary.schemeCode === tc.code, `[${tc.code}] Scheme code matches ${tc.code}`);
    assert(summary && summary.amc === tc.expectedAmc, `[${tc.code}] AMC matches "${tc.expectedAmc}" (${tc.name})`);
    assert(summary && summary.plan === 'Direct', `[${tc.code}] Plan is "Direct"`);
    assert(summary && summary.option === 'Growth', `[${tc.code}] Option is "Growth"`);
    assert(summary && summary.canonicalKey && summary.canonicalKey.startsWith(tc.code), `[${tc.code}] Canonical Key starts with schemeCode`);
  }

  console.log('\n--- 3. Auditing All Active Direct Growth Schemes (2,748 Schemes) ---');
  const activeList = await amfiImportService.getActiveSchemes() || [];
  let validCodes = 0;
  let validAmcs = 0;
  let validPlans = 0;
  let validOptions = 0;
  let validKeys = 0;
  let distinctKeySet = new Set();

  for (const s of activeList) {
    if (s.schemeCode && /^\d+$/.test(String(s.schemeCode).trim())) validCodes++;
    if (s.amc && s.amc.includes('Mutual Fund')) validAmcs++;
    if (s.plan === 'Direct') validPlans++;
    if (s.option === 'Growth') validOptions++;
    if (s.canonicalKey) {
      validKeys++;
      distinctKeySet.add(s.canonicalKey);
    }
  }

  assert(validCodes === activeList.length, `All ${activeList.length} schemes have valid numeric schemeCode`);
  assert(validAmcs === activeList.length, `All ${activeList.length} schemes have official canonical AMC name`);
  assert(validPlans === activeList.length, `All ${activeList.length} schemes strictly have plan="Direct"`);
  assert(validOptions === activeList.length, `All ${activeList.length} schemes strictly have option="Growth"`);
  assert(distinctKeySet.size === activeList.length, `All ${activeList.length} schemes have unique 5-tuple canonical keys (0 collisions)`);

  console.log('\n====================================================');
  console.log(`TOTAL AUDIT CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runUniverseAudit();
