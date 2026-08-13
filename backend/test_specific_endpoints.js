import axios from 'axios';
import liveMfAnalyticsService from './services/LiveMfAnalyticsService.js';
import unifiedAssetService from './services/UnifiedAssetService.js';
import amfiImportService from './services/AmfiImportService.js';

async function checkFunds() {
  await amfiImportService.runAtomicImport();

  const codes = [
    '120594', // ICICI Tech Growth
    '120595', // ICICI Tech IDCW
    '120578', // SBI Tech Growth
    '118537', // Franklin Tech Growth
    '152059', // HDFC Tech Growth
    '152437', // Edelweiss Tech Growth
    '152462', // Kotak Tech Growth
    '154244', // LIC Tech Growth
    '152863', // Invesco Tech Growth
    '135800'  // Tata Digital Growth
  ];

  console.log("=== Checking Active Schemes Cache in AmfiImportService ===");
  const activeSchemes = await amfiImportService.getActiveSchemes();
  for (const code of codes) {
    const s = activeSchemes.find(item => String(item.schemeCode) === code);
    console.log(`\nScheme ${code}:`, s ? {
      name: s.schemeName,
      nav: s.nav,
      aum: s.aum,
      '1Y': s.oneYearChangePct,
      '3Y': s.threeYearCagr,
      '5Y': s.fiveYearCagr,
      inception: s.inceptionCagr
    } : 'NOT FOUND IN ACTIVE SCHEMES CACHE');
  }

  console.log("\n=== Checking UnifiedAssetService.getAssetSummary ===");
  for (const code of codes) {
    const summary = await unifiedAssetService.getAssetSummary('mf', code, 'india');
    console.log(`\nUnified Summary ${code}:`, {
      name: summary.name,
      nav: summary.currentPrice_or_nav,
      aum: summary.aum,
      '1Y': summary.oneYearChangePct,
      '3Y': summary.threeYearCagr,
      '5Y': summary.fiveYearCagr,
      inception: summary.inceptionCagr
    });
  }
}

checkFunds().catch(console.error);
