import assert from 'assert';
import { describe, it } from 'node:test';
import sectorDataService from '../services/SectorDataService.js';
import sectorIndexMap from '../config/sectorIndexMap.js';
import yahooFinanceService from '../services/YahooFinanceService.js';

describe('Comprehensive Stock Sector & Index Data Audit', function() {

  it('1. should verify sectorIndexMap has correct official tickers for all sectors and broad indices', () => {
    assert.strictEqual(sectorIndexMap['Consumer Durables'], 'NIFTY_CONSR_DURBL.NS', 'Consumer Durables must map to NIFTY_CONSR_DURBL.NS');
    assert.strictEqual(sectorIndexMap['Financial Services'], 'NIFTY_FIN_SERVICE.NS', 'Financial Services must map to NIFTY_FIN_SERVICE.NS');
    assert.strictEqual(sectorIndexMap['FMCG'], '^CNXFMCG', 'FMCG must map to ^CNXFMCG');
    assert.strictEqual(sectorIndexMap['Infrastructure'], '^CNXINFRA', 'Infra must map to ^CNXINFRA');
    assert.strictEqual(sectorIndexMap['Nifty 50'], '^NSEI', 'Nifty 50 must map to ^NSEI');
    assert.strictEqual(sectorIndexMap['Nifty 100'], '^CNX100', 'Nifty 100 must map to ^CNX100');
    assert.strictEqual(sectorIndexMap['Nifty Next 50'], '^NSMIDCP', 'Nifty Next 50 must map to ^NSMIDCP');
    assert.strictEqual(sectorIndexMap['Nifty Midcap 50'], '^NSEMDCP50', 'Nifty Midcap 50 must map to ^NSEMDCP50');
    assert.strictEqual(sectorIndexMap['Nifty Smallcap 100'], '^CNXSC', 'Nifty Smallcap 100 must map to ^CNXSC');
    assert.strictEqual(sectorIndexMap['Nifty 500'], '^CRSLDX', 'Nifty 500 must map to ^CRSLDX');
  });

  it('2. should verify SectorDataService has active, authentic constituent lists', () => {
    const defs = sectorDataService.getSectorDefinitions();
    
    // Nifty 50 constituent check
    const n50 = defs.find(s => s.id === 'nifty-50');
    assert(n50, 'nifty-50 definition exists');
    assert.strictEqual(n50.stocks.length, 50, 'nifty-50 must have exactly 50 stocks');
    assert(n50.stocks.some(s => s.symbol === 'BEL.NS'), 'BEL.NS should be in nifty-50');
    assert(!n50.stocks.some(s => s.symbol === 'LTIM.NS'), 'LTIM.NS should not be in nifty-50');

    // Nifty Smallcap 100 constituent check
    const sc100 = defs.find(s => s.id === 'nifty-smallcap-100');
    assert(sc100, 'nifty-smallcap-100 definition exists');
    assert(sc100.stocks.some(s => s.symbol === 'EXIDEIND.NS'), 'EXIDEIND.NS should be in nifty-smallcap-100');
    assert(!sc100.stocks.some(s => s.symbol === 'TV18BRDCST.NS'), 'delisted TV18BRDCST.NS should not be in nifty-smallcap-100');

    // Nifty Consumer Durables index ticker check
    const cd = defs.find(s => s.id === 'nifty-consumer-durables');
    assert.strictEqual(cd.indexTicker, 'NIFTY_CONSR_DURBL.NS', 'nifty-consumer-durables must use NIFTY_CONSR_DURBL.NS');

    // Nifty Financial Services index ticker check
    const fin = defs.find(s => s.id === 'nifty-financial-services');
    assert.strictEqual(fin.indexTicker, 'NIFTY_FIN_SERVICE.NS', 'nifty-financial-services must use NIFTY_FIN_SERVICE.NS');
  });

  it('3. should verify all 19 Indian sectors and broad indices return valid quotes and price metrics in getAllSectors', async () => {
    const sectors = await sectorDataService.getAllSectors('india', '1D', 'stocks');
    assert(Array.isArray(sectors) && sectors.length >= 19, `Expected >= 19 sectors, got ${sectors.length}`);

    const targetIds = [
      'nifty-bank', 'nifty-it', 'nifty-auto', 'nifty-pharma', 'nifty-fmcg',
      'nifty-metal', 'nifty-energy', 'nifty-realty', 'nifty-psu-bank',
      'nifty-financial-services', 'nifty-media', 'nifty-infra',
      'nifty-consumer-durables', 'nifty-50', 'nifty-100', 'nifty-next-50',
      'nifty-midcap-50', 'nifty-smallcap-100', 'nifty-500'
    ];

    for (const id of targetIds) {
      const s = sectors.find(sec => sec.id === id);
      assert(s, `Sector/Index ${id} must be present in getAllSectors output`);
      assert(typeof s.indexPrice === 'number' && s.indexPrice > 0, `${id} indexPrice must be positive number (got ${s.indexPrice})`);
      assert(typeof s.changePercent === 'number' && !isNaN(s.changePercent), `${id} changePercent must be a valid number`);
      assert(typeof s.fiftyTwoWeekHigh === 'number' && s.fiftyTwoWeekHigh > 0, `${id} fiftyTwoWeekHigh must be positive`);
      assert(typeof s.fiftyTwoWeekLow === 'number' && s.fiftyTwoWeekLow > 0, `${id} fiftyTwoWeekLow must be positive`);
      assert(typeof s.pctFrom52WLow === 'number', `${id} pctFrom52WLow must be computed`);
      assert(typeof s.pctFromATH === 'number', `${id} pctFromATH must be computed`);
      assert(s.totalStocks > 0, `${id} totalStocks must be > 0`);
      assert(s.advances + s.declines + s.unchanged + s.unknown === s.totalStocks, `${id} advance/decline sum must equal totalStocks`);

      // Financial sector EBIT rule
      const isFin = id.includes('bank') || id.includes('fin');
      if (isFin) {
        assert.strictEqual(s.ebit, null, `${id} EBIT must be null per financial accounting standards`);
      }
    }
  });

  it('4. should verify multi-period returns are preserved for sparse daily data indices via monthly candles', async () => {
    const fmcgAnalysis = await yahooFinanceService.getHistoricalAnalysis('^CNXFMCG');
    assert(fmcgAnalysis, 'Historical analysis for ^CNXFMCG exists');
    assert(fmcgAnalysis.returns['1M'] !== null || fmcgAnalysis.returns['6M'] !== null || fmcgAnalysis.returns['ALL'] !== null, 
      '^CNXFMCG must have 1M, 6M, or ALL returns from monthly candles');
    assert(fmcgAnalysis.athBase !== null, '^CNXFMCG athBase must be computed');

    const infraAnalysis = await yahooFinanceService.getHistoricalAnalysis('^CNXINFRA');
    assert(infraAnalysis, 'Historical analysis for ^CNXINFRA exists');
    assert(infraAnalysis.returns['1M'] !== null || infraAnalysis.returns['6M'] !== null || infraAnalysis.returns['ALL'] !== null,
      '^CNXINFRA must have 1M, 6M, or ALL returns from monthly candles');
    assert(infraAnalysis.athBase !== null, '^CNXINFRA athBase must be computed');
  });
});
