import sectorDataService from '../services/SectorDataService.js';

async function verifySectorPerformance() {
  console.log('========================================================================================================================');
  console.log('                                  MARKETPULSE SECTOR PERFORMANCE AUDIT TABLE                                           ');
  console.log('========================================================================================================================');
  console.log(
    'Sector Name'.padEnd(25),
    'Price (₹)'.padEnd(12),
    '1W%'.padEnd(8),
    '1M%'.padEnd(8),
    '6M%'.padEnd(8),
    '1Y%'.padEnd(8),
    '3Y%'.padEnd(8),
    '5Y%'.padEnd(8),
    'ALL%'.padEnd(10),
    'EBIT (₹ Cr)'.padEnd(14)
  );
  console.log('-'.repeat(120));

  const sectors = await sectorDataService.getAllSectors('india', '1D', 'stocks');

  sectors.forEach(s => {
    console.log(
      s.name.padEnd(25),
      String(s.indexPrice ? ('₹' + s.indexPrice.toLocaleString('en-IN')) : '—').padEnd(12),
      (s.returns?.['1W'] !== null && s.returns?.['1W'] !== undefined ? s.returns['1W'] + '%' : '—').padEnd(8),
      (s.returns?.['1M'] !== null && s.returns?.['1M'] !== undefined ? s.returns['1M'] + '%' : '—').padEnd(8),
      (s.returns?.['6M'] !== null && s.returns?.['6M'] !== undefined ? s.returns['6M'] + '%' : '—').padEnd(8),
      (s.returns?.['1Y'] !== null && s.returns?.['1Y'] !== undefined ? s.returns['1Y'] + '%' : '—').padEnd(8),
      (s.returns?.['3Y'] !== null && s.returns?.['3Y'] !== undefined ? s.returns['3Y'] + '%' : '—').padEnd(8),
      (s.returns?.['5Y'] !== null && s.returns?.['5Y'] !== undefined ? s.returns['5Y'] + '%' : '—').padEnd(8),
      (s.returns?.['ALL'] !== null && s.returns?.['ALL'] !== undefined ? s.returns['ALL'] + '%' : '—').padEnd(10),
      (s.ebit ? ('₹' + s.ebit.toLocaleString('en-IN')) : '—').padEnd(14)
    );
  });
  console.log('========================================================================================================================');
}

verifySectorPerformance().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
