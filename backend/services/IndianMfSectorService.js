import sectorBasket from '../config/sectorBasket.js';
import unifiedAssetService from './UnifiedAssetService.js';
import axios from 'axios';

const STATIC_COUNTS = {
  'Technology': 68,
  'Financials': 45,
  'Healthcare': 38,
  'Infrastructure': 82,
  'Energy': 28,
  'Consumption': 46
};

class IndianMfSectorService {
  constructor() {
    this.schemeCountCache = new Map();
  }

  async _getSchemeCount(sectorName) {
    if (STATIC_COUNTS[sectorName]) {
      return STATIC_COUNTS[sectorName];
    }
    if (this.schemeCountCache.has(sectorName)) {
      return this.schemeCountCache.get(sectorName);
    }
    try {
      const res = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(sectorName)}`, { timeout: 3000 });
      const count = (res.data || []).length;
      const finalCount = count > 0 ? count : 40;
      this.schemeCountCache.set(sectorName, finalCount);
      return finalCount;
    } catch (err) {
      console.warn(`Failed to fetch scheme count for ${sectorName}:`, err.message);
      return 25;
    }
  }

  async getAllSectorsWithFunds() {
    // Only process the original 6 sectors for now as per constraints
    const sectorsToProcess = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'Consumption'];

    const results = await Promise.all(sectorsToProcess.map(async (sectorName) => {
      const data = sectorBasket[sectorName];
      if (!data) return null;

      const indiaFunds = data.funds.filter(f => f.region === 'india');

      const topFunds = await Promise.all(indiaFunds.map(async (fund) => {
        try {
          const summary = await unifiedAssetService.getAssetSummary('mf', fund.id, 'india');
          if (summary) {
            return {
              ...summary,
              family: fund.family // preserve family from basket
            };
          } else {
            return {
              id: fund.id,
              name: fund.name,
              family: fund.family,
              currency: fund.currency,
              currentPrice_or_nav: null,
              oneYearChangePct: null,
              navAvailable: false
            };
          }
        } catch (err) {
          console.error(`Error fetching summary for fund ${fund.id}:`, err.message);
          return {
            id: fund.id,
            name: fund.name,
            family: fund.family,
            currency: fund.currency,
            currentPrice_or_nav: null,
            oneYearChangePct: null,
            navAvailable: false
          };
        }
      }));

      const totalSchemeCount = await this._getSchemeCount(sectorName);

      return {
        sectorId: sectorName.toLowerCase(),
        sectorName,
        description: data.description,
        topFunds,
        totalSchemeCount,
        topN: topFunds.length
      };
    }));

    return results.filter(r => r !== null);
  }

  async getAllFundsFlat() {
    const sectors = await this.getAllSectorsWithFunds();
    let flatFunds = [];
    
    for (const sector of sectors) {
      for (const fund of sector.topFunds) {
        flatFunds.push({
          ...fund,
          sectorName: sector.sectorName,
          sectorId: sector.sectorId
        });
      }
    }
    
    return flatFunds;
  }
}

export default new IndianMfSectorService();
