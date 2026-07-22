import express from 'express';
import macroDataService from '../services/MacroDataService.js';
import indianMfSectorService from '../services/IndianMfSectorService.js';
import macroCorrelationService from '../services/MacroCorrelationService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';

const router = express.Router();

router.get('/dashboard-summary', async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    const summary = await liveMfAnalyticsService.getLiveDashboardSummary(category);
    res.json(summary);
  } catch (err) {
    console.error('Error fetching live dashboard summary:', err);
    res.status(500).json({ error: 'Failed to fetch live dashboard summary', details: err.message });
  }
});

let sectorsOverviewCache = null;
let sectorsOverviewCacheTime = null;
const SECTORS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

router.get('/macro/snapshot', async (req, res) => {
  try {
    const data = await macroDataService.getMacroSnapshot();
    res.json(data);
  } catch (err) {
    console.error('Error fetching macro snapshot:', err);
    res.status(500).json({ error: 'Failed to fetch macro snapshot' });
  }
});

let fetchPromise = null;

router.get('/sectors-overview', async (req, res) => {
  try {
    const hasInvalidData = sectorsOverviewCache?.sectors?.some(s => s.topFunds?.some(f => f.navAvailable === false));
    if (sectorsOverviewCache && !hasInvalidData && (Date.now() - sectorsOverviewCacheTime < SECTORS_CACHE_TTL)) {
      return res.json({ cached: true, ...sectorsOverviewCache });
    }

    if (!fetchPromise) {
      fetchPromise = (async () => {
        const [macro, sectors] = await Promise.all([
          macroDataService.getMacroSnapshot(),
          indianMfSectorService.getAllSectorsWithFunds()
        ]);
        const payload = { macro, sectors };
        sectorsOverviewCache = payload;
        sectorsOverviewCacheTime = Date.now();
        return payload;
      })();
    }

    const payload = await fetchPromise;
    fetchPromise = null; // Clear the promise once resolved

    res.json(payload);
  } catch (err) {
    fetchPromise = null;
    console.error('Error fetching sectors overview:', err);
    res.status(500).json({ error: 'Failed to fetch sectors overview' });
  }
});

router.get('/sectors/flat', async (req, res) => {
  try {
    // Rely on the same cache mechanism to prevent duplicate fetches
    let sectors;
    if (sectorsOverviewCache && (Date.now() - sectorsOverviewCacheTime < SECTORS_CACHE_TTL)) {
      sectors = sectorsOverviewCache.sectors;
    } else {
      if (!fetchPromise) {
        fetchPromise = (async () => {
          const [macro, s] = await Promise.all([
            macroDataService.getMacroSnapshot(),
            indianMfSectorService.getAllSectorsWithFunds()
          ]);
          const payload = { macro, sectors: s };
          sectorsOverviewCache = payload;
          sectorsOverviewCacheTime = Date.now();
          return payload;
        })();
      }
      const payload = await fetchPromise;
      fetchPromise = null;
      sectors = payload.sectors;
    }

    const flatFunds = [];
    for (const sector of sectors) {
      for (const fund of sector.topFunds) {
        flatFunds.push({
          ...fund,
          sectorName: sector.sectorName,
          sectorId: sector.sectorId
        });
      }
    }
    res.json(flatFunds);
  } catch (err) {
    console.error('Error fetching flat sector funds:', err);
    res.status(500).json({ error: 'Failed to fetch flat sector funds' });
  }
});

router.get('/macro/correlation-summary', async (req, res) => {
  try {
    const { indicator = 'repoRate', range = '3y' } = req.query;
    const summary = await macroCorrelationService.getAllSectorsMacroSummary(indicator, range);
    res.json(summary);
  } catch (err) {
    console.error('Error fetching correlation summary:', err);
    res.status(500).json({ error: 'Failed to fetch correlation summary' });
  }
});

router.get('/macro/correlation/:sector', async (req, res) => {
  try {
    const { sector } = req.params;
    const { indicator = 'repoRate', range = '3y' } = req.query;
    const data = await macroCorrelationService.getSectorMacroCorrelation(sector, indicator, range);
    res.json(data);
  } catch (err) {
    console.error(`Error fetching correlation for sector ${req.params.sector}:`, err);
    res.status(500).json({ error: 'Failed to fetch sector correlation' });
  }
});

router.get('/all-schemes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const filters = {
      amc: req.query.amc || '',
      category: req.query.category || '',
      risk: req.query.risk || '',
      duration: req.query.duration || '',
      searchTerm: req.query.search || ''
    };
    const data = await allFundsDirectoryService.getAllSchemes(page, pageSize, filters);
    res.json(data);
  } catch (err) {
    console.error('Error fetching all schemes:', err);
    res.status(500).json({ error: 'Failed to fetch all schemes directory' });
  }
});

export default router;
