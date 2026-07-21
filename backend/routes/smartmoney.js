import express from 'express';
import smartMoneyService from '../services/SmartMoneyService.js';

const router = express.Router();

// GET /api/smart-money/signals
router.get('/signals', async (req, res) => {
  try {
    const data = await smartMoneyService.getSmartMoneySignals();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-money/rotation
router.get('/rotation', async (req, res) => {
  try {
    const data = await smartMoneyService.getSectorRotation(req.query.timeframe || '1M');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
