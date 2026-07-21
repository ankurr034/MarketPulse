import express from 'express';
import yahooFinanceService from '../services/YahooFinanceService.js';
import simulator from '../services/SimulatorService.js';

const router = express.Router();

// Get list of all stocks (supports autocomplete query)
router.get('/', async (req, res) => {
  const query = req.query.q;
  try {
    if (query && query.trim().length > 0) {
      const res = await yahooFinanceService.search(query);
      const results = res.available ? res.data : [];
      return res.json(results);
    }
    
    // Default fallback list from simulator
    const stocks = simulator.getStocks();
    res.json(stocks.map(s => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      ltp: s.ltp,
      changePercent: s.changePercent
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get individual stock details
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const sym = symbol.toUpperCase();
  
  try {
    // 1. Try Yahoo Finance first
    const stockRes = await yahooFinanceService.getQuoteDetail(sym);
    const stock = stockRes.available ? stockRes.data : null;
    if (stock) {
      return res.json(stock);
    }
    
    // 2. Try Local Simulator (e.g. for simple mock codes like RELIANCE)
    const mockStock = simulator.getStock(sym);
    if (mockStock) {
      const { candles, ...metaData } = mockStock;
      return res.json(metaData);
    }

    res.status(404).json({ error: 'Stock not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stock chart candles
router.get('/:symbol/chart', async (req, res) => {
  const { symbol } = req.params;
  const interval = req.query.interval || '1D'; // 1m, 5m, 1H, 1D
  const sym = symbol.toUpperCase();

  try {
    const chartRes = await yahooFinanceService.getChartData(sym, interval);
    const candles = chartRes.available ? chartRes.data : [];
    if (candles && candles.length > 0) {
      if (candles.earliestDate) {
        res.setHeader('X-Earliest-Date', candles.earliestDate);
      }
      return res.json(candles);
    }

    // 2. Fallback to Local Simulator
    const mockStock = simulator.getStock(sym);
    if (mockStock) {
      const validIntervals = ['1m', '5m', '1H', '1D'];
      const targetInterval = validIntervals.includes(interval) ? interval : '1D';
      const mockCandles = mockStock.candles[targetInterval] || [];
      return res.json(mockCandles);
    }

    res.status(404).json({ error: 'Stock not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
