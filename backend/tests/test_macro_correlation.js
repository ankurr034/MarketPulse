import assert from 'assert';
import macroCorrelationService from '../services/MacroCorrelationService.js';
import sectorTrendsService from '../services/SectorTrendsService.js';
import macroHistory from '../config/macroHistory.js';

async function runTests() {
  console.log('Running test_macro_correlation.js...');

  // Mock sector trends service
  const originalGetSectorTrends = sectorTrendsService.getSectorTrends;
  sectorTrendsService.getSectorTrends = async (sector, range) => {
    return {
      sector: 'Technology',
      indexAvailable: true,
      indexHistory: [
        { date: '2025-10-01', value: 100 }, // start
        { date: '2025-12-08', value: 110 }, // around macro point
        { date: '2026-02-08', value: 115 }, // around macro point
        { date: '2026-04-05', value: 105 }, // around macro point
      ]
    };
  };

  // Temporarily override macroHistory for controlled test
  const originalMacro = macroHistory.repoRate;
  macroHistory.repoRate = [
    { date: '2025-10-01', value: 6.00 },
    { date: '2025-12-08', value: 5.75 }, // Rate Cut (-0.25) -> Market rose (100 -> 110) => +10% 
    { date: '2026-02-08', value: 5.50 }, // Rate Cut (-0.25) -> Market rose (110 -> 115) => +4.5% 
    { date: '2026-04-05', value: 5.75 }  // Rate Hike (+0.25) -> Market fell (115 -> 105) => -8.7%
  ];

  try {
    const res = await macroCorrelationService.getSectorMacroCorrelation('Technology', 'repoRate', '1y');
    
    // There are 3 periods:
    // Period 1: 2025-10-01 to 2025-12-08
    // macroChange = -0.25 (fell), sectorChangePct = +10% (rose)
    // Divergence because they moved in opposite directions.
    
    // Period 2: 2025-12-08 to 2026-02-08
    // macroChange = -0.25 (fell), sectorChangePct = +4.54% (rose)
    // Divergence because they moved in opposite directions.

    // Period 3: 2026-02-08 to 2026-04-05
    // macroChange = +0.25 (rose), sectorChangePct = -8.69% (fell)
    // Divergence because they moved in opposite directions.

    // So all 3 are divergences.
    assert.strictEqual(res.periodsOfDivergence.length, 3, 'Should detect 3 periods of divergence');
    assert.strictEqual(res.periodsOfAlignment.length, 0, 'Should detect 0 periods of alignment');

    assert.ok(res.periodsOfDivergence[0].description.includes('fell'), 'Macro fell description expected');
    assert.ok(res.periodsOfDivergence[0].description.includes('10.00%'), 'Sector rose 10% expected');

    console.log('All tests passed successfully for MacroCorrelationService!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    // Restore mocks
    sectorTrendsService.getSectorTrends = originalGetSectorTrends;
    macroHistory.repoRate = originalMacro;
  }
}

runTests();
