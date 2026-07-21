import express from 'express';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import sectorDataService from '../services/SectorDataService.js';
import sectorBasket from '../config/sectorBasket.js';
import fundAnalysisEngine from '../services/FundAnalysisEngine.js';

const router = express.Router();

const SECTOR_GROUPS = {
  Technology: {
    id: 'Technology',
    name: 'Technology',
    icon: '💻',
    stockSectors: ['nifty-it', 'global-technology'],
    mfSector: 'Technology'
  },
  Financials: {
    id: 'Financials',
    name: 'Financials',
    icon: '🏦',
    stockSectors: ['nifty-bank', 'nifty-psu-bank', 'global-financials'],
    mfSector: 'Financials'
  },
  Healthcare: {
    id: 'Healthcare',
    name: 'Healthcare',
    icon: '🏥',
    stockSectors: ['nifty-pharma', 'global-healthcare'],
    mfSector: 'Healthcare'
  },
  Infrastructure: {
    id: 'Infrastructure',
    name: 'Infrastructure / Energy',
    icon: '🏗️',
    stockSectors: ['nifty-energy', 'global-energy'],
    mfSector: 'Infrastructure'
  }
};

// GET /api/assets/sectors
router.get('/sectors', (req, res) => {
  const list = Object.values(SECTOR_GROUPS).map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon
  }));
  res.json(list);
});

// GET /api/assets/sectors/:sector?types=stock,mf&region=india|global|all
router.get('/sectors/:sector', async (req, res) => {
  try {
    const { sector } = req.params;
    const { types = 'stock,mf', region = 'all' } = req.query;
    
    const group = SECTOR_GROUPS[sector];
    if (!group) return res.status(404).json({ error: 'Sector group not found' });

    const allowedTypes = types.split(',');
    const results = [];

    // Get Stocks
    if (allowedTypes.includes('stock')) {
      for (const sectorId of group.stockSectors) {
        const detail = await sectorDataService.getSectorDetail(sectorId);
        if (detail && detail.stocks) {
          detail.stocks.forEach(s => {
            // Apply region filter to stock symbol
            const isGlobal = !s.symbol.endsWith('.NS') && !s.symbol.endsWith('.BO');
            if (region === 'india' && isGlobal) return;
            if (region === 'global' && !isGlobal) return;

            results.push({
              type: 'stock',
              id: s.symbol,
              name: s.name,
              currentPrice_or_nav: s.ltp,
              currency: isGlobal ? 'USD' : 'INR',
              sector: group.name,
              oneYearChangePct: s.changePercent
            });
          });
        }
      }
    }

    // Get Mutual Funds
    if (allowedTypes.includes('mf')) {
      const basket = sectorBasket[group.mfSector];
      if (basket && basket.funds) {
        for (const fund of basket.funds) {
          if (region !== 'all' && fund.region !== region) continue;

          // Fetch summary dynamically (using existing services for NAV & change pct)
          try {
            const summary = await unifiedAssetService.getAssetSummary('mf', fund.id, fund.region);
            if (summary) results.push(summary);
          } catch (e) {
            // Fallback to static config
            results.push({
              type: 'mf',
              id: fund.id,
              name: fund.name,
              currentPrice_or_nav: 0,
              currency: fund.currency,
              sector: group.name,
              oneYearChangePct: 0
            });
          }
        }
      }
    }

    const uniqueResults = [];
    const seen = new Set();
    for (const item of results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueResults.push(item);
      }
    }

    res.json(uniqueResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assets/:type/:id/detail?region=
router.get('/:type/:id/detail', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { region = 'india', range = '1yr' } = req.query;
    const detail = await unifiedAssetService.getAssetDetail(type, id, region, range);
    
    // Append Advanced Analysis for MFs
    if (type === 'mf') {
      try {
        const advancedAnalysis = await fundAnalysisEngine.analyzeFund(detail.profile, detail.history, region);
        detail.advancedAnalysis = advancedAnalysis;
      } catch (e) {
        console.warn('Advanced analysis failed for', id, e.message);
      }
    }
    
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
