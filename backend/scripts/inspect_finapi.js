import axios from 'axios';

async function check() {
  try {
    const res = await axios.get('https://finapi.upvaly.com/api/mf/scheme-code/119062', { timeout: 8000 });
    console.log('Status:', res.status);
    console.log('Keys in res.data:', Object.keys(res.data));
    console.log('Keys in res.data.data:', Object.keys(res.data?.data || {}));
    console.log('Holdings count:', res.data?.data?.holdings?.length);
    console.log('Holdings sample:', JSON.stringify((res.data?.data?.holdings || []).slice(0, 3), null, 2));
    console.log('Sectors:', res.data?.data?.sectors?.length);
  } catch (err) {
    console.error('FinAPI error:', err.message);
  }
}

check();
