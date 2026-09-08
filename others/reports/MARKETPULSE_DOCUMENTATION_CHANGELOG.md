# MarketPulse — Technical Documentation Changelog
## Comprehensive Record of Modifications from Baseline PDF v2.4.0 (Sep 4, 2026) to Official Documentation v2.5.0 (Sep 8, 2026)

**Release Date**: September 8, 2026  
**Auditor / Author**: Lead System Architect & Antigravity Agent  
**Baseline Document**: `MarketPulse_Complete_Technical_Documentation.pdf` (v2.4.0, 13 Pages, Sep 4, 2026)  
**Target Document**: `MARKETPULSE_FINAL_TECHNICAL_DOCUMENTATION.pdf` (v2.5.0, Institutional Standard, Sep 8, 2026)  
**Governing Principle**: Codebase as Sole Source of Truth — Zero Fabrication Standard  

---

## 1. Summary of Changes

| Category | Count of Items | Key Areas Affected |
| :--- | :--- | :--- |
| **Removed / Superseded** | 6 Items | Obsolete `YahooFinanceService` timeseries logic, exaggerated scheme counts ("40,000+"), blanket holdings claims, un-disambiguated closed-end schemes. |
| **Updated / Corrected** | 18 Items | MF Direct-Growth universe count (2,743), AUM coverage stats (26.10%), 3Y Trailing Sharpe/Sortino exposure with Inception fallback, Same-quarter YoY calendar resolution, endpoint count (78). |
| **Newly Added** | 12 Items | Official AMC portfolio service & coverage boundary, Screener service & research usability criteria, Scheme 146951 open-ended disambiguation, BSE financial filing cross-validation, 11-page routing architecture. |

---

## 2. Itemized Breakdown of Modifications

### 2.1 Removed / Corrected Outdated Items

1. **Removed "40,000+ Mutual Fund Schemes" and "4,000+ Schemes" Claims**
   - *Baseline PDF Location*: Section 1.2, Bullet 4; Section 17, Pipeline diagram.
   - *Reason for Removal*: The active Direct-Growth explorer universe loaded by `allFundsDirectoryService.js` from `backend/data/amfi_active_schemes.json` contains exactly **2,743** schemes. Raw AMFI daily files include thousands of inactive, merged, or un-deduplicated plan variants; quoting 40,000+ or 4,000+ schemes in the production directory was inaccurate and contradictory.
   - *Code Reference*: `backend/services/allFundsDirectoryService.js:L50-L75`, `backend/data/amfi_active_schemes.json`.

2. **Superseded Legacy `YahooFinanceService` Quarterly Revenue Parsing**
   - *Baseline PDF Location*: Section 5.2, Section 10.
   - *Reason for Update*: The old documentation described a naive `fundamentalsTimeSeries` parser that divided `operatingRevenue` by $10^7$ and compared sequential indexes ($t$ vs $t-4$). The codebase has evolved to use `QuarterlyRevenueService.js` and `BseFinancialDataService.js`, which perform calendar-aware quarter normalization (`normalizePeriodEnd`), strict fiscal year/quarter matching (`findSameQuarterPriorYear`), consolidated vs. standalone statement prioritization, and reconciliation against BSE filings (`backend/data/bse_scrip_mapping.json`).
   - *Code Reference*: `backend/services/QuarterlyRevenueService.js:L1-L150`, `backend/services/BseFinancialDataService.js`.

3. **Removed Unqualified Holdings Coverage Assumption**
   - *Baseline PDF Location*: Section 2.1, Section 18.2 (`/api/mf/:schemeCode/holdings`).
   - *Reason for Correction*: The baseline documentation implied that portfolio equity holdings were available across the entire mutual fund directory. In reality, authentic regulatory disclosures are supported for **7 flagship schemes** via `OfficialAmcPortfolioService.js` and `HoldingsFallbackService.js`. For all unsupported schemes, the API transparently returns `DATA_UNAVAILABLE` with empty positions, strictly adhering to the Zero-Fabrication Standard rather than presenting synthetic holdings.
   - *Code Reference*: `backend/services/OfficialAmcPortfolioService.js`, `backend/routes/holdingsFallback.js`.

4. **Corrected Sharpe / Sortino Primary Metric Exposure**
   - *Baseline PDF Location*: Section 15.1, Section 15.2.
   - *Reason for Update*: The baseline PDF described monthly Sharpe ratios without specifying the evaluation window exposure. A recent production audit and reconciliation against AMFI and fund factsheets revealed that the system previously exposed Since Inception figures that diverged from published 3-Year metrics. The architecture was upgraded so that `LiveMfAnalyticsService.js` exposes **3-Year Trailing Sharpe and Sortino** as the primary `sharpeRatio` and `sortinoRatio` fields, automatically falling back to **Since Inception** only when a scheme has less than 36 months of NAV history. Explicit accessors `riskRatios['3Y']` and `riskRatios['All']` were preserved for multi-horizon analytics.
   - *Code Reference*: `backend/services/LiveMfAnalyticsService.js:L140-L195`, `backend/services/AmfiImportService.js:L210-L245`.

5. **Resolved Scheme Identity Ambiguity (Scheme 146951)**
   - *Baseline PDF Location*: Not addressed in baseline PDF.
   - *Reason for Update*: ICICI Prudential Bharat Consumption Fund had been conflated with closed-ended series (Series 1–5). Scheme 146951 is an **Open-Ended Direct Growth** scheme. To prevent confusion in UI rankings, the fund is now explicitly badged with an `(Open-Ended)` indicator in `MfRankingTable.jsx`, and validated in `regression_mf_data.test.js`.
   - *Code Reference*: `frontend/src/components/MfRankingTable.jsx`, `backend/tests/regression_mf_data.test.js`.

---

### 2.2 Updated Architectural & Operational Items

1. **Document Control & Metadata**
   - Document date updated to **September 8, 2026**.
   - Documentation release version updated to **2.5.0** (Production Architecture).
   - Core runtime verified on **Node.js v24.18.0 (ESM)**, Express 4.19, React 18, Vite 5.

2. **Equity Universe Precise Metrics**
   - Master dataset: `backend/data/indian_equity_master.json` containing **12,538 securities** (4,775 NSE `.NS`, 7,763 BSE `.BO`, 0 foreign securities, 12,538 unique ISINs, 12,512 unique issuers).
   - Ranked universe: `SectorDataService.getAllIndianSymbols()` resolves **12,536 unique symbols** (deduplicated).
   - Sector constituents: **268 constituent stocks** across 30 economic sectors.

3. **Mutual Fund Universe & AUM Coverage Disclosure**
   - Explorer universe: Exactly **2,743 active Direct-Growth mutual fund schemes**.
   - Verified AUM coverage: Exactly **716 schemes** (26.10% coverage) have verified, non-null AUM disclosures in `backend/data/verified_aum_cache.json` and `amfi_active_schemes.json`.
   - Missing AUM handling: Exactly **2,027 schemes** (73.90%) have unpopulated AUM and are honestly assigned `aumCr: null`, `indiaMfRank: null`, displaying as `—`.

4. **API Endpoint Count Reconciled**
   - Baseline PDF claimed 74 endpoints.
   - Exhaustive endpoint enumeration across all 21 router modules in `backend/routes/*.js` revealed exactly **78 endpoints**.

5. **Frontend Pages Catalog Expanded**
   - Baseline PDF documented 6 pages.
   - Final documentation documents the full **11 pages** active in `frontend/src/App.jsx`:
     1. `SectorHeatmap.jsx` (`/sectors`, `/heatmap`)
     2. `IndianMfSectorAnalysis.jsx` (`/indian-mf`, `/mutual-funds`)
     3. `Dashboard.jsx` (`/`, `/dashboard`)
     4. `StockDetails.jsx` (`/stocks/:symbol`)
     5. `MfAnalyticsDashboard.jsx` (`/analytics/mf`)
     6. `EconomicDashboard.jsx` (`/economy`)
     7. `SmartMoneyTracker.jsx` (`/smart-money`)
     8. `GlobalComparison.jsx` (`/comparison`)
     9. `ScreenerPage.jsx` (`/screener`)
     10. `EtfTracker.jsx` (`/etf`)
     11. `Portfolio.jsx` (`/portfolio`)

---

### 2.3 Newly Added Subsystems

1. **Portfolio Holdings Architecture (`OfficialAmcPortfolioService.js`)**
   - Detailed documentation of authentic holdings data ingestion from official AMC disclosures.
   - Clear specification of the 7 supported flagship schemes and the strict `DATA_UNAVAILABLE` zero-fabrication fallback for unsupported schemes.

2. **Equity & Mutual Fund Screener Engine (`ScreenerService.js`)**
   - Multi-metric screening engine supporting Market Cap, P/E, Revenue YoY, 52W recovery, multi-period returns, AUM, Sharpe ratio, and expense ratio.
   - Comprehensive documentation of the `isResearchUsable()` criteria, which filters out corporate shells, penny stocks, and dormant instruments without valid quotes.

3. **BSE Financial Data Cross-Validation (`BseFinancialDataService.js`)**
   - Integration of 157 mapped BSE corporate scrips (`backend/data/bse_scrip_mapping.json`) for corporate quarterly filing cross-verification.

4. **Regression & Build Stability Test Documentation**
   - Addition of test specifications for `regression_mf_data.test.js` (reconciling Sharpe/Sortino bounds against AMFI/factsheets), `test_dateRangeUtils.js` (fixture recovery validation), and `master_production_audit.js`.
