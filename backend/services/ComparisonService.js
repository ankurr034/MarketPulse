import unifiedAssetService from './UnifiedAssetService.js';
import sectorIndexService from './SectorIndexService.js';
import { stringifyRange } from '../utils/dateRangeUtils.js';

class ComparisonService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  }

  _getCached(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Generates a cache key based on sorted items and range
   */
  _generateCacheKey(items, range) {
    const itemKeys = items.map(i => `${i.type}:${i.id}:${i.region || ''}`).sort().join('|');
    return `${itemKeys}::${stringifyRange(range)}`;
  }

  async getComparisonData(items, range = '1y') {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { items: [], range };
    }

    const cacheKey = this._generateCacheKey(items, range);
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const promises = items.map(async (item) => {
      try {
        if (item.type === 'sector') {
          const detail = await sectorIndexService.getSectorIndex(item.id, range);
          return {
            type: 'sector',
            id: item.id,
            name: detail.name || item.id,
            series: detail.history || [],
            metrics: {
              currentPrice: detail.currentPrice_or_nav,
              changePercent: detail.oneYearChangePct,
              currency: detail.currency,
              // N/A fields for sector
              expenseRatio: null,
              category: null,
              riskLevel: null,
              amc: null,
              industry: null
            }
          };
        } else if (item.type === 'stock' || item.type === 'mf') {
          const detail = await unifiedAssetService.getAssetDetail(item.type, item.id, item.region || 'india', range);
          
          if (!detail) return null;

          return {
            type: item.type,
            id: item.id,
            name: detail.name || detail.schemeName || item.id,
            series: detail.history || [],
            metrics: {
              currentPrice: detail.currentPrice || detail.nav || (detail.history && detail.history.length > 0 ? detail.history[detail.history.length - 1].value : null),
              changePercent: detail.oneYearChangePct,
              currency: detail.currency || 'INR',
              expenseRatio: detail.expenseRatio || null,
              category: detail.category || detail.sector || null,
              riskLevel: detail.riskLevel || null,
              amc: detail.fundHouse || null,
              industry: detail.industry || null
            }
          };
        }
        return null;
      } catch (err) {
        console.error(`Error fetching comparison data for ${item.type}:${item.id}`, err.message);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);

    const response = {
      items: validResults,
      range
    };

    this._setCache(cacheKey, response);
    return response;
  }
}

export default new ComparisonService();
