import assert from 'assert';
import macroDataService from '../services/MacroDataService.js';
import indianMfSectorService from '../services/IndianMfSectorService.js';
import axios from 'axios';

async function runTests() {
  console.log('--- Running Tests for Indian MFs Feature ---');

  // Test 1: MacroDataService fallback
  console.log('Test 1: MacroDataService fallback behavior (DATA_GOV_IN_ENABLED=false)');
  process.env.DATA_GOV_IN_ENABLED = 'false';
  macroDataService.cache = null; // Clear cache
  const snapshot = await macroDataService.getMacroSnapshot();
  
  assert.ok(snapshot.repoRate.source.includes('RBI'), 'Repo Rate should be RBI');
  assert.ok(snapshot.gdpGrowth.source.includes('MOSPI') || snapshot.gdpGrowth.source === 'manual', 'GDP should be MOSPI or manual');
  assert.strictEqual(snapshot.cpiInflation.source, 'manual', 'CPI should be manual when disabled');
  assert.strictEqual(snapshot.iip.source, 'manual', 'IIP should be manual when disabled');
  console.log('✅ Test 1 Passed.');

  // Test 2: IndianMfSectorService aggregation
  console.log('Test 2: IndianMfSectorService aggregation logic');
  // We can mock axios for mfapi.in if we wanted, but we'll just run it live to see it fetch or fallback
  const sectors = await indianMfSectorService.getAllSectorsWithFunds();
  
  assert.ok(sectors.length > 0, 'Should return sectors');
  const tech = sectors.find(s => s.sectorId === 'technology');
  assert.ok(tech, 'Technology sector should exist');
  assert.ok(typeof tech.totalSchemeCount === 'number' && tech.totalSchemeCount > 0, 'Should have totalSchemeCount > 0');
  assert.ok(tech.topFunds.length > 0, 'Should have topFunds');
  console.log('✅ Test 2 Passed.');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
