import axios from 'axios';
import macroSnapshot from '../config/macroSnapshot.js';

class MacroDataService {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  }

  async getMacroSnapshot() {
    if (this.cache && (Date.now() - this.cacheTime < this.CACHE_DURATION)) {
      return this.cache;
    }

    const isLiveEnabled = process.env.DATA_GOV_IN_ENABLED === 'true';
    const apiKey = process.env.DATA_GOV_IN_API_KEY;

    let cpiData = { value: macroSnapshot.cpiInflation.value, date: macroSnapshot.cpiInflation.date, source: 'manual' };
    let iipData = { value: macroSnapshot.iip.value, date: macroSnapshot.iip.date, source: 'manual' };

    if (isLiveEnabled && apiKey) {
      try {
        // Placeholder endpoints, waiting for exact resource IDs
        const cpiRes = await axios.get(`https://api.data.gov.in/resource/CPI_RESOURCE_ID?api-key=${apiKey}&format=json&limit=1`);
        if (cpiRes.data && cpiRes.data.records && cpiRes.data.records.length > 0) {
          const record = cpiRes.data.records[0];
          // Assuming record has 'inflation_rate' and 'date' fields (will adjust when real resource is known)
          cpiData = { value: parseFloat(record.inflation_rate), date: record.date, source: 'data.gov.in' };
        }
      } catch (err) {
        console.warn('Failed to fetch live CPI data, falling back to manual snapshot:', err.message);
      }

      try {
        const iipRes = await axios.get(`https://api.data.gov.in/resource/IIP_RESOURCE_ID?api-key=${apiKey}&format=json&limit=1`);
        if (iipRes.data && iipRes.data.records && iipRes.data.records.length > 0) {
          const record = iipRes.data.records[0];
          // Assuming record has 'iip_growth' and 'date' fields
          iipData = { value: parseFloat(record.iip_growth), date: record.date, source: 'data.gov.in' };
        }
      } catch (err) {
        console.warn('Failed to fetch live IIP data, falling back to manual snapshot:', err.message);
      }
    }

    const payload = {
      repoRate: { ...macroSnapshot.repoRate, source: 'manual' },
      gdpGrowth: { ...macroSnapshot.gdpGrowth, source: 'manual' },
      cpiInflation: cpiData,
      iip: iipData,
      fetchedAt: new Date().toISOString()
    };

    this.cache = payload;
    this.cacheTime = Date.now();
    return payload;
  }
}

export default new MacroDataService();
