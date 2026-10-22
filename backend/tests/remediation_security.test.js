import assert from 'assert';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import totpService from '../services/TotpService.js';
import redisCache from '../services/RedisCacheService.js';
import { getJwtSecret } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

console.log('================================================================');
console.log('       RUNNING MARKETPULSE REMEDIATION VERIFICATION SUITE       ');
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

async function runTests() {
  console.log('--- 1. Cryptographic Environment Secrets Guard ---');
  it('JWT_SECRET is cryptographically secure and distinct from default placeholder', () => {
    const secret = getJwtSecret();
    assert(secret && secret.length >= 32, 'Secret must be at least 32 characters');
    assert.notStrictEqual(secret, 'super_secret_trading_dashboard_jwt_key_2026', 'Must not match default placeholder');
  });

  console.log('\n--- 2. RFC 6238 TOTP 2FA & Cryptographic Secret Encryption ---');
  let secretB32, otpauth;
  it('TotpService generates RFC 6238 Base32 secret and valid otpauth:// URI', () => {
    const res = totpService.generateSecret('admin@marketpulse.in', 'MarketPulse');
    secretB32 = res.secret;
    otpauth = res.otpauthUrl;
    assert(typeof secretB32 === 'string' && secretB32.length >= 26, 'Base32 secret length valid');
    assert(otpauth.startsWith('otpauth://totp/'), 'otpauth URL must have valid scheme');
    assert(otpauth.includes('secret=' + secretB32), 'otpauth URL must embed secret');
  });

  let encryptedPayload;
  it('TotpService encrypts secret at rest using AES-256-GCM', () => {
    encryptedPayload = totpService.encryptSecret(secretB32);
    assert(encryptedPayload.ciphertext && encryptedPayload.ciphertext !== secretB32, 'Ciphertext must be distinct from plaintext');
    assert(encryptedPayload.iv && encryptedPayload.iv.length === 24, 'IV must be 12 bytes (24 hex characters)');
    assert(encryptedPayload.authTag && encryptedPayload.authTag.length === 32, 'Auth tag must be 16 bytes (32 hex characters)');
  });

  it('TotpService decrypts AES-256-GCM secret accurately', () => {
    const decrypted = totpService.decryptSecret(encryptedPayload.ciphertext, encryptedPayload.iv, encryptedPayload.authTag);
    assert.strictEqual(decrypted, secretB32, 'Decrypted secret must match original Base32 secret');
  });

  it('TotpService verifies current valid 6-digit TOTP code', () => {
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    const keyBuffer = totpService.base32Decode(secretB32);
    const validCode = totpService.generateOtpForStep(keyBuffer, currentStep);

    const result = totpService.verifyTotp(secretB32, validCode, 0);
    assert.strictEqual(result.valid, true, 'Valid code must pass verification');
    assert.strictEqual(result.matchedStep, currentStep, 'Matched step must equal current step');
  });

  it('TotpService accepts ±1 window clock skew (30s prior / 30s future)', () => {
    const prevStep = Math.floor(Date.now() / 1000 / 30) - 1;
    const keyBuffer = totpService.base32Decode(secretB32);
    const priorCode = totpService.generateOtpForStep(keyBuffer, prevStep);

    const result = totpService.verifyTotp(secretB32, priorCode, 0, 1);
    assert.strictEqual(result.valid, true, 'Code from previous 30s window must pass with window=1');
  });

  it('TotpService strictly prevents replay attacks within the same or prior period', () => {
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    const keyBuffer = totpService.base32Decode(secretB32);
    const validCode = totpService.generateOtpForStep(keyBuffer, currentStep);

    // Simulate code already used for currentStep
    const replayResult = totpService.verifyTotp(secretB32, validCode, currentStep);
    assert.strictEqual(replayResult.valid, false, 'Replayed code must be rejected');
    assert(replayResult.error && replayResult.error.includes('already used'), 'Must return token already used error');
  });

  it('TotpService rejects invalid, non-numeric, or incorrect length codes', () => {
    assert.strictEqual(totpService.verifyTotp(secretB32, '000000', 0).valid, false);
    assert.strictEqual(totpService.verifyTotp(secretB32, 'abcdef', 0).valid, false);
    assert.strictEqual(totpService.verifyTotp(secretB32, '123', 0).valid, false);
  });

  let backupCodes;
  await itAsync('TotpService generates 8 hashed one-time backup recovery codes', async () => {
    backupCodes = await totpService.generateBackupCodes(8);
    assert.strictEqual(backupCodes.plainCodes.length, 8, 'Must generate 8 plain backup codes');
    assert.strictEqual(backupCodes.hashedCodes.length, 8, 'Must generate 8 hashed backup codes');
    assert(backupCodes.plainCodes[0].includes('-'), 'Plain codes must be formatted XXXX-XXXX');
  });

  await itAsync('TotpService verifies and marks backup code consumed once', async () => {
    const codeToUse = backupCodes.plainCodes[0];
    const res1 = await totpService.verifyBackupCode(codeToUse, backupCodes.hashedCodes);
    assert.strictEqual(res1.valid, true, 'First backup code use must succeed');
    assert.strictEqual(backupCodes.hashedCodes[0].used, true, 'Matched backup code must be marked used');

    // Attempt reuse
    const res2 = await totpService.verifyBackupCode(codeToUse, backupCodes.hashedCodes);
    assert.strictEqual(res2.valid, false, 'Second use of same backup code must be rejected');
  });

  console.log('\n--- 3. Rate Limiting Store Atomic Operations & Sweeper ---');
  await itAsync('Rate limiting store increments atomically and resets correctly', async () => {
    const store = redisCache.createRateLimitStore(5000);
    const key = 'test_ip_127_0_0_1';
    const hit1 = await store.increment(key);
    assert.strictEqual(hit1.totalHits, 1, 'First hit must return totalHits 1');
    const hit2 = await store.increment(key);
    assert.strictEqual(hit2.totalHits, 2, 'Second hit must return totalHits 2');
    await store.resetKey(key);
    const hit3 = await store.increment(key);
    assert.strictEqual(hit3.totalHits, 1, 'After reset, totalHits must restart at 1');
  });

  console.log('\n================================================================');
  console.log(`REMEDIATION TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
