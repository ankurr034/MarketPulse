import http from 'http';

const BASE_URL = 'http://localhost:5001';

function request(path) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - start;
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          latency,
          sizeBytes: Buffer.byteLength(data),
          headers: res.headers,
          itemCount: Array.isArray(json) ? json.length : (json && typeof json === 'object' ? Object.keys(json).length : 0)
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out after 30s'));
    });
  });
}

async function measureEndpoint(name, path, iterations = 5) {
  console.log(`\n--- Benchmarking: ${name} (${path}) ---`);
  const latencies = [];
  let firstResult = null;

  for (let i = 0; i < iterations; i++) {
    try {
      const res = await request(path);
      latencies.push(res.latency);
      if (i === 0) firstResult = res;
      console.log(`  Run ${i + 1}: ${res.latency}ms (Status: ${res.statusCode}, Items: ${res.itemCount}, Size: ${Math.round(res.sizeBytes / 1024)} KB)`);
    } catch (err) {
      console.error(`  Run ${i + 1} Failed: ${err.message}`);
    }
  }

  latencies.sort((a, b) => a - b);
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  return {
    name,
    path,
    statusCode: firstResult?.statusCode,
    itemCount: firstResult?.itemCount,
    sizeKb: firstResult ? Math.round(firstResult.sizeBytes / 1024) : 0,
    min,
    max,
    p50,
    p95,
    avg,
    runs: latencies.length
  };
}

async function measureConcurrency(name, path, concurrency = 5) {
  console.log(`\n--- Concurrency Test (${concurrency} parallel requests): ${name} ---`);
  const start = Date.now();
  const promises = Array.from({ length: concurrency }).map((_, i) => request(path));
  const results = await Promise.allSettled(promises);
  const totalDuration = Date.now() - start;

  const fulfilled = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const latencies = fulfilled.map(r => r.latency).sort((a, b) => a - b);

  console.log(`  Total wall-clock time for ${concurrency} parallel requests: ${totalDuration}ms`);
  console.log(`  Min latency: ${latencies[0]}ms, Max: ${latencies[latencies.length - 1]}ms, Avg: ${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`);

  return {
    totalDuration,
    min: latencies[0],
    max: latencies[latencies.length - 1],
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
  };
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('MARKETPULSE ENDPOINT PERFORMANCE BENCHMARK');
  console.log('====================================================');

  const endpoints = [
    { name: 'Market Indices Ticker', path: '/api/market/indices' },
    { name: 'Sector Heatmap Overview', path: '/api/sectors?region=india&timeframe=1D&assetClass=stocks' },
    { name: 'All Ranked Constituent Stocks', path: '/api/sectors/all-stocks?region=india&timeframe=1D&assetClass=stocks' },
    { name: 'All Direct Mutual Funds', path: '/api/indian-mf/all-direct-schemes' },
    { name: 'Global Top Movers', path: '/api/sectors/top-movers?count=10' },
    { name: 'Stocks List (Full Universe)', path: '/api/stocks' }
  ];

  const summary = [];
  for (const ep of endpoints) {
    const res = await measureEndpoint(ep.name, ep.path, 4);
    summary.push(res);
  }

  const concurrencyResults = await measureConcurrency('Sector Heatmap Parallel Fetch', '/api/sectors?region=india&timeframe=1D&assetClass=stocks', 5);

  console.log('\n====================================================');
  console.log('BENCHMARK SUMMARY TABLE (BASELINE)');
  console.log('====================================================');
  console.table(summary.map(s => ({
    'Endpoint': s.name,
    'Status': s.statusCode,
    'Items': s.itemCount,
    'Size (KB)': s.sizeKb,
    'Min (ms)': s.min,
    'P50 (ms)': s.p50,
    'P95 (ms)': s.p95,
    'Max (ms)': s.max,
    'Avg (ms)': s.avg
  })));

  console.log('\nConcurrency Results:', concurrencyResults);
}

runBenchmark().catch(err => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
