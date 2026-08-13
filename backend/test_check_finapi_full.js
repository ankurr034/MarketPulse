import axios from 'axios';

async function checkFinapiFull() {
  console.log("=== CHECKING FINAPI SCHEME DETAIL FIELDS ===");
  try {
    const res = await axios.get("https://finapi.upvaly.com/api/mf/scheme-code/122639");
    console.log("Keys in FinAPI detail for 122639:", Object.keys(res.data?.data || {}));
    console.log("Full data:", JSON.stringify(res.data?.data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

checkFinapiFull();
