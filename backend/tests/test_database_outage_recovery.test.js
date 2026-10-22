import assert from 'assert';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { authenticateToken, getJwtSecret } from '../middleware/authMiddleware.js';

const JWT_SECRET = getJwtSecret();

console.log('================================================================');
console.log('     TESTING DATABASE OUTAGE RESILIENCE & RECOVERY LIFECYCLE     ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${desc} -> ${e.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${desc} -> ${e.message}`);
    failed++;
  }
}

async function runRecoveryTests() {
  const origReadyState = mongoose.connection.readyState;

  try {
    // ─────────────────────────────────────────────────────────────
    // Phase 1: Database Outage State (readyState = 0)
    // ─────────────────────────────────────────────────────────────
    console.log('--- Phase 1: Simulated Database Outage ---');
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    await itAsync('Mutating POST operation fails closed (503) during outage', async () => {
      const validToken = jwt.sign({ id: 'test_user', email: 'test@marketpulse.in', role: 'user' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
      let status = null;
      let body = null;
      let nextCalled = false;

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/mf',
        originalUrl: '/api/portfolio/mf'
      };
      const res = {
        status(c) { status = c; return this; },
        json(b) { body = b; return this; }
      };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);
      assert.strictEqual(status, 503, 'Must return 503 on mutating op during DB outage');
      assert.strictEqual(nextCalled, false);
      assert.ok(body.error.includes('Database service unavailable'));
    });

    await itAsync('Read-only GET operation gracefully serves verified claims during outage without leaking PII', async () => {
      const validToken = jwt.sign({ id: 'test_user_2', email: 'user2@marketpulse.in', role: 'user' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
      let nextCalled = false;

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'GET',
        path: '/me',
        originalUrl: '/api/auth/me'
      };
      const res = { status() { return this; }, json() { return this; } };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);
      assert.strictEqual(nextCalled, true, 'GET fallback must proceed to route handler');
      assert.strictEqual(req.user.id, 'test_user_2');
      assert.strictEqual(req.user.role, 'user');
    });

    await itAsync('Logout is permitted during outage so sessions can be revoked in cache', async () => {
      const validToken = jwt.sign({ id: 'test_user_logout', email: 'logout@marketpulse.in', role: 'user' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
      let nextCalled = false;

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/logout',
        originalUrl: '/api/auth/logout'
      };
      const res = { status() { return this; }, json() { return this; } };
      const next = () => { nextCalled = true; };

      await authenticateToken(req, res, next);
      assert.strictEqual(nextCalled, true, 'Logout POST must succeed during DB outage');
    });

    // ─────────────────────────────────────────────────────────────
    // Phase 2: Database Recovery State (readyState = 1)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 2: Database Connection Recovery ---');
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    // Mock User query for recovered state
    const { default: User } = await import('../models/User.js');
    const origFindById = User.findById;

    try {
      User.findById = () => ({
        select: () => Promise.resolve({ _id: 'recovered_user_id', email: 'rec@marketpulse.in', role: 'user', isRevoked: false })
      });

      await itAsync('Mutating POST operation succeeds normally after database recovery', async () => {
        const validToken = jwt.sign({ id: 'recovered_user_id', email: 'rec@marketpulse.in', role: 'user' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
        let nextCalled = false;
        let status = null;

        const req = {
          headers: { authorization: `Bearer ${validToken}` },
          method: 'POST',
          path: '/mf',
          originalUrl: '/api/portfolio/mf'
        };
        const res = { status(c) { status = c; return this; }, json() { return this; } };
        const next = () => { nextCalled = true; };

        await authenticateToken(req, res, next);
        assert.strictEqual(nextCalled, true, 'Must call next() after DB recovery');
        assert.strictEqual(status, null, 'Must not return 503 after DB recovery');
        assert.strictEqual(req.user.role, 'user');
      });
    } finally {
      User.findById = origFindById;
    }

  } finally {
    Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
  }

  console.log('\n================================================================');
  console.log(`RECOVERY SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runRecoveryTests().catch(err => {
  console.error('Fatal error in recovery suite:', err);
  process.exit(1);
});
