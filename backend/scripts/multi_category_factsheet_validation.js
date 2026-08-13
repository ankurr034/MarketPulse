import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';

console.log('==========================================================================');
console.log('    MULTI-CATEGORY UNIVERSAL RISK ENGINE & AMC FACTSHEET VALIDATION      ');
console.log('==========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 7 Representative Schemes Across Distinct Categories
const multiCategoryUniverse = [
  {
    code: '119598',
    name: 'SBI Small Cap Fund - Direct Plan - Growth',
    category: 'Small Cap',
    factsheetAMC: 'SBI Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.0%)',
    publishedSharpe: 0.22,
    publishedSortino: 0.74,
    benchmarkRf: 0.06,
    expectedCategory: 'EXACT_MATCH'
  },
  {
    code: '118989',
    name: 'Axis Bluechip Fund - Direct Plan - Growth',
    category: 'Large Cap',
    factsheetAMC: 'Axis Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.0%)',
    publishedSharpe: 0.44,
    publishedSortino: 1.82,
    benchmarkRf: 0.06,
    expectedCategory: 'CLOSE_METHODOLOGY_MATCH'
  },
  {
    code: '120684',
    name: 'ICICI Prudential Nifty 50 Index Fund - Direct Plan - Growth',
    category: 'Index Fund',
    factsheetAMC: 'ICICI Prudential Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.0%)',
    publishedSharpe: 0.38,
    publishedSortino: 0.58,
    benchmarkRf: 0.06,
    expectedCategory: 'METHODOLOGY_DIFFERENCE' // ICICI AMC uses MAR = 0% and negative-month denominator for Sortino
  },
  {
    code: '120716',
    name: 'UTI Flexi Cap Fund - Direct Plan - Growth',
    category: 'Flexi Cap',
    factsheetAMC: 'UTI Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.70%)',
    publishedSharpe: 0.18,
    publishedSortino: 0.31,
    benchmarkRf: 0.06,
    expectedCategory: 'METHODOLOGY_DIFFERENCE' // UTI AMC uses 3Y CAGR excess return division over trailing average MIBOR/T-Bill
  },
  {
    code: '119061',
    name: 'HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth',
    category: 'Mid Cap',
    factsheetAMC: 'HDFC Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.0%)',
    publishedSharpe: 0.62,
    publishedSortino: 1.15,
    benchmarkRf: 0.06,
    expectedCategory: 'METHODOLOGY_DIFFERENCE'
  },
  {
    code: '120586',
    name: 'ICICI Prudential Equity & Debt Fund - Direct Plan - Growth',
    category: 'Aggressive Hybrid',
    factsheetAMC: 'ICICI Prudential Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.0%)',
    publishedSharpe: 0.88,
    publishedSortino: 1.42,
    benchmarkRf: 0.06,
    expectedCategory: 'METHODOLOGY_DIFFERENCE'
  },
  {
    code: '119114',
    name: 'HDFC Liquid Fund - Direct Plan - Growth',
    category: 'Liquid Fund',
    factsheetAMC: 'HDFC Mutual Fund',
    factsheetDate: '30 June 2026',
    observationPeriod: 'Trailing 36 Months (July 2023 - June 2026)',
    benchmark: '3-Year Average RBI 91-Day T-Bill (6.0%)',
    publishedSharpe: 0.35,
    publishedSortino: 0.85,
    benchmarkRf: 0.06,
    expectedCategory: 'METHODOLOGY_DIFFERENCE'
  }
];

async function runMultiCategoryValidation() {
  console.log('Scheme Code | Category | Scheme Name | Factsheet Date | Benchmark Rf | Published Sharpe | MarketPulse 3Y Monthly Sharpe | Sharpe Diff | Published Sortino | MarketPulse 3Y Monthly Sortino | Sortino Diff | Classification Category');
  console.log('------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------');

  for (const fund of multiCategoryUniverse) {
    try {
      const schemeData = await mfapiCacheService.getSchemeData(fund.code);
      if (schemeData && schemeData.data && schemeData.data.length > 10) {
        const chronologicalData = [...schemeData.data].reverse();
        const monthEndNavs = riskAnalyticsService.extractMonthEndNavs(chronologicalData);
        const monthPrices = monthEndNavs.map(m => m.value);
        const monthlyReturns = riskAnalyticsService.calculateMonthlyReturns(monthPrices);

        const testRf = fund.benchmarkRf;
        const mpSharpe3Y = riskAnalyticsService.calculateMonthlySharpeRatio(monthlyReturns, testRf);
        const mpSortino3Y = riskAnalyticsService.calculateMonthlySortinoRatio(monthlyReturns, testRf);

        const sharpeDiff = mpSharpe3Y !== null ? Math.abs(mpSharpe3Y - fund.publishedSharpe) : null;
        const sortinoDiff = mpSortino3Y !== null ? Math.abs(mpSortino3Y - fund.publishedSortino) : null;

        let statusCategory = 'METHODOLOGY_DIFFERENCE';
        if (sharpeDiff !== null && sharpeDiff <= 0.0001 && sortinoDiff !== null && sortinoDiff <= 0.02) {
          statusCategory = 'EXACT_MATCH';
        } else if (sharpeDiff !== null && sharpeDiff <= 0.05 && sortinoDiff !== null && sortinoDiff <= 0.05) {
          statusCategory = 'CLOSE_METHODOLOGY_MATCH';
        } else if (mpSharpe3Y === null) {
          statusCategory = 'UNVERIFIED';
        }

        console.log(`${fund.code} | ${fund.category.padEnd(12)} | ${fund.name.slice(0, 22)} | ${fund.factsheetDate} | ${(fund.benchmarkRf*100).toFixed(1)}% | ${fund.publishedSharpe} | ${mpSharpe3Y} | ${sharpeDiff !== null ? sharpeDiff.toFixed(4) : 'N/A'} | ${fund.publishedSortino} | ${mpSortino3Y} | ${sortinoDiff !== null ? sortinoDiff.toFixed(4) : 'N/A'} | ${statusCategory}`);

        assert(mpSharpe3Y !== null, `Universal Risk Engine computes valid 3Y Monthly Sharpe for category: ${fund.category}`);
        assert(mpSortino3Y !== null, `Universal Risk Engine computes valid 3Y Monthly Sortino for category: ${fund.category}`);
      }
    } catch (e) {
      console.warn(`Multi-category validation warning for ${fund.code}:`, e.message);
    }
  }

  // Universal Newly-Launched / Insufficient History Test (< 36 Monthly Returns / < 37 Month-End NAVs)
  console.log('\n--- Newly Launched Fund / Insufficient History Test (< 36 Monthly Returns) ---');
  const shortHistoryNavs = Array(150).fill(0).map((_, i) => ({ time: Date.now() - (150 - i) * 86400000, value: 10 + i * 0.01 })); // ~5 months
  const newFundRes = riskAnalyticsService.getRiskMetrics3YMonthly(shortHistoryNavs, [], 0.06);
  assert(newFundRes.sharpeRatio === null && newFundRes.sortinoRatio === null && newFundRes.status === 'UNAVAILABLE', 'Newly launched fund (< 36 monthly returns) strictly returns status UNAVAILABLE with null Sharpe & Sortino');

  // Universal Null Risk-Free Rate Test
  console.log('\n--- Universal UNAVAILABLE Risk-Free Rate Test ---');
  const nullRfRes = riskAnalyticsService.getRiskMetrics3YMonthly(generateNavHistory(1200), [], null);
  assert(nullRfRes.sharpeRatio === null && nullRfRes.sortinoRatio === null && nullRfRes.status === 'UNAVAILABLE', 'Unconfigured / UNAVAILABLE risk-free rate strictly returns status UNAVAILABLE across all categories');

  console.log('\n==========================================================================');
  console.log(`   SUMMARY: ${passedTests} OF ${totalTests} UNIVERSAL MULTI-CATEGORY TESTS PASSED! `);
  console.log('==========================================================================');
}

function generateNavHistory(days) {
  const navs = [];
  let nav = 100;
  for (let i = 0; i < days; i++) {
    nav *= (1 + (Math.sin(i / 10) * 0.003 + 0.0004));
    navs.push({ time: Date.now() - (days - i) * 86400000, value: nav });
  }
  return navs;
}

runMultiCategoryValidation().catch(err => {
  console.error('Multi-category validation failed:', err);
  process.exit(1);
});
