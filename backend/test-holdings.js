import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/assets/mf/122639/detail');
    console.log(JSON.stringify(res.data.holdings.slice(0, 2), null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
