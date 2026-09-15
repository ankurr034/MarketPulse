import axios from 'axios';

async function testTata() {
  const res = await axios.get('https://www.tatamutualfund.com', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const text = res.data;
  const regex = /(https?:\/\/[^\s"'<>]+\.(?:xlsx|xls))/gi;
  let m;
  const found = [];
  while ((m = regex.exec(text)) !== null) {
    found.push(m[1]);
  }
  console.log('Tata excel links:', found.length);
  if (found.length > 0) console.log(found.slice(0, 5));
}
testTata().catch(e => console.error(e.message));
