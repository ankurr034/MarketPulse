import macroEconomicService from './MacroEconomicService.js';
import cacheService from './CacheService.js';

class CountryIntelligenceService {
  async getGlobalHeatmapData() {
    const cacheKey = 'global_heatmap_data';
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const countriesMacro = await macroEconomicService.getAllCountriesMacro();
    
    // Map return rates and colors based on macro stability
    const countries = Object.keys(countriesMacro).map(code => {
      const macro = countriesMacro[code];
      const marketReturn = parseFloat(((macro.gdp || 3.0) * 1.5 + (Math.random() - 0.5) * 8).toFixed(2));
      
      let color = 'neutral';
      if (marketReturn > 5) color = 'gain';
      else if (marketReturn < -2) color = 'loss';

      return {
        code,
        name: macro.country,
        marketReturn,
        gdpGrowth: macro.gdp,
        inflation: macro.inflation,
        color
      };
    });

    const result = { countries };
    cacheService.set(cacheKey, result, 'STANDARD');
    return result;
  }
}

export default new CountryIntelligenceService();
