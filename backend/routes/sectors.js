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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import amfiImportService from '../services/AmfiImportService.js';
import { resolveSchemeClassification } from '../utils/schemeFilterUtil.js';
import { CATEGORY_GROUPS } from '../config/mfTaxonomy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-load stock masters for fast fallback search
let bseScripMapping = {};
try {
  const bsePath = path.resolve(__dirname, '../data/bse_scrip_mapping.json');
  if (fs.existsSync(bsePath)) {
    bseScripMapping = JSON.parse(fs.readFileSync(bsePath, 'utf8'));
  }
} catch (e) {
  console.warn('Failed to load bse_scrip_mapping for search:', e.message);
}

let indianEquityMaster = [];
try {
  const eqPath = path.resolve(__dirname, '../data/indian_equity_master.json');
  if (fs.existsSync(eqPath)) {
    const raw = JSON.parse(fs.readFileSync(eqPath, 'utf8'));
    indianEquityMaster = Array.isArray(raw) ? raw : Object.values(raw);
  }
} catch (e) {
  console.warn('Failed to load indian_equity_master for search:', e.message);
}

// GET /api/sectors/search?q=query
router.get('/search', async (req, res) => {
  const { q = '' } = req.query;
  const queryStr = (q || '').trim();
  if (!queryStr || queryStr.length < 2) {
    return res.json({ sectors: [], stocks: [], funds: [], subcategories: [] });
  }

  const qLower = queryStr.toLowerCase();
  const results = sectorDataService.searchStocksAndSectors(queryStr);
  const sectors = results.sectors || [];
  let stocks = results.stocks || [];

  // Supplemental stock matching from BSE and Master if under 8 stocks
  if (stocks.length < 8) {
    const seen = new Set(stocks.map(s => (s.symbol || '').replace('.NS', '').replace('.BO', '').toLowerCase()));
    
    // Check BSE mapping (e.g. ZOMATO, PAYTM, SUZLON, IREDA)
    for (const [sym, info] of Object.entries(bseScripMapping)) {
      const symClean = sym.toLowerCase();
      const compClean = (info.companyName || '').toLowerCase();
      if ((symClean.includes(qLower) || compClean.includes(qLower)) && !seen.has(symClean)) {
        seen.add(symClean);
        stocks.push({
          symbol: `${sym}.NS`,
          name: info.companyName,
          sectorId: 'nse-stocks',
          sectorName: 'NSE Equities'
        });
        if (stocks.length >= 8) break;
      }
    }

    // Check Indian Equity Master
    if (stocks.length < 8 && indianEquityMaster.length > 0) {
      for (const item of indianEquityMaster) {
        const symClean = (item.symbol || '').toLowerCase();
        const compClean = (item.name || '').toLowerCase();
        if ((symClean.includes(qLower) || compClean.includes(qLower)) && !seen.has(symClean)) {
          seen.add(symClean);
          stocks.push({
            symbol: `${item.symbol}.NS`,
            name: item.name,
            sectorId: 'nse-stocks',
            sectorName: 'NSE Equities'
          });
          if (stocks.length >= 8) break;
        }
      }
    }
  }

  // Mutual funds search from active direct schemes
  let funds = [];
  try {
    const activeSchemes = await amfiImportService.getActiveSchemes() || [];
    const matched = activeSchemes.filter(s => {
      const name = (s.schemeName || '').toLowerCase();
      const amc = (s.amc || s.family || '').toLowerCase();
      const code = String(s.schemeCode || '');
      return name.includes(qLower) || amc.includes(qLower) || code.includes(qLower);
    });

    funds = matched.slice(0, 10).map(s => {
      const cls = resolveSchemeClassification(s.schemeName, s.category);
      return {
        id: String(s.schemeCode),
        schemeCode: String(s.schemeCode),
        name: s.schemeName,
        amc: s.amc || s.family,
        category: s.category,
        parentCategory: cls?.parentCategory || 'HYBRID',
        parentCategoryLabel: cls?.parentCategoryLabel || 'Hybrid',
        subType: cls?.subType || 'other',
        subLabel: cls?.subLabel || s.category,
        nav: s.nav,
        aumCr: s.aumCr ?? s.aum,
        aumMetric: s.aumMetric || 'AUM'
      };
    });
  } catch (err) {
    console.warn('[search] Failed to search mutual funds:', err.message);
  }

  // Subcategories search across all asset classes
  const subcategories = [];
  try {
    const allSubs = [];
    for (const [parentGroup, subs] of Object.entries(CATEGORY_GROUPS)) {
      for (const sub of subs) {
        let marketFilter = 'equity';
        let subType = sub.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (parentGroup === 'Tax Saver (ELSS)') { marketFilter = 'elss'; subType = 'elss_funds'; }
        else if (parentGroup === 'Sectoral & Thematic') { marketFilter = 'sectoral_thematic'; }
        else if (parentGroup === 'Hybrid') { 
          marketFilter = 'hybrid';
          if (sub === 'Balanced Advantage Funds') subType = 'balanced_adv';
          else if (sub === 'Dynamic Asset Allocation Funds') subType = 'dynamic_asset';
          else if (sub === 'Active Momentum Funds') subType = 'active_momentum';
        }
        else if (parentGroup === 'Debt') { marketFilter = 'debt'; }
        else if (parentGroup === 'Index Funds & ETFs' || parentGroup === 'Index / ETFs') { marketFilter = 'index'; }
        else if (parentGroup === 'Commodities') { marketFilter = 'commodities'; }
        else if (parentGroup === 'Global') { marketFilter = 'global'; }

        allSubs.push({
          id: subType,
          name: sub,
          label: sub,
          parentCategory: parentGroup,
          parentGroup,
          marketFilter,
          subType
        });
      }
    }

    const matchedSubs = allSubs.filter(s => {
      const label = s.label.toLowerCase();
      return label.includes(qLower) || qLower.includes(label);
    });
    subcategories.push(...matchedSubs.slice(0, 6));
  } catch (err) {
    console.warn('[search] Failed to search subcategories:', err.message);
  }

  res.json({
    sectors: sectors.slice(0, 6),
    stocks: stocks.slice(0, 8),
    funds,
    subcategories
  });
});

// GET /api/sectors/all-stocks?region=india|global|all&timeframe=1D|1W|1M|1Y|5Y|ALL
router.get('/all-stocks', async (req, res) => {
  try {
    const { region = 'all', timeframe = '1D', assetClass = 'stocks' } = req.query;
    const stocks = await sectorDataService.getAllRankedStocks(region, timeframe, assetClass);
    res.json(stocks);
  } catch (err) {
    console.error('All ranked stocks fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch all ranked stocks' });
  }
});

// GET /api/sectors/:sectorId?timeframe=1D|1W|1M|1Y|5Y|ALL
router.get('/:sectorId', async (req, res) => {
  try {
    const { timeframe = '1D' } = req.query;
    const detail = await sectorDataService.getSectorDetail(req.params.sectorId, timeframe);
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
