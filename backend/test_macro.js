import { getMacroCorrelation } from './services/MacroCorrelationService.js';

async function run() {
  try {
    const result = await getMacroCorrelation('Technology', '1yr');
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
