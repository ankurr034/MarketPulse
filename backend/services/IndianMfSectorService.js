// backend/services/IndianMfSectorService.js
import sectorBasket from '../config/sectorBasket.js';
import unifiedAssetService from './UnifiedAssetService.js';
import amfiImportService from './AmfiImportService.js';
import indianMfRankingService from './IndianMfRankingService.js';

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

    const activeSchemes = await amfiImportService.getActiveSchemes() || [];
    const globalRankMap = indianMfRankingService.computeGlobalMfRankings(activeSchemes);

    // Only process the original 6 sectors for now as per constraints
    const sectorsToProcess = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'Consumption'];

    const results = await Promise.all(sectorsToProcess.map(async (sectorName) => {
      const data = sectorBasket[sectorName];
      if (!data) return null;

      const indiaFunds = data.funds.filter(f => f.region === 'india');

      const topFunds = await Promise.all(indiaFunds.map(async (fund) => {
        const codeStr = String(fund.id).trim();
        const globalRank = globalRankMap.get(codeStr) ?? null;
        const rankObj = globalRankMap.get(`OBJ_${codeStr}`) || {};

        try {
          const summary = await unifiedAssetService.getAssetSummary('mf', fund.id, 'india');
          if (summary) {
            const cleanAum = (summary.aum !== null && summary.aum !== undefined && !isNaN(summary.aum) && Number(summary.aum) > 0)
              ? Number(summary.aum)
              : null;
            return {
              ...summary,
              id: codeStr,
              schemeCode: codeStr,
              name: summary.schemeName || summary.name || fund.name,
              schemeName: summary.schemeName || summary.name || fund.name,
              amc: summary.amc || summary.family || fund.family,
              family: summary.family || summary.amc || fund.family,
              fundHouse: summary.fundHouse || summary.amc || fund.family,
              aum: cleanAum,
              aumCr: cleanAum,
              indiaMfRank: globalRank,
              globalMfRank: globalRank,
              rank: globalRank,
              overallRank: globalRank,
              indiaMfCategoryRank: rankObj.indiaMfCategoryRank ?? summary.indiaMfCategoryRank ?? null,
              indiaMfSubcategoryRank: rankObj.indiaMfSubcategoryRank ?? summary.indiaMfSubcategoryRank ?? null,
              indiaMfSectorRank: rankObj.indiaMfSectorRank ?? null
            };
          } else {
            return {
              id: codeStr,
              schemeCode: codeStr,
              name: fund.name,
              schemeName: fund.name,
              family: fund.family,
              amc: fund.family,
              fundHouse: fund.family,
              currency: fund.currency,
              currentPrice_or_nav: null,
              oneYearChangePct: null,
              navAvailable: false,
              indiaMfRank: globalRank,
              globalMfRank: globalRank,
              rank: globalRank,
              overallRank: globalRank,
              indiaMfCategoryRank: rankObj.indiaMfCategoryRank ?? null,
              indiaMfSubcategoryRank: rankObj.indiaMfSubcategoryRank ?? null,
              indiaMfSectorRank: rankObj.indiaMfSectorRank ?? null
            };
          }
        } catch (err) {
          console.error(`Error fetching summary for fund ${fund.id}:`, err.message);
          return {
            id: codeStr,
            schemeCode: codeStr,
            name: fund.name,
            schemeName: fund.name,
            family: fund.family,
            amc: fund.family,
            fundHouse: fund.family,
            currency: fund.currency,
            currentPrice_or_nav: null,
            oneYearChangePct: null,
            navAvailable: false,
            indiaMfRank: globalRank,
            globalMfRank: globalRank,
            rank: globalRank,
            overallRank: globalRank,
            indiaMfCategoryRank: rankObj.indiaMfCategoryRank ?? null,
            indiaMfSubcategoryRank: rankObj.indiaMfSubcategoryRank ?? null,
            indiaMfSectorRank: rankObj.indiaMfSectorRank ?? null
          };
        }
      }));

      const totalSchemeCount = await this._getSchemeCount(sectorName);

      // Sort funds by AUM descending (largest first); null AUM goes to bottom
      topFunds.sort((a, b) => (Number(b.aumCr || b.aum) || 0) - (Number(a.aumCr || a.aum) || 0));

      // Assign sequential local sector rank 1..M for valid AUM funds
      let sectorRankCounter = 1;
      topFunds.forEach(fund => {
        const hasAum = (fund.aumCr != null && fund.aumCr > 0) || (fund.aum != null && fund.aum > 0);
        if (hasAum) {
          fund.indiaMfSectorRank = sectorRankCounter++;
        } else {
          fund.indiaMfSectorRank = null;
        }
      });

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
}

export default new IndianMfSectorService();
