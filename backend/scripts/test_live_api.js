import axios from 'axios';

async function testLiveApi() {
  const base = 'http://localhost:5001/api/analytics/mutual-fund/stock-weightage';

  console.log('Testing live backend endpoints...\n');

  // 1. Screener KPI & list
  const resScreener = await axios.get(`${base}/screener?limit=5`);
  console.log('1. Screener endpoint status:', resScreener.status);
  console.log('   KPIs:', resScreener.data.kpis);
  console.log('   Top 3 stocks in screener:');
  resScreener.data.stocks.slice(0, 3).forEach(s => {
    console.log(`     #${s.rank} ${s.symbol} (${s.name}): held by ${s.mutualFundsHolding} funds | avg wt: ${s.avgWeightage}% | total val: ₹${s.totalHoldingValueCr} Cr`);
  });

  // 2. HDFC Bank detail
  const resDetail = await axios.get(`${base}/HDFCBANK`);
  const detail = resDetail.data.data || resDetail.data;
  console.log('\n2. HDFC Bank detail endpoint status:', resDetail.status);
  console.log('   Stock name:', detail.name, 'Symbol:', detail.symbol, 'ISIN:', detail.isin);
  console.log('   Ownership summary:', detail.ownershipSummary);
  console.log('   AMC Distribution:', detail.ownershipSummary.amcDistribution);
  console.log('   Key Takeaways:', detail.keyTakeaways);

  // 3. Funds holding HDFC Bank
  const resFunds = await axios.get(`${base}/HDFCBANK/funds?page=1&limit=3`);
  const fundsData = resFunds.data.data || resFunds.data;
  console.log('\n3. Funds holding HDFC Bank status:', resFunds.status);
  console.log('   Pagination:', fundsData.pagination);
  console.log('   Summary:', fundsData.summary);
  console.log('   Sample funds:');
  fundsData.funds.forEach(f => {
    console.log(`     #${f.rank} [${f.schemeCode}] ${f.schemeName} | AMC: ${f.amc} | Weight: ${f.weightage}% | Value: ₹${f.holdingValueCr} Cr`);
  });

  // 4. Reverse lookup: Fund -> complete portfolio
  const resFundPortfolio = await axios.get(`${base}/fund/122639`);
  const portfolioData = resFundPortfolio.data.data || resFundPortfolio.data;
  console.log('\n4. Reverse lookup (Parag Parikh Flexi Cap 122639) status:', resFundPortfolio.status);
  console.log(`   Total holdings in portfolio: ${portfolioData.totalHoldings}`);
  console.log('   Top 3 holdings:');
  portfolioData.holdings.slice(0, 3).forEach(h => {
    console.log(`     #${h.rank} ${h.stockName || h.name} (${h.symbol}): ${h.weightPct}% (₹${h.valueCr} Cr)`);
  });

  console.log('\n✅ ALL LIVE API TESTS PASSED SUCCESSFULLY!');
}

testLiveApi().catch(e => {
  console.error('LIVE API TEST FAILED:', e.message);
  process.exit(1);
});
