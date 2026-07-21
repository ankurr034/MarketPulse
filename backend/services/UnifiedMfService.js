import mfDataAggregatorService from './MfDataAggregatorService.js';
import globalMfService from './GlobalMfService.js';
import sectorBasket from '../config/sectorBasket.js';
import { AMC_LIST } from '../config/mfTaxonomy.js';

class UnifiedMfService {
  /**
   * Search for mutual funds across regions
   */
  async searchFunds(query, region = 'all') {
    let results = [];

    if (region === 'india' || region === 'all') {
      const indianFunds = await mfDataAggregatorService.searchSchemes(query);
      // Map to the unified schema
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
   * Get fund profile (holdings, sector breakdown, etc)
   */
  async getFundProfile(id, region = 'india') {
    if (region === 'global') {
      const profile = await globalMfService.getSchemeHoldings(id);
      return { ...profile, currency: 'USD' };
    }

    // India
    const profile = await mfDataAggregatorService.getSchemeHoldings(id);
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
   * Get a list of popular funds (curated)
   */
  async getPopularFunds(region = 'all') {
    let results = [];

    if (region === 'india' || region === 'all') {
      results = results.concat([
        { id: '122639', name: 'Parag Parikh Flexi Cap Fund', family: 'Parag Parikh', region: 'india', currency: 'INR' },
        { id: '118989', name: 'HDFC Mid-Cap Opportunities Fund', family: 'HDFC', region: 'india', currency: 'INR' },
        { id: '125464', name: 'SBI Small Cap Fund', family: 'SBI', region: 'india', currency: 'INR' },
        { id: '119062', name: 'ICICI Prudential Bluechip Fund', family: 'ICICI', region: 'india', currency: 'INR' }
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
      const popular = await this.getPopularFunds('global');
      return popular;
    }

    let searchParts = [];
    
    // Add AMC to search query if provided
    if (amc) {
      searchParts.push(amc);
    }

    // Add Category to search query if provided, handling generic groups
    if (category) {
      if (category !== 'Equity' && category !== 'Debt' && category !== 'Hybrid' && category !== 'Commodities' && category !== 'ETFs' && category !== 'Others') {
        searchParts.push(category);
      } else if (!amc && !risk && !duration) {
        searchParts.push(category);
      }
    }

    // Append duration modifiers if applicable
    if (duration === 'Low') searchParts.push('Low Duration');
    if (duration === 'Medium') searchParts.push('Medium Duration');
    if (duration === 'Long') searchParts.push('Long Duration');

    // Append risk modifiers if applicable (Liquid funds are low risk)
    if (risk === 'Low' && !category) searchParts.push('Liquid');
    if (risk === 'High' && !category) searchParts.push('Small Cap');

    let searchWord = searchParts.join(' ').trim();
    if (!searchWord && category) searchWord = category;

    if (!searchWord) {
      return await this.getPopularFunds('india');
    }

    const rawFunds = await mfDataAggregatorService.searchSchemes(searchWord);
    
    let results = rawFunds.map(f => {
      const nameLower = f.schemeName.toLowerCase();
      let matchedAmc = amc || 'Unknown';
      if (!amc) {
        const foundAmc = AMC_LIST.find(a => nameLower.includes(a.toLowerCase()));
        if (foundAmc) matchedAmc = foundAmc;
      }
      return {
        id: f.schemeCode,
        name: f.schemeName,
        family: matchedAmc,
        category: category || 'Other',
        region: 'india',
        currency: 'INR'
      };
    });

    // Post-filter the results if they don't match the exact category keyword in their name
    if (category && category !== 'Equity' && category !== 'Debt' && category !== 'Hybrid') {
      // Create a loose regex or substring match
      const catParts = category.toLowerCase().split(/[ \-\&]+/);
      results = results.filter(f => {
        const nameL = f.name.toLowerCase();
        // Check if at least one significant part of the category name is in the fund name
        return catParts.some(p => p.length > 2 && nameL.includes(p));
      });
    }

    return results;
  }
}

export default new UnifiedMfService();
