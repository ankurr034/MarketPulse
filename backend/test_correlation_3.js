import axios from 'axios';

async function testTechSurge() {
  try {
    const res = await axios.get('https://api.mfapi.in/mf/120594');
    const history = res.data.data;
    
    // format is DD-MM-YYYY
    const aprNav = history.find(d => d.date === '07-04-2025' || d.date === '04-04-2025' || d.date === '08-04-2025')?.nav;
    // Find closest date to Jun 6 2025
    const junNav = history.find(d => d.date === '06-06-2025' || d.date === '05-06-2025' || d.date === '09-06-2025')?.nav;
    
    console.log(`Apr 6 NAV: ${aprNav}, Jun 6 NAV: ${junNav}`);
    if (aprNav && junNav) {
      console.log(`True Tech Surge: ${(((parseFloat(junNav) - parseFloat(aprNav))/parseFloat(aprNav))*100).toFixed(2)}%`);
    } else {
        console.log("Sample:", history.slice(0, 5));
    }
  } catch (e) {
    console.log('Error', e.message);
  }
}
testTechSurge();
