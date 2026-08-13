import axios from 'axios';

async function checkNav() {
  const res = await axios.get('https://api.mfapi.in/mf/122639');
  const navArray = res.data.data;
  console.log("Total daily NAV records:", navArray.length);
  console.log("Latest NAV [0]:", navArray[0]);
  console.log("NAV 1 Year ago (~250 items back):", navArray[Math.min(250, navArray.length - 1)]);
  console.log("Oldest NAV in mfapi.in:", navArray[navArray.length - 1]);

  const latestNav = parseFloat(navArray[0].nav);
  const nav1Y = parseFloat(navArray[Math.min(250, navArray.length - 1)].nav);
  const return1Y = ((latestNav - nav1Y) / nav1Y) * 100;
  console.log(`Calculated 1Y Return: ${return1Y.toFixed(2)}% (Latest: ₹${latestNav}, 1Y Ago: ₹${nav1Y})`);
}

checkNav();
