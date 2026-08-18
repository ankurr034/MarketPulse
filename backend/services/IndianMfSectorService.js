import sectorBasket from '../config/sectorBasket.js';
import unifiedAssetService from './UnifiedAssetService.js';
import amfiImportService from './AmfiImportService.js';


class IndianMfSectorService {
  constructor() {
    this.schemeCountCache = new Map();
    this.sectorsCache = null;
    this.sectorsCacheTime = 0;
    this.SECTORS_CACHE_TTL = 15 * 60 * 1000; // 15 mins
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
    if (this.sectorsCache && (Date.now() - this.sectorsCacheTime < this.SECTORS_CACHE_TTL)) {
      return this.sectorsCache;
    }

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
              id: String(fund.id),
              schemeCode: String(fund.id),
              name: summary.schemeName || summary.name || fund.name,
              schemeName: summary.schemeName || summary.name || fund.name,
              amc: summary.amc || summary.family || fund.family,
              family: summary.family || summary.amc || fund.family,
              fundHouse: summary.fundHouse || summary.amc || fund.family,
              aum: (summary.aum !== null && summary.aum !== undefined && !isNaN(summary.aum) && Number(summary.aum) > 0) ? Number(summary.aum) : null,
              aumCr: (summary.aum !== null && summary.aum !== undefined && !isNaN(summary.aum) && Number(summary.aum) > 0) ? Number(summary.aum) : null
            };
          } else {
            return {
              id: String(fund.id),
              schemeCode: String(fund.id),
              name: fund.name,
              schemeName: fund.name,
              family: fund.family,
              amc: fund.family,
              fundHouse: fund.family,
              currency: fund.currency,
              currentPrice_or_nav: null,
              oneYearChangePct: null,
              navAvailable: false
            };
          }
        } catch (err) {
          console.error(`Error fetching summary for fund ${fund.id}:`, err.message);
          return {
            id: String(fund.id),
            schemeCode: String(fund.id),
            name: fund.name,
            schemeName: fund.name,
            family: fund.family,
            amc: fund.family,
            fundHouse: fund.family,
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

    const filtered = results.filter(r => r !== null);
    if (filtered.length > 0) {
      this.sectorsCache = filtered;
      this.sectorsCacheTime = Date.now();
    }
    return filtered;
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
