import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('https://finapi.upvaly.com/api/mf/scheme-code/122639');
    console.log(JSON.stringify(res.data.data.holdings.slice(0, 2), null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
