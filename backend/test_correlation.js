import axios from 'axios';

async function testTechSurge() {
  try {
    const res = await axios.get('http://localhost:5001/api/assets/mf/120594/detail');
    const history = res.data.data?.history || res.data.history || res.data;
    if (!history || !Array.isArray(history)) {
      console.log('No history found for 120594', Object.keys(res.data));
      return;
    }
    const aprilNav = history.find(d => d.date === '06-04-2025' || d.date === '07-04-2025' || d.date === '04-04-2025')?.nav;
    const juneNav = history.find(d => d.date === '06-06-2025' || d.date === '05-06-2025' || d.date === '04-06-2025')?.nav;
    console.log(`Tech Fund 120594 NAVs - Apr: ${aprilNav}, Jun: ${juneNav}`);
    if (aprilNav && juneNav) {
      const growth = ((parseFloat(juneNav) - parseFloat(aprilNav)) / parseFloat(aprilNav)) * 100;
      console.log(`True Tech Surge (Apr-Jun 2025): ${growth.toFixed(2)}%`);
    } else {
      console.log('Could not find exact dates for tech surge calculation.');
    }
  } catch (e) {
    console.error('Error fetching tech fund detail:', e.message);
  }
}

async function testCorrelation() {
  const sectors = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'Consumption'];
  for (const sector of sectors) {
    try {
      const res = await axios.get(`http://localhost:5001/api/indian-mf/macro/correlation/${sector}?range=5Y`);
      console.log(`\n--- ${sector} ---`);
      if (res.data && res.data.correlation && res.data.correlation.narrative) {
        console.log(res.data.correlation.narrative);
      } else if (res.data && res.data.periodsOfAlignment && res.data.periodsOfDivergence) {
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

async function run() {
  await testTechSurge();
  await testCorrelation();
}
run();
