import http from 'http';
import jwt from 'jsonwebtoken';
import assert from 'assert';

const BASE_URL = 'http://localhost:5001';
const JWT_SECRET = 'super_secret_trading_dashboard_jwt_key_2026';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

console.log('================================================================');
console.log('    THE LAL STREET SCREENER FINAL STAGING SMOKE TEST SUITE      ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

async function runStagingSmoke() {
  // 1. Health & Topology
  console.log('--- 1. Health Check & Runtime Topology ---');
  const healthRes = await request({ hostname: 'localhost', port: 5001, path: '/health', method: 'GET' });
  it('Health endpoint returns 200 with status ok', () => {
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'ok');
  });
  it('Topology accurately reports cache mode without false distributed claims', () => {
    assert.ok(healthRes.body.topology);
    assert.ok(healthRes.body.topology.cacheMode === 'single_instance_memory' || healthRes.body.topology.cacheMode === 'redis_distributed');
  });

  // 2. HTTPS Security Headers & CSP
  console.log('\n--- 2. Security Headers & TLS/HSTS ---');
  const secureHeadersRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/health',
    method: 'GET',
    headers: { 'x-forwarded-proto': 'https' }
  });
  it('HSTS max-age=31536000 emitted under HTTPS proxy', () => {
    assert.ok(secureHeadersRes.headers['strict-transport-security']);
    assert.ok(secureHeadersRes.headers['strict-transport-security'].includes('max-age=31536000'));
  });
  it('CSP header permits TradingView and enforces strict self', () => {
    assert.ok(secureHeadersRes.headers['content-security-policy']);
    assert.ok(secureHeadersRes.headers['content-security-policy'].includes("default-src 'self'"));
    assert.ok(secureHeadersRes.headers['content-security-policy'].includes("tradingview.com"));
  });
  it('nosniff, SAMEORIGIN, and X-Powered-By suppression present', () => {
    assert.strictEqual(secureHeadersRes.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(secureHeadersRes.headers['x-frame-options'], 'SAMEORIGIN');
    assert.strictEqual(secureHeadersRes.headers['x-powered-by'], undefined);
  });

  // 3. CORS Policy
  console.log('\n--- 3. CORS Policy & Whitelisting ---');
  const corsRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/market/indices',
    method: 'OPTIONS',
    headers: { 'Origin': 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' }
  });
  it('Whitelisted origin receives CORS allow origin and credentials', () => {
    assert.strictEqual(corsRes.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.strictEqual(corsRes.headers['access-control-allow-credentials'], 'true');
  });

  // 4. Financial Data Endpoints (Mutual Funds & Stocks)
  console.log('\n--- 4. Financial Data APIs ---');
  const mfRes = await request({ hostname: 'localhost', port: 5001, path: '/api/mf/categories', method: 'GET' });
  it('Mutual fund categories endpoint returns 200 with category list', () => {
    assert.strictEqual(mfRes.status, 200);
    assert.ok(Array.isArray(mfRes.body) || typeof mfRes.body === 'object');
  });

  const indianMfSummaryRes = await request({ hostname: 'localhost', port: 5001, path: '/api/indian-mf/dashboard-summary', method: 'GET' });
  it('Indian mutual fund dashboard summary returns 200', () => {
    assert.strictEqual(indianMfSummaryRes.status, 200);
    assert.ok(indianMfSummaryRes.body);
  });

  const stockIndicesRes = await request({ hostname: 'localhost', port: 5001, path: '/api/market/indices', method: 'GET' });
  it('Market indices endpoint returns 200 with market data', () => {
    assert.strictEqual(stockIndicesRes.status, 200);
    assert.ok(stockIndicesRes.body);
  });

  // 5. Authentication, Token Revocation & Logout Smoke
  console.log('\n--- 5. Authentication, Revocation & Logout ---');
  const smokeEmail = `smoke_${Date.now()}@marketpulse.in`;
  const signupRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: smokeEmail, password: 'StrongSmokePassword123!', name: 'Smoke Tester' });

  it('Signup creates a new account in database (201)', () => {
    assert.strictEqual(signupRes.status, 201);
    assert.ok(signupRes.body.token);
  });

  const smokeUserToken = signupRes.body.token;

  const meBeforeLogout = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${smokeUserToken}` }
  });
  it('Valid token accesses /api/auth/me successfully (200)', () => {
    assert.strictEqual(meBeforeLogout.status, 200);
    assert.strictEqual(meBeforeLogout.body.user.email, smokeEmail);
  });

  const logoutRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${smokeUserToken}` }
  });
  it('POST /api/auth/logout revokes session successfully (200)', () => {
    assert.strictEqual(logoutRes.status, 200);
    assert.ok(logoutRes.body.message.includes('logged out'));
  });

  const meAfterLogout = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${smokeUserToken}` }
  });
  it('Subsequent request with revoked token is rejected immediately (401)', () => {
    assert.strictEqual(meAfterLogout.status, 401);
    assert.ok(meAfterLogout.body.error.includes('revoked'));
  });

  // 6. Portfolio Ownership & IDOR
  console.log('\n--- 6. Portfolio Ownership & IDOR Protection ---');
  const unauthPortfolio = await request({ hostname: 'localhost', port: 5001, path: '/api/portfolio/mf', method: 'GET' });
  it('Unauthenticated GET /api/portfolio/mf is blocked (401)', () => {
    assert.strictEqual(unauthPortfolio.status, 401);
  });

  const unauthPostPortfolio = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/portfolio/mf',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { schemeCode: '119716', units: 10 });
  it('Unauthenticated POST /api/portfolio/mf is blocked (401)', () => {
    assert.strictEqual(unauthPostPortfolio.status, 401);
  });

  console.log('\n================================================================');
  console.log(`STAGING SMOKE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runStagingSmoke().catch(e => {
  console.error('Smoke suite fatal error:', e);
  process.exit(1);
});
