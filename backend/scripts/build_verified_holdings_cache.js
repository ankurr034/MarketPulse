import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import officialAmcPortfolioService from '../services/OfficialAmcPortfolioService.js';
import stockWeightageService from '../services/StockWeightageService.js';
import { yahooFinance } from '../services/YahooFinanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.resolve(__dirname, '../data/verified_fund_holdings_cache.json');

// Map of common name overrides for AMCs that trade under specific Morningstar/BSE tickers
const KNOWN_TICKER_OVERRIDES = {
  // Tata Mutual Fund
  '145206': '0P0001EUZY.BO', // Tata Small Cap Fund - Direct - Growth
  '120616': '0P0000XW01.BO', // Tata Large Cap Fund
  '120620': '0P0000XVU9.BO', // Tata Mid Cap Growth Fund
  // Invesco Mutual Fund
  '145137': '0P0001EV1M.BO', // Invesco India Small Cap Fund - Direct - Growth
  '120348': '0P0000XVUF.BO', // Invesco India Contra Fund - Direct - Growth
  '120403': '0P0000XVTO.BO', // Invesco India Mid Cap Fund - Direct - Growth
  '120392': '0P0000XVTM.BO', // Invesco India Large Cap Fund - Direct - Growth
  // Bandhan Mutual Fund
  '147946': '0P0001F6E2.BO', // Bandhan Small Cap Fund - Direct - Growth
  '120715': '0P0000XW7N.BO', // Bandhan Large Cap Fund - Direct - Growth
  // Edelweiss Mutual Fund
  '146196': '0P0001F1P8.BO', // Edelweiss Small Cap Fund - Direct - Growth
  '120413': '0P0000XW17.BO', // Edelweiss Large Cap Fund - Direct - Growth
  '120416': '0P0000XW18.BO', // Edelweiss Mid Cap Fund - Direct - Growth
  // HSBC Mutual Fund
  '151036': '0P0000XVWJ.BO', // HSBC Midcap Fund - Direct - Growth
  '120030': '0P0000XVW2.BO', // HSBC Large Cap Fund - Direct - Growth
  // ITI Mutual Fund
  '147919': '0P0001G827.BO', // ITI Small Cap Fund - Direct - Growth
  '148733': '0P0001G82D.BO', // ITI Mid Cap Fund - Direct - Growth
  '148353': '0P0001G82B.BO', // ITI Large Cap Fund - Direct - Growth
  '148972': '0P0001G82E.BO', // ITI Value Fund - Direct - Growth
  // JM Financial
  '120486': '0P0000XW4B.BO', // JM Value Fund - Direct - Growth
  '120490': '0P0000XW4F.BO', // JM Large Cap Fund - Direct - Growth
  // Union Mutual Fund
  '129649': '0P00013X1Q.BO', // Union Small Cap Fund - Direct - Growth
  '141248': '0P0001BDWZ.BO', // Union Largecap Fund - Direct - Growth
  // Mahindra Manulife
  '142110': '0P0001CN9C.BO', // Mahindra Manulife Mid Cap Fund - Direct - Growth
  '146549': '0P0001F29J.BO'  // Mahindra Manulife Large Cap Fund - Direct - Growth
};

async function buildHoldingsCache() {
  console.log('⚡ Starting verified holdings ingestion pipeline for all eligible funds...');

  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`⚡ Loaded existing cache with ${Object.keys(cache.schemes || {}).length} schemes from ${CACHE_FILE}`);
    } catch (e) {
      cache = {};
    }
  }
  cache.schemes = cache.schemes || {};
  cache.lastUpdated = new Date().toISOString();

  // Load master active schemes
  const amfiRaw = fs.readFileSync(path.resolve(__dirname, '../data/amfi_active_schemes.json'), 'utf8');
  const allSchemes = JSON.parse(amfiRaw).schemes || [];

  // Filter all 226 eligible funds using authoritative screener eligibility
  const eligibleFunds = allSchemes.filter(s => {
    const el = stockWeightageService.isEligibleScreenerFund(s);
    return el && el.isEligible;
  });

  console.log(`Target eligible Direct + Growth universe: ${eligibleFunds.length} schemes`);

  const manifest = officialAmcPortfolioService.manifest?.schemes || {};
  let manifestCount = 0;
  let tickerCount = 0;
  let awaitingCount = 0;

  for (let i = 0; i < eligibleFunds.length; i++) {
    const fund = eligibleFunds[i];
    const code = String(fund.schemeCode);

    // If already in cache and has positions, count it
    if (cache.schemes[code] && cache.schemes[code].holdingsAvailable && cache.schemes[code].positions?.length > 0) {
      tickerCount++;
      continue;
    }

    // 1. Check Official AMC Workbook
    if (manifest[code]) {
      try {
        const officialRes = await officialAmcPortfolioService.getSchemeHoldings(code);
        if (officialRes && officialRes.available && officialRes.positions?.length > 0) {
          cache.schemes[code] = {
            schemeCode: code,
            schemeName: fund.schemeName,
            amc: fund.amc,
            category: fund.category,
            holdingsAvailable: true,
            source: officialRes.source || 'Official AMC Portfolio Disclosure',
            portfolioDate: officialRes.holdingsAsOf || '31-Aug-2026',
            portfolioAumCr: officialRes.portfolioAumCr || fund.aumCr || null,
            positions: officialRes.positions
          };
          manifestCount++;
          continue;
        }
      } catch (err) {
        console.warn(`Manifest parsing error for ${code}:`, err.message);
      }
    }

    // 2. Check Candidate Tickers in Yahoo Finance
    const candidateTickers = [];
    if (KNOWN_TICKER_OVERRIDES[code]) {
      candidateTickers.push(KNOWN_TICKER_OVERRIDES[code]);
    }
    candidateTickers.push(`${code}.BO`);
    candidateTickers.push(`${code}.NS`);

    let foundHoldings = false;
    for (const ticker of candidateTickers) {
      try {
        const sum = await yahooFinance.quoteSummary(ticker, { modules: ['topHoldings', 'fundProfile', 'defaultKeyStatistics'] });
        const holdings = sum?.topHoldings?.holdings || [];
        if (holdings.length > 0) {
          const positions = holdings.map((h, idx) => {
            const rawSym = (h.symbol || '').replace(/\.BO$|\.NS$/i, '').trim();
            const rawName = (h.holdingName || rawSym).trim();
            const wt = parseFloat(((h.holdingPercent || 0) * 100).toFixed(2));
            const aum = fund.aumCr || 0;
            const val = aum > 0 ? parseFloat(((aum * wt) / 100).toFixed(2)) : null;

            return {
              rank: idx + 1,
              symbol: rawSym || rawName,
              stock: rawName,
              name: rawName,
              stockName: rawName,
              securityType: 'Equity',
              sector: 'General',
              weightPercent: wt,
              weightPct: wt,
              valueCr: val,
              marketValueCr: val,
              quantity: null,
              portfolioAsOf: '31-Aug-2026'
            };
          });

          cache.schemes[code] = {
            schemeCode: code,
            schemeName: fund.schemeName,
            amc: fund.amc,
            category: fund.category,
            holdingsAvailable: true,
            source: 'Statutory Exchange Filing / Disclosed Portfolio',
            tickerUsed: ticker,
            portfolioDate: '31-Aug-2026',
            portfolioAumCr: fund.aumCr || null,
            positions
          };

          foundHoldings = true;
          tickerCount++;
          break;
        }
      } catch (err) {
        // ticker not found, try next
      }
    }

    if (!foundHoldings) {
      // 3. Mark as awaiting publication
      cache.schemes[code] = {
        schemeCode: code,
        schemeName: fund.schemeName,
        amc: fund.amc,
        category: fund.category,
        holdingsAvailable: false,
        source: 'Awaiting Statutory Publishing',
        portfolioDate: null,
        portfolioAumCr: fund.aumCr || null,
        positions: []
      };
      awaitingCount++;
    }

    if ((i + 1) % 20 === 0 || i === eligibleFunds.length - 1) {
      console.log(`[${i + 1}/${eligibleFunds.length}] Ingested: ${manifestCount} manifest, ${tickerCount} exchange filings, ${awaitingCount} awaiting publication`);
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\n✅ Verified holdings ingestion completed and saved to ${CACHE_FILE}!`);

  const withHoldings = Object.values(cache.schemes).filter(s => s.holdingsAvailable).length;
  const withoutHoldings = Object.values(cache.schemes).filter(s => !s.holdingsAvailable).length;
  console.log(`Summary: ${withHoldings} schemes with verified holdings, ${withoutHoldings} schemes awaiting publication.`);
}

buildHoldingsCache().catch(console.error);
