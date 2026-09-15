import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import amfiImportService from '../services/AmfiImportService.js';

async function testDiscovery() {
  console.log('Testing scheme discovery and holdings across AMCs...');
  
  const testSchemes = [
    { code: '119062', name: 'ICICI Prudential Bluechip Fund' },
    { code: '118989', name: 'HDFC Mid-Cap Opportunities Fund' },
    { code: '125464', name: 'SBI Small Cap Fund' },
    { code: '120503', name: 'Axis Bluechip Fund' },
    { code: '120847', name: 'Kotak Emerging Equity Fund' },
    { code: '118272', name: 'Mirae Asset Large Cap Fund' },
    { code: '122639', name: 'Parag Parikh Flexi Cap Fund' }
  ];

  for (const s of testSchemes) {
    try {
      const res = await holdingsFallbackService.getHoldings(s.code, s.name);
      console.log(`\nScheme: ${s.name} (${s.code})`);
      console.log(`  Available: ${res?.available}`);
      console.log(`  Holdings count: ${res?.holdings?.length || 0}`);
      console.log(`  AUM (Cr): ${res?.aum || res?.aumCr || 'N/A'}`);
      console.log(`  Source: ${res?.source || res?.aumSource || 'N/A'}`);
      console.log(`  Date: ${res?.holdingsAsOf || res?.aumAsOf || res?.holdings?.[0]?.portfolioAsOf || 'N/A'}`);
      if (res?.holdings && res.holdings.length > 0) {
        const top5 = res.holdings.slice(0, 5).map(h => `${h.name || h.stock} (${h.weightPct}%)`);
        console.log(`  Top 5 Holdings:`, top5.join(' | '));
      }
    } catch (e) {
      console.error(`Error for ${s.name}:`, e.message);
    }
  }

  // Also check AMFI active schemes count
  const activeSchemes = await amfiImportService.getActiveSchemes();
  console.log(`\nAMFI Active Schemes in snapshot: ${activeSchemes?.length || 0}`);
}

testDiscovery().catch(console.error);
