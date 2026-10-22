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
    this.AMFI_PORTAL_RSS_BASE = 'https://portal.amfiindia.com/RssNAV.aspx?swise=y&mf=';
    this.aumCache = new Map();
    this.lastImportReport = null;
    this.amcIdMap = {
      'Taurus': 26,
      'NJ': 73,
      'Shriram': 67,
      'Unifi': 79,
      'Capitalmind': 81,
      'Jio BlackRock': 82,
      'JioBlackRock': 82,
      'The Wealth Company': 83,
      'Abakkus': 85,
      'Old Bridge': 78,
      'AlphaGrep': 86,
      'Quantum': 41,
      'Motilal Oswal': 55,
      'Nippon India': 21
    };
  }

  /**
   * 1. Download official AMFI scheme-wise AUM disclosure file or portal feed
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
   * 1b. Download official AMFI Scheme-Wise RSS disclosure for a specific AMC ID
   */
  async downloadAmfiPortalFeed(amcId) {
    try {
      const url = `${this.AMFI_PORTAL_RSS_BASE}${amcId}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 15000
      });
      return { status: 'downloaded', data: res.data, url };
    } catch (err) {
      return { status: 'failed', error: err.message, url: `${this.AMFI_PORTAL_RSS_BASE}${amcId}` };
    }
  }

  /**
   * 1c. Parse AMFI Portal Scheme-Wise RSS feed XML
   */
  parsePortalRssFeed(xmlData) {
    if (!xmlData || typeof xmlData !== 'string') return [];
    const items = xmlData.split('<item>');
    const results = [];

    items.slice(1).forEach(item => {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      if (!title) return;

      const quarterMatch = item.match(/AAUM for the quarter.*?<td[^>]*>(.*?)<\/td>/is);
      const quarter = quarterMatch ? quarterMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      const aumMatch = item.match(/Average AUM\(Rs\.\s*in\s*Lacs\).*?<td[^>]*>(.*?)<\/td>/is);
      const aumLacs = aumMatch ? parseFloat(aumMatch[1].replace(/<[^>]+>/g, '').trim()) : null;

      if (aumLacs !== null && !isNaN(aumLacs) && aumLacs > 0) {
        const aumCr = parseFloat((aumLacs / 100).toFixed(4));
        const isDirect = title.toLowerCase().includes('direct');
        const isGrowth = title.toLowerCase().includes('growth') || !title.toLowerCase().includes('idcw');

        const curDate = new Date();
        const curYr = curDate.getFullYear();
        let dynamicAsOf = null;
        if (quarter) {
          const qLower = quarter.toLowerCase();
          const yrMatch = quarter.match(/\b(20\d\d)\b/);
          const yr = yrMatch ? yrMatch[1] : String(curYr);
          if (qLower.includes('september') || qLower.includes('jul')) dynamicAsOf = `30 Sep ${yr}`;
          else if (qLower.includes('december') || qLower.includes('oct')) dynamicAsOf = `31 Dec ${yr}`;
          else if (qLower.includes('march') || qLower.includes('jan')) dynamicAsOf = `31 Mar ${yr}`;
          else if (qLower.includes('june') || qLower.includes('apr')) dynamicAsOf = `30 Jun ${yr}`;
        }
        if (!dynamicAsOf) {
          const m = curDate.getMonth();
          if (m >= 9) dynamicAsOf = `30 Sep ${curYr}`;
          else if (m >= 6) dynamicAsOf = `30 Jun ${curYr}`;
          else if (m >= 3) dynamicAsOf = `31 Mar ${curYr}`;
          else dynamicAsOf = `31 Dec ${curYr - 1}`;
        }

        results.push({
          rawSchemeName: title,
          quarter,
          reportingPeriod: quarter || dynamicAsOf,
          asOfDate: dynamicAsOf,
          rawAumLacs: aumLacs,
          aumCr,
          isDirect,
          isGrowth,
          source: 'AMFI Scheme-Wise Disclosure'
        });
      }
    });

    return results;
  }

  /**
   * 2. Parse raw spreadsheet / text rows
   */
  parseDisclosure(rawData) {
    if (!rawData || typeof rawData !== 'string') return [];
    
    const lines = rawData.split('\n');
    const records = [];
    let detectedAsOfDate = null;
    let detectedPeriod = null;

    // Scan top lines for disclosure period metadata
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      const asOnMatch = line.match(/as\s+on\s+([0-9]{1,2}[-\/][0-9A-Za-z]{3,}[-\/][0-9]{2,4})/i) ||
                        line.match(/as\s+on\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
      if (asOnMatch) {
        detectedAsOfDate = asOnMatch[1];
      }
      const periodMatch = line.match(/(for\s+the\s+month\s+ended|for\s+the\s+quarter\s+ended)\s+([A-Za-z]+\s+[0-9]{4})/i);
      if (periodMatch) {
        detectedPeriod = periodMatch[2];
      }
    }

    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;
      
      const isTotalRow = line.toLowerCase().includes('total') || line.toLowerCase().includes('subtotal');
      if (isTotalRow) return;

      // Support semicolon, comma, or tab delimiters
      let parts = [];
      if (line.includes(';')) {
        parts = line.split(';').map(p => p.trim());
      } else if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map(p => p.trim());
      }

      if (parts.length >= 2) {
        // Detect scheme code if first column is numeric
        let schemeCode = null;
        let schemeName = null;
        let aumVal = null;
        let aaumVal = null;
        let metric = 'AUM';

        if (/^\d{5,7}$/.test(parts[0])) {
          schemeCode = parts[0];
          schemeName = parts[1];
          aumVal = parseFloat(parts[2]?.replace(/,/g, ''));
          if (parts.length >= 4) {
            aaumVal = parseFloat(parts[3]?.replace(/,/g, ''));
          }
        } else {
          schemeName = parts[0];
          aumVal = parseFloat(parts[1]?.replace(/,/g, ''));
          if (parts.length >= 3 && !isNaN(parseFloat(parts[2]?.replace(/,/g, '')))) {
            aaumVal = parseFloat(parts[2]?.replace(/,/g, ''));
          }
        }

        if (!isNaN(aumVal) && aumVal > 0) {
          records.push({
            schemeCode: schemeCode || null,
            rawSchemeName: schemeName,
            rawAum: aumVal,
            rawAaum: !isNaN(aaumVal) ? aaumVal : null,
            rawUnit: 'Crore',
            aumMetric: metric,
            asOfDate: detectedAsOfDate || '30 Sep 2026',
            reportingPeriod: detectedPeriod || 'September 2026'
          });
        }
      }
    });

    return records;
  }

  /**
   * 3. Normalize disclosure record
   */
  normalizeDisclosureRecord(record, defaultAsOf = '30 Sep 2026') {
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

    const cleanAumCr = record.rawUnit === 'Lakh' ? record.rawAum / 100 : record.rawAum;
    const cleanAaumCr = record.rawAaum ? (record.rawUnit === 'Lakh' ? record.rawAaum / 100 : record.rawAaum) : null;

    return {
      schemeCode: record.schemeCode || null,
      originalSchemeName: record.rawSchemeName,
      normalizedSchemeName: normName,
      aumCr: cleanAumCr,
      aaumCr: cleanAaumCr,
      aumMetric: record.aumMetric || 'AUM',
      aumOriginalValue: record.rawAum,
      aumOriginalUnit: record.rawUnit,
      aumAsOfDate: record.asOfDate || defaultAsOf,
      reportingPeriod: record.reportingPeriod || 'September 2026',
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
      const rawRecords = this.parseDisclosure(downloadResult.data);
      parsedRecords = rawRecords.map(r => this.normalizeDisclosureRecord(r)).filter(Boolean);
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
        else if (matchResult.method === 'LEVEL_3_EXACT_IDENTITY_MATCH' || matchResult.method === 'LEVEL_3_NORMALIZED_IDENTITY_EXACT') exactNameMatches++;
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

  /**
   * 7. Import official AMFI Portal RSS Feeds for specified or all registered AMCs
   */
  async importAmfiPortalAum(amcList = null, universeSchemes = []) {
    const targets = amcList || Object.entries(this.amcIdMap);
    const parsedDisclosures = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of targets) {
      const amcName = Array.isArray(item) ? item[0] : item.name;
      const amcId = Array.isArray(item) ? item[1] : item.id;
      try {
        const download = await this.downloadAmfiPortalFeed(amcId);
        if (download.status === 'downloaded') {
          const records = this.parsePortalRssFeed(download.data);
          records.forEach(r => {
            parsedDisclosures.push({
              ...r,
              amc: amcName,
              sourceUrl: download.url
            });
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    return {
      status: 'completed',
      amcsProcessed: successCount,
      amcsFailed: failCount,
      totalDisclosuresParsed: parsedDisclosures.length,
      disclosures: parsedDisclosures
    };
  }
}

export default new AmfiAumImportService();
