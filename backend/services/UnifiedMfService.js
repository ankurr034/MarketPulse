import mfDataAggregatorService from './MfDataAggregatorService.js';
import globalMfService from './GlobalMfService.js';
import sectorBasket from '../config/sectorBasket.js';

class UnifiedMfService {
  /**
   * Search for mutual funds across regions
   */
  async searchFunds(query, region = 'all') {
    let results = [];

    if (region === 'india' || region === 'all') {
      const indianFunds = await mfDataAggregatorService.searchSchemes(query);
      const mapped = indianFunds.map(f => ({
        id: f.schemeCode,
        name: f.schemeName,
        schemeCode: f.schemeCode,
        schemeName: f.schemeName,
        family: f.fundHouse,
        region: 'india',
        currency: 'INR'
      }));
      results = results.concat(mapped);
    }

    if (region === 'global' || region === 'all') {
      const globalFunds = await globalMfService.searchSchemes(query);
      const mappedGlobal = globalFunds.map(f => ({
        id: f.schemeCode,
        name: f.schemeName,
        schemeCode: f.schemeCode,
        schemeName: f.schemeName,
        family: f.fundHouse,
        region: 'global',
        currency: 'USD'
      }));
      results = results.concat(mappedGlobal);
    }

    return results;
  }

  /**
   * Get fund profile (holdings, sector breakdown, dynamic risk metrics)
   */
  async getFundProfile(id, region = 'india', timeframe = '1y') {
    if (region === 'global') {
      const profile = await globalMfService.getSchemeHoldings(id);
      return { ...profile, currency: 'USD' };
    }

    // India
    const profile = await mfDataAggregatorService.getSchemeHoldings(id, timeframe);
    return { ...profile, currency: 'INR' };
  }

  /**
   * Get historical NAV data
   */
  async getFundNavHistory(id, region = 'india', range = '1y') {
    if (region === 'global') {
      return await globalMfService.getSchemeNavHistory(id, range);
    }

    // India
    return await mfDataAggregatorService.getSchemeNavHistory(id, range);
  }

  /**
   * Get a list of popular funds (curated with 100% verified AMFI Direct Growth scheme codes)
   */
  async getPopularFunds(region = 'all') {
    let results = [];

    if (region === 'india' || region === 'all') {
      results = results.concat([
        { id: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth', family: 'Parag Parikh', region: 'india', currency: 'INR' },
        { id: '118989', name: 'HDFC Mid-Cap Opportunities Fund Direct Growth', family: 'HDFC', region: 'india', currency: 'INR' },
        { id: '125497', name: 'SBI Small Cap Fund Direct Growth', family: 'SBI', region: 'india', currency: 'INR' },
        { id: '120586', name: 'ICICI Prudential Bluechip Fund Direct Growth', family: 'ICICI Prudential', region: 'india', currency: 'INR' },
        { id: '120828', name: 'Quant Small Cap Fund Direct Growth', family: 'Quant', region: 'india', currency: 'INR' },
        { id: '125354', name: 'Axis Small Cap Fund Direct Growth', family: 'Axis', region: 'india', currency: 'INR' },
        { id: '118777', name: 'Nippon India Small Cap Fund Direct Growth', family: 'Nippon India', region: 'india', currency: 'INR' }
      ]);
    }

    if (region === 'global' || region === 'all') {
      results = results.concat([
        { id: 'SPY', name: 'SPDR S&P 500 ETF Trust', family: 'ETF', region: 'global', currency: 'USD' },
        { id: 'QQQ', name: 'Invesco QQQ Trust', family: 'ETF', region: 'global', currency: 'USD' },
        { id: 'VTSAX', name: 'Vanguard Total Stock Market Index', family: 'MUTUALFUND', region: 'global', currency: 'USD' },
        { id: 'FXAIX', name: 'Fidelity 500 Index Fund', family: 'MUTUALFUND', region: 'global', currency: 'USD' }
      ]);
    }
    return results;
  }

  /**
   * Get all available mutual fund sectors from curated basket
   */
  getSectors() {
    return Object.keys(sectorBasket).map(key => ({
      id: key,
      name: key,
      description: sectorBasket[key].description
    }));
  }

  /**
   * Get funds mapped to a specific sector
   */
  getFundsBySector(sectorId, region = 'all') {
    const sector = sectorBasket[sectorId];
    if (!sector) return [];

    let funds = sector.funds;
    if (region !== 'all') {
      funds = funds.filter(f => f.region === region);
    }
    return funds;
  }

  /**
   * Filter funds by AMC, Category, Risk, Duration, and Region
   */
  async getFilteredFunds(amc, category, risk, duration, region = 'india') {
    if (region === 'global') {
      return await this.getPopularFunds('global');
    }

    let searchParts = [];
    if (amc) searchParts.push(amc);
    if (category) {
      if (!['Equity', 'Debt', 'Hybrid', 'Commodities', 'ETFs', 'Others'].includes(category)) {
        searchParts.push(category);
      } else if (!amc && !risk && !duration) {
        searchParts.push(category);
      }
    }
    if (duration === 'Low') searchParts.push('Low Duration');
    if (duration === 'Medium') searchParts.push('Medium Duration');
    if (duration === 'Long') searchParts.push('Long Duration');

    const query = searchParts.join(' ');
    if (!query) {
      return await this.getPopularFunds('india');
    }

    return await this.searchFunds(query, 'india');
  }
}

export default new UnifiedMfService();
