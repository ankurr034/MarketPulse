import axios from 'axios';

async function measure() {
  console.log('Testing cold load...');
  const startCold = Date.now();
  try {
    const res = await axios.get('http://localhost:5001/api/indian-mf/sectors-overview');
    console.log(`Cold load /sectors-overview: ${Date.now() - startCold}ms (Cached: ${res.data.cached})`);
  } catch(e) {
    console.log(`Cold load failed: ${Date.now() - startCold}ms - ${e.message}`);
  }

  const startFlat = Date.now();
  try {
    const res = await axios.get('http://localhost:5001/api/indian-mf/sectors/flat');
    console.log(`Cold load /sectors/flat: ${Date.now() - startFlat}ms`);
  } catch(e) {
    console.log(`Cold load flat failed: ${Date.now() - startFlat}ms - ${e.message}`);
  }

  console.log('\nTesting warm load...');
  const startWarm = Date.now();
  try {
    const res = await axios.get('http://localhost:5001/api/indian-mf/sectors-overview');
    console.log(`Warm load /sectors-overview: ${Date.now() - startWarm}ms (Cached: ${res.data.cached})`);
  } catch(e) {
    console.log(`Warm load failed: ${Date.now() - startWarm}ms - ${e.message}`);
  }
}

measure();
