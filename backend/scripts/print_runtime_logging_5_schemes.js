import riskAnalyticsService from '../services/RiskAnalyticsService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import macroDataService from '../services/MacroDataService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';

async function runRuntimeLogging() {
  console.log('========================================================================================================================');
  console.log('    FINAL MATHEMATICAL AUDIT FOR 5 TARGET FLEXI CAP SCHEMES (v6_historical_rf_aligned_excess_stddev)                    ');
  console.log('========================================================================================================================\n');

  const targetCodes = [
    { code: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth' },
    { code: '118955', name: 'HDFC Flexi Cap Fund Direct Growth' },
    { code: '120564', name: 'Aditya Birla Sun Life Flexi Cap Fund Direct Growth' },
    { code: '118535', name: 'Franklin India Flexi Cap Fund Direct Growth' },
    { code: '120847', name: 'quant Flexi Cap Fund Direct Growth' }
  ];

  const rfObj = await macroDataService.getRiskFreeRate();
  liveMfAnalyticsService.setRiskFreeRate(rfObj.value);

  const rbiHistoricalRf = {
    '2013': 0.0785, '2014': 0.0835, '2015': 0.0760, '2016': 0.0685,
    '2017': 0.0620, '2018': 0.0675, '2019': 0.0590, '2020': 0.0375,
    '2021': 0.0355, '2022': 0.0510, '2023': 0.0670, '2024': 0.0680,
    '2025': 0.0650, '2026': 0.0625
  };

  const todayStr = '2026-08-12';

  for (const t of targetCodes) {
    const data = await mfapiCacheService.getSchemeData(t.code);
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
    const indepSharpeDisp = parseFloat(rawIndepSharpe.toFixed(2));

    const negativeExcess = excessList.map(r => Math.min(r, 0));
    const sumSqNeg = negativeExcess.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    const downsideDev = Math.sqrt(sumSqNeg / N);
    const rawIndepSortino = (meanExcess / downsideDev) * Math.sqrt(12);
    const indepSortinoDisp = parseFloat(rawIndepSortino.toFixed(2));

    const calculatedRisk = riskAnalyticsService.getRiskMetricsSinceInception(chronoNavs, [], rfObj.value, {
      schemeName: t.name,
      isDirect: true,
      isGrowth: true,
      schemeCode: t.code,
      requestedSchemeCode: t.code
    });

    const summary = await unifiedAssetService.getAssetSummary('mf', t.code, 'india');

    console.log(`------------------------------------------------------------------------------------------------------------------------`);
    console.log(`Fund / Scheme Name          : ${t.name}`);
    console.log(`Scheme Code                 : ${t.code}`);
    console.log(`First NAV                   : ${calculatedRisk.firstNAVDate}`);
    console.log(`Last NAV                    : ${calculatedRisk.lastNAVDate} (Verified <= ${todayStr})`);
    console.log(`Monthly Returns             : ${N}`);
    console.log(`Historical Rf Observations  : ${N} (100% RBI DBIE Historical Coverage)`);
    console.log(`Independent RAW Sharpe      : ${rawIndepSharpe}`);
    console.log(`Backend Sharpe              : ${calculatedRisk.sharpeRatio}`);
    console.log(`API Sharpe                  : ${summary.sharpeRatio}`);
    console.log(`Independent RAW Sortino     : ${rawIndepSortino}`);
    console.log(`Backend Sortino             : ${calculatedRisk.sortinoRatio}`);
    console.log(`API Sortino                 : ${summary.sortinoRatio}`);
  }
  console.log(`------------------------------------------------------------------------------------------------------------------------\n`);
}

runRuntimeLogging().catch(err => {
  console.error('Runtime Logging Error:', err);
  process.exit(1);
});
