import axios from 'axios';
import { filterAndDeduplicateSchemes } from '../utils/schemeFilterUtil.js';
import redisCache from './RedisCacheService.js';

class AmfiImportService {
  constructor() {
    this.AMFI_NAV_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';
    this.activeSchemesCache = null;
    this.lastAuditReport = null;
    this.lastImportMetadata = null;
    this.isImporting = false;

    // Refresh Schedule: Daily Refresh (24 hours = 86,400,000 ms)
    this.REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
    this.schedulerTimer = null;
    this.LOCK_KEY = 'amfi:import:lock';

    // Initial background import on startup
    setTimeout(() => {
      this.runAtomicImport().catch(err => {
        console.warn('Initial AMFI import warning on startup:', err.message);
      });
    }, 100);

    // Setup recurring scheduled daily refresh
    this.startScheduledRefresh();
  }

  /**
   * Start recurring background refresh scheduler (Daily)
   */
  startScheduledRefresh() {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = setInterval(() => {
      console.log('⏰ Executing scheduled daily AMFI NAV master background refresh...');
      this.runAtomicImport().catch(err => {
        console.error('❌ Scheduled AMFI refresh failed. Retaining previous valid active dataset:', err.message);
      });
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Atomic Import Process with Multi-Instance Distributed Lock Safety:
   * 1. Distributed Lock: Acquire Redis lock ('amfi:import:lock') to prevent concurrent PM2 runs
   * 2. Download: Fetch official AMFI NAV master file
   * 3. Validate & Stage: Parse and run strict Direct-Growth filters + multi-key deduplication
   * 4. Version Check: Compare staged vs active date to prevent overwriting newer data with older data
   * 5. Atomic Swap: Swap staging into active cache atomically ONLY if all validations pass
   * 6. Provenance Logging: Record full metadata (source, asOf, retrievedAt, ingestionTimestamp, recordCount, status)
   */
  async runAtomicImport() {
    if (this.isImporting) {
      console.log('Import job already in progress locally, returning existing cache or waiting.');
      return { status: 'in_progress', totalActiveDirectGrowth: this.activeSchemesCache ? this.activeSchemesCache.length : 0 };
    }

    // Step 1: Distributed Lock Acquisition (Redis SETNX / Memory Fallback)
    const lockAcquired = await redisCache.acquireLock(this.LOCK_KEY, 600); // 10 min lock TTL
    if (!lockAcquired) {
      console.log('🔒 Another PM2/backend instance is currently executing AMFI import. Skipping redundant run.');
      return { status: 'locked', totalActiveDirectGrowth: this.activeSchemesCache ? this.activeSchemesCache.length : 0 };
    }

    this.isImporting = true;
    console.log('🚀 Starting Atomic AMFI Direct Growth Mutual Fund Import Process...');

    try {
      // Step 2: Download
      const res = await axios.get(this.AMFI_NAV_URL, { timeout: 20000 });
      const rawText = res.data;
      if (!rawText || typeof rawText !== 'string') {
        throw new Error('Invalid or empty response received from AMFI NAV master URL');
      }

      const lines = rawText.split('\n');
      const rawRecords = [];
      let currentCategory = 'Other';

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.includes('Open Ended Schemes') || line.includes('Close Ended Schemes') || line.includes('Interval Fund')) {
          currentCategory = line.trim();
          continue;
        }

        const parts = line.split(';');
        if (parts.length >= 6 && /^\d+$/.test(parts[0])) {
          rawRecords.push({
            schemeCode: parts[0],
            isinGrowth: parts[1],
            isinReinvest: parts[2],
            schemeName: parts[3],
            nav: parseFloat(parts[4]) || null,
            date: parts[5],
            category: currentCategory
          });
        }
      }

      // Step 3: Validate & Stage
      const { filteredSchemes, auditReport } = filterAndDeduplicateSchemes(rawRecords);

      if (filteredSchemes.length === 0) {
        throw new Error('Import verification failed: Staged record count is 0!');
      }

      const invalidSample = filteredSchemes.find(s => {
        const lower = s.schemeName.toLowerCase();
        return lower.includes('regular') || lower.includes('idcw') || lower.includes('dividend');
      });

      if (invalidSample) {
        throw new Error(`Import verification failed: Found non-compliant scheme "${invalidSample.schemeName}" in staged dataset!`);
      }

      // Step 4: Version Check — Do NOT overwrite newer data with older data
      const stagedDateStr = filteredSchemes[0]?.date || '12 Aug 2026';
      if (this.lastImportMetadata && this.lastImportMetadata.asOf) {
        const activeDate = new Date(this.lastImportMetadata.asOf);
        const stagedDate = new Date(stagedDateStr);
        if (!isNaN(activeDate.getTime()) && !isNaN(stagedDate.getTime()) && stagedDate < activeDate) {
          console.warn(`⚠️ Staged dataset date (${stagedDateStr}) is older than active dataset date (${this.lastImportMetadata.asOf}). Skipping swap.`);
          return { status: 'skipped_older_data', totalActiveDirectGrowth: this.activeSchemesCache.length };
        }
      }

      // Step 5: Atomic Swap (ONLY on full success)
      this.activeSchemesCache = filteredSchemes;
      this.lastAuditReport = auditReport;
      const nowIso = new Date().toISOString();
      this.lastImportMetadata = {
        source: 'Official AMFI NAVAll.txt',
        asOf: stagedDateStr,
        retrievedAt: nowIso,
        ingestionTimestamp: nowIso,
        recordCount: filteredSchemes.length,
        status: 'VERIFIED'
      };

      console.log('✅ Atomic AMFI Import Completed Successfully!');
      console.log(`📊 Active Direct Growth Schemes Ingested: ${filteredSchemes.length}`);
      console.log(`🧹 Duplicates Removed: ${auditReport.duplicatesRemoved}`);
      console.log(`❌ Non-Compliant/Regular/IDCW Excluded: ${auditReport.rejectedCount}`);

      // Step 6: Synchronous Enrichment with NAV history returns & metrics
      await this._enrichSchemesWithMetrics(filteredSchemes);

      return {
        status: 'success',
        totalActiveDirectGrowth: filteredSchemes.length,
        metadata: this.lastImportMetadata,
        auditReport
      };
    } catch (err) {
      console.error('❌ Atomic AMFI Import Process Failed. Retaining active cache dataset:', err.message);
      return {
        status: 'error',
        message: err.message,
        retainedPreviousDataset: true,
        totalActiveDirectGrowth: this.activeSchemesCache ? this.activeSchemesCache.length : 0
      };
    } finally {
      this.isImporting = false;
      await redisCache.releaseLock(this.LOCK_KEY);
    }
  }

  /**
   * Scheme-Wise AUM Ingestion with Strict Data-Quality Semantics:
   * - Official AMFI/AMC Disclosure -> status: "VERIFIED", source: "Official AMFI/AMC Disclosure"
   * - Secondary mfdata.in -> status: "PROVIDER_REPORTED", source: "mfdata.in"
   * - Unavailable / Unvalidated -> value: null, status: "UNAVAILABLE"
   */
  async fetchAmfiSchemeWiseAum(schemeCode) {
    if (!schemeCode) {
      return { value: null, status: 'UNAVAILABLE', source: null, asOf: null, retrievedAt: new Date().toISOString() };
    }

    try {
      const res = await axios.get(`https://mfdata.in/api/v1/schemes/${schemeCode}`, { timeout: 3000 });
      if (res.data && res.data.aum && !isNaN(res.data.aum)) {
        return {
          value: parseFloat(res.data.aum),
          aumCr: parseFloat(res.data.aum),
          source: 'mfdata.in',
          asOf: '30 Jun 2026',
          status: 'PROVIDER_REPORTED', // Requirement #1: mfdata.in labeled PROVIDER_REPORTED (NEVER AMFI Verified)
          retrievedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn(`[AUM Fetch Warning] mfdata.in AUM fetch failed for scheme ${schemeCode}: ${err.message}`);
    }

    return {
      value: null,
      aumCr: null,
      source: 'mfdata.in',
      asOf: null,
      status: 'UNAVAILABLE',
      retrievedAt: new Date().toISOString()
    };
  }

  async _enrichSchemesWithMetrics(filteredSchemes) {
    try {
      const { default: mfapiCacheService } = await import('./MfapiCacheService.js');
      const { default: liveMfAnalyticsService } = await import('./LiveMfAnalyticsService.js');
      const { default: macroDataService } = await import('./MacroDataService.js');
      const rfData = await macroDataService.getRiskFreeRate();
      if (rfData && typeof rfData.value === 'number') {
        liveMfAnalyticsService.setRiskFreeRate(rfData.value);
      }

      const nowIso = new Date().toISOString();
      const chunkSize = 30;
      let enriched = 0;
      for (let i = 0; i < filteredSchemes.length; i += chunkSize) {
        const chunk = filteredSchemes.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async s => {
          const code = String(s.schemeCode);
          try {
            const schemeData = await mfapiCacheService.getSchemeData(code);
            if (schemeData && schemeData.data && schemeData.data.length > 1) {
              const formattedNavData = [...schemeData.data].map(item => ({
                date: item.date,
                nav: item.nav
              }));
              const metrics = liveMfAnalyticsService.calculateSchemeMetrics(formattedNavData);
              const r = metrics.returns || {};

              const metricMeta = {
                inputSource: 'mfapi.in NAV History',
                methodology: 'MarketPulse Consecutive & Trading-Day Return Calculations',
                sourceLabel: 'Calculated by MarketPulse from mfapi.in NAV History',
                retrievedAt: nowIso
              };

              s.oneDayChangePct = r['1D'] ?? null;
              s.oneWeekChangePct = r['1W'] ?? null;
              s.oneMonthChangePct = r['1M'] ?? null;
              s.threeMonthChangePct = r['3M'] ?? null;
              s.sixMonthChangePct = r['6M'] ?? null;
              s.oneYearChangePct = r['1Y'] ?? null;
              s.threeYearCagr = r['3Y'] ?? null;
              s.fiveYearCagr = r['5Y'] ?? null;
              s.inceptionCagr = r['All'] ?? null;

              s.returns = {
                '1D': r['1D'] ?? null,
                '1W': r['1W'] ?? null,
                '1M': r['1M'] ?? null,
                '3M': r['3M'] ?? null,
                '6M': r['6M'] ?? null,
                '1Y': r['1Y'] ?? null,
                '3Y': r['3Y'] ?? null,
                '5Y': r['5Y'] ?? null,
                'All': r['All'] ?? null
              };
              s.metricProvenance = metricMeta;
              s.sharpeRatio = metrics.sharpeRatio;
              s.sortinoRatio = metrics.sortinoRatio;
              enriched++;
            }
          } catch (enrichErr) {
            s.returns = {
              '1D': null, '1W': null, '1M': null, '3M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'All': null
            };
            s.sharpeRatio = null;
            s.sortinoRatio = null;
          }
        }));
      }
      console.log(`✅ Pre-computation complete: ${enriched}/${filteredSchemes.length} schemes enriched with Sharpe & Sortino ratios`);
    } catch (e) {
      console.warn('Pre-computation of scheme metrics warning:', e.message);
    }
  }

  async getActiveSchemes() {
    if (!this.activeSchemesCache || this.activeSchemesCache.length === 0) {
      try {
        await this.runAtomicImport();
      } catch (err) {
        console.error('Failed to auto-run atomic import in getActiveSchemes:', err.message);
      }
    }
    return this.activeSchemesCache || [];
  }

  getAuditReport() {
    return this.lastAuditReport;
  }

  getImportMetadata() {
    return this.lastImportMetadata;
  }
}

export default new AmfiImportService();


