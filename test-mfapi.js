import axios from 'axios';
import { resolveRangeToDates } from './backend/utils/dateRangeUtils.js';

async function test() {
  const res = await axios.get('https://api.mfapi.in/mf/148614');
  const navArray = res.data.data;
  
  const parsed = navArray.map(n => {
    const parts = n.date.split('-');
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    return {
      time: d.getTime(), // ms
      value: parseFloat(n.nav)
    };
  }).sort((a, b) => a.time - b.time);

  const parsedRange = resolveRangeToDates('1yr');
  const cutoff = parsedRange.start.getTime();
  const filtered = parsed.filter(d => d.time >= cutoff);
  console.log("Filtered length:", filtered.length);
  if (filtered.length > 0) {
    console.log("Latest:", new Date(filtered[filtered.length - 1].time));
  }
}
test();
