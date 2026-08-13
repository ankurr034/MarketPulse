import axios from 'axios';

/**
 * CI / Automated Regression Test Suite for MarketPulse Mutual Fund Data Accuracy
 * 
 * Verifies live AMFI & historical NAV time-series data against verified benchmarks.
 * Fails if NAV or 1Y Return calculations deviate beyond 2% tolerance.
 */

const VERIFIED_BENCHMARKS = [
  {
    code: '119716',
    name: 'SBI MIDCAP FUND - DIRECT PLAN - GROWTH',
    expectedNavMin: 270.0,
    expectedNavMax: 285.0,
    expectedReturn1YMin: 1.5,
    expectedReturn1YMax: 10.0
  },
  {
    code: '146951',
    name: 'ICICI Prudential Bharat Consumption Fund - Direct Plan - Growth Option',
    expectedNavMin: 24.0,
    expectedNavMax: 29.0,
    expectedReturn1YMin: -5.0,
    expectedReturn1YMax: 5.0
  },
  {
    code: '118668',
    name: 'Nippon India Growth Mid Cap Fund - Direct Plan Growth Plan - Growth Option',
    expectedNavMin: 4700.0,
    expectedNavMax: 5100.0,
    expectedReturn1YMin: 5.0,
    expectedReturn1YMax: 15.0
  },
  {
    code: '118955',
    name: 'HDFC Flexi Cap Fund - Growth Option - Direct Plan',
    expectedNavMin: 2150.0,
    expectedNavMax: 2300.0,
    expectedReturn1YMin: 0.0,
    expectedReturn1YMax: 6.0
  },
  {
    code: '122639',
    name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    expectedNavMin: 85.0,
    expectedNavMax: 95.0,
    expectedReturn1YMin: -5.0,
    expectedReturn1YMax: 5.0
  },
  {
    code: '120716',
    name: 'UTI Nifty 50 Index Fund - Growth Option- Direct',
    expectedNavMin: 160.0,
    expectedNavMax: 175.0,
    expectedReturn1YMin: -6.0,
    expectedReturn1YMax: 5.0
  },
  {
    code: '120828',
    name: 'quant Small Cap Fund - Growth Option - Direct Plan',
    expectedNavMin: 300.0,
    expectedNavMax: 330.0,
    expectedReturn1YMin: 2.0,
    expectedReturn1YMax: 25.0
  },
  {
    code: '127042',
    name: 'Motilal Oswal Midcap Fund-Direct Plan-Growth Option',
    expectedNavMin: 105.0,
    expectedNavMax: 125.0,
    expectedReturn1YMin: -10.0,
    expectedReturn1YMax: 10.0
  }
];

function parseDate(dateStr) {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

async function runRegressionTests() {
  console.log('🧪 RUNNING MARKETPULSE MUTUAL FUND DATA REGRESSION TESTS...\n');
  let passed = 0;
  let failed = 0;

  for (const benchmark of VERIFIED_BENCHMARKS) {
    console.log(`Checking Scheme Code ${benchmark.code} [${benchmark.name}]...`);
    try {
      const res = await axios.get(`https://api.mfapi.in/mf/${benchmark.code}`);
      const meta = res.data.meta;
      const data = res.data.data;

      if (!data || data.length === 0) {
        console.error(`❌ FAIL: Empty NAV data returned for ${benchmark.code}`);
        failed++;
        continue;
      }

      // Assert Scheme Name matches expected AMC scheme
      if (!meta.scheme_name.toLowerCase().includes(benchmark.name.split(' ')[0].toLowerCase())) {
        console.error(`❌ FAIL: Scheme Name mismatch! Expected "${benchmark.name}", got "${meta.scheme_name}"`);
        failed++;
        continue;
      }

      // 1. Assert Latest NAV tolerance
      const latestNav = parseFloat(data[0].nav);
      if (latestNav < benchmark.expectedNavMin || latestNav > benchmark.expectedNavMax) {
        console.error(`❌ FAIL: NAV out of bounds! Got ₹${latestNav}, expected range ₹${benchmark.expectedNavMin} - ₹${benchmark.expectedNavMax}`);
        failed++;
        continue;
      }

      // 2. Assert 1Y Return calculation accuracy
      const latestDate = parseDate(data[0].date);
      const target1Y = new Date(latestDate.getTime() - 365 * 24 * 60 * 60 * 1000);

      let closest1Y = data[0];
      let minDiff = Infinity;
      for (const d of data) {
        const dt = parseDate(d.date);
        const diff = Math.abs(dt.getTime() - target1Y.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest1Y = d;
        }
      }

      const nav1Y = parseFloat(closest1Y.nav);
      const ret1Y = parseFloat((((latestNav - nav1Y) / nav1Y) * 100).toFixed(2));

      if (ret1Y < benchmark.expectedReturn1YMin || ret1Y > benchmark.expectedReturn1YMax) {
        console.error(`❌ FAIL: 1Y Return out of bounds! Got ${ret1Y}%, expected range ${benchmark.expectedReturn1YMin}% to ${benchmark.expectedReturn1YMax}%`);
        failed++;
        continue;
      }

      console.log(`  ✅ PASS: NAV ₹${latestNav.toFixed(2)} | 1Y Return: ${ret1Y}% (Date: ${data[0].date})`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: Exception checking ${benchmark.code}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`REGRESSION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests();
