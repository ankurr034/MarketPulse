import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import MacroCorrelationService from './services/MacroCorrelationService.js';
import { mfBasket } from './config/sectorBasket.js';

async function sweep() {
  await connectDB();
  const sectors = Object.keys(mfBasket);
  for (const sector of sectors) {
    try {
      const res = await MacroCorrelationService.getSectorMacroCorrelation(sector, 'repoRate', '5Y');
      console.log(`\n--- ${sector} ---`);
      if (res.correlation && res.correlation.narrative) {
        console.log(res.correlation.narrative);
      } else if (res.periodsOfAlignment && res.periodsOfDivergence) {
         console.log("Alignment:");
         console.log(res.periodsOfAlignment.map(p => p.description).join('\n'));
         console.log("Divergence:");
         console.log(res.periodsOfDivergence.map(p => p.description).join('\n'));
      }
    } catch(e) {
      console.log(`Error on ${sector}:`, e.message);
    }
  }
  process.exit(0);
}
sweep();
