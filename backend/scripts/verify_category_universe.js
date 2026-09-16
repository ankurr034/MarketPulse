import stockWeightageService from '../services/StockWeightageService.js';

async function verifyCategoryUniverse() {
  await stockWeightageService.init();

  const categories = ['Large Cap', 'Mid Cap', 'Small Cap', 'Contra', 'Value'];
  console.log(`========================================================================`);
  console.log(`VERIFICATION: CATEGORY-WISE HOLDINGS COVERAGE ACROSS MULTI-AMC UNIVERSE`);
  console.log(`========================================================================`);

  for (const cat of categories) {
    console.log(`\n--- [CATEGORY: ${cat.toUpperCase()}] ---`);
    const fundsRes = await stockWeightageService.getFundsList({ category: cat, limit: 100 });
    const funds = fundsRes.funds || [];
    const withHoldings = funds.filter(f => f.holdingsAvailable);
    const amcsWithHoldings = new Set(withHoldings.map(f => f.amc));

    console.log(`Total Eligible ${cat} Funds: ${funds.length}`);
    console.log(`Funds with Disclosed Holdings: ${withHoldings.length}`);
    console.log(`Unique AMCs with Disclosed Holdings: ${amcsWithHoldings.size}`);
    console.log(`AMCs with Holdings: ${[...amcsWithHoldings].join(', ')}`);

    // Run screener for this category
    const screenerRes = await stockWeightageService.getScreenerResults({ category: cat, limit: 5 });
    console.log(`Total Distinct Stocks Held by ${cat} Funds: ${screenerRes.pagination.totalStocks}`);
    console.log(`Top 5 Most Held Stocks in ${cat}:`);
    screenerRes.stocks.forEach(s => {
      console.log(`  #${s.rank} ${s.symbol} (${s.stockName}) | Sector: ${s.sector} | Funds Holding: ${s.fundsHolding} | Avg Wt: ${s.avgWeightage}% | Max Wt: ${s.maxWeightage}%`);
    });
  }

  // Get full diagnostics
  const diag = await stockWeightageService.getCoverageDiagnostics();
  console.log(`\n========================================================================`);
  console.log(`FINAL AUDIT REPORT:`);
  console.log(`Eligible Funds: ${diag.eligibleFunds}`);
  console.log(`Funds with Verified Holdings: ${diag.fundsWithVerifiedHoldings}`);
  console.log(`Funds Awaiting Statutory Publication: ${diag.fundsAwaitingPublication}`);
  console.log(`Funds Failed Due to Parsing/Source Errors: ${diag.fundsFailed}`);
  console.log(`Unique AMCs Covered: ${diag.uniqueAmcsCovered}`);
  console.log(`Unique Stocks: ${diag.uniqueStocks}`);
  console.log(`Total Holdings Positions: ${diag.totalHoldings}`);
  console.log(`Category-wise Holdings Coverage:`, JSON.stringify(diag.categoryWiseCoverage, null, 2));
  console.log(`========================================================================`);
}

verifyCategoryUniverse().catch(console.error);
