import axios from 'axios';
import sectorBasket from './config/sectorBasket.js';

async function verify() {
  for (const [sector, data] of Object.entries(sectorBasket)) {
    for (const fund of data.funds) {
      if (fund.region === 'india') {
        try {
          const res = await axios.get(`https://api.mfapi.in/mf/${fund.id}`);
          if (res.data && res.data.meta) {
            console.log(`[OK] ${fund.id} -> ${res.data.meta.scheme_name.substring(0, 50)}...`);
          } else {
            console.log(`[FAILED DATA] ${fund.id} for ${fund.name}`);
          }
        } catch (e) {
          console.log(`[FAILED REQ] ${fund.id} for ${fund.name}`);
        }
      }
    }
  }
}
verify();
