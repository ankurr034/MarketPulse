import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/assets/indianMf/122639/detail');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
