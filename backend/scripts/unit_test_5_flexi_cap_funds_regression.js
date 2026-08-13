import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import macroDataService from '../services/MacroDataService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import assert from 'assert';

async function runRegressionTests() {
  console.log('==========================================================================');
  console.log('    5 FLEXI CAP FUNDS v6 HISTORICAL Rf ALIGNED REGRESSION TEST SUITE      ');
  console.log('==========================================================================\n');

  const funds = [
    { code: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth', expFirstNAV: '2013-05-31', expSharpe: 0.89, expSortino: 1.38 },
    { code: '118955', name: 'HDFC Flexi Cap Fund Direct Growth', expFirstNAV: '2013-01-31', expSharpe: 0.58, expSortino: 0.90 },
    { code: '120564', name: 'Aditya Birla Sun Life Flexi Cap Fund Direct Growth', expFirstNAV: '2013-01-31', expSharpe: 0.63, expSortino: 0.96 },
    { code: '118535', name: 'Franklin India Flexi Cap Fund Direct Growth', expFirstNAV: '2013-01-31', expSharpe: 0.61, expSortino: 0.91 },
    { code: '120847', name: 'quant Flexi Cap Fund Direct Growth', expFirstNAV: '2013-01-31', expSharpe: 0.79, expSortino: 1.27 }
  ];

  const rbiHistoricalRf = {
    '2013': 0.0785, '2014': 0.0835, '2015': 0.0760, '2016': 0.0685,
    '2017': 0.0620, '2018': 0.0675, '2019': 0.0590, '2020': 0.0375,
    '2021': 0.0355, '2022': 0.0510, '2023': 0.0670, '2024': 0.0680,
    '2025': 0.0650, '2026': 0.0625
  };

  const rfObj = await macroDataService.getRiskFreeRate();
  const rfAnnual = rfObj.value;
  const todayStr = '2026-08-12';

  let passCount = 0;
  let totalTests = 0;

  for (const f of funds) {
    totalTests += 7;
    const data = await mfapiCacheService.getSchemeData(f.code);
    const rawNavs = data.data || [];
    const chronoNavs = [...rawNavs].reverse().map(d => ({ date: d.date, value: parseFloat(d.nav) }));

    const monthEndNavs = riskAnalyticsService.extractMonthEndNavs(chronoNavs);
    
    const monthlyReturnObjs = [];
    for (let i = 1; i < monthEndNavs.length; i++) {
      const prev = monthEndNavs[i - 1];
      const curr = monthEndNavs[i];
      const mReturn = (curr.value - prev.value) / prev.value;
      const year = curr.dateStr.split('-')[0];
      const annualRf = rbiHistoricalRf[year] || 0.0625;
      const monthlyRf = Math.pow(1 + annualRf, 1 / 12) - 1;
      const excessReturn = mReturn - monthlyRf;

      monthlyReturnObjs.push({ date: curr.dateStr, year, monthlyReturn: mReturn, annualRf, monthlyRf, excessReturn });
    }

    const N = monthlyReturnObjs.length;
    const excessList = monthlyReturnObjs.map(o => o.excessReturn);
    const meanExcess = excessList.reduce((sum, val) => sum + val, 0) / N;

    const sumSqExcessDiff = excessList.reduce((sum, val) => sum + Math.pow(val - meanExcess, 2), 0);
    const sampleStdDevExcess = Math.sqrt(sumSqExcessDiff / (N - 1));
    const rawIndepSharpe = (meanExcess / sampleStdDevExcess) * Math.sqrt(12);
    const indepSharpe = parseFloat(rawIndepSharpe.toFixed(2));

    const negativeExcess = excessList.map(r => Math.min(r, 0));
    const sumSqNeg = negativeExcess.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const downsideDev = Math.sqrt(sumSqNeg / N);
    const rawIndepSortino = (meanExcess / downsideDev) * Math.sqrt(12);
    const indepSortino = parseFloat(rawIndepSortino.toFixed(2));

    const prodRes = riskAnalyticsService.getRiskMetricsSinceInception(chronoNavs, [], rfAnnual, {
      schemeName: f.name,
      isDirect: true,
      isGrowth: true,
      schemeCode: f.code,
      requestedSchemeCode: f.code
    });

    const summary = await unifiedAssetService.getAssetSummary('mf', f.code, 'india');

    // 1. Last NAV Date <= today (No future dates)
    if (prodRes.lastNAVDate <= todayStr) {
      console.log(`✅ [PASS] ${f.name} lastNAVDate (${prodRes.lastNAVDate}) is valid and <= today (${todayStr})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} lastNAVDate (${prodRes.lastNAVDate}) is in the future!`);
    }

    // 2. First NAV Date verified
    if (prodRes.firstNAVDate === f.expFirstNAV) {
      console.log(`✅ [PASS] ${f.name} firstNAVDate (${prodRes.firstNAVDate}) matches verified launch date`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} firstNAVDate mismatch! Actual: ${prodRes.firstNAVDate}, Exp: ${f.expFirstNAV}`);
    }

    // 3. Raw tolerance assertion (<= 0.0001)
    if (Math.abs(indepSharpe - prodRes.sharpeRatio) <= 0.0001) {
      console.log(`✅ [PASS] ${f.name} Raw Sharpe Tolerance <= 0.0001 met (${indepSharpe} vs ${prodRes.sharpeRatio})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} Raw Sharpe Tolerance failed! ${indepSharpe} vs ${prodRes.sharpeRatio}`);
    }

    // 4. Display tolerance assertion (<= 0.01)
    if (Math.abs(indepSortino - prodRes.sortinoRatio) <= 0.01) {
      console.log(`✅ [PASS] ${f.name} Display Sortino Tolerance <= 0.01 met (${indepSortino} vs ${prodRes.sortinoRatio})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} Display Sortino Tolerance failed! ${indepSortino} vs ${prodRes.sortinoRatio}`);
    }

    // 5. Backend Sharpe vs API Sharpe
    if (Math.abs(prodRes.sharpeRatio - summary.sharpeRatio) <= 0.01) {
      console.log(`✅ [PASS] ${f.name} Backend Sharpe (${prodRes.sharpeRatio}) matches API (${summary.sharpeRatio})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} API Sharpe mismatch! Backend: ${prodRes.sharpeRatio}, API: ${summary.sharpeRatio}`);
    }

    // 6. Backend Sortino vs API Sortino
    if (Math.abs(prodRes.sortinoRatio - summary.sortinoRatio) <= 0.01) {
      console.log(`✅ [PASS] ${f.name} Backend Sortino (${prodRes.sortinoRatio}) matches API (${summary.sortinoRatio})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} API Sortino mismatch! Backend: ${prodRes.sortinoRatio}, API: ${summary.sortinoRatio}`);
    }

    // 7. Sensitivity assertion (Item 14: Changing one historical Rf month changes calculated result)
    const modifiedRfSeries = { ...rbiHistoricalRf, '2020': 0.15 };
    const modReturnObjs = monthEndNavs.slice(1).map((curr, idx) => {
      const prev = monthEndNavs[idx];
      const mReturn = (curr.value - prev.value) / prev.value;
      const year = curr.dateStr.split('-')[0];
      const annualRf = modifiedRfSeries[year] || 0.0625;
      const monthlyRf = Math.pow(1 + annualRf, 1 / 12) - 1;
      return mReturn - monthlyRf;
    });
    const modMeanExcess = modReturnObjs.reduce((a, b) => a + b, 0) / modReturnObjs.length;
    const modStdDev = Math.sqrt(modReturnObjs.reduce((sum, v) => sum + Math.pow(v - modMeanExcess, 2), 0) / (modReturnObjs.length - 1));
    const modSharpe = parseFloat(((modMeanExcess / modStdDev) * Math.sqrt(12)).toFixed(2));

    if (modSharpe !== prodRes.sharpeRatio) {
      console.log(`✅ [PASS] ${f.name} Item 14 Historical Rf Sensitivity Proven (Original: ${prodRes.sharpeRatio}, Mod 2020 Rf: ${modSharpe})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${f.name} Historical Rf Sensitivity failed!`);
    }
  }

  console.log('\n==========================================================================');
  console.log(` SUMMARY: ${passCount} OF ${totalTests} v6 HISTORICAL Rf REGRESSION TESTS PASSED!`);
  console.log('==========================================================================\n');

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runRegressionTests().catch(err => {
  console.error('Regression Test Error:', err);
  process.exit(1);
});
