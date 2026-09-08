import http from 'http';
import { spawn } from 'child_process';

function fetchUrl(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
          data: body
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    });
  });
}

async function runTest() {
  console.log('🚀 Starting verification of server startup responsiveness...');

  // Start backend server on test port 5002
  const env = { ...process.env, PORT: '5002', NODE_ENV: 'production' };
  const proc = spawn('node', ['server.js'], { cwd: './backend', env });

  let serverStarted = false;
  proc.stdout.on('data', (d) => {
    const text = d.toString();
    console.log('[Server stdout]', text.trim());
    if (text.includes('listening on port 5002')) {
      serverStarted = true;
    }
  });

  proc.stderr.on('data', (d) => {
    console.error('[Server stderr]', d.toString().trim());
  });

  // Wait for server to start listening
  const waitStart = Date.now();
  while (!serverStarted && Date.now() - waitStart < 8000) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (!serverStarted) {
    console.error('❌ Server failed to start listening within 8s');
    proc.kill();
    process.exit(1);
  }

  console.log('✅ Server is listening on port 5002. Testing immediate route latency...');

  try {
    // Test 1: GET /api/mf/amcs (synchronous in-memory)
    const tAmcs = await fetchUrl('http://127.0.0.1:5002/api/mf/amcs', 3000);
    console.log(`[GET /api/mf/amcs] Status: ${tAmcs.statusCode}, Latency: ${tAmcs.durationMs}ms`);
    if (tAmcs.statusCode !== 200 || tAmcs.durationMs > 2000) {
      throw new Error(`GET /api/mf/amcs took ${tAmcs.durationMs}ms (> 2000ms threshold)`);
    }

    // Test 2: GET /api/sectors/top-movers (requires data or fast fallback)
    const tMovers = await fetchUrl('http://127.0.0.1:5002/api/sectors/top-movers', 3000);
    console.log(`[GET /api/sectors/top-movers] Status: ${tMovers.statusCode}, Latency: ${tMovers.durationMs}ms`);
    if (tMovers.statusCode !== 200 || tMovers.durationMs > 2500) {
      throw new Error(`GET /api/sectors/top-movers took ${tMovers.durationMs}ms (> 2500ms threshold)`);
    }

    // Test 3: Subsequent call with circuit breaker active / cached
    const tMovers2 = await fetchUrl('http://127.0.0.1:5002/api/sectors/top-movers', 1000);
    console.log(`[GET /api/sectors/top-movers (Cached/Circuit Breaker)] Status: ${tMovers2.statusCode}, Latency: ${tMovers2.durationMs}ms`);
    if (tMovers2.statusCode !== 200 || tMovers2.durationMs > 100) {
      throw new Error(`Cached /api/sectors/top-movers took ${tMovers2.durationMs}ms (> 100ms threshold)`);
    }

    console.log('✅ Both routes responded well within 2s threshold!');
  } catch (err) {
    console.error('❌ Responsiveness test failed:', err.message);
    proc.kill();
    process.exit(1);
  } finally {
    proc.kill();
  }

  process.exit(0);
}

runTest();
