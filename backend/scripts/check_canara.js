import axios from 'axios';

async function checkCanara() {
  try {
    const res = await axios.get('https://www.canararobeco.com/statutory-disclosures', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    console.log('Canara status:', res.status);
    const links = res.data.match(/https?:\/\/[^"'\s]+\.(?:xlsx|xls|pdf)/gi) || [];
    console.log('Canara links count:', links.length);
    console.log('Sample links:', links.slice(0, 10));
  } catch (e) {
    console.log('Canara err:', e.message);
  }
}

checkCanara();
