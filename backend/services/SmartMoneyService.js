import yahooFinanceService from './YahooFinanceService.js';
import cacheService from './CacheService.js';

class SmartMoneyService {
  constructor() {
    this.sectors = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'FMCG', 'IT', 'Pharma'];
  }

  async getSectorRotation(timeframe = '1M') {
    const cacheKey = `smart_money_rotation_${timeframe}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    // Simulate sector rotation returns based on timeframe
    const rotation = this.sectors.map(sec => {
      let shortTermReturn = parseFloat(((Math.random() - 0.4) * 15).toFixed(2));
      let longTermReturn = parseFloat(((Math.random() - 0.2) * 35).toFixed(2));

      return {
        name: sec,
        shortTermReturn,
        longTermReturn,
        rotationSignal: shortTermReturn > 5 ? 'Inflow' : shortTermReturn < -5 ? 'Outflow' : 'Neutral'
      };
    });

    rotation.sort((a, b) => b.shortTermReturn - a.shortTermReturn);

    cacheService.set(cacheKey, rotation, 'STANDARD');
    return rotation;
  }

  async getSmartMoneySignals() {
    const cacheKey = 'smart_money_signals';
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const rotation = await this.getSectorRotation('1M');
    const bullishSectors = rotation.filter(r => r.rotationSignal === 'Inflow').map(r => r.name);
    const bearishSectors = rotation.filter(r => r.rotationSignal === 'Outflow').map(r => r.name);

    const signals = [
      { type: 'FII Buy Surge', sector: bullishSectors[0] || 'Technology', description: 'Strong foreign institutional buying recorded in large-cap entities.', confidence: 'High' },
      { type: 'DII Profit Booking', sector: bearishSectors[0] || 'Energy', description: 'Domestic institutions locking in profits after recent peak rally.', confidence: 'Medium' }
    ];

    const result = {
      bullishSectors,
      bearishSectors,
      signals
    };

    cacheService.set(cacheKey, result, 'STANDARD');
    return result;
  }
}

export default new SmartMoneyService();
