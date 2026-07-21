import express from 'express';
import macroEconomicService from '../services/MacroEconomicService.js';

const router = express.Router();

// GET /api/economy/countries
router.get('/countries', async (req, res) => {
  try {
    const data = await macroEconomicService.getAllCountriesMacro();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/economy/country/:code
router.get('/country/:code', async (req, res) => {
  try {
    const data = await macroEconomicService.getCountryMacro(req.params.code.toUpperCase());
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
