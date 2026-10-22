import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const BASE_URL = 'http://localhost:5001';
const JWT_SECRET = (process.env.JWT_SECRET || 'super_secret_trading_dashboard_jwt_key_2026').trim();

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
console.log('      RUNNING MARKETPULSE SECURITY HARDENING TEST SUITE        ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function itAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runSecuritySuite() {
  const { default: mongoose } = await import('mongoose');
  const { default: User } = await import('../models/User.js');
  if (process.env.MONGO_URI && mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    } catch (e) {
      // Offline fallback
    }
  }
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await User.updateOne(
        { _id: '60c72b2f9b1d8b2bad000001' },
        { $set: { email: 'owner@marketpulse.in', name: 'Portfolio Owner', role: 'user', isRevoked: false } },
        { upsert: true }
      );
      await User.updateOne(
        { _id: '60c72b2f9b1d8b2bad000009' },
        { $set: { email: 'logout.user@marketpulse.in', name: 'Logout User', role: 'user', isRevoked: false } },
        { upsert: true }
      );
    } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Security Headers Verification
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. HTTP Security Headers & Information Leakage ---');
  const healthRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/health',
    method: 'GET',
    headers: {
      'x-forwarded-proto': 'https'
    }
  });

  it('X-Content-Type-Options header is nosniff', () => {
    assert.strictEqual(healthRes.headers['x-content-type-options'], 'nosniff');
  });

  it('X-Frame-Options header is SAMEORIGIN', () => {
    assert.strictEqual(healthRes.headers['x-frame-options'], 'SAMEORIGIN');
  });

  it('X-XSS-Protection header is 0', () => {
    assert.strictEqual(healthRes.headers['x-xss-protection'], '0');
  });

  it('Referrer-Policy header is strict-origin-when-cross-origin', () => {
    assert.strictEqual(healthRes.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  });

  it('Strict-Transport-Security (HSTS) is emitted under HTTPS proxy', () => {
    assert.ok(healthRes.headers['strict-transport-security']);
    assert.ok(healthRes.headers['strict-transport-security'].includes('max-age=31536000'));
  });

  it('Content-Security-Policy (CSP) is emitted with TradingView and self permissions', () => {
    assert.ok(healthRes.headers['content-security-policy']);
    assert.ok(healthRes.headers['content-security-policy'].includes("default-src 'self'"));
    assert.ok(healthRes.headers['content-security-policy'].includes("tradingview.com"));
  });

  it('X-Powered-By header is strictly suppressed (no Express leakage)', () => {
    assert.strictEqual(healthRes.headers['x-powered-by'], undefined);
  });

  it('X-Data-Disclaimer header is present', () => {
    assert.strictEqual(healthRes.headers['x-data-disclaimer'], 'Delayed data - not investment advice');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CORS Policy Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. CORS Origin Policy ---');
  const corsRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/market/indices',
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET'
    }
  });

  it('Whitelisted origin receives matching Access-Control-Allow-Origin', () => {
    assert.strictEqual(corsRes.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  it('CORS credentials header is true for trusted origin', () => {
    assert.strictEqual(corsRes.headers['access-control-allow-credentials'], 'true');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Authentication & Input Validation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Input Validation & Injection Prevention ---');

  // Test: Signup with invalid email
  const badEmailRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'not-an-email', password: 'password123' });

  it('Signup rejects invalid email format with HTTP 400', () => {
    assert.strictEqual(badEmailRes.status, 400);
    assert.ok(badEmailRes.body.error.includes('valid email'));
  });

  // Test: Signup with short password (< 8 chars)
  const shortPassRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'valid.user@marketpulse.in', password: '123' });

  it('Signup rejects short password (< 8 chars) with HTTP 400', () => {
    assert.strictEqual(shortPassRes.status, 400);
    assert.ok(shortPassRes.body.error.includes('8 characters'));
  });

  // Test: Login with excessively long password (> 128 chars) to prevent bcrypt DoS
  const hugePass = 'a'.repeat(200);
  const hugePassRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'valid.user@marketpulse.in', password: hugePass });

  it('Login rejects excessively long password (> 128 chars) to protect bcrypt CPU exhaustion', () => {
    assert.strictEqual(hugePassRes.status, 401);
  });

  // Test: NoSQL injection attempt ({ email: { "$ne": null } })
  const nosqlRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: { '$ne': null }, password: 'password123' });

  it('NoSQL operator injection in auth request is blocked and returns HTTP 400', () => {
    assert.strictEqual(nosqlRes.status, 400);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. User Portfolio IDOR / BOLA Prevention
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Resource Ownership & IDOR / BOLA Prevention ---');

  // Test: Unauthenticated GET /api/portfolio/mf
  const portfolioNoToken = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/portfolio/mf',
    method: 'GET'
  });

  it('Unauthenticated GET /api/portfolio/mf is blocked with HTTP 401', () => {
    assert.strictEqual(portfolioNoToken.status, 401);
  });

  // Test: Unauthenticated POST /api/portfolio/mf
  const portfolioAddNoToken = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/portfolio/mf',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { schemeCode: '119716', units: 100, avgBuyNav: 250 });

  it('Unauthenticated POST /api/portfolio/mf is blocked with HTTP 401', () => {
    assert.strictEqual(portfolioAddNoToken.status, 401);
  });

  // Test: Unauthenticated DELETE /api/portfolio/mf/:id
  const portfolioDeleteNoToken = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/portfolio/mf/dummy-holding-id-12345',
    method: 'DELETE'
  });

  it('Unauthenticated DELETE /api/portfolio/mf/:id is blocked with HTTP 401', () => {
    assert.strictEqual(portfolioDeleteNoToken.status, 401);
  });

  // Test: Authenticated GET /api/portfolio/mf with valid user token
  const testUserToken = jwt.sign(
    { id: '60c72b2f9b1d8b2bad000001', email: 'owner@marketpulse.in', name: 'Portfolio Owner' },
    JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );

  const portfolioWithToken = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/portfolio/mf',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${testUserToken}` }
  });

  it('Authenticated user accesses their own portfolio with HTTP 200', () => {
    assert.strictEqual(portfolioWithToken.status, 200);
    assert.ok(Array.isArray(portfolioWithToken.body));
  });

  // ─────────────────────────────────────────────────────────────
  // 5. JWT Cryptographic Verification & Revocation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. JWT Cryptographic Verification & Token Revocation ---');

  // Test: Algorithm 'none' attack
  const noneAlgToken = jwt.sign(
    { id: 'attacker_id', email: 'attacker@evil.com' },
    '',
    { algorithm: 'none' }
  );

  const noneAlgRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${noneAlgToken}` }
  });

  it('Token with algorithm none is strictly rejected with HTTP 403', () => {
    assert.strictEqual(noneAlgRes.status, 403);
  });

  // Test: Token signed with forged/wrong secret
  const forgedToken = jwt.sign(
    { id: 'attacker_id', email: 'attacker@evil.com' },
    'forged_secret_key_that_does_not_match',
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const forgedRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${forgedToken}` }
  });

  it('Token signed with invalid secret is strictly rejected with HTTP 403', () => {
    assert.strictEqual(forgedRes.status, 403);
  });

  // Test: Expired token
  const expiredToken = jwt.sign(
    { id: 'user_id', email: 'expired@marketpulse.in' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '-1s' }
  );

  const expiredRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  });

  it('Expired token is strictly rejected with HTTP 403', () => {
    assert.strictEqual(expiredRes.status, 403);
  });

  // Test: Token Revocation via POST /api/auth/logout
  const logoutToken = jwt.sign(
    { id: '60c72b2f9b1d8b2bad000009', email: 'logout.user@marketpulse.in', name: 'Logout User' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const preLogoutRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${logoutToken}` }
  });

  it('Token is valid and authenticated prior to logout (HTTP 200)', () => {
    assert.strictEqual(preLogoutRes.status, 200);
  });

  const logoutRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${logoutToken}` }
  });

  it('POST /api/auth/logout revokes session successfully (HTTP 200)', () => {
    assert.strictEqual(logoutRes.status, 200);
    assert.ok(logoutRes.body.message.includes('logged out'));
  });

  const postLogoutRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${logoutToken}` }
  });

  it('Revoked token is immediately rejected on subsequent requests (HTTP 401)', () => {
    assert.strictEqual(postLogoutRes.status, 401);
    assert.ok(postLogoutRes.body.error.includes('revoked'));
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Production JWT Secret Integrity Guard
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Production Environment Secrets Guard ---');
  const { getJwtSecret } = await import('../middleware/authMiddleware.js');

  it('getJwtSecret throws fatal security error in production mode when secret is default placeholder', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'super_secret_trading_dashboard_jwt_key_2026';
      assert.throws(() => getJwtSecret(), /SECURITY ERROR/);
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
    }
  });

  it('getJwtSecret throws fatal security error in production mode when secret is < 32 characters', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'too_short';
      assert.throws(() => getJwtSecret(), /SECURITY ERROR/);
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Distributed Rate Limiter Store Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Distributed Rate Limiting Store ---');
  const { default: redisCache } = await import('../services/RedisCacheService.js');
  const { authenticateToken, revokeToken, isTokenRevoked, requireRole } = await import('../middleware/authMiddleware.js');

  await itAsync('createRateLimitStore correctly tracks, increments, and resets hit counts', async () => {
    const store = redisCache.createRateLimitStore(5000);
    const testKey = 'unit_test_client_ip';
    
    await store.resetKey(testKey);
    const hit1 = await store.increment(testKey);
    assert.strictEqual(hit1.totalHits, 1, 'First increment returns 1');

    const hit2 = await store.increment(testKey);
    assert.strictEqual(hit2.totalHits, 2, 'Second increment returns 2');

    await store.decrement(testKey);
    await store.resetKey(testKey);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Redis-Backed Distributed Token Revocation Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. Distributed Token Revocation Store ---');

  await itAsync('redisCache tracks and verifies revoked tokens across instances', async () => {
    const sampleToken = 'header.payload.signature_sample_revocation_test';
    assert.strictEqual(await redisCache.isTokenRevoked(sampleToken), false);

    await redisCache.revokeToken(sampleToken, 60);
    assert.strictEqual(await redisCache.isTokenRevoked(sampleToken), true);
  });

  await itAsync('authMiddleware revokeToken / isTokenRevoked interfaces properly with Redis store', async () => {
    const tokenToRevoke = jwt.sign(
      { id: 'redis_user_1', email: 'redis@marketpulse.in' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
    assert.strictEqual(await isTokenRevoked(tokenToRevoke), false);

    await revokeToken(tokenToRevoke);
    assert.strictEqual(await isTokenRevoked(tokenToRevoke), true);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Database Outage Fail-Closed Security Policy
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 9. Database Outage Fail-Closed Policy ---');

  await itAsync('authenticateToken fails closed (503) for sensitive POST when MongoDB is unavailable', async () => {
    const validToken = jwt.sign(
      { id: 'db_outage_user', email: 'outage@marketpulse.in', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    const origReadyState = mongoose.connection.readyState;
    try {
      // Force simulated DB outage
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

      let statusCode = null;
      let jsonBody = null;
      let nextCalled = false;

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/mf',
        originalUrl: '/api/portfolio/mf'
      };
      const res = {
        status(c) { statusCode = c; return this; },
        json(b) { jsonBody = b; return this; }
      };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);

      assert.strictEqual(statusCode, 503, 'Must return 503 during DB outage for mutating operations');
      assert.strictEqual(nextCalled, false, 'Must not call next() during DB outage for mutating operations');
      assert.ok(jsonBody.error.includes('Database service unavailable'));
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await itAsync('authenticateToken allows read-only GET fallback during MongoDB outage with verified token', async () => {
    const validToken = jwt.sign(
      { id: 'db_outage_user', email: 'outage@marketpulse.in', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    const origReadyState = mongoose.connection.readyState;
    try {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

      let nextCalled = false;
      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'GET',
        path: '/me',
        originalUrl: '/api/auth/me'
      };
      const res = {
        status(c) { return this; },
        json(b) { return this; }
      };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);

      assert.strictEqual(nextCalled, true, 'Read-only GET must proceed with verified token payload');
      assert.strictEqual(req.user.id, 'db_outage_user');
      assert.strictEqual(req.user.role, 'user');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await itAsync('authenticateToken allows /logout even during DB outage so sessions can be invalidated', async () => {
    const validToken = jwt.sign(
      { id: 'db_outage_user', email: 'outage@marketpulse.in', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    const origReadyState = mongoose.connection.readyState;
    try {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

      let nextCalled = false;
      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/logout',
        originalUrl: '/api/auth/logout'
      };
      const res = {
        status(c) { return this; },
        json(b) { return this; }
      };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);

      assert.strictEqual(nextCalled, true, 'Logout POST must proceed to revoke token in Redis/memory');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Role-Based Access Control (RBAC) Enforcement
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 10. Role-Based Access Control (RBAC) ---');

  it('requireRole middleware strictly forbids non-admin users from admin resources', () => {
    const adminOnly = requireRole('admin');
    let statusCode = null;
    let jsonBody = null;
    let nextCalled = false;

    const req = { user: { id: 'u1', role: 'user' } };
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { jsonBody = b; return this; }
    };
    const next = () => { nextCalled = true; };

    adminOnly(req, res, next);

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(nextCalled, false);
    assert.ok(jsonBody.error.includes('Insufficient permissions'));
  });

  it('requireRole middleware permits users possessing the admin role', () => {
    const adminOnly = requireRole('admin');
    let nextCalled = false;

    const req = { user: { id: 'admin1', role: 'admin' } };
    const res = {};
    const next = () => { nextCalled = true; };

    adminOnly(req, res, next);

    assert.strictEqual(nextCalled, true);
  });

  // ─────────────────────────────────────────────────────────────
  // 11. Pre-Deployment Readiness Gate & Topology Verifications
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 11. Pre-Deployment Gate: Revocation Order, DB Checks & Topology ---');

  await itAsync('authenticateToken enforces token revocation check BEFORE route execution', async () => {
    const validSignedToken = jwt.sign(
      { id: 'revocation_priority_user', email: 'prior@marketpulse.in', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    // Revoke the token
    await revokeToken(validSignedToken);

    let statusCode = null;
    let jsonBody = null;
    let nextCalled = false;

    const req = {
      headers: { authorization: `Bearer ${validSignedToken}` },
      method: 'GET',
      path: '/me',
      originalUrl: '/api/auth/me'
    };
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { jsonBody = b; return this; }
    };
    const next = () => { nextCalled = true; };

    await authenticateToken(req, res, next);

    assert.strictEqual(statusCode, 401, 'Must reject revoked token with 401 before route execution');
    assert.strictEqual(nextCalled, false, 'Route next() must not be called for revoked token');
    assert.ok(jsonBody.error.includes('revoked'));
  });

  await itAsync('authenticateToken rejects revoked user account when DB is online', async () => {
    const validToken = jwt.sign(
      { id: 'revoked_account_user_id', email: 'revoked.account@marketpulse.in', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    const origReadyState = mongoose.connection.readyState;
    const origFindById = User.findById;

    try {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      User.findById = () => ({
        select: () => Promise.resolve({ _id: 'revoked_account_user_id', isRevoked: true, role: 'user' })
      });

      let statusCode = null;
      let jsonBody = null;
      let nextCalled = false;

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'GET',
        path: '/me',
        originalUrl: '/api/auth/me'
      };
      const res = {
        status(c) { statusCode = c; return this; },
        json(b) { jsonBody = b; return this; }
      };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);

      assert.strictEqual(statusCode, 401, 'Must reject user with isRevoked: true');
      assert.strictEqual(nextCalled, false);
      assert.ok(jsonBody.error.includes('revoked'));
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
      User.findById = origFindById;
    }
  });

  await itAsync('authenticateToken rejects deleted user account when DB is online', async () => {
    const validToken = jwt.sign(
      { id: 'deleted_account_user_id', email: 'deleted.account@marketpulse.in', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    const origReadyState = mongoose.connection.readyState;
    const origFindById = User.findById;

    try {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      User.findById = () => ({
        select: () => Promise.resolve(null)
      });

      let statusCode = null;
      let jsonBody = null;
      let nextCalled = false;

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'GET',
        path: '/me',
        originalUrl: '/api/auth/me'
      };
      const res = {
        status(c) { statusCode = c; return this; },
        json(b) { jsonBody = b; return this; }
      };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);

      assert.strictEqual(statusCode, 401, 'Must reject user when account no longer exists in DB');
      assert.strictEqual(nextCalled, false);
      assert.ok(jsonBody.error.includes('no longer exists'));
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
      User.findById = origFindById;
    }
  });

  it('RedisCacheService distinguishes distributed vs single_instance_memory mode accurately', () => {
    const isDist = redisCache.isDistributed();
    assert.strictEqual(typeof isDist, 'boolean');
    // If running in development without a local Redis daemon, it must report false
    if (!redisCache.isRedisConnected) {
      assert.strictEqual(isDist, false, 'Must report false when Redis is offline');
    }
  });

  await itAsync('Health endpoint accurately identifies runtime topology without claiming false distributed caching', async () => {
    const healthCheck = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/health',
      method: 'GET'
    });

    assert.strictEqual(healthCheck.status, 200);
    assert.strictEqual(healthCheck.body.status, 'ok');
    assert.ok(healthCheck.body.topology);
    assert.ok(healthCheck.body.topology.cacheMode === 'single_instance_memory' || healthCheck.body.topology.cacheMode === 'redis_distributed');
  });

  console.log('\n================================================================');
  console.log(`SECURITY TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecuritySuite().catch(err => {
  console.error('Security test suite fatal error:', err);
  process.exit(1);
});
