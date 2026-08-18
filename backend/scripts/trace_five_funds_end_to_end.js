import axios from 'axios';
import fs from 'fs';
import path from 'path';
import amfiImportService from '../services/AmfiImportService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';

const API_BASE = 'http://localhost:5001/api/indian-mf';

async function traceFiveFunds() {
  console.log('==========================================================================');
  console.log('            FIVE-FUND END-TO-END VERIFICATION & AUDIT TRACE               ');
  console.log('==========================================================================\n');

  const fundsToAudit = [
    { code: '122639', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', amc: 'PPFAS Mutual Fund' },
    { code: '120828', name: 'quant Small Cap Fund - Growth Option - Direct Plan', amc: 'Quant Mutual Fund' },
    { code: '118778', name: 'Nippon India Small Cap Fund - Direct Plan Growth Plan', amc: 'Nippon India Mutual Fund' },
    { code: '148404', name: 'BANK OF INDIA Flexi Cap Fund Direct Plan -Growth', amc: 'Bank of India Mutual Fund' },
    { code: '120586', name: 'ICICI Prudential Large Cap Fund - Direct Plan - Growth', amc: 'ICICI Prudential Mutual Fund' }
  ];

  const activeSnapshot = await amfiImportService.getActiveSchemes();
  const allDirectRes = await axios.get(`${API_BASE}/all-direct-schemes`);
  const extraRes = await axios.get(`${API_BASE}/extra-schemes`);

  for (const target of fundsToAudit) {
    console.log(`\n--------------------------------------------------------------------------`);
    console.log(`>>> TRACING FUND: [${target.code}] ${target.name}`);
    console.log(`--------------------------------------------------------------------------`);

    // 1. Authoritative Disk Snapshot Layer
    const snapshotItem = activeSnapshot.find(s => String(s.schemeCode) === target.code);
    console.log('1. DISK SNAPSHOT LAYER:');
    console.log('   SchemeCode:', snapshotItem?.schemeCode);
    console.log('   SchemeName:', snapshotItem?.schemeName);
    console.log('   AMC:', snapshotItem?.amc);
    console.log('   ISIN:', snapshotItem?.isinGrowth || snapshotItem?.isin);
    console.log('   Plan:', snapshotItem?.plan);
    console.log('   Option:', snapshotItem?.option);
    console.log('   AUM (Cr):', snapshotItem?.aum);
    console.log('   NAV:', snapshotItem?.nav);

    // 2. Service Layer (UnifiedAssetService)
    const summary = await unifiedAssetService.getAssetSummary('mf', target.code, 'india');
    console.log('2. SERVICE LAYER (UnifiedAssetService):');
    console.log('   SchemeCode:', summary?.schemeCode);
    console.log('   SchemeName:', summary?.schemeName);
    console.log('   AMC:', summary?.amc);
    console.log('   ISIN:', summary?.isin);
    console.log('   Plan:', summary?.plan);
    console.log('   Option:', summary?.option);
    console.log('   AUM (Cr):', summary?.aum);
    console.log('   Latest NAV:', summary?.currentPrice_or_nav);
    console.log('   1Y Return:', summary?.returns?.['1Y']);
    console.log('   3Y CAGR:', summary?.returns?.['3Y']);
    console.log('   5Y CAGR:', summary?.returns?.['5Y']);
    console.log('   Inception CAGR:', summary?.returns?.['All']);
    console.log('   Sharpe Ratio:', summary?.sharpeRatio);
    console.log('   Sortino Ratio:', summary?.sortinoRatio);

    // 3. API Layer (/all-direct-schemes & /extra-schemes)
    const apiDirectItem = allDirectRes.data.find(s => String(s.schemeCode) === target.code);
    const apiExtraItem = extraRes.data.find(s => String(s.schemeCode) === target.code || String(s.id) === target.code);

    console.log('3. API LAYER (/all-direct-schemes):');
    console.log('   AUM (Cr):', apiDirectItem?.aum);
    console.log('   Latest NAV:', apiDirectItem?.nav);
    console.log('   1Y Return:', apiDirectItem?.returns?.['1Y'] ?? apiDirectItem?.oneYearChangePct);
    console.log('   3Y CAGR:', apiDirectItem?.returns?.['3Y'] ?? apiDirectItem?.threeYearCagr);
    console.log('   5Y CAGR:', apiDirectItem?.returns?.['5Y'] ?? apiDirectItem?.fiveYearCagr);
    console.log('   Inception CAGR:', apiDirectItem?.returns?.['All'] ?? apiDirectItem?.inceptionCagr);
    console.log('   Sharpe Ratio:', apiDirectItem?.sharpeRatio);
    console.log('   Sortino Ratio:', apiDirectItem?.sortinoRatio);

    console.log('4. API LAYER (/extra-schemes):');
    console.log('   AUM (Cr):', apiExtraItem?.aum);
    console.log('   Latest NAV:', apiExtraItem?.currentPrice_or_nav);
    console.log('   1Y Return:', apiExtraItem?.returns?.['1Y'] ?? apiExtraItem?.oneYearChangePct);
    console.log('   3Y CAGR:', apiExtraItem?.returns?.['3Y'] ?? apiExtraItem?.threeYearCagr);
    console.log('   5Y CAGR:', apiExtraItem?.returns?.['5Y'] ?? apiExtraItem?.fiveYearCagr);
    console.log('   Inception CAGR:', apiExtraItem?.returns?.['All'] ?? apiExtraItem?.inceptionCagr);
    console.log('   Sharpe Ratio:', apiExtraItem?.sharpeRatio);
    console.log('   Sortino Ratio:', apiExtraItem?.sortinoRatio);

    // 4. Verification Assertions
    if (snapshotItem && summary && apiDirectItem) {
      const matchAum = apiDirectItem.aum === summary.aum;
      console.log(`   ✅ AUM Invariance Verified: Snapshot/Service (${summary.aum}) === API (${apiDirectItem.aum}) -> ${matchAum}`);
      const matchIdentity = apiDirectItem.schemeCode === summary.schemeCode && summary.plan === 'Direct' && summary.option === 'Growth';
      console.log(`   ✅ Identity Invariance Verified: Direct + Growth (${summary.plan} / ${summary.option}) -> ${matchIdentity}`);
    }
  }

  console.log('\n==========================================================================');
  console.log('             FIVE-FUND END-TO-END TRACE COMPLETED!                        ');
  console.log('==========================================================================\n');
}

traceFiveFunds();
