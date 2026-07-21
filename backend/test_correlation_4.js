import axios from 'axios';

async function testCorrelation() {
  const sectors = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'Consumption'];
  for (const sector of sectors) {
    try {
      const res = await axios.get(`http://localhost:5001/api/indian-mf/macro/correlation/${sector}?range=5Y`);
      console.log(`\n--- ${sector} ---`);
      if (res.data && res.data.periodsOfAlignment && res.data.periodsOfDivergence) {
         console.log("Alignment:");
         console.log(res.data.periodsOfAlignment.map(p => p.description).join('\n'));
         console.log("Divergence:");
         console.log(res.data.periodsOfDivergence.map(p => p.description).join('\n'));
      } else {
        console.log("No narrative found.");
      }
    } catch (e) {
      console.error(`Error for ${sector}:`, e.message);
    }
  }
}
testCorrelation();
