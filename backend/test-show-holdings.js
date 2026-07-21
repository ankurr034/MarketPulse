import holdingsFallbackService from './services/HoldingsFallbackService.js';

async function main() {
  try {
    const result = await holdingsFallbackService.getHoldings('120594', 'ICICI Prudential Technology Fund');
    if (result && result.available) {
      console.log('--- TOP 10 HOLDINGS ---');
      const top10 = result.holdings.slice(0, 10);
      top10.forEach((h, index) => {
        console.log(`${index + 1}. ${h.Symbol} - ${(h['Holding Percent'] * 100).toFixed(2)}% (${h.sector || 'N/A'})`);
      });
      console.log('\n--- SECTOR WEIGHTINGS ---');
      Object.entries(result.sector_weightings).forEach(([sector, weight]) => {
        console.log(`${sector}: ${(weight * 100).toFixed(2)}%`);
      });
    } else {
      console.log('Failed to fetch:', result.reason);
    }
  } catch (e) {
    console.error(e);
  }
}

main();
