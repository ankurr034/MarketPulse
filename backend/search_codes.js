import axios from 'axios';
const search = async (q) => {
  try {
    const res = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
    console.log(`Search: ${q} ->`, res.data.slice(0, 3));
  } catch (e) {
    console.log(e.message);
  }
}
async function run() {
  await search('ICICI Prudential Technology Fund');
  await search('Tata Digital India Fund');
  await search('SBI Banking & Financial Services');
  await search('Nippon India Banking & Financial');
  await search('Nippon India Pharma');
  await search('SBI Healthcare Opportunities');
  await search('Franklin Build India');
  await search('ICICI Prudential Infrastructure');
  await search('Nippon India Power & Infra');
  await search('SBI Consumption Opportunities');
  await search('ICICI Prudential Bharat Consumption');
}
run();
