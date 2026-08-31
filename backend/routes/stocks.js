import express from 'express';
import yahooFinanceService from '../services/YahooFinanceService.js';
import marketDataGateway from '../services/MarketDataGateway.js';
import sectorDataService from '../services/SectorDataService.js';
import athBaseService from '../services/AthBaseService.js';

const router = express.Router();

// Get list of all stocks (supports autocomplete query)
router.get('/', async (req, res) => {
  const query = req.query.q;
  try {
    if (query && query.trim().length > 0) {
      const searchRes = await yahooFinanceService.search(query);
      const results = searchRes.available ? searchRes.data : [];
      res.setHeader('X-Data-Source', 'YAHOO_FINANCE');
      res.setHeader('X-Data-Status', 'LIVE');
      return res.json(results);
    }
    
    // Return all stocks across all sectors with verified quotes & provenance
    const symbols = sectorDataService.getAllSymbols();
    const quotesRes = await marketDataGateway.getQuotes(symbols);
    const data = quotesRes.data || [];
    const primarySource = data.length > 0 ? (data[0].source || 'YAHOO_FINANCE') : 'YAHOO_FINANCE_UNAVAILABLE';
    const primaryStatus = data.length > 0 ? (data[0].dataStatus || 'UNAVAILABLE') : 'UNAVAILABLE';
    res.setHeader('X-Data-Source', primarySource);
    res.setHeader('X-Data-Status', primaryStatus);
    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get individual stock details
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const sym = symbol.toUpperCase();
  
  try {
    // Pure Authoritative Gateway (Yahoo Finance -> YAHOO_FINANCE_UNAVAILABLE)
    const stockRes = await marketDataGateway.getQuoteDetail(sym);
    let stock = stockRes && stockRes.data ? stockRes.data : null;
    
    if (stock && stock.dataStatus !== 'UNAVAILABLE' && stock.ltp !== null) {
      try {
        const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
        const athBase = await athBaseService.getAthAndBaseMetrics(yahooSym, stock.ltp);
        if (athBase) {
          stock = {
            ...stock,
            week52Low: athBase.week52Low ?? athBase.baseLow ?? null,
            week52LowDate: athBase.week52LowDate ?? athBase.baseLowDate ?? null,
            allTimeHigh: athBase.allTimeHigh || null,
            allTimeHighDate: athBase.allTimeHighDate || null,
            ath: athBase.allTimeHigh || null,
            pctFrom52WLow: athBase.pctFrom52WLow ?? athBase.recoveryFromBasePercent ?? null,
            pctFromATH: athBase.pctFromATH ?? athBase.distanceFromATHPercent ?? null,
            baseLow: athBase.week52Low ?? athBase.baseLow ?? null,
            baseLowDate: athBase.week52LowDate ?? athBase.baseLowDate ?? null,
            longTermBaseLow: athBase.week52Low ?? athBase.baseLow ?? null,
            longTermBaseLowDate: athBase.week52LowDate ?? athBase.baseLowDate ?? null,
            recoveryFromBasePercent: athBase.pctFrom52WLow ?? athBase.recoveryFromBasePercent ?? null,
            distanceFromATHPercent: athBase.pctFromATH ?? athBase.distanceFromATHPercent ?? null,
            baseStatus: athBase.baseStatus || 'WEEK_52_LOW',
            positionDataSource: athBase.positionDataSource || 'YAHOO_FINANCE',
            historicalAsOf: athBase.historicalAsOf || null,
            athBaseMetrics: athBase
          };
        }
      } catch (e) {
        console.warn(`Could not attach athBaseMetrics for ${sym}:`, e.message);
      }

      res.setHeader('X-Data-Source', stock.source || 'YAHOO_FINANCE');
      res.setHeader('X-Data-Status', stock.dataStatus || 'LIVE');
      return res.json(stock);
    }
    
    if (stock) {
      res.setHeader('X-Data-Source', 'YAHOO_FINANCE_UNAVAILABLE');
      res.setHeader('X-Data-Status', 'UNAVAILABLE');
      return res.status(404).json(stock);
    }

    res.setHeader('X-Data-Source', 'YAHOO_FINANCE_UNAVAILABLE');
    res.setHeader('X-Data-Status', 'UNAVAILABLE');
    res.status(404).json({ error: 'Stock not found', symbol: sym, source: 'YAHOO_FINANCE_UNAVAILABLE', dataStatus: 'UNAVAILABLE' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stock chart candles
router.get('/:symbol/chart', async (req, res) => {
  const { symbol } = req.params;
  const interval = req.query.interval || '1D'; // 1m, 5m, 1H, 1D, 1W, 1M, 1Y
  const sym = symbol.toUpperCase();

  try {
    const chartRes = await marketDataGateway.getChartData(sym, interval);
    const candles = chartRes.available ? chartRes.data : [];
    if (candles && candles.length > 0) {
      if (candles.earliestDate) {
        res.setHeader('X-Earliest-Date', candles.earliestDate);
      }
      res.setHeader('X-Data-Source', chartRes.source || 'YAHOO_FINANCE');
      res.setHeader('X-Data-Status', chartRes.dataStatus || 'EOD');
      return res.json(candles);
    }

    res.setHeader('X-Data-Source', 'YAHOO_FINANCE_UNAVAILABLE');
    res.setHeader('X-Data-Status', 'UNAVAILABLE');
    res.status(404).json({ error: 'Stock chart not found', symbol: sym, source: 'YAHOO_FINANCE_UNAVAILABLE', dataStatus: 'UNAVAILABLE' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

