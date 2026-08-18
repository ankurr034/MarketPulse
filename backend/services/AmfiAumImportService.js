import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * AmfiAumImportService.js
 * Dedicated service for downloading, parsing, normalizing, and matching official AMFI Scheme-Wise AUM disclosures.
 */
class AmfiAumImportService {
  constructor() {
    this.AMFI_AUM_URL = 'https://www.amfiindia.com/spages/SchemeWiseAUM.txt';
    this.aumCache = new Map();
    this.lastImportReport = null;
  }

  /**
   * 1. Download official AMFI scheme-wise AUM disclosure file
   */
  async downloadLatestDisclosure() {
    try {
      console.log('Attempting download of official AMFI AUM disclosure...');
      const res = await axios.get(this.AMFI_AUM_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      return { status: 'downloaded', data: res.data, headers: res.headers, url: this.AMFI_AUM_URL };
    } catch (err) {
      return { status: 'failed', error: err.message, url: this.AMFI_AUM_URL };
    }
  }

  /**
   * 2. Parse raw spreadsheet / text rows
   */
  parseDisclosure(rawData) {
    if (!rawData || typeof rawData !== 'string') return [];
    
    const lines = rawData.split('\n');
    const records = [];

    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;
      
      const isTotalRow = line.toLowerCase().includes('total') || line.toLowerCase().includes('subtotal');
      const parts = line.split(';');

      if (!isTotalRow && parts.length >= 4) {
        records.push({
          rawSchemeName: parts[0],
          rawAum: parseFloat(parts[1]),
          rawUnit: 'Crore'
        });
      }
    });

    return records;
  }

  /**
   * 3. Normalize disclosure record
   */
  normalizeDisclosureRecord(record) {
    if (!record || !record.rawSchemeName) return null;

    const normName = record.rawSchemeName
      .toLowerCase()
      .replace(/direct\s+plan/g, '')
      .replace(/direct/g, '')
      .replace(/growth\s+option/g, '')
      .replace(/growth/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      originalSchemeName: record.rawSchemeName,
      normalizedSchemeName: normName,
      aumCr: record.rawUnit === 'Lakh' ? record.rawAum / 100 : record.rawAum,
      aumOriginalValue: record.rawAum,
      aumOriginalUnit: record.rawUnit,
      aumAsOfDate: '2026-03-31',
      source: 'AMFI Scheme-Wise AUM Disclosure',
      granularity: 'scheme'
    };
  }

  /**
   * 4. 3-Level Deterministic Scheme Matching
   */
  matchScheme(targetScheme, aumRecords) {
    if (!targetScheme) return null;

    const targetCode = String(targetScheme.schemeCode || targetScheme.id || '');
    const targetIsin = targetScheme.isinGrowth || targetScheme.isin;

    // Level 1: Scheme Code match
    let match = aumRecords.find(r => r.schemeCode && String(r.schemeCode) === targetCode);
    if (match) {
      return { record: match, method: 'LEVEL_1_SCHEME_CODE_EXACT', confidence: 1.0 };
    }

    // Level 2: ISIN match
    if (targetIsin) {
      match = aumRecords.find(r => r.isin && r.isin === targetIsin);
      if (match) {
        return { record: match, method: 'LEVEL_2_ISIN_EXACT', confidence: 1.0 };
      }
    }

    // Level 3: Strict Normalized Identity Match (Exact Plan + Exact Option required)
    const targetRaw = (targetScheme.schemeName || targetScheme.name || '').toLowerCase();
    const targetIsDirect = targetRaw.includes('direct');
    const isEtfOrBees = targetRaw.includes('etf') || targetRaw.includes('bees');
    const targetIsGrowth = targetRaw.includes('growth') || isEtfOrBees;

    const targetNormName = targetRaw
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const matches = aumRecords.filter(r => {
      const rRaw = (r.originalSchemeName || r.rawSchemeName || '').toLowerCase();
      const rIsDirect = rRaw.includes('direct');
      const rIsEtf = rRaw.includes('etf') || rRaw.includes('bees');
      const rIsGrowth = rRaw.includes('growth') || rIsEtf;

      // Never mix Direct with Regular, or Growth with IDCW/Dividend
      if (targetIsDirect !== rIsDirect || targetIsGrowth !== rIsGrowth) return false;

      const rNorm = rRaw.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      return rNorm === targetNormName;
    });

    if (matches.length === 1) {
      return { record: matches[0], method: 'LEVEL_3_EXACT_IDENTITY_MATCH', confidence: 0.95 };
    } else if (matches.length > 1) {
      return { record: null, method: 'REJECTED_AMBIGUOUS_MATCH', confidence: 0.0 };
    }

    return null;
  }

  /**
   * 5. Validate AUM Bounds
   */
  validateAum(aumCr) {
    return typeof aumCr === 'number' && !isNaN(aumCr) && aumCr > 0 && aumCr < 500000;
  }

  /**
   * 6. Import Full AUM Dataset
   */
  async importAumDataset(universeSchemes = []) {
    const downloadResult = await this.downloadLatestDisclosure();
    let parsedRecords = [];

    if (downloadResult.status === 'downloaded') {
      parsedRecords = this.parseDisclosure(downloadResult.data);
    }

    let exactSchemeCodeMatches = 0;
    let exactIsinMatches = 0;
    let exactNameMatches = 0;
    let ambiguousMatches = 0;
    let unmatchedCount = 0;
    let validAumCount = 0;

    universeSchemes.forEach(scheme => {
      const matchResult = this.matchScheme(scheme, parsedRecords);
      if (matchResult && matchResult.record && this.validateAum(matchResult.record.aumCr)) {
        validAumCount++;
        if (matchResult.method === 'LEVEL_1_SCHEME_CODE_EXACT') exactSchemeCodeMatches++;
        else if (matchResult.method === 'LEVEL_2_ISIN_EXACT') exactIsinMatches++;
        else if (matchResult.method === 'LEVEL_3_NORMALIZED_IDENTITY_EXACT') exactNameMatches++;
      } else if (matchResult && matchResult.method === 'REJECTED_AMBIGUOUS_MATCH') {
        ambiguousMatches++;
      } else {
        unmatchedCount++;
      }
    });

    const report = {
      downloadStatus: downloadResult.status,
      downloadUrl: downloadResult.url,
      downloadError: downloadResult.error || null,
      universeTotal: universeSchemes.length,
      recordsParsed: parsedRecords.length,
      matched: validAumCount,
      unmatched: unmatchedCount,
      ambiguous: ambiguousMatches,
      validAum: validAumCount,
      coveragePct: universeSchemes.length > 0 ? ((validAumCount / universeSchemes.length) * 100).toFixed(2) : '0.00',
      schemeCodeExact: exactSchemeCodeMatches,
      isinExact: exactIsinMatches,
      nameExact: exactNameMatches
    };

    this.lastImportReport = report;
    return report;
  }
}

export default new AmfiAumImportService();
