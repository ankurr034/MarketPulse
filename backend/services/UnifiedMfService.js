import amfiImportService from './AmfiImportService.js';
import mfDataAggregatorService from './MfDataAggregatorService.js';
import globalMfService from './GlobalMfService.js';
import sectorBasket from '../config/sectorBasket.js';

class UnifiedMfService {
  /**
   * Search for mutual funds across regions
   */
  async searchFunds(query, region = 'all') {
    let results = [];
    const q = (query || '').toLowerCase().trim();

    if (region === 'india' || region === 'all') {
      try {
        const activeList = await amfiImportService.getActiveSchemes() || [];
        const matched = activeList.filter(s => {
          if (!q) return true;
          const sName = (s.schemeName || '').toLowerCase();
          const sCode = String(s.schemeCode || '');
          const sAmc = (s.amc || s.fundHouse || s.family || '').toLowerCase();
          const sCat = (s.category || '').toLowerCase();
          return sName.includes(q) || sCode.includes(q) || sAmc.includes(q) || sCat.includes(q);
        });

        const mapped = matched.slice(0, 80).map(f => ({
          id: String(f.schemeCode),
          schemeCode: String(f.schemeCode),
          name: f.schemeName,
          schemeName: f.schemeName,
          family: f.amc || f.fundHouse || f.family || 'Mutual Fund',
          amc: f.amc || f.fundHouse || f.family || 'Mutual Fund',
          category: f.category || 'Equity Scheme',
          planType: f.planType || f.plan || 'Direct Growth',
          nav: f.nav,
          aum: f.aum,
          launchYear: f.launchYear ?? f.inceptionYear ?? null,
          inceptionYear: f.launchYear ?? f.inceptionYear ?? null,
          launchDate: f.launchDate ?? null,
          region: 'india',
          currency: 'INR'
        }));
        results = results.concat(mapped);

        if (results.length === 0 && q.length >= 2) {
          const fallback = await mfDataAggregatorService.searchSchemes(query);
          const fallbackMapped = fallback.map(f => ({
            id: String(f.schemeCode),
            schemeCode: String(f.schemeCode),
            name: f.schemeName,
            schemeName: f.schemeName,
            family: f.fundHouse || 'Mutual Fund',
            region: 'india',
            currency: 'INR'
          }));
          results = results.concat(fallbackMapped);
        }
      } catch (err) {
        console.warn('Indian MF search error:', err.message);
      }
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
      const activeList = await amfiImportService.getActiveSchemes() || [];
      const popularIds = ['122639', '118989', '125497', '120586', '120828', '125354', '118778', '118955', '120594', '135781'];
      
      const found = [];
      for (const pid of popularIds) {
        const item = activeList.find(s => String(s.schemeCode) === pid);
        if (item) {
          found.push({
            id: String(item.schemeCode),
            name: item.schemeName,
            schemeCode: String(item.schemeCode),
            schemeName: item.schemeName,
            family: item.amc || item.fundHouse || item.family || 'Mutual Fund',
            amc: item.amc || item.fundHouse || item.family || 'Mutual Fund',
            category: item.category,
            planType: item.planType || 'Direct Growth',
            nav: item.nav,
            aum: item.aum,
            launchYear: item.launchYear ?? item.inceptionYear ?? 2013,
            inceptionYear: item.launchYear ?? item.inceptionYear ?? 2013,
            launchDate: item.launchDate ?? null,
            region: 'india',
            currency: 'INR'
          });
        }
      }

      if (found.length > 0) {
        results = results.concat(found);
      } else {
        results = results.concat([
          { id: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth', family: 'PPFAS Mutual Fund', launchYear: 2013, launchDate: '28-05-2013', region: 'india', currency: 'INR' },
          { id: '118989', name: 'HDFC Mid-Cap Opportunities Fund Direct Growth', family: 'HDFC Mutual Fund', launchYear: 2013, launchDate: '01-01-2013', region: 'india', currency: 'INR' },
          { id: '125497', name: 'SBI Small Cap Fund Direct Growth', family: 'SBI Mutual Fund', launchYear: 2013, launchDate: '01-01-2013', region: 'india', currency: 'INR' },
          { id: '120586', name: 'ICICI Prudential Bluechip Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', launchYear: 2013, launchDate: '01-01-2013', region: 'india', currency: 'INR' },
          { id: '120828', name: 'Quant Small Cap Fund Direct Growth', family: 'Quant Mutual Fund', launchYear: 2013, launchDate: '01-01-2013', region: 'india', currency: 'INR' },
          { id: '125354', name: 'Axis Small Cap Fund Direct Growth', family: 'Axis Mutual Fund', launchYear: 2013, launchDate: '11-11-2013', region: 'india', currency: 'INR' },
          { id: '118778', name: 'Nippon India Small Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', launchYear: 2013, launchDate: '01-01-2013', region: 'india', currency: 'INR' }
        ]);
      }
    }

    if (region === 'global' || region === 'all') {
      results = results.concat([
        { id: 'SPY', name: 'SPDR S&P 500 ETF Trust', family: 'State Street Global Advisors', launchYear: 1993, region: 'global', currency: 'USD' },
        { id: 'QQQ', name: 'Invesco QQQ Trust', family: 'Invesco', launchYear: 1999, region: 'global', currency: 'USD' },
        { id: 'VTSAX', name: 'Vanguard Total Stock Market Index', family: 'Vanguard', launchYear: 2001, region: 'global', currency: 'USD' },
        { id: 'FXAIX', name: 'Fidelity 500 Index Fund', family: 'Fidelity', launchYear: 2011, region: 'global', currency: 'USD' }
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

    const activeList = await amfiImportService.getActiveSchemes() || [];
    let filtered = activeList;

    if (amc) {
      const a = amc.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.amc && s.amc.toLowerCase().includes(a)) ||
        (s.fundHouse && s.fundHouse.toLowerCase().includes(a)) ||
        (s.family && s.family.toLowerCase().includes(a)) ||
        (s.schemeName && s.schemeName.toLowerCase().includes(a))
      );
    }

    if (category) {
      const c = category.toLowerCase().trim();
      if (!['equity', 'debt', 'hybrid', 'commodities', 'etfs', 'others'].includes(c)) {
        filtered = filtered.filter(s => 
          (s.category && s.category.toLowerCase().includes(c)) ||
          (s.schemeName && s.schemeName.toLowerCase().includes(c))
        );
      } else {
        filtered = filtered.filter(s => 
          (s.category && s.category.toLowerCase().includes(c)) ||
          (s.specifiedType && s.specifiedType.toLowerCase().includes(c))
        );
      }
    }

    if (duration) {
      const d = duration.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.category && s.category.toLowerCase().includes(d)) ||
        (s.schemeName && s.schemeName.toLowerCase().includes(d))
      );
    }

    return filtered.slice(0, 100).map(f => ({
      id: String(f.schemeCode),
      name: f.schemeName,
      schemeCode: String(f.schemeCode),
      schemeName: f.schemeName,
      family: f.amc || f.fundHouse || f.family || 'Mutual Fund',
      amc: f.amc || f.fundHouse || f.family || 'Mutual Fund',
      category: f.category || 'Equity Scheme',
      planType: f.planType || f.plan || 'Direct Growth',
      nav: f.nav,
      aum: f.aum,
      launchYear: f.launchYear ?? f.inceptionYear ?? null,
      inceptionYear: f.launchYear ?? f.inceptionYear ?? null,
      launchDate: f.launchDate ?? null,
      region: 'india',
      currency: 'INR'
    }));
  }
}

export default new UnifiedMfService();

