import macroEconomicService from './MacroEconomicService.js';
import cacheService from './CacheService.js';

class CountryIntelligenceService {
  async getGlobalHeatmapData() {
    const cacheKey = 'global_heatmap_data';
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const countriesMacro = (await macroEconomicService.getAllCountriesMacro?.()) || {};
    
    // Map return rates and colors based on macro stability
    const countries = Object.keys(countriesMacro).map(code => {
      const macro = countriesMacro[code] || {};
      const marketReturn = typeof macro.marketReturn === 'number' ? parseFloat(macro.marketReturn.toFixed(2)) : null;
      
      let color = 'neutral';
      if (marketReturn !== null) {
        if (marketReturn > 5) color = 'gain';
        else if (marketReturn < -2) color = 'loss';
      }

      return {
        code,
        name: macro.country || code,
        marketReturn,
        gdpGrowth: macro.gdp ?? null,
        inflation: macro.inflation ?? null,
        color
      };
    });

    const result = { countries, dataStatus: countries.length > 0 ? 'AVAILABLE' : 'DATA_UNAVAILABLE' };
    cacheService.set(cacheKey, result, 'STANDARD');
    return result;
  }
}

export default new CountryIntelligenceService();
