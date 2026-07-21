import sectorDataService from './services/SectorDataService.js';

async function run() {
  const globalSectors = await sectorDataService.getAllSectors('global', '1D', 'stocks');
  console.log(globalSectors[0]); // Tech
}
run();
