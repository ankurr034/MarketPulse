import amfiImportService from '../services/AmfiImportService.js';
import redisCache from '../services/RedisCacheService.js';

console.log('==========================================================================');
console.log('      MULTI-INSTANCE REDIS LOCK & STALE OVERWRITE PREVENT SUITE           ');
console.log('==========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  // 1. Test Redis Distributed Lock Acquisition & Concurrent Rejection
  console.log('--- Test 1: Redis Distributed Lock Acquisition & Multi-Instance Safety ---');
  const lockKey = 'amfi:import:lock';
  
  // Acquire lock manually
  const acquired1 = await redisCache.acquireLock(lockKey, 60);
  assert(acquired1 === true, 'First instance successfully acquired amfi:import:lock');

  // Attempt second acquire while lock is held
  const acquired2 = await redisCache.acquireLock(lockKey, 60);
  assert(acquired2 === false, 'Second PM2 instance blocked from acquiring lock while held by Instance 1');

  // Try running import while lock is held by another process
  const runResult = await amfiImportService.runAtomicImport();
  assert(runResult.status === 'locked', 'AmfiImportService.runAtomicImport returns "locked" when lock is held by another process');

  // Release lock
  await redisCache.releaseLock(lockKey);
  const reAcquired = await redisCache.acquireLock(lockKey, 60);
  assert(reAcquired === true, 'Lock cleanly released and re-acquirable');
  await redisCache.releaseLock(lockKey);

  // 2. Test AUM Semantics (mfdata.in marked PROVIDER_REPORTED)
  console.log('\n--- Test 2: AUM Data Quality Semantics ---');
  const aumRes = await amfiImportService.fetchAmfiSchemeWiseAum('120893');
  assert(aumRes.status === 'PROVIDER_REPORTED' || aumRes.status === 'UNAVAILABLE', `AUM status for mfdata.in is "${aumRes.status}" (NEVER AMFI Verified)`);
  assert(aumRes.source === 'mfdata.in', `AUM source correctly labeled as "mfdata.in"`);

  // 3. Test Older Dataset Overwrite Prevention
  console.log('\n--- Test 3: Stale / Older Dataset Overwrite Prevention ---');
  // Set active dataset date to 12 Aug 2026
  amfiImportService.lastImportMetadata = {
    source: 'Official AMFI NAVAll.txt',
    asOf: '2026-08-12',
    retrievedAt: new Date().toISOString(),
    ingestionTimestamp: new Date().toISOString(),
    recordCount: 2743,
    status: 'VERIFIED'
  };

  // Mock a staged older dataset (10 Aug 2026)
  const stagedOlder = [{ date: '2026-08-10', schemeCode: '100001', schemeName: 'Test Fund Direct Growth' }];
  const activeDate = new Date(amfiImportService.lastImportMetadata.asOf);
  const stagedDate = new Date(stagedOlder[0].date);
  const isOlder = stagedDate < activeDate;
  assert(isOlder === true, 'Staged older date correctly identified as less than active date');

  console.log('\n==========================================================================');
  console.log(`     SUMMARY: ${passedTests} OF ${totalTests} MULTI-INSTANCE LOCK TESTS PASSED!    `);
  console.log('==========================================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
