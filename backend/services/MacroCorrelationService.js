import sectorTrendsService from './SectorTrendsService.js';
import macroHistory from '../config/macroHistory.js';
import { stringifyRange } from '../utils/dateRangeUtils.js';

class MacroCorrelationService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  }

  _getCached(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Generates a descriptive analysis of how a sector's index performed around macro changes.
   * Does NOT compute statistical r-values.
   * @param {string} sector - The sector name (e.g. 'Technology')
   * @param {string} macroIndicator - 'repoRate' | 'cpiInflation' | 'gdpGrowth' | 'iip'
   * @param {string} range - '1y' | '3y' | '5y'
   */
  async getSectorMacroCorrelation(sector, macroIndicator, range = '3y') {
    const cacheKey = `macro_corr_${sector}_${macroIndicator}_${stringifyRange(range)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const sectorData = await sectorTrendsService.getSectorTrends(sector, range);
    if (!sectorData.indexAvailable || !sectorData.indexHistory || sectorData.indexHistory.length === 0) {
      return {
        sector,
        indicator: macroIndicator,
        sectorSeries: [],
        macroSeries: [],
        periodsOfAlignment: [],
        periodsOfDivergence: [],
        error: 'Sector index data unavailable'
      };
    }

    const macroData = macroHistory[macroIndicator] || [];
    // Sort macro data chronologically
    const sortedMacro = [...macroData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const sectorSeries = sectorData.indexHistory; // [{ date, value }]
    
    // Create base-100 indexed sector series for easier plotting
    const baseSectorValue = sectorSeries[0].value;
    const indexedSectorSeries = sectorSeries.map(s => ({
      date: s.date,
      value: parseFloat(((s.value / baseSectorValue) * 100).toFixed(2))
    }));

    // Find the start date from sector series to filter macro data
    const startDate = new Date(indexedSectorSeries[0].date);
    const relevantMacro = sortedMacro.filter(m => new Date(m.date) >= startDate);

    // Simple divergence/alignment detection
    const periodsOfAlignment = [];
    const periodsOfDivergence = [];

    // Analyze periods between macro data points
    for (let i = 1; i < relevantMacro.length; i++) {
      const prevMacro = relevantMacro[i - 1];
      const currMacro = relevantMacro[i];

      const macroChange = currMacro.value - prevMacro.value;
      
      // Find sector performance in that window
      const sectorStart = indexedSectorSeries.find(s => s.date >= prevMacro.date);
      const sectorEnd = indexedSectorSeries.find(s => s.date >= currMacro.date) || indexedSectorSeries[indexedSectorSeries.length - 1];

      if (sectorStart && sectorEnd) {
        const sectorChangePct = ((sectorEnd.value - sectorStart.value) / sectorStart.value) * 100;
        
        const periodDesc = `${prevMacro.date} to ${currMacro.date}`;
        
        let direction = '';
        if (macroChange > 0) direction = 'rose';
        else if (macroChange < 0) direction = 'fell';
        else direction = 'remained flat';

        const description = `Historically, when ${macroIndicator} ${direction} (from ${prevMacro.value} to ${currMacro.value}), the ${sector} sector moved ${sectorChangePct > 0 ? '+' : ''}${sectorChangePct.toFixed(2)}%.`;
        
        // Define alignment/divergence based on indicator. 
        // Example: If inflation rises, market dropping is expected (alignment with typical theory).
        // For simplicity, we just classify them mechanically.
        if (Math.abs(macroChange) > 0.01) {
          if ((macroChange > 0 && sectorChangePct > 0) || (macroChange < 0 && sectorChangePct < 0)) {
            periodsOfAlignment.push({ period: periodDesc, description, sectorChangePct, macroChange });
          } else {
            periodsOfDivergence.push({ period: periodDesc, description, sectorChangePct, macroChange });
          }
        }
      }
    }

    const result = {
      sector,
      indicator: macroIndicator,
      sectorSeries: indexedSectorSeries,
      macroSeries: relevantMacro,
      periodsOfAlignment,
      periodsOfDivergence
    };

    this._setCache(cacheKey, result);
    return result;
  }

  async getAllSectorsMacroSummary(macroIndicator, range = '3y') {
    const cacheKey = `macro_summary_all_${macroIndicator}_${stringifyRange(range)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const sectors = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'Consumption'];
    const summaries = await Promise.all(sectors.map(s => this.getSectorMacroCorrelation(s, macroIndicator, range)));
    
    this._setCache(cacheKey, summaries);
    return summaries;
  }
}

export default new MacroCorrelationService();
