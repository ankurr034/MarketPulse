import http from 'http';

const BASE_URL = 'http://localhost:5001';

function makeRequest(path, method = 'GET', postData = null, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(path, BASE_URL);

    const reqHeaders = {
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
      agent: new http.Agent({ keepAlive: true, maxSockets: 200 })
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - start;
        resolve({
          status: res.statusCode,
          latency,
          size: Buffer.byteLength(data),
          rateLimited: res.statusCode === 429
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        latency: Date.now() - start,
        error: err.message,
        rateLimited: false
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({
        status: 408,
        latency: 15000,
        error: 'Timeout',
        rateLimited: false
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function computeStats(results, wallClockMs) {
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const statusCounts = {};
  let totalErrors = 0;
  let rateLimitedCount = 0;

  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.status >= 500 || r.status === 0 || r.status === 408) totalErrors++;
    if (r.rateLimited) rateLimitedCount++;
  }

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));
  const rps = Math.round((results.length / (wallClockMs / 1000)) * 10) / 10;

  return {
    totalRequests: results.length,
    wallClockMs,
    rps,
    p50,
    p90,
    p95,
    p99,
    avg,
    min: latencies[0] || 0,
    max: latencies[latencies.length - 1] || 0,
    statusCounts,
    errorRate: Math.round((totalErrors / results.length) * 10000) / 100,
    rateLimitedCount
  };
}

async function runScenario(name, count, concurrency, requestFn) {
  console.log(`\n============================================================`);
  console.log(`SCENARIO: ${name}`);
  console.log(`Target: ${count} requests | Concurrency: ${concurrency} parallel workers`);
  console.log(`============================================================`);

  const results = [];
  const start = Date.now();
  let index = 0;

  async function worker() {
    while (index < count) {
      const current = index++;
      const res = await requestFn(current);
      results.push(res);
    }
  }

  const workers = Array.from({ length: concurrency }).map(() => worker());
  await Promise.all(workers);
  const wallClockMs = Date.now() - start;

  const stats = computeStats(results, wallClockMs);
  console.log(`  Completed in: ${stats.wallClockMs}ms`);
  console.log(`  Throughput:   ${stats.rps} requests/second`);
  console.log(`  Latency p50:  ${stats.p50}ms | p90: ${stats.p90}ms | p95: ${stats.p95}ms | p99: ${stats.p99}ms | Avg: ${stats.avg}ms`);
  console.log(`  Status codes: ${JSON.stringify(stats.statusCounts)}`);
  console.log(`  Error rate:   ${stats.errorRate}%`);
  if (stats.rateLimitedCount > 0) {
    console.log(`  Rate-limited: ${stats.rateLimitedCount} requests (HTTP 429)`);
  }
  return stats;
}

async function main() {
  console.log('############################################################');
  console.log('#        MARKETPULSE EMPIRICAL PRODUCTION LOAD TEST        #');
  console.log('############################################################');

  // Verify server is listening
  try {
    const health = await makeRequest('/health');
    if (health.status !== 200) {
      console.error('Server health check failed with status:', health.status);
      process.exit(1);
    }
    console.log('Server is online. Starting test scenarios...\n');
  } catch (err) {
    console.error('Failed to connect to backend server at ' + BASE_URL, err.message);
    process.exit(1);
  }

  // 1. 100 Concurrent Read Users (Health, Indices, Dashboard Summary)
  const endpoints = [
    '/health',
    '/api/market/indices',
    '/api/sectors?region=india&timeframe=1D&assetClass=stocks',
    '/api/indian-mf/dashboard-summary'
  ];
  await runScenario('100 Concurrent Read Users (Mixed Endpoints)', 500, 100, (i) => {
    const endpoint = endpoints[i % endpoints.length];
    return makeRequest(endpoint);
  });

  // 2. Auth Burst Test (20 Concurrent Logins to test Bcrypt CPU Saturation)
  await runScenario('Auth Burst Test (20 Concurrent Logins)', 20, 20, (i) => {
    const payload = JSON.stringify({
      email: `benchmark_user_${i % 5}@example.com`,
      password: 'BenchmarkPassword123!'
    });
    return makeRequest('/auth/login', 'POST', payload);
  });

  // 3. High-Throughput Cached Pipeline Test (1,000 requests at 50 concurrency)
  await runScenario('High Throughput Read Stress (1,000 Requests at 50 Concurrency)', 1000, 50, () => {
    return makeRequest('/health');
  });

  console.log('\n============================================================');
  console.log('LOAD TEST COMPLETED SUCCESSFULLY WITH ZERO UNHANDLED REJECTIONS');
  console.log('============================================================');
}

main();
