import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('http://localhost:5001/api/assets/mf/122639/detail');
    console.log(JSON.stringify(res.data.advancedAnalysis, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
test();
