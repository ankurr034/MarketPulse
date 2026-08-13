import axios from 'axios';
import liveMfAnalyticsService from './services/LiveMfAnalyticsService.js';
import unifiedAssetService from './services/UnifiedAssetService.js';
import holdingsFallbackService from './services/HoldingsFallbackService.js';
import mfapiCacheService from './services/MfapiCacheService.js';

async function checkDirect() {
  const codes = [
    { code: '120594', name: 'ICICI Tech Growth' },
    { code: '120595', name: 'ICICI Tech IDCW' },
    { code: '120578', name: 'SBI Tech Growth' },
    { code: '118537', name: 'Franklin Tech Growth' },
    { code: '152059', name: 'HDFC Tech Growth' },
    { code: '152437', name: 'Edelweiss Tech Growth' },
    { code: '152462', name: 'Kotak Tech Growth' },
    { code: '154244', name: 'LIC Tech Growth' },
    { code: '152863', name: 'Invesco Tech Growth' },
    { code: '135800', name: 'Tata Digital Growth' }
  ];

  console.log("=== Testing Individual Schemes Direct Fetch ===");
  for (const { code, name } of codes) {
    console.log(`\n------------------------------------------------`);
    console.log(`Checking ${name} (Code: ${code})`);

    // 1. Check mfapiCacheService / calculateSchemeMetrics
    try {
      const mfData = await mfapiCacheService.getSchemeData(code);
      if (mfData && mfData.data && mfData.data.length > 0) {
        const formattedNavData = [...mfData.data].map(item => ({
          date: item.date,
          nav: item.nav
        }));
        const metrics = liveMfAnalyticsService.calculateSchemeMetrics(formattedNavData);
        console.log(`  mfapi history count: ${mfData.data.length}`);
        console.log(`  Calculated Metrics:`, {
          '1W': metrics.return1W,
          '1M': metrics.return1M,
          '3M': metrics.return3M,
          '6M': metrics.return6M,
          '1Y': metrics.return1Y,
          '3Y': metrics.return3Y,
          '5Y': metrics.return5Y,
          'All': metrics.returnAll
        });
      } else {
        console.log(`  mfapi data empty or missing!`);
      }
    } catch (e) {
      console.log(`  mfapi error: ${e.message}`);
    }

    // 2. Check UnifiedAssetService.getAssetSummary
    try {
      const summary = await unifiedAssetService.getAssetSummary('mf', code, 'india');
      console.log(`  Unified Summary:`, {
        name: summary.name,
        nav: summary.currentPrice_or_nav,
        aum: summary.aum,
        '1Y': summary.oneYearChangePct,
        '3Y': summary.threeYearCagr,
        '5Y': summary.fiveYearCagr,
        inception: summary.inceptionCagr
      });
    } catch (e) {
      console.log(`  Unified summary error: ${e.message}`);
    }

    // 3. Check HoldingsFallbackService (FinAPI Upvaly)
    try {
      const finData = await holdingsFallbackService.fetchFinapiHoldings(code);
      console.log(`  FinAPI Upvaly AUM: ${finData?.aum}, 3Y: ${finData?.officialReturns?.['3Y']}, 5Y: ${finData?.officialReturns?.['5Y']}`);
    } catch (e) {
      console.log(`  FinAPI Upvaly error: ${e.message}`);
    }
  }
}

checkDirect().catch(console.error);
