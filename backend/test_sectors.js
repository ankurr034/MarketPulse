import sectorDataService from './services/SectorDataService.js';

async function run() {
  const globalSectors = await sectorDataService.getAllSectors('global', '1D', 'stocks');
  console.log(globalSectors.map(s => ({
    name: s.name,
    valid: s.validStocks,
    total: s.totalStocks,
    advances: s.advances,
    declines: s.declines,
    chg: s.changePercent
  })));
}
run();
