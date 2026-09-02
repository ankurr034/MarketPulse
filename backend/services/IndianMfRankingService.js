// backend/services/IndianMfRankingService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isStrictDirectGrowth, resolveAmcName, resolvePlanAndOption, buildCanonicalIdentity } from '../utils/schemeFilterUtil.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISK_CACHE_PATHS = [
  path.resolve('data/verified_aum_cache.json'),
  path.resolve('backend/data/verified_aum_cache.json'),
  path.resolve(__dirname, '../data/verified_aum_cache.json'),
  path.resolve(__dirname, '../../data/verified_aum_cache.json')
];

/**
 * IndianMfRankingService
 * Canonical service for building the Indian Mutual Fund Universe and
 * computing deterministic, global and local scheme rankings based strictly on:
 *
 *               aumCr DESC (Scheme AUM in Crores INR)
 *
 * Ranking Hierarchy:
 * 1. Global India MF Rank (indiaMfRank): 1..N across ALL valid schemes in India.
 * 2. Category Rank (indiaMfCategoryRank): 1..M within broad category (Equity, Debt, Hybrid, etc.).
 * 3. Subcategory Rank (indiaMfSubcategoryRank): 1..K within exact subcategory (Flexi Cap, Large Cap, Small Cap, etc.).
 * 4. Sector/Theme Rank (indiaMfSectorRank): 1..P within sector (Technology, Healthcare, Financials, etc.).
 *
 * Invariants:
 * - Ranking is strictly AUM DESC — NEVER by returns, NAV, Sharpe, Sortino, Alpha, rating, popularity.
 * - Sequential unique 1-based ranks within each respective scope.
 * - Invalid/missing/zero/negative/non-numeric AUM receives null across all ranking levels.
 * - Global rank is never overwritten by local ranks.
 * - Frontend filters/search/sort/pagination do not recalculate ranks.
 * - Stock ranking and Mutual Fund ranking remain 100% separate.
 */
class IndianMfRankingService {
  constructor() {
    this.verifiedAumMap = new Map(); // schemeCode -> { value, aumCr, source, status, asOf }
    this._loadVerifiedAumCache();
  }

  _loadVerifiedAumCache() {
    for (const p of DISK_CACHE_PATHS) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.disclosures && typeof parsed.disclosures === 'object') {
            for (const [code, item] of Object.entries(parsed.disclosures)) {
              if (item && typeof item.value === 'number' && item.value > 0) {
                const cleanCode = String(code).trim();
                const normAum = this.normalizeAumValue(item.value, item.unit || 'Cr');
                if (normAum !== null && normAum > 0) {
                  this.verifiedAumMap.set(cleanCode, {
                    value: normAum,
                    aumCr: normAum,
                    source: item.source || 'Official Factsheet Disclosure',
                    status: 'PROVIDER_REPORTED',
                    asOf: item.asOf || '30 Jun 2026'
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn(`IndianMfRankingService: Failed reading AUM cache from ${p}:`, e.message);
      }
    }
  }

  /**
   * Normalize AUM into numeric aumCr (Crores INR).
   * Handles string inputs, numbers, Lakhs, Crores, etc.
   * Returns null for invalid, non-positive, NaN, or non-numeric values.
   */
  normalizeAumValue(rawAum, unit = 'Cr') {
    if (rawAum === null || rawAum === undefined) return null;
    let num = null;
    if (typeof rawAum === 'number') {
      num = rawAum;
    } else if (typeof rawAum === 'string') {
      const cleanStr = rawAum.replace(/[^0-9.-]/g, '').trim();
      if (!cleanStr) return null;
      num = parseFloat(cleanStr);
    }
    if (num === null || isNaN(num) || !isFinite(num) || num <= 0) {
      return null;
    }

    const normUnit = String(unit || '').toLowerCase();
    if (normUnit.includes('lakh')) {
      num = num / 100;
    } else if (normUnit.includes('thousand')) {
      num = num / 100000;
    }

    return parseFloat(num.toFixed(4));
  }

  /**
   * Normalizes raw category strings into distinct broad Category and specific Subcategory.
   * e.g. "Equity Scheme - Flexi Cap Fund" -> { category: "Equity", subcategory: "Flexi Cap" }
   * e.g. "Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage" -> { category: "Hybrid", subcategory: "Dynamic Asset Allocation or Balanced Advantage" }
   */
  normalizeCategoryAndSubcategory(rawCategory) {
    if (!rawCategory || typeof rawCategory !== 'string') {
      return { category: 'Other', subcategory: 'Other' };
    }

    let str = rawCategory.trim();
    let category = 'Other';
    let subcategory = str;

    if (str.includes(' - ')) {
      const parts = str.split(' - ');
      category = parts[0].replace(/Schemes?$/i, '').trim();
      subcategory = parts.slice(1).join(' - ').replace(/Fund$/i, '').replace(/Option$/i, '').trim();
    } else if (str.includes(':')) {
      const parts = str.split(':');
      category = parts[0].replace(/Schemes?$/i, '').trim();
      subcategory = parts.slice(1).join(':').replace(/Fund$/i, '').replace(/Option$/i, '').trim();
    } else {
      if (/^(Equity|Debt|Hybrid|Solution Oriented|Other)/i.test(str)) {
        category = str.match(/^(Equity|Debt|Hybrid|Solution Oriented|Other)/i)[0];
        subcategory = str.replace(category, '').replace(/^[\s-:]+/, '').trim() || category;
      } else {
        subcategory = str.replace(/Fund$/i, '').trim();
      }
    }

    category = category.replace(/Schemes?$/i, '').trim();
    if (!category) category = 'Other';

    return { category, subcategory };
  }

  /**
   * Helper to resolve clean AUM for a scheme record.
   */
  resolveSchemeAum(scheme) {
    if (!scheme) return { aumCr: null, provenance: null };
    const code = String(scheme.schemeCode || scheme.id || '').trim();

    // 1. Check verified disk disclosure cache
    if (code && this.verifiedAumMap.has(code)) {
      const prov = this.verifiedAumMap.get(code);
      return {
        aumCr: prov.aumCr,
        provenance: prov
      };
    }

    // 2. Check scheme object direct AUM properties
    const directAum = this.normalizeAumValue(scheme.aumCr ?? scheme.aum);
    if (directAum !== null && directAum > 0) {
      return {
        aumCr: directAum,
        provenance: scheme.aumProvenance || {
          value: directAum,
          aumCr: directAum,
          source: scheme.aumSource || 'AMFI Scheme-Wise Disclosure',
          status: 'PROVIDER_REPORTED',
          asOf: scheme.aumAsOf || scheme.aumAsOfDate || '30 Jun 2026'
        }
      };
    }

    return {
      aumCr: null,
      provenance: {
        value: null,
        aumCr: null,
        source: null,
        status: 'UNAVAILABLE',
        asOf: null
      }
    };
  }

  /**
   * Canonical ranking function for Indian Mutual Funds.
   * Computes Global, Category, Subcategory, and Sector AUM ranks simultaneously.
   *
   * @param {Array<Object>} schemes - Array of mutual fund scheme objects
   * @returns {Array<Object>} Ranked array of scheme objects
   */
  rankMutualFundsByAUM(schemes = []) {
    if (!Array.isArray(schemes) || schemes.length === 0) return [];

    // 1. Deduplicate by canonical scheme identity (schemeCode or isin)
    const schemeMap = new Map();

    schemes.forEach(s => {
      if (!s) return;
      const code = String(s.schemeCode || s.id || '').trim();
      const isin = s.isinGrowth || s.isin || '';
      const resolvedAmc = s.amc || s.fundHouse || s.family || resolveAmcName(s.schemeName || s.name || '');
      const { plan, option } = resolvePlanAndOption(s.schemeName || s.name || '');

      const dedupeKey = code ? `CODE_${code}` : (isin ? `ISIN_${isin}` : `${resolvedAmc}_${s.schemeName || s.name}`);
      const canonicalKey = s.canonicalKey || `${code || 'NOCODE'}_${isin || 'NOISIN'}_${resolvedAmc.replace(/\s+/g, '')}_${plan}_${option}`;

      if (!schemeMap.has(dedupeKey)) {
        const { aumCr, provenance } = this.resolveSchemeAum(s);
        const { category: normCat, subcategory: normSubcat } = this.normalizeCategoryAndSubcategory(s.category || s.subType || s.type);

        schemeMap.set(dedupeKey, {
          ...s,
          id: code || s.id,
          schemeCode: code || s.schemeCode,
          name: s.schemeName || s.name,
          schemeName: s.schemeName || s.name,
          amc: resolvedAmc,
          fundHouse: resolvedAmc,
          family: resolvedAmc,
          plan,
          planType: plan,
          option,
          isin: isin || null,
          isinGrowth: isin || null,
          canonicalKey,
          category: s.category || normCat,
          normalizedCategory: normCat,
          subcategory: s.subcategory || normSubcat,
          normalizedSubcategory: normSubcat,
          sectorId: s.sectorId || s.sector || null,
          sectorName: s.sectorName || s.sector || null,
          aum: aumCr,
          aumCr,
          aumProvenance: provenance,
          aumAsOfDate: provenance?.asOf || s.aumAsOfDate || null
        });
      }
    });

    const uniqueSchemes = Array.from(schemeMap.values());

    // 2. Separate valid AUM records (>0) from invalid AUM records
    const validSchemes = uniqueSchemes.filter(s => typeof s.aumCr === 'number' && !isNaN(s.aumCr) && s.aumCr > 0);
    const invalidSchemes = uniqueSchemes.filter(s => s.aumCr === null || isNaN(s.aumCr) || s.aumCr <= 0);

    // ─────────────────────────────────────────────────────────────
    // A. GLOBAL RANK: indiaMfRank (1..N across ALL valid schemes)
    // ─────────────────────────────────────────────────────────────
    validSchemes.sort((a, b) => {
      if (b.aumCr !== a.aumCr) return b.aumCr - a.aumCr;
      const nameComp = String(a.schemeName || a.name || '').localeCompare(String(b.schemeName || b.name || ''));
      if (nameComp !== 0) return nameComp;
      return String(a.schemeCode || '').localeCompare(String(b.schemeCode || ''));
    });

    validSchemes.forEach((scheme, idx) => {
      const rank = idx + 1;
      scheme.indiaMfRank = rank;
      scheme.globalMfRank = rank;
      scheme.rank = rank;
      scheme.overallRank = rank;
    });

    // ─────────────────────────────────────────────────────────────
    // B. CATEGORY RANK: indiaMfCategoryRank (Starts at #1 in each broad category)
    // ─────────────────────────────────────────────────────────────
    const categoryGroups = new Map();
    validSchemes.forEach(s => {
      const catKey = (s.normalizedCategory || 'Other').toLowerCase();
      if (!categoryGroups.has(catKey)) categoryGroups.set(catKey, []);
      categoryGroups.get(catKey).push(s);
    });

    categoryGroups.forEach(group => {
      group.sort((a, b) => {
        if (b.aumCr !== a.aumCr) return b.aumCr - a.aumCr;
        const nameComp = String(a.schemeName || a.name || '').localeCompare(String(b.schemeName || b.name || ''));
        if (nameComp !== 0) return nameComp;
        return String(a.schemeCode || '').localeCompare(String(b.schemeCode || ''));
      });
      group.forEach((scheme, idx) => {
        scheme.indiaMfCategoryRank = idx + 1;
      });
    });

    // ─────────────────────────────────────────────────────────────
    // C. SUBCATEGORY RANK: indiaMfSubcategoryRank (Starts at #1 in each subcategory)
    // ─────────────────────────────────────────────────────────────
    const subcategoryGroups = new Map();
    validSchemes.forEach(s => {
      const subKey = (s.normalizedSubcategory || s.category || 'Other').toLowerCase();
      if (!subcategoryGroups.has(subKey)) subcategoryGroups.set(subKey, []);
      subcategoryGroups.get(subKey).push(s);
    });

    subcategoryGroups.forEach(group => {
      group.sort((a, b) => {
        if (b.aumCr !== a.aumCr) return b.aumCr - a.aumCr;
        const nameComp = String(a.schemeName || a.name || '').localeCompare(String(b.schemeName || b.name || ''));
        if (nameComp !== 0) return nameComp;
        return String(a.schemeCode || '').localeCompare(String(b.schemeCode || ''));
      });
      group.forEach((scheme, idx) => {
        scheme.indiaMfSubcategoryRank = idx + 1;
      });
    });

    // ─────────────────────────────────────────────────────────────
    // D. SECTOR / THEME RANK: indiaMfSectorRank (Starts at #1 in each sector)
    // ─────────────────────────────────────────────────────────────
    const sectorGroups = new Map();
    validSchemes.forEach(s => {
      const secKey = s.sectorId || s.sectorName ? String(s.sectorId || s.sectorName).toLowerCase() : null;
      if (secKey) {
        if (!sectorGroups.has(secKey)) sectorGroups.set(secKey, []);
        sectorGroups.get(secKey).push(s);
      } else {
        s.indiaMfSectorRank = null;
      }
    });

    sectorGroups.forEach(group => {
      group.sort((a, b) => {
        if (b.aumCr !== a.aumCr) return b.aumCr - a.aumCr;
        const nameComp = String(a.schemeName || a.name || '').localeCompare(String(b.schemeName || b.name || ''));
        if (nameComp !== 0) return nameComp;
        return String(a.schemeCode || '').localeCompare(String(b.schemeCode || ''));
      });
      group.forEach((scheme, idx) => {
        scheme.indiaMfSectorRank = idx + 1;
      });
    });

    // Invalid AUM records receive null for ALL rank fields
    invalidSchemes.forEach(scheme => {
      scheme.indiaMfRank = null;
      scheme.globalMfRank = null;
      scheme.rank = null;
      scheme.overallRank = null;
      scheme.indiaMfCategoryRank = null;
      scheme.indiaMfSubcategoryRank = null;
      scheme.indiaMfSectorRank = null;
    });

    return [...validSchemes, ...invalidSchemes];
  }

  /**
   * Computes a global ranking map (schemeCode / isin / canonicalKey -> rankObj).
   */
  computeGlobalMfRankings(schemes = []) {
    const ranked = this.rankMutualFundsByAUM(schemes);
    const rankMap = new Map();

    ranked.forEach(s => {
      const rankObj = {
        indiaMfRank: s.indiaMfRank ?? null,
        indiaMfCategoryRank: s.indiaMfCategoryRank ?? null,
        indiaMfSubcategoryRank: s.indiaMfSubcategoryRank ?? null,
        indiaMfSectorRank: s.indiaMfSectorRank ?? null
      };
      const rank = s.indiaMfRank ?? null;
      if (s.schemeCode) {
        rankMap.set(String(s.schemeCode).trim(), rank);
        rankMap.set(`OBJ_${String(s.schemeCode).trim()}`, rankObj);
      }
      if (s.id) {
        rankMap.set(String(s.id).trim(), rank);
        rankMap.set(`OBJ_${String(s.id).trim()}`, rankObj);
      }
      if (s.isin) {
        rankMap.set(String(s.isin).trim(), rank);
        rankMap.set(`OBJ_${String(s.isin).trim()}`, rankObj);
      }
      if (s.canonicalKey) {
        rankMap.set(s.canonicalKey, rank);
        rankMap.set(`OBJ_${s.canonicalKey}`, rankObj);
      }
    });

    return rankMap;
  }
}

const indianMfRankingService = new IndianMfRankingService();
export default indianMfRankingService;
