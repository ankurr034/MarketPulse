import express from 'express';
import sectorDataService from '../services/SectorDataService.js';

const router = express.Router();

// GET /api/sectors?region=india|global|all&timeframe=1D|1W|1M|YTD
router.get('/', async (req, res) => {
  try {
    const { region = 'all', timeframe = '1D', assetClass = 'stocks' } = req.query;
    const sectors = await sectorDataService.getAllSectors(region, timeframe, assetClass);
    res.json(sectors);
  } catch (err) {
    console.error('Sectors fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch sectors' });
  }
});

// GET /api/sectors/definitions — lightweight, no data fetch
router.get('/definitions', (req, res) => {
  res.json(sectorDataService.getSectorDefinitions());
});

// GET /api/sectors/top-movers?count=10
router.get('/top-movers', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const movers = await sectorDataService.getTopMovers(count);
    res.json(movers);
  } catch (err) {
    console.error('Top movers fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch top movers' });
  }
});

// GET /api/sectors/search?q=query
router.get('/search', (req, res) => {
  const { q = '' } = req.query;
  const results = sectorDataService.searchStocksAndSectors(q);
  res.json(results);
});

// GET /api/sectors/:sectorId
router.get('/:sectorId', async (req, res) => {
  try {
    const detail = await sectorDataService.getSectorDetail(req.params.sectorId);
    if (!detail) {
      return res.status(404).json({ error: 'Sector not found' });
    }
    res.json(detail);
  } catch (err) {
    console.error('Sector detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch sector detail' });
  }
});

export default router;
