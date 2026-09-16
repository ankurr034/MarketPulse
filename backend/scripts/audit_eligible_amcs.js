import stockWeightageService from '../services/StockWeightageService.js';

async function main() {
  await stockWeightageService.init();
  const amcMap = {};
  for (const fund of stockWeightageService.eligibleFundUniverseMap.values()) {
    if (!amcMap[fund.amc]) amcMap[fund.amc] = [];
    amcMap[fund.amc].push(fund);
  }
  console.log(`Total AMCs in 226 eligible universe: ${Object.keys(amcMap).length}`);
  const sorted = Object.entries(amcMap).sort((a, b) => b[1].length - a[1].length);
  for (const [amc, funds] of sorted) {
    const withH = funds.filter(f => f.holdingsAvailable).length;
    console.log(`${amc} (${funds.length} schemes, ${withH} with holdings):`);
    funds.forEach(f => console.log(`   - [${f.targetCategory}] ${f.schemeName} (${f.schemeCode}) [Holdings: ${f.holdingsAvailable}]`));
  }
}

main().catch(console.error);
