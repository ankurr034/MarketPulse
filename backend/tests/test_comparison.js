import assert from 'assert';
import comparisonService from '../services/ComparisonService.js';
import express from 'express';
import comparisonRouter from '../routes/comparison.js';
import axios from 'axios';

async function runTests() {
  console.log('--- Running Tests for Comparison Workbench ---');

  // Test 1: Service level cache key generation
  console.log('Test 1: Cache key stringifier');
  const items = [
    { type: 'stock', id: 'TCS.NS', region: 'india' },
    { type: 'mf', id: '122639', region: 'india' }
  ];
  const items2 = [
    { type: 'mf', id: '122639', region: 'india' },
    { type: 'stock', id: 'TCS.NS', region: 'india' }
  ];
  
  const key1 = comparisonService._generateCacheKey(items, '1y');
  const key2 = comparisonService._generateCacheKey(items2, '1y');
  
  assert.strictEqual(key1, key2, 'Cache key should be identical regardless of item order');
  console.log('✅ Test 1 Passed.');

  // Test 2: Server-level 6 item limit
  console.log('Test 2: Ensure 7 items are rejected by the router');
  
  // Set up temporary express server
  const app = express();
  app.use(express.json());
  app.use('/api/comparison', comparisonRouter);
  
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const url = `http://localhost:${port}/api/comparison`;

    try {
      const tooManyItems = [
        { type: 'stock', id: '1' },
        { type: 'stock', id: '2' },
        { type: 'stock', id: '3' },
        { type: 'stock', id: '4' },
        { type: 'stock', id: '5' },
        { type: 'stock', id: '6' },
        { type: 'stock', id: '7' }
      ];

      await axios.post(url, { items: tooManyItems });
      assert.fail('Should have thrown 400 error');
    } catch (err) {
      assert.strictEqual(err.response.status, 400, 'Status should be 400 Bad Request');
      assert.strictEqual(err.response.data.error, 'Maximum 6 items allowed for comparison');
      console.log('✅ Test 2 Passed.');
      
      // Cleanup
      server.close();
      console.log('All tests passed.');
      process.exit(0);
    }
  });
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
