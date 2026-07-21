import axios from 'axios';
import RiskAnalyticsService from './RiskAnalyticsService.js';

class AllFundsDirectoryService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    this.schemeNavCache = new Map();
  }

  async _getFullSchemeList() {
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      // 1. Fetch AMFI active funds list to filter out dead/closed funds and extract category
      let activeSchemeCodes = new Set();
      let schemeCategoryMap = new Map();

      const normalizeCategory = (amfiCat) => {
        const lower = amfiCat.toLowerCase();
        
        // Commodities & ETFs (Check FIRST)
        if (lower.includes('gold etf')) return 'Gold ETF';
        if (lower.includes('silver etf')) return 'Silver ETF';
        if (lower.includes('gold') || lower.includes('silver') || lower.includes('commodity') || lower.includes('commodities') || lower.includes('precious metal')) return 'Commodities & Gold';
        if (lower.includes('exchange traded') || lower.includes('etf')) return 'ETFs & Index Funds';
        if (lower.includes('index')) return 'Index Funds';

        if (lower.includes('arbitrage')) return 'Arbitrage Fund';
        if (lower.includes('elss')) return 'ELSS (Tax Savings)';
        if (lower.includes('flexi cap')) return 'Flexi Cap';
        if (lower.includes('focused')) return 'Focused Fund';
        if (lower.includes('large & mid')) return 'Large & Mid-Cap';
        if (lower.includes('large cap')) return 'Large-Cap';
        if (lower.includes('mid cap')) return 'Mid-Cap';
        if (lower.includes('small cap')) return 'Small-Cap';
        if (lower.includes('multi cap')) return 'Multi-Cap';
        if (lower.includes('value')) return 'Value';
        if (lower.includes('contra')) return 'Contra';
        if (lower.includes('dividend yield')) return 'Dividend Yield';
        if (lower.includes('sectoral') || lower.includes('thematic')) return 'Sector / Thematic';
        
        // Debt
        if (lower.includes('banking and psu') || lower.includes('banking & psu')) return 'Banking & PSU';
        if (lower.includes('corporate bond')) return 'Corporate Bond';
        if (lower.includes('credit risk')) return 'Credit Risk';
        if (lower.includes('dynamic bond')) return 'Dynamic Bond';
        if (lower.includes('floater') || lower.includes('floating')) return 'Floating Rate';
        if (lower.includes('gilt') || lower.includes('government bond')) return 'Government Bond';
        if (lower.includes('liquid')) return 'Liquid';
        if (lower.includes('long duration')) return 'Long Duration';
        if (lower.includes('low duration')) return 'Low Duration';
        if (lower.includes('medium to long')) return 'Medium to Long Duration';
        if (lower.includes('medium duration')) return 'Medium Duration';
        if (lower.includes('money market')) return 'Money Market';
        if (lower.includes('overnight')) return 'Overnight';
        if (lower.includes('short duration') || lower.includes('short term')) return 'Short Duration';
        if (lower.includes('ultra short')) return 'Ultra Short Duration';
        
        // Hybrid & Others
        if (lower.includes('aggressive hybrid')) return 'Aggressive Allocation';
        if (lower.includes('conservative hybrid')) return 'Conservative Allocation';
        if (lower.includes('dynamic asset') || lower.includes('balanced advantage')) return 'Dynamic Asset Allocation';
        if (lower.includes('equity savings')) return 'Equity Savings';
        if (lower.includes('multi asset')) return 'Multi Asset Allocation';
        if (lower.includes('children')) return 'Children';
        if (lower.includes('retirement')) return 'Retirement';
        if (lower.includes('fof') || lower.includes('fund of funds')) return 'Fund of Funds';
        
        return 'Other';
      };

      try {
        const amfiRes = await axios.get('https://portal.amfiindia.com/spages/NAVAll.txt', { timeout: 10000 });
        const lines = amfiRes.data.split('\n');
        let currentCategory = 'Other';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed.includes('Open Ended Schemes') || trimmed.includes('Close Ended Schemes')) {
            const match = trimmed.match(/\((.*?)\)/);
            if (match && match[1]) {
              currentCategory = normalizeCategory(match[1].trim());
            } else {
              currentCategory = normalizeCategory(trimmed);
            }
            continue;
          }

          if (trimmed.includes(';')) {
            const parts = trimmed.split(';');
            if (parts.length >= 6 && !isNaN(parseInt(parts[0], 10))) {
              const code = String(parts[0]).trim();
              activeSchemeCodes.add(code);
              schemeCategoryMap.set(code, currentCategory);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch AMFI active list, defaulting to allowing all:', err.message);
      }

      // 2. Fetch full list from mfapi.in
      const res = await axios.get('https://api.mfapi.in/mf');
      let rawList = res.data || [];
      
      // 3. Filter out non-direct, non-growth, forbidden plan types, and closed funds
      rawList = rawList.filter(s => {
        if (!s.schemeName || !s.schemeCode) return false;
        
        // Strict Active Check
        if (activeSchemeCodes.size > 0 && !activeSchemeCodes.has(String(s.schemeCode))) {
          return false; // Fund is not in the active AMFI list
        }

        const lower = s.schemeName.toLowerCase();
        const isEtfOrCommodity = lower.includes('etf') || lower.includes('bees') || lower.includes('gold') || lower.includes('silver') || lower.includes('commodity');

        if (!isEtfOrCommodity) {
          // Keep ONLY Growth and Direct options for regular mutual funds
          const isDirect = lower.includes('direct') || lower.includes('-dir') || lower.includes('(dir)') || lower.includes(' dir ');
          const isGrowth = lower.includes('growth') || lower.includes('-gr') || lower.includes('(gr)') || lower.includes(' gr ');
          if (!isDirect || !isGrowth) return false;

          // Avoid IDCW, Dividend, Payout, Reinvestment, Bonus, Regular (as substrings)
          const broadForbidden = /(idcw|dividend|payout|reinvest|bonus|regular)/i;
          if (broadForbidden.test(lower)) return false;

          // Avoid reg, div (as word boundaries to not filter out segregated or diversified)
          const boundaryForbidden = /\b(reg|div)\b/i;
          if (boundaryForbidden.test(lower)) return false;
        }

        return true;
      });

      this.cache = rawList.map(s => {
        return {
          ...s,
          category: schemeCategoryMap.get(String(s.schemeCode)) || 'Other'
        };
      });

      this.cacheTimestamp = Date.now();
      return this.cache;
    } catch (err) {
      console.error('Failed to fetch full scheme directory from mfapi.in:', err.message);
      return this.cache || [];
    }
  }

  async _getNavAndChange(schemeCode) {
    const cacheKey = `nav_summary_${schemeCode}`;
    if (this.schemeNavCache.has(cacheKey)) {
      const cached = this.schemeNavCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 15 * 60 * 1000) {
        return cached.data;
      }
    }

    try {
      const res = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, { timeout: 10000 });
      if (res.data && res.data.data && res.data.data.length > 0) {
        const navArray = res.data.data;
        const latestNav = parseFloat(navArray[0].nav);
        const firstNav = parseFloat(navArray[Math.min(navArray.length - 1, 250)].nav);
        
        let changePct = 0;
        if (firstNav > 0) {
          changePct = parseFloat((((latestNav - firstNav) / firstNav) * 100).toFixed(2));
        }

        const latestDateStr = navArray[0].date;
        const dp = latestDateStr.split('-');
        const latestDate = new Date(`${dp[2]}-${dp[1]}-${dp[0]}T00:00:00Z`);
        const isClosed = (Date.now() - latestDate.getTime()) > (90 * 24 * 60 * 60 * 1000);

        // Calculate Risk Metrics for 1 year
        let sharpeRatio = 0;
        let sortinoRatio = 0;
        try {
          const recentNavs = navArray.slice(0, 252).reverse().map(item => ({
            value: parseFloat(item.nav)
          }));
          if (recentNavs.length > 10) {
            const riskMetrics = RiskAnalyticsService.getRiskMetrics(recentNavs);
            sharpeRatio = riskMetrics.sharpeRatio || 0;
            sortinoRatio = riskMetrics.sortinoRatio || 0;
          }
        } catch (e) {
          console.warn(`Failed to calc risk metrics for ${schemeCode}:`, e.message);
        }

        const data = {
          currentPrice_or_nav: latestNav,
          oneYearChangePct: changePct,
          navAvailable: true,
          isClosed: isClosed,
          sharpeRatio,
          sortinoRatio
        };
        this.schemeNavCache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      }
    } catch (e) {
      console.warn(`Failed quick NAV fetch for scheme ${schemeCode}: ${e.message}`);
    }

    return {
      currentPrice_or_nav: null,
      oneYearChangePct: null,
      navAvailable: false,
      sharpeRatio: 0,
      sortinoRatio: 0
    };
  }

  async getAllSchemes(page = 1, pageSize = 20, filters = {}) {
    const allSchemes = await this._getFullSchemeList();
    
    let filtered = allSchemes;

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        (s.schemeName && s.schemeName.toLowerCase().includes(term)) ||
        (s.schemeCode && String(s.schemeCode).includes(term))
      );
    }
    
    if (filters.amc) {
      const amc = filters.amc.toLowerCase();
      filtered = filtered.filter(s => s.schemeName && s.schemeName.toLowerCase().includes(amc));
    }
    
    if (filters.category) {
      const cat = filters.category.toLowerCase();
      filtered = filtered.filter(s => s.category && s.category.toLowerCase() === cat);
    }

    const totalCount = filtered.length;
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const slice = filtered.slice(startIndex, endIndex);

    // Fetch NAV and returns in small parallel batches with slight delay to prevent rate limits
    const chunkSize = 4;
    const schemes = [];
    for (let i = 0; i < slice.length; i += chunkSize) {
      const chunk = slice.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(async s => {
        const navData = await this._getNavAndChange(s.schemeCode);
        return {
          id: String(s.schemeCode),
          name: s.schemeName,
          type: 'mf',
          currency: 'INR',
          region: 'india',
          family: s.schemeName.split(' ')[0], 
          ...navData
        };
      }));
      schemes.push(...results);
      if (i + chunkSize < slice.length) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    return {
      schemes,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  }
}

export default new AllFundsDirectoryService();
