import axios from 'axios';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpAgent = new http.Agent({ insecureHTTPParser: true });
const httpsAgent = new https.Agent({ insecureHTTPParser: true });

const withTimeout = (promise, ms = 10000, fallback = null) => 
  Promise.race([promise, new Promise(r => setTimeout(() => r(fallback), ms))]);

class BseFinancialDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 4 * 60 * 60 * 1000; // 4 hours
    this.bseMapping = {};
    
    this.loadMapping();
  }

  loadMapping() {
    try {
      const mappingPath = path.resolve(__dirname, '../data/bse_scrip_mapping.json');
      if (fs.existsSync(mappingPath)) {
        const data = fs.readFileSync(mappingPath, 'utf8');
        this.bseMapping = JSON.parse(data);
        const count = Object.keys(this.bseMapping).length;
        console.log(`⚡ BseFinancialDataService: Loaded ${count} BSE scrip mappings`);
      } else {
        console.warn(`⚠️ BseFinancialDataService: Mapping file not found at ${mappingPath}`);
      }
    } catch (error) {
      console.error('❌ BseFinancialDataService: Failed to load BSE scrip mapping', error);
    }
  }

  getScripInfo(bareSymbol) {
    if (!bareSymbol) return null;
    const cleanSym = bareSymbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
    return this.bseMapping[cleanSym] || null;
  }

  // Parse date string like 'Jun-26' to '2026-06-30'
  parseQuarterToPeriodEnd(quarterStr) {
    if (!quarterStr || quarterStr === '-/-') return null;
    
    const parts = quarterStr.split('-');
    if (parts.length !== 2) return null;
    
    const month = parts[0].toLowerCase();
    const yearStr = parts[1];
    let year = parseInt(yearStr, 10);
    if (isNaN(year)) return null;
    
    if (year < 100) year += 2000;

    const endDates = {
      'mar': '-03-31',
      'jun': '-06-30',
      'sep': '-09-30',
      'dec': '-12-31'
    };

    if (endDates[month]) {
      return `${year}${endDates[month]}`;
    }
    
    return null;
  }

  async fetchBseData(bseCode, flag) {
    const url = `https://api.bseindia.com/BseIndiaAPI/api/FinancialResult/w?scripcode=${bseCode}&flag=${flag}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.bseindia.com/'
    };

    try {
      const response = await withTimeout(axios.get(url, { headers, httpAgent, httpsAgent }), 10000, null);
      if (response && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error(`BseFinancialDataService: Error fetching data for ${bseCode} flag=${flag}`, error.message);
    }
    return null;
  }

  parseHtmlTable(html, basisKey, existingQuartersMap = new Map()) {
    if (!html) return existingQuartersMap;
    
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

    let matchRow;
    let isHeader = true;

    while ((matchRow = rowRegex.exec(html)) !== null) {
      const rowContent = matchRow[1];
      let matchCell;
      const cells = [];
      
      while ((matchCell = cellRegex.exec(rowContent)) !== null) {
        const text = matchCell[1].replace(/<[^>]+>/g, '').trim();
        cells.push(text);
      }

      if (isHeader) {
        isHeader = false;
        continue;
      }

      if (cells.length >= 5) {
        const fiscalYear = cells[0];
        
        for (let i = 1; i <= 4; i++) {
          const quarterText = cells[i]; 
          
          if (quarterText && quarterText !== '-/-') {
            const periodEnd = this.parseQuarterToPeriodEnd(quarterText);
            if (periodEnd) {
              const quarterId = `Q${i}`;
              const key = `${fiscalYear}_${quarterId}`;
              
              if (!existingQuartersMap.has(key)) {
                existingQuartersMap.set(key, {
                  fiscalYear,
                  quarter: quarterId,
                  periodEnd,
                  hasConsolidated: false,
                  hasStandalone: false
                });
              }
              
              const quarterObj = existingQuartersMap.get(key);
              if (basisKey === 'consolidated') {
                quarterObj.hasConsolidated = true;
              } else if (basisKey === 'standalone') {
                quarterObj.hasStandalone = true;
              }
            }
          }
        }
      }
    }

    return existingQuartersMap;
  }

  async getFilingMetadata(nseSymbol) {
    if (!this.bseMapping[nseSymbol]) {
      return null;
    }

    const mapping = this.bseMapping[nseSymbol];
    const bseCode = typeof mapping === 'object' ? mapping.bseCode : mapping;
    const companyName = typeof mapping === 'object' && mapping.companyName ? mapping.companyName : nseSymbol;

    const cacheKey = `bse_filing_${bseCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.data;
    }

    const consData = await this.fetchBseData(bseCode, 1);
    const stdData = await this.fetchBseData(bseCode, 0);

    const quartersMap = new Map();
    
    if (consData && consData.Data) {
      this.parseHtmlTable(consData.Data, 'consolidated', quartersMap);
    }
    
    if (stdData && stdData.Data) {
      this.parseHtmlTable(stdData.Data, 'standalone', quartersMap);
    }

    const availableQuarters = Array.from(quartersMap.values());
    availableQuarters.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));

    let latestConsolidatedQuarter = null;
    let latestStandaloneQuarter = null;

    for (const q of availableQuarters) {
      if (!latestConsolidatedQuarter && q.hasConsolidated) {
        latestConsolidatedQuarter = q.periodEnd;
      }
      if (!latestStandaloneQuarter && q.hasStandalone) {
        latestStandaloneQuarter = q.periodEnd;
      }
    }

    const result = {
      symbol: nseSymbol,
      bseCode: bseCode.toString(),
      companyName: companyName,
      availableQuarters,
      latestConsolidatedQuarter,
      latestStandaloneQuarter,
      fetchedAt: new Date().toISOString()
    };

    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  }

  async isQuarterAvailable(nseSymbol, periodEnd, financialBasis = 'consolidated') {
    const metadata = await this.getFilingMetadata(nseSymbol);
    if (!metadata) return false;

    const quarter = metadata.availableQuarters.find(q => q.periodEnd === periodEnd);
    if (!quarter) return false;

    if (financialBasis === 'consolidated') {
      return quarter.hasConsolidated;
    } else {
      return quarter.hasStandalone;
    }
  }
}

export default new BseFinancialDataService();
