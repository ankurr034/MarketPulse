import axios from 'axios';

async function testTechSurge() {
  try {
    const res = await axios.get('http://localhost:5001/api/assets/mf/120594/detail');
    const history = res.data.data?.history || res.data.history || res.data;
    if (!history) return;
    
    // Find closest date to Apr 6 2025 (e.g. Apr 4, Apr 7)
    // format is DD-MM-YYYY
    const aprNav = history.find(d => d.date === '07-04-2025' || d.date === '04-04-2025' || d.date === '08-04-2025')?.nav;
    // Find closest date to Jun 6 2025
    const junNav = history.find(d => d.date === '06-06-2025' || d.date === '05-06-2025' || d.date === '09-06-2025')?.nav;
    
    console.log(`Apr 6 NAV: ${aprNav}, Jun 6 NAV: ${junNav}`);
    if (aprNav && junNav) {
      console.log(`True Tech Surge: ${(((junNav - aprNav)/aprNav)*100).toFixed(2)}%`);
    } else {
        // print a sample
        console.log("Sample:", history.slice(0, 5));
        const aprmatch = history.filter(d => d.date.includes('04-2025')).slice(0,3);
        console.log("Apr sample:", aprmatch);
    }
  } catch (e) {
    console.log('Error', e.message);
  }
}
testTechSurge();
