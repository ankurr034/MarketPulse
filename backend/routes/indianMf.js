import express from 'express';
import macroDataService from '../services/MacroDataService.js';
import indianMfSectorService from '../services/IndianMfSectorService.js';
import macroCorrelationService from '../services/MacroCorrelationService.js';
import allFundsDirectoryService from '../services/AllFundsDirectoryService.js';
import liveMfAnalyticsService from '../services/LiveMfAnalyticsService.js';
import amfiImportService from '../services/AmfiImportService.js';
import mfapiCacheService from '../services/MfapiCacheService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';
import unifiedAssetService from '../services/UnifiedAssetService.js';
import { isStrictDirectGrowth, resolveAmcName, resolvePlanAndOption, buildCanonicalIdentity, resolveSchemeClassification } from '../utils/schemeFilterUtil.js';

const router = express.Router();

router.get('/audit-report', (req, res) => {
  const report = amfiImportService.getAuditReport();
  if (!report) {
    return res.status(404).json({ message: 'No import audit report available. Run /api/indian-mf/import first.' });
  }
  res.json(report);
});

router.post('/import', async (req, res) => {
  try {
    const result = await amfiImportService.runAtomicImport();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Atomic import failed', details: err.message });
  }
});

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
    // Sort by AUM descending (largest funds first); null AUM goes to bottom
    flatFunds.sort((a, b) => (Number(b.aum) || 0) - (Number(a.aum) || 0));
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

const EXTRA_SCHEMES_REGISTRY = [
  { id: '118955', name: 'HDFC Flexi Cap Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '120564', name: 'Aditya Birla Sun Life Flexi Cap Fund Direct Growth', family: 'Aditya Birla Sun Life Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '118535', name: 'Franklin India Flexi Cap Fund Direct Growth', family: 'Franklin Templeton Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '120046', name: 'HSBC Flexi Cap Fund Direct Growth', family: 'HSBC Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '120492', name: 'JM Flexicap Fund Direct Growth', family: 'JM Financial Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '140353', name: 'Edelweiss Flexi Cap Fund Direct Growth', family: 'Edelweiss Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '148404', name: 'Bank of India Flexi Cap Fund Direct Growth', family: 'Bank of India Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth', family: 'PPFAS Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '133839', name: 'PGIM India Flexi Cap Fund Direct Growth', family: 'PGIM India Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '120843', name: 'Quant Flexi Cap Fund Direct Growth', family: 'Quant Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '151379', name: 'ITI Flexi Cap Fund Direct Growth', family: 'ITI Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
  { id: '143793', name: 'Navi Flexi Cap Fund Direct Growth', family: 'Navi Mutual Fund', sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },

  { id: '120828', name: 'Quant Small Cap Fund Direct Growth', family: 'Quant Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '118778', name: 'Nippon India Small Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '125497', name: 'SBI Small Cap Fund Direct Growth', family: 'SBI Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '125354', name: 'Axis Small Cap Fund Direct Growth', family: 'Axis Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '147946', name: 'Bandhan Small Cap Fund Direct Growth', family: 'Bandhan Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '145137', name: 'Invesco India Smallcap Fund Direct Growth', family: 'Invesco Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '146196', name: 'Edelweiss Small Cap Fund Direct Growth', family: 'Edelweiss Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '145206', name: 'Tata Small Cap Fund Direct Growth', family: 'Tata Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '120591', name: 'ICICI Prudential Smallcap Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
  { id: '119212', name: 'DSP Small Cap Fund Direct Growth', family: 'DSP Mutual Fund', sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },

  { id: '118989', name: 'HDFC Mid-Cap Opportunities Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '119775', name: 'Kotak Emerging Equity Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '127042', name: 'Motilal Oswal Midcap Fund Direct Growth', family: 'Motilal Oswal Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '118668', name: 'Nippon India Growth Fund Direct Growth', family: 'Nippon India Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '120505', name: 'Axis Midcap Fund Direct Growth', family: 'Axis Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '119716', name: 'SBI Magnum Midcap Fund Direct Growth', family: 'SBI Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '125307', name: 'PGIM India Midcap Opportunities Fund Direct Growth', family: 'PGIM India Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
  { id: '118834', name: 'Mirae Asset Midcap Fund Direct Growth', family: 'Mirae Asset Mutual Fund', sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },

  { id: '120586', name: 'ICICI Prudential Bluechip Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
  { id: '118825', name: 'Mirae Asset Large Cap Fund Direct Growth', family: 'Mirae Asset Mutual Fund', sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
  { id: '119060', name: 'HDFC Top 100 Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
  { id: '118632', name: 'Nippon India Large Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
  { id: '119598', name: 'SBI Bluechip Fund Direct Growth', family: 'SBI Mutual Fund', sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
  { id: '120152', name: 'Kotak Bluechip Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },

  { id: '118650', name: 'Nippon India Multi Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },
  { id: '120823', name: 'Quant Multi Cap Fund Direct Growth', family: 'Quant Mutual Fund', sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },
  { id: '120599', name: 'ICICI Prudential Multicap Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },

  { id: '135781', name: 'Mirae Asset ELSS Tax Saver Fund Direct Growth', family: 'Mirae Asset Mutual Fund', sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
  { id: '120847', name: 'Quant ELSS Tax Saver Fund Direct Growth', family: 'Quant Mutual Fund', sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
  { id: '147481', name: 'Parag Parikh ELSS Tax Saver Fund Direct Growth', family: 'PPFAS Mutual Fund', sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
  { id: '119242', name: 'DSP ELSS Tax Saver Fund Direct Growth', family: 'DSP Mutual Fund', sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },

  { id: '120594', name: 'ICICI Prudential Technology Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Sectoral Technology', specifiedType: 'equity', specifiedSub: 'sectoral' },
  { id: '135800', name: 'Tata Digital India Fund Direct Growth', family: 'Tata Mutual Fund', sectorName: 'Sectoral Technology', specifiedType: 'equity', specifiedSub: 'sectoral' },
  { id: '118759', name: 'Nippon India Pharma Fund Direct Growth', family: 'Nippon India Mutual Fund', sectorName: 'Sectoral Healthcare', specifiedType: 'equity', specifiedSub: 'sectoral' },
  { id: '133859', name: 'SBI Banking & Financial Services Fund Direct Growth', family: 'SBI Mutual Fund', sectorName: 'Sectoral Banking', specifiedType: 'equity', specifiedSub: 'sectoral' },

  { id: '120834', name: 'Quant Focused Fund Direct Growth', family: 'Quant Mutual Fund', sectorName: 'Focused Equity', specifiedType: 'equity', specifiedSub: 'focused' },

  // Contra Equity
  { id: '119835', name: 'SBI Contra Fund Direct Growth', family: 'SBI Mutual Fund', sectorName: 'Contra Equity', specifiedType: 'equity', specifiedSub: 'contra' },
  { id: '119769', name: 'Kotak Contra Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', sectorName: 'Contra Equity', specifiedType: 'equity', specifiedSub: 'contra' },

  // Large & Mid Cap Equity
  { id: '119721', name: 'SBI Large & Midcap Fund Direct Growth', family: 'SBI Mutual Fund', sectorName: 'Large & Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'largemidcap' },
  { id: '118968', name: 'HDFC Large and Mid Cap Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Large & Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'largemidcap' },
  { id: '119777', name: 'Kotak Equity Opportunities Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', sectorName: 'Large & Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'largemidcap' },
  { id: '120596', name: 'ICICI Prudential Large & Mid Cap Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Large & Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'largemidcap' },

  // Value Equity
  { id: '120323', name: 'ICICI Prudential Value Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Value Equity', specifiedType: 'equity', specifiedSub: 'value' },
  { id: '118481', name: 'Bandhan Value Fund Direct Growth', family: 'Bandhan Mutual Fund', sectorName: 'Value Equity', specifiedType: 'equity', specifiedSub: 'value' },

  { id: '149800', name: 'Motilal Oswal Nifty 200 Momentum 30 Index Fund Direct Growth', family: 'Motilal Oswal Mutual Fund', sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
  { id: '148703', name: 'UTI Nifty200 Momentum 30 Index Fund Direct Growth', family: 'UTI Mutual Fund', sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
  { id: '150452', name: 'ICICI Prudential Nifty200 Momentum 30 Index Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
  { id: '150657', name: 'HDFC Nifty200 Momentum 30 Index Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
  { id: '151781', name: 'Kotak Nifty 200 Momentum 30 Index Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
  { id: '150738', name: 'Tata Nifty200 Momentum 30 Index Fund Direct Growth', family: 'Tata Mutual Fund', sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },

  // Commodities
  { id: '118663', name: 'Nippon India Gold Savings Fund Direct Growth', family: 'Nippon India Mutual Fund', sectorName: 'Commodity Gold', specifiedType: 'commodities', specifiedSub: 'gold' },
  { id: '149775', name: 'ICICI Prudential Silver ETF FOF Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Commodity Silver', specifiedType: 'commodities', specifiedSub: 'silver' },
  { id: '150737', name: 'HDFC Silver ETF Fund of Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Commodity Silver', specifiedType: 'commodities', specifiedSub: 'silver' },

  // Debt Funds
  { id: '120590', name: 'ICICI Prudential Gilt Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },

  // Nifty Bank & Banking Schemes
  { id: '140087', name: 'Nippon India ETF Nifty Bank BeES', family: 'Nippon India Mutual Fund', sectorName: 'Nifty Bank Index', specifiedType: 'index', specifiedSub: 'niftybank' },
  { id: '134013', name: 'SBI Nifty Bank ETF', family: 'SBI Mutual Fund', sectorName: 'Nifty Bank Index', specifiedType: 'index', specifiedSub: 'niftybank' },
  { id: '149858', name: 'ICICI Prudential Nifty Bank Index Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', sectorName: 'Nifty Bank Index', specifiedType: 'index', specifiedSub: 'niftybank' },
  { id: '135853', name: 'HDFC Nifty Bank Index Fund Direct Growth', family: 'HDFC Mutual Fund', sectorName: 'Nifty Bank Index', specifiedType: 'index', specifiedSub: 'niftybank' },
  { id: '123693', name: 'Kotak Banking & PSU Debt Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', sectorName: 'Banking & PSU Debt', specifiedType: 'debt', specifiedSub: 'banking' },
  { id: '120438', name: 'Axis Banking & PSU Debt Fund Direct Growth', family: 'Axis Mutual Fund', sectorName: 'Banking & PSU Debt', specifiedType: 'debt', specifiedSub: 'banking' }
].filter(s => isStrictDirectGrowth(s.name));

let allDirectSchemesCache = null;
let allDirectSchemesCacheTime = 0;
const DIRECT_SCHEMES_TTL = 15 * 60 * 1000; // 15 minutes

router.get('/all-direct-schemes', async (req, res) => {
  try {
    if (allDirectSchemesCache && (Date.now() - allDirectSchemesCacheTime < DIRECT_SCHEMES_TTL)) {
      return res.json(allDirectSchemesCache);
    }

    const activeList = await amfiImportService.getActiveSchemes() || [];
    const formatted = activeList.map(s => {
      const launchYearVal = s.launchYear ?? s.inceptionYear ?? null;
      const cleanAum = (s.aum !== null && s.aum !== undefined && !isNaN(s.aum) && Number(s.aum) > 0) ? Number(s.aum) : null;
      const resolvedAmc = s.amc || s.fundHouse || s.family || resolveAmcName(s.schemeName);
      const { plan, option } = resolvePlanAndOption(s.schemeName);
      const isin = s.isinGrowth || s.isin || null;
      const canonicalKey = `${s.schemeCode}_${isin || 'NOISIN'}_${resolvedAmc.replace(/\s+/g, '')}_${plan}_${option}`;
      const classification = resolveSchemeClassification(s.schemeName, s.category);

      return {
        id: String(s.schemeCode),
        schemeCode: String(s.schemeCode),
        name: s.schemeName,
        schemeName: s.schemeName,
        amc: resolvedAmc,
        fundHouse: resolvedAmc,
        family: resolvedAmc,
        plan,
        planType: plan,
        option,
        isin,
        isinGrowth: isin,
        canonicalKey,
        category: s.category || 'Other',
        ...(classification ? {
          specifiedType: classification.specifiedType || classification.type,
          specifiedSub: classification.specifiedSub || classification.subType,
          type: classification.type,
          subType: classification.subType,
          parentCategory: classification.parentCategory
        } : {}),
        nav: s.nav,
        navDate: s.date,
        aum: cleanAum,
        aumCr: cleanAum,
        aumProvenance: s.aumProvenance || { value: cleanAum, aumCr: cleanAum, source: cleanAum ? 'Upvaly FinAPI Disclosure' : null, status: cleanAum ? 'PROVIDER_REPORTED' : 'UNAVAILABLE' },
        oneWeekChangePct: s.oneWeekChangePct ?? null,
        oneMonthChangePct: s.oneMonthChangePct ?? null,
        threeMonthChangePct: s.threeMonthChangePct ?? null,
        sixMonthChangePct: s.sixMonthChangePct ?? null,
        oneYearChangePct: s.oneYearChangePct ?? null,
        threeYearCagr: s.threeYearCagr ?? null,
        fiveYearCagr: s.fiveYearCagr ?? null,
        inceptionCagr: s.inceptionCagr ?? null,
        returns: s.returns ?? null,
        sharpeRatio: s.sharpeRatio ?? null,
        sortinoRatio: s.sortinoRatio ?? null,
        launchDate: s.launchDate ?? null,
        launchYear: launchYearVal,
        inceptionYear: launchYearVal
      };
    });
    // Sort by AUM descending (largest funds first); null AUM goes to bottom
    formatted.sort((a, b) => (Number(b.aum) || 0) - (Number(a.aum) || 0));
    
    if (formatted.length > 0) {
      allDirectSchemesCache = formatted;
      allDirectSchemesCacheTime = Date.now();
    }
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active direct schemes', details: err.message });
  }
});

let extraSchemesCache = null;
let extraSchemesCacheTime = 0;
const EXTRA_SCHEMES_TTL = 15 * 60 * 1000; // 15 minutes

router.get('/extra-schemes', async (req, res) => {
  try {
    if (extraSchemesCache && (Date.now() - extraSchemesCacheTime < EXTRA_SCHEMES_TTL)) {
      return res.json(extraSchemesCache);
    }

    const chunkSize = 10;
    const enriched = [];

    for (let i = 0; i < EXTRA_SCHEMES_REGISTRY.length; i += chunkSize) {
      const chunk = EXTRA_SCHEMES_REGISTRY.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(async s => {
        const assetSummary = await unifiedAssetService.getAssetSummary('mf', s.id, 'india');
        const cleanAum = (assetSummary?.aum !== null && assetSummary?.aum !== undefined && !isNaN(assetSummary?.aum) && Number(assetSummary?.aum) > 0) ? Number(assetSummary.aum) : null;
        
        // Canonical scheme identity: authoritative name and AMC from assetSummary strictly prevail
        const resolvedName = assetSummary?.schemeName || assetSummary?.name || s.name;
        const resolvedAmc = assetSummary?.amc || assetSummary?.family || resolveAmcName(s.family || resolvedName);

        return {
          id: s.id,
          schemeCode: s.id,
          name: resolvedName,
          schemeName: resolvedName,
          amc: resolvedAmc,
          fundHouse: resolvedAmc,
          family: resolvedAmc,
          category: s.sectorName || assetSummary?.sector || 'Mutual Funds',
          sectorName: s.sectorName || assetSummary?.sector || 'Mutual Funds',
          specifiedType: s.specifiedType,
          specifiedSub: s.specifiedSub,
          type: 'mf',
          currency: 'INR',
          region: 'india',
          ...assetSummary,
          id: s.id,
          schemeCode: s.id,
          name: resolvedName,
          schemeName: resolvedName,
          amc: resolvedAmc,
          family: resolvedAmc,
          fundHouse: resolvedAmc,
          aum: cleanAum,
          aumCr: cleanAum
        };
      }));
      enriched.push(...results);
    }

    // Sort by AUM descending (largest funds first); null AUM goes to bottom
    enriched.sort((a, b) => (Number(b.aum) || 0) - (Number(a.aum) || 0));
    extraSchemesCache = enriched;
    extraSchemesCacheTime = Date.now();
    res.json(enriched);
  } catch (err) {
    console.error('Error fetching extra schemes:', err);
    res.status(500).json({ error: 'Failed to fetch extra schemes' });
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
      searchTerm: req.query.search || '',
      sortBy: req.query.sortBy || '',
      timeframe: req.query.timeframe || '1y'
    };
    const data = await allFundsDirectoryService.getAllSchemes(page, pageSize, filters);
    res.json(data);
  } catch (err) {
    console.error('Error fetching all schemes:', err);
    res.status(500).json({ error: 'Failed to fetch all schemes directory' });
  }
});

export default router;
