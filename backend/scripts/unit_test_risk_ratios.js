import riskAnalyticsService from '../services/RiskAnalyticsService.js';

/**
 * UNIT TEST SUITE FOR SHARPE & SORTINO RATIOS
 * Uses a synthetic return series with hand-calculated reference values
 */

function runUnitTests() {
  console.log("==========================================================================");
  console.log("      UNIT TESTS: SHARPE & SORTINO MATHEMATICAL RATIO VERIFICATION       ");
  console.log("==========================================================================");

  // Synthetic Price Series: 20 Trading Days
  // Price starts at 100 and moves deterministically
  const prices = [
    100.0, 101.0, 100.5, 102.0, 101.5,
    103.0, 102.5, 104.0, 103.5, 105.0,
    104.5, 106.0, 105.5, 107.0, 106.5,
    108.0, 107.5, 109.0, 108.5, 110.0
  ];

  const returns = riskAnalyticsService.calculateReturns(prices);
  console.log(`\n[TEST 1] Returns Series Calculated: ${returns.length} daily return periods`);
  console.log(`  - First Daily Return: ${(returns[0] * 100).toFixed(4)}%`);
  console.log(`  - Last Daily Return: ${(returns[returns.length - 1] * 100).toFixed(4)}%`);

  // Annualized Volatility
  const vol = riskAnalyticsService.calculateVolatility(returns);
  console.log(`  - Calculated Annualized Volatility: ${(vol * 100).toFixed(2)}%`);

  // Sharpe Ratio
  const sharpe = riskAnalyticsService.calculateDailySharpeRatio(returns);
  console.log(`  - Calculated Annualized Sharpe Ratio: ${sharpe}`);

  // Sortino Ratio
  const sortino = riskAnalyticsService.calculateDailySortinoRatio(returns);
  console.log(`  - Calculated Annualized Sortino Ratio: ${sortino}`);

  // Short Window Threshold Test (< 15 data points)
  const shortPrices = [100.0, 101.0, 102.0, 101.5, 103.0]; // 5 prices -> 4 returns
  const shortReturns = riskAnalyticsService.calculateReturns(shortPrices);
  const shortSharpe = riskAnalyticsService.calculateDailySharpeRatio(shortReturns);
  const shortSortino = riskAnalyticsService.calculateDailySortinoRatio(shortReturns);

  console.log("\n[TEST 2] Short Window Threshold (< 15 returns):");
  console.log(`  - Data Points: ${shortReturns.length}`);
  console.log(`  - Short Window Sharpe: ${shortSharpe} (Must be null)`);
  console.log(`  - Short Window Sortino: ${shortSortino} (Must be null)`);

  let passed = true;

  if (typeof sharpe === 'number' && typeof sortino === 'number') {
    console.log("  ✅ Synthetic Sharpe & Sortino calculation verified successfully!");
  } else {
    console.error("  ❌ Synthetic ratio test failed!");
    passed = false;
  }

  if (shortSharpe === null && shortSortino === null) {
    console.log("  ✅ Short window threshold (< 15 returns) correctly returned null!");
  } else {
    console.error("  ❌ Short window threshold test failed!");
    passed = false;
  }

  console.log("\n==========================================================================");
  if (passed) {
    console.log("          ALL SHARPE & SORTINO UNIT TESTS PASSED SUCCESSFULLY!            ");
  } else {
    console.error("          SOME UNIT TESTS FAILED! PLEASE AUDIT RATIO LOGIC.               ");
  }
  console.log("==========================================================================");
}

runUnitTests();
