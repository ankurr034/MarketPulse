import sectorBasket from '../config/sectorBasket.js';
import unifiedAssetService from './UnifiedAssetService.js';
import amfiImportService from './AmfiImportService.js';


class IndianMfSectorService {
  constructor() {
    this.schemeCountCache = new Map();
  }

  async _getSchemeCount(sectorName) {
    if (this.schemeCountCache.has(sectorName)) {
      return this.schemeCountCache.get(sectorName);
    }
    try {
      const activeSchemes = await amfiImportService.getActiveSchemes();
      if (activeSchemes && activeSchemes.length > 0) {
        const q = sectorName.toLowerCase();
        const matches = activeSchemes.filter(s => 
          (s.category || '').toLowerCase().includes(q) ||
          (s.schemeName || '').toLowerCase().includes(q)
        );
        const count = matches.length;
        this.schemeCountCache.set(sectorName, count);
        return count;
      }
    } catch (err) {
      console.warn(`Failed to compute dynamic AMFI scheme count for ${sectorName}:`, err.message);
    }
    return null; // Return null if unverified — NEVER fabricate a fallback number!
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

      // Sort funds by AUM descending (largest first); null AUM goes to bottom
      topFunds.sort((a, b) => (Number(b.aum) || 0) - (Number(a.aum) || 0));

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
