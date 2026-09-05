import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSSIBLE_DISCLOSURE_DIRS = [
  path.resolve(__dirname, '../data/amc_disclosures'),
  path.resolve(__dirname, '../../data/amc_disclosures'),
  path.resolve('backend/data/amc_disclosures'),
  path.resolve('data/amc_disclosures')
];

const POSSIBLE_EQUITY_MASTER_PATHS = [
  path.resolve(__dirname, '../data/indian_equity_master.json'),
  path.resolve(__dirname, '../../data/indian_equity_master.json'),
  path.resolve('backend/data/indian_equity_master.json'),
  path.resolve('data/indian_equity_master.json')
];

class OfficialAmcPortfolioService {
  constructor() {
    this.cache = new Map();
    this.inFlightRequests = new Map();
    this.CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in memory
    this.equityMasterMap = new Map(); // isin -> { symbol, name }
    this.manifest = null;
    this._initEquityMaster();
    this._initManifest();
  }

  _initEquityMaster() {
    for (const p of POSSIBLE_EQUITY_MASTER_PATHS) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item.isin && item.symbol) {
                this.equityMasterMap.set(item.isin.trim(), {
                  symbol: item.symbol.trim(),
                  name: item.name ? item.name.trim() : null
                });
              }
            }
            console.log(`⚡ OfficialAmcPortfolioService: Loaded ${this.equityMasterMap.size} ISIN-to-Symbol mappings from ${p}`);
            return;
          }
        }
      } catch (err) {
        console.warn(`Failed reading equity master from ${p}:`, err.message);
      }
    }
  }

  _initManifest() {
    for (const dir of POSSIBLE_DISCLOSURE_DIRS) {
      const manifestPath = path.join(dir, 'manifest.json');
      try {
        if (fs.existsSync(manifestPath)) {
          const raw = fs.readFileSync(manifestPath, 'utf8');
          this.manifest = JSON.parse(raw);
          this.disclosureDir = dir;
          console.log(`⚡ OfficialAmcPortfolioService: Loaded AMC disclosure manifest (${Object.keys(this.manifest.schemes || {}).length} schemes) from ${manifestPath}`);
          return;
        }
      } catch (err) {
        console.warn(`Failed reading manifest from ${manifestPath}:`, err.message);
      }
    }
  }

  _getDisclosureFilePath(fileName) {
    for (const dir of POSSIBLE_DISCLOSURE_DIRS) {
      const fullPath = path.join(dir, fileName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  classifyAssetType(name, isin, rawIndustry, sectionHeader) {
    const normName = String(name || '').trim().toLowerCase();
    const normSection = String(sectionHeader || '').toLowerCase();
    const normInd = String(rawIndustry || '').toLowerCase();

    // 1. Foreign Equity: US ISIN or Foreign section
    if ((isin && /^[A-Z]{2}/.test(isin) && !isin.startsWith('IN') && !isin.startsWith('INF')) || 
        normSection.includes('foreign') || 
        normName.includes('alphabet') || 
        normName.includes('microsoft') || 
        normName.includes('amazon') || 
        normName.includes('meta platforms')) {
      return 'Foreign Equity';
    }

    // 2. Cash & Receivables / TREPS / Repo
    if (normName.startsWith('trp_') || 
        normName.startsWith('rep') || 
        normName.includes('repo') || 
        normName.includes('treps') || 
        normName.includes('triparty repo') || 
        normName.includes('reverse repo') || 
        normName.includes('net receivables') || 
        normName.includes('cash & cash equivalent') || 
        normName.includes('bank margin') || 
        normName.includes('clearing corporation')) {
      return 'Cash/Receivables';
    }

    // 3. ETF / REIT / InvIT
    if (normName.includes('reit') || 
        normName.includes('invit') || 
        normName.includes(' etf') || 
        normName.endsWith('etf') || 
        normInd.includes('reit') || 
        normInd.includes('invit')) {
      return 'ETF/REIT';
    }

    // 4. Money Market (CDs, CPs, T-Bills)
    if (normSection.includes('commercial paper') || 
        normSection.includes('certificate of deposit') || 
        normName.includes('certificate of deposit') || 
        normName.includes('commercial paper') || 
        normSection.includes('money market')) {
      return 'Money Market';
    }

    // 5. Government Securities & Sovereign Debt
    if (normName.includes('tbill') || 
        normName.includes('treasury bill') || 
        normName.includes('g-sec') || 
        normName.includes('government security') || 
        normInd.includes('sovereign') || 
        normSection.includes('government securities') || 
        normSection.includes('treasury bill')) {
      return 'Government Securities';
    }

    // 6. Corporate Debt & Other Fixed Income
    if (normSection.includes('debt') || 
        normInd.includes('crisil') || 
        normInd.includes('care') || 
        normInd.includes('icra') || 
        normInd.includes('ind a1+') || 
        normInd.includes('ind aaa') || 
        normName.includes('bond') || 
        normName.includes('debenture') || 
        normName.includes('ncd')) {
      return 'Debt';
    }

    // Default to Domestic Equity
    return 'Equity';
  }

  /**
   * Dynamically parse official AMC disclosure workbook.
   * Extracts statement date, portfolio AUM, positions, and authentic sector allocation.
   */
  parseDisclosureFile(filePath, schemeMeta = {}) {
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (!rows || rows.length < 5) {
      throw new Error(`Insufficient data rows in disclosure file ${filePath}`);
    }

    // 1. Extract Statement Date
    let holdingsAsOf = 'July 31, 2026';
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowText = (rows[i] || []).join(' ');
      const match = rowText.match(/Monthly Portfolio Statement as on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
      if (match && match[1]) {
        holdingsAsOf = match[1].trim();
        break;
      }
    }

    // 2. Identify end of holdings table (GRAND TOTAL / TOTAL NET ASSETS)
    let grandTotalRowIdx = -1;
    let declaredNetAssetsLakhs = null;

    for (let i = 4; i < rows.length; i++) {
      const name = String(rows[i]?.[1] || '').trim().toUpperCase();
      if (name === 'GRAND TOTAL' || name === 'TOTAL NET ASSETS') {
        grandTotalRowIdx = i;
        const valLakhs = typeof rows[i][5] === 'number' ? rows[i][5] : (typeof rows[i][5] === 'string' ? parseFloat(rows[i][5].replace(/,/g, '')) : null);
        if (valLakhs && !isNaN(valLakhs)) {
          declaredNetAssetsLakhs = valLakhs;
        }
        break;
      }
    }

    const endIdx = grandTotalRowIdx !== -1 ? grandTotalRowIdx : rows.length;

    // 3. Parse positions between header row and grand total row
    const rawPositions = [];
    let currentSectionHeader = 'Equity & Equity related';

    for (let i = 4; i < endIdx; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      const rawName = String(r[1] || '').trim();
      if (!rawName) continue;

      // Track section headers
      if (!r[2] && !r[4] && !r[5] && !r[6]) {
        currentSectionHeader = rawName;
        continue;
      }

      // Skip subtotal or total rows
      const upperName = rawName.toUpperCase();
      if (upperName === 'SUB TOTAL' || upperName === 'TOTAL' || upperName === 'GRAND TOTAL' || upperName === 'TOTAL NET ASSETS' || rawName.startsWith('(a) Listed') || rawName.startsWith('(b) Listed') || rawName.startsWith('(c) Unlisted')) {
        continue;
      }

      const valLakhs = typeof r[5] === 'number' ? r[5] : (typeof r[5] === 'string' ? parseFloat(r[5].replace(/,/g, '')) : null);
      let weight = typeof r[6] === 'number' ? r[6] : (typeof r[6] === 'string' ? parseFloat(r[6].replace(/,/g, '')) : null);

      // Skip invalid / NIL rows
      if (valLakhs === null || isNaN(valLakhs) || weight === null || isNaN(weight)) {
        continue;
      }

      const rawIsin = r[2] ? String(r[2]).trim() : null;
      const cleanIsin = (rawIsin && /^[A-Z0-9]{12}$/.test(rawIsin)) ? rawIsin : null;
      const rawInd = r[3] ? String(r[3]).replace(/##/g, '').trim() : '';
      const quantity = typeof r[4] === 'number' ? r[4] : null;

      // Weight conversion: PPFAS provides decimals (0.0755 = 7.55%)
      const weightPercent = (Math.abs(weight) <= 1.0 && weight !== 0) 
        ? Number((weight * 100).toFixed(4)) 
        : Number(weight.toFixed(4));
      
      const valueCr = Number((valLakhs / 100).toFixed(2));

      // Resolve friendly name & canonical symbol
      let displayName = rawName;
      if (displayName.startsWith('TRP_')) displayName = 'Triparty Repo (TREPS)';
      else if (/^REP\d+/i.test(displayName)) displayName = `Repo (${displayName})`;
      else if (displayName.includes('Net Receivables')) displayName = 'Net Receivables / (Payables)';

      const securityType = this.classifyAssetType(displayName, cleanIsin, rawInd, currentSectionHeader);

      // Equity master lookup for canonical NSE symbol
      const masterRecord = cleanIsin ? this.equityMasterMap.get(cleanIsin) : null;
      const canonicalSymbol = masterRecord ? masterRecord.symbol : (securityType === 'Foreign Equity' ? cleanIsin : null);

      let sectorName = rawInd;
      if (!sectorName) {
        if (securityType === 'Cash/Receivables') sectorName = 'Cash & Receivables';
        else if (securityType === 'Money Market') sectorName = 'Money Market';
        else if (securityType === 'Government Securities') sectorName = 'Sovereign';
        else sectorName = 'Other';
      }

      rawPositions.push({
        name: displayName,
        stock: displayName,
        companyName: displayName,
        Symbol: canonicalSymbol || displayName,
        nseSymbol: canonicalSymbol,
        ISIN: cleanIsin,
        securityId: cleanIsin,
        sector: sectorName,
        industry: sectorName,
        securityType: securityType,
        quantity: quantity,
        weightPercent: weightPercent,
        weightPct: weightPercent,
        allocation: weightPercent.toFixed(2),
        "Holding Percent": weightPercent,
        valueCr: valueCr,
        marketValueCr: valueCr,
        marketValue: valueCr.toFixed(2),
        portfolioAsOf: holdingsAsOf,
        asOf: holdingsAsOf,
        source: 'Official PPFAS AMC Portfolio Disclosure'
      });
    }

    // 4. Deterministic Sort: weightPercent DESC, companyName ASC
    rawPositions.sort((a, b) => {
      const diff = b.weightPercent - a.weightPercent;
      if (Math.abs(diff) > 0.000001) return diff;
      return a.companyName.localeCompare(b.companyName);
    });

    // 5. Assign sequential ranks
    const positions = rawPositions.map((pos, idx) => ({
      rank: idx + 1,
      ...pos
    }));

    // 6. Compute Authentic Sector Breakdown
    const sectorBreakdown = {};
    for (const pos of positions) {
      let sec = pos.sector || 'Other';
      // Group fixed-income credit ratings into Debt & Money Market for clean sector charting
      if (pos.securityType === 'Debt' || pos.securityType === 'Money Market') {
        sec = 'Debt & Money Market';
      } else if (pos.securityType === 'Government Securities') {
        sec = 'Sovereign / G-Secs';
      } else if (pos.securityType === 'Cash/Receivables') {
        sec = 'Cash & Equivalents';
      }

      const existing = sectorBreakdown[sec] || 0;
      sectorBreakdown[sec] = Number((existing + pos.weightPercent).toFixed(2));
    }

    const portfolioAumCr = declaredNetAssetsLakhs ? Number((declaredNetAssetsLakhs / 100).toFixed(2)) : null;
    const totalDisclosedWeightPercent = Number(positions.reduce((sum, p) => sum + p.weightPercent, 0).toFixed(2));

    return {
      available: true,
      holdingsAvailable: true,
      dataStatus: 'DATA_AVAILABLE',
      source: 'Official AMC Portfolio Disclosure',
      amc: 'PPFAS Mutual Fund',
      AMC: 'PPFAS Mutual Fund',
      amcProvider: this.manifest?.provider || 'PPFAS Mutual Fund Official Portal',
      sourceUrl: schemeMeta.sourceUrl || null,
      sourceFile: schemeMeta.fileName || null,
      holdingsAsOf: holdingsAsOf,
      asOfDate: holdingsAsOf,
      fetchedAt: schemeMeta.fetchedAt || this.manifest?.fetchedAt || new Date().toISOString(),
      schemeCode: String(schemeMeta.schemeCode || ''),
      schemeName: schemeMeta.schemeName || 'Mutual Fund Scheme',
      isin: schemeMeta.isin || null,
      ISIN: schemeMeta.isin || null,
      plan: 'Direct Plan',
      option: 'Growth',
      portfolioAumCr: portfolioAumCr,
      positions: positions,
      holdings: positions, // alias for frontend backward compatibility
      sectorBreakdown: sectorBreakdown,
      totalDisclosedWeightPercent: totalDisclosedWeightPercent,
      positionsCount: positions.length,
      totalDisclosedPositionsCount: positions.length,
      eligibleStockPositionsCount: positions.filter(p => p.securityType === 'Equity' || p.securityType === 'Foreign Equity' || p.securityType === 'ETF/REIT').length,
      equityPositionsCount: positions.filter(p => p.securityType === 'Equity' || p.securityType === 'Foreign Equity').length,
      debtPositionsCount: positions.filter(p => p.securityType === 'Debt' || p.securityType === 'Money Market' || p.securityType === 'Government Securities').length
    };
  }

  /**
   * Retrieve official disclosed holdings for a given AMFI scheme code.
   * If not available or scheme not supported, returns DATA_UNAVAILABLE without fabrication.
   */
  async getSchemeHoldings(schemeCode) {
    const cleanCode = String(schemeCode || '').trim();
    if (!cleanCode) {
      return this._getUnavailableResult('Invalid scheme code', schemeCode);
    }

    // 1. Check in-memory cache with strict schemeCode identity match
    const cached = this.cache.get(cleanCode);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      if (cached.data && String(cached.data.schemeCode) === cleanCode) {
        return cached.data;
      }
    }

    // 2. Check in-flight request deduplication
    if (this.inFlightRequests.has(cleanCode)) {
      return await this.inFlightRequests.get(cleanCode);
    }

    const promise = this._fetchAndParseScheme(cleanCode);
    this.inFlightRequests.set(cleanCode, promise);

    try {
      const result = await promise;
      if (result && result.available && String(result.schemeCode) === cleanCode) {
        this.cache.set(cleanCode, { data: result, timestamp: Date.now() });
      }
      return result;
    } finally {
      this.inFlightRequests.delete(cleanCode);
    }
  }

  async _fetchAndParseScheme(cleanCode) {
    const schemeMeta = this.manifest?.schemes?.[cleanCode];
    if (!schemeMeta) {
      return this._getUnavailableResult(`Official portfolio holdings disclosure unavailable for scheme code ${cleanCode}`, cleanCode);
    }

    let localPath = this._getDisclosureFilePath(schemeMeta.fileName);

    // If file is not present locally, attempt downloading from verified source URL
    if (!localPath && schemeMeta.sourceUrl) {
      try {
        console.log(`📥 Downloading AMC portfolio disclosure for scheme ${cleanCode} from ${schemeMeta.sourceUrl}...`);
        const res = await axios.get(schemeMeta.sourceUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const targetDir = this.disclosureDir || POSSIBLE_DISCLOSURE_DIRS[0];
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        localPath = path.join(targetDir, schemeMeta.fileName);
        fs.writeFileSync(localPath, Buffer.from(res.data));
        console.log(`✅ Saved AMC disclosure to ${localPath}`);
      } catch (dlErr) {
        console.warn(`Failed downloading disclosure file for scheme ${cleanCode}:`, dlErr.message);
        return this._getUnavailableResult(`Official portfolio disclosure file could not be retrieved for scheme ${cleanCode}`, cleanCode);
      }
    }

    if (!localPath || !fs.existsSync(localPath)) {
      return this._getUnavailableResult(`Official portfolio disclosure file missing for scheme ${cleanCode}`, cleanCode);
    }

    try {
      return this.parseDisclosureFile(localPath, schemeMeta);
    } catch (parseErr) {
      console.error(`Error parsing disclosure file ${localPath}:`, parseErr.message);
      return this._getUnavailableResult(`Error parsing official disclosure file for scheme ${cleanCode}: ${parseErr.message}`, cleanCode);
    }
  }

  _getUnavailableResult(reason, schemeCode = null) {
    return {
      available: false,
      holdingsAvailable: false,
      dataStatus: 'DATA_UNAVAILABLE',
      schemeCode: schemeCode ? String(schemeCode) : null,
      positions: [],
      holdings: [],
      sectorBreakdown: {},
      reason: reason || 'Official portfolio holdings disclosure unavailable for this fund'
    };
  }
}

export default new OfficialAmcPortfolioService();
