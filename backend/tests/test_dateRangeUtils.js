/**
 * Test Suite: dateRangeUtils
 * 
 * NOTE: The fixture file `shared/dateRangeTests.json` is a REQUIRED test input.
 * Do not delete or move this file during scratch/temporary file cleanups.
 */
import fs from 'fs';
import path from 'path';
import { resolveRangeToDates, stringifyRange } from '../utils/dateRangeUtils.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(__dirname, 'fixtures/dateRangeTests.json'),
  path.resolve(__dirname, '../data/dateRangeTests.json'),
  path.resolve(__dirname, '../../shared/dateRangeTests.json')
];
const fixturePath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
const tests = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

let failures = 0;

tests.forEach((t, i) => {
  console.log(`Test ${i + 1}: ${t.description}`);
  try {
    if (t.method === 'stringifyRange') {
      const result = stringifyRange(t.input);
      if (result !== t.expected) {
        console.error(`  ❌ Failed. Expected ${t.expected}, got ${result}`);
        failures++;
      } else {
        console.log(`  ✅ Passed`);
      }
    } else {
      const result = resolveRangeToDates(t.input);
      if (t.expectedType === 'rolling') {
        // Just verify it's rolling (end is roughly now)
        const now = new Date();
        if (Math.abs(now - result.end) > 5000) {
           console.error(`  ❌ Failed. End date is not now`);
           failures++;
        } else {
           console.log(`  ✅ Passed`);
        }
      } else {
        const expectedStart = new Date(t.expected.start).toISOString();
        const expectedEnd = new Date(t.expected.end).toISOString();
        const actualStart = result.start.toISOString();
        const actualEnd = result.end.toISOString();
        
        if (expectedStart !== actualStart || expectedEnd !== actualEnd) {
          console.error(`  ❌ Failed.`);
          console.error(`     Expected Start: ${expectedStart}, Got: ${actualStart}`);
          console.error(`     Expected End:   ${expectedEnd}, Got: ${actualEnd}`);
          failures++;
        } else {
          console.log(`  ✅ Passed`);
        }
      }
    }
  } catch (err) {
    console.error(`  ❌ Failed with error: ${err.message}`);
    failures++;
  }
});

if (failures > 0) {
  console.error(`\n${failures} tests failed.`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed successfully!`);
}
