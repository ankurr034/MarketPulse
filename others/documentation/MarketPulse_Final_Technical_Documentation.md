# MarketPulse — Indian Stock & Mutual Fund Market Intelligence Platform
## Institutional Technical & Data Lineage Reference Manual

---

### Document Control & Metadata
- **Project Name**: MarketPulse (Institutional Equities & Mutual Fund Intelligence Platform)
- **Document Version**: 2.5.0 (Production Architecture Reference)
- **Publication Date**: September 8, 2026
- **Classification**: Authoritative Technical Specification & Operational Lineage Manual
- **Runtime Environment**: Node.js v24.18.0 (ESM `"type": "module"`), Express.js 4.19.2, React 18.3.1, Vite 5.2.8, Tailwind CSS 3.4.3
- **Data Integrity Standard**: Institutional Zero-Fabrication Standard (Missing Data = `null` → `—`)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Complete System Architecture & Data Flow](#2-complete-system-architecture--data-flow)
3. [Technology Stack & Runtime Specifications](#3-technology-stack--runtime-specifications)
4. [External Data-Source Catalog & Provenance](#4-external-data-source-catalog--provenance)
5. [Yahoo Finance Market Data Ingestion Pipeline](#5-yahoo-finance-market-data-ingestion-pipeline)
6. [Mutual Fund Data Sourcing & Universe Coverage](#6-mutual-fund-data-sourcing--universe-coverage)
7. [Official AMC Portfolio Holdings Pipeline](#7-official-amc-portfolio-holdings-pipeline)
8. [Comprehensive Stock Data Dictionary](#8-comprehensive-stock-data-dictionary)
9. [Comprehensive Mutual Fund Data Dictionary](#9-comprehensive-mutual-fund-data-dictionary)
10. [Stock Table Column-by-Column Specification](#10-stock-table-column-by-column-specification)
11. [Quarterly Revenue & Same-Quarter YoY Methodology](#11-quarterly-revenue--same-quarter-yoy-methodology)
12. [Stock Performance Calculations (1W to ALL)](#12-stock-performance-calculations)
13. [Stock Ranking Architecture (Market Cap DESC)](#13-stock-ranking-architecture)
14. [Mutual Fund AUM Ranking Architecture (4-Tier Hierarchy)](#14-mutual-fund-aum-ranking-architecture)
15. [Mutual Fund Returns Methodology (Absolute & CAGR)](#15-mutual-fund-returns-methodology)
16. [Risk Metrics & Mathematical Formulations](#16-risk-metrics--mathematical-formulations)
17. [Equity & Mutual Fund Screener Engine](#17-equity--mutual-fund-screener-engine)
18. [Classification & Category Hierarchies](#18-classification--category-hierarchies)
19. [Search, Filter, Sorting & Pagination Pipeline](#19-search-filter-sorting--pagination-pipeline)
20. [Complete API Reference Summary (All 78 Endpoints)](#20-complete-api-reference-summary)
21. [Frontend Architecture & 11-Page Routing Catalog](#21-frontend-architecture--11-page-routing-catalog)
22. [Frontend Component-by-Component Catalog](#22-frontend-component-by-component-catalog)
23. [Data Validation & Sanitization Engine](#23-data-validation--sanitization-engine)
24. [Missing Data Policy & Zero-Fabrication Rulebook](#24-missing-data-policy--zero-fabrication-rulebook)
25. [Caching, Freshness & Background Warming Architecture](#25-caching-freshness--background-warming-architecture)
26. [Error Handling, Timeouts & Circuit Breakers](#26-error-handling-timeouts--circuit-breakers)
27. [CSV Export Specifications](#27-csv-export-specifications)
28. [Upstox Broker Integration & OAuth Architecture](#28-upstox-broker-integration--oauth-architecture)
29. [Real-Time WebSocket Streaming Specification](#29-real-time-websocket-streaming-specification)
30. [Automated Test Suite Documentation](#30-automated-test-suite-documentation)
31. [Security, CORS & Environment Configuration](#31-security-cors--environment-configuration)
32. [Performance & Concurrency Architecture](#32-performance--concurrency-architecture)
33. [Master Data-Lineage Matrix](#33-master-data-lineage-matrix)
34. [Operational Q&A ("Where Does This Number Come From?")](#34-operational-qa)
35. [Formula & Calculation Master Reference](#35-formula--calculation-master-reference)
36. [Known Limitations, Glossary & Source File Appendix](#36-known-limitations-glossary--source-file-appendix)

---

## 1. Executive Summary

### 1.1 Platform Mission
**MarketPulse** is an institutional-grade financial analytics and market intelligence dashboard designed specifically for Indian capital markets. It bridges exchange trading feeds, regulatory disclosures, corporate financial filings, and mutual fund portfolios into a unified, low-latency, and strictly auditable analytical platform.

### 1.2 Core Capabilities
1. **NSE/BSE Sector Performance & Heatmaps**: Real-time tracking of all 30 Indian economic sectors (Nifty Bank, Nifty IT, Nifty Auto, etc.) with constituent advances/declines, market breadth, and sector-level valuation metrics.
2. **Indian Equities Universe Performance Directory**: Globally ranked universe of **12,536 deduplicated Indian equities** (derived from 12,538 master securities across NSE and BSE) sorted strictly by full Market Capitalization descending.
3. **Verified Corporate Quarterly Financials**: Sourced from corporate earnings reports and cross-validated with BSE filings, computing Revenue from Operations (₹ Cr) and same-quarter Year-on-Year (YoY %) growth.
4. **Mutual Fund Intelligence & Explorer**: High-performance directory of **2,743 active Direct-Growth mutual fund schemes**, featuring 4-tier AUM ranking (Global, Category, Subcategory, Sector), multi-period CAGR returns, and historical RBI-aligned risk ratios.
5. **Authentic Portfolio Holdings**: Ingestion of verified constituent stock holdings and sector weights for flagship mutual fund schemes.
6. **Multi-Factor Screener**: Quantitative stock and mutual fund screener powered by `isResearchUsable()` filters.
7. **Institutional Brokerage & WebSockets**: Upstox OAuth 2.0 broker portfolio synchronization and Socket.io real-time tick streaming.

### 1.3 The Zero-Fabrication Standard
MarketPulse enforces a strict rule of data authenticity:
- **Real Verified Data**: Formatted in standard Indian numbering conventions (₹ Crores, Lakhs, 2 decimal percentages).
- **Missing or Unreported Data**: Recorded internally as `null` and displayed in all tables and cards as an em-dash (`—`).
- **Zero Mock Values**: The system never generates synthetic placeholder holdings, simulated prices, or default revenue figures.

---

## 2. Complete System Architecture & Data Flow

### 2.1 High-Level Architecture Diagram
```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                  EXTERNAL DATA SOURCES                                    │
│   Yahoo Finance v2   │  AMFI India (NAVAll)  │  Upvaly FinAPI  │  BSE Filings  │  RBI T-Bills │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Raw REST / HTTP GET / Sockets
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BACKEND INGESTION LAYER                                   │
│  YahooFinanceService.js   │  AmfiImportService.js          │  OfficialAmcPortfolioService │
│  QuarterlyRevenueService  │  BseFinancialDataService.js    │  HoldingsFallbackService.js  │
│  UpstoxInstrumentService  │  MacroDataService.js           │  allFundsDirectoryService.js │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Concurrency Throttling & Deduplication
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                            VALIDATION & NORMALIZATION GATEWAY                             │
│     MarketDataGateway.js         │    MarketDataValidator.js (Session & Limits)           │
│     - Upper / Lower Bounds       │    - Market Session Detection (LIVE vs EOD)            │
│     - Strict INR Currency Normal │    - Entity Classification & Banking EBIT Suppression  │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Normalized Data Models
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BUSINESS & RANKING LOGIC                                  │
│  SectorDataService.js            │  IndianMfRankingService.js   │  RiskAnalyticsService   │
│  - 12,536 Stock Cap Ranking      │  - 4-Tier AUM Ranking        │  - 3Y Trailing Sharpe   │
│  - Sector Breadth Rollup         │  - Direct-Growth Filtering   │  - Sortino Downside Dev │
│  - Background Warming (288 stks) │  - 716 Verified AUM (26.1%)  │  - Historical RBI Yield │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Route Serialization & Fast In-Memory Cache
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXPRESS API ROUTERS (21)                                  │
│  /api/sectors  │  /api/stocks  │  /api/indian-mf  │  /api/mf  │  /api/screener  │  /health│
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ JSON REST & Socket.io Push (Port 5001)
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND REDUX & COMPONENT LAYER                             │
│  Redux Toolkit (marketSlice.js)  │  Workbench Context            │  Socket.io Listener    │
│  SectorHeatmap.jsx (Stocks View) │  IndianMfSectorAnalysis.jsx   │  TradingViewChart.jsx  │
│  AllMutualFundsDirectory.jsx     │  ScreenerPage.jsx             │  SmartMoneyTracker.jsx │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Runtime Specifications

### 3.1 Backend Specifications
- **Node.js**: `v24.18.0` with native ECMAScript Modules (`"type": "module"` in `backend/package.json`).
- **HTTP Server**: Express.js `v4.19.2` integrated with native `node:http`.
- **WebSocket Server**: `socket.io` `v4.7.5` handling real-time rooms (`ticks`, `indices`, `stock:SYMBOL`).
- **Core Dependencies**:
  - `yahoo-finance2`: `v4.0.0` (Configured with `validateResult: false` to suppress non-fatal schema warnings).
  - `mathjs`: `v15.2.0` (Matrix algebra, sample covariance, standard deviation, downside semi-variance).
  - `axios`: `v1.6.8` (Equipped with default Chrome headers and IPv4-first DNS resolution).
  - `mongoose`: `v8.3.1` (MongoDB persistence for historical caches).
  - `redis`: `v6.1.0` (Distributed caching with graceful in-memory fallback).
  - `node-cron`: `v4.6.0` (Automated cron scheduling for AMFI NAV updates and background cache warming).
  - `upstox-js-sdk`: `v2.30.0` (Upstox broker API client).

### 3.2 Frontend Specifications
- **Framework**: React `v18.3.1` (Strict Mode, functional components, hooks).
- **Bundler & Build Tool**: Vite `v5.2.8` (Rollup ESM bundler; production build: 5.84s, 1,947 modules).
- **Styling**: Tailwind CSS `v3.4.3` with dark-mode color palettes, flex/grid layouts.
- **State Management**: Redux Toolkit `v2.2.3` (`marketSlice.js` managing stocks, sectors, filters).
- **Financial Charting**:
  - `lightweight-charts` `v4.1.3` (TradingView Canvas-rendered candlestick charts).
  - `recharts` `v2.12.5` (Responsive SVG area, bar, and pie charts).
- **Iconography**: `lucide-react` `v0.368.0`.

---

## 4. External Data-Source Catalog & Provenance

| Data Domain | External Provider | Ingestion Endpoint / Method | Cadence | Units | Transformation Applied | Missing Data Representation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Indian Equities Quotes** | Yahoo Finance | `yahooFinance.quote()` | 15-min delayed | INR (₹) | Scaled to ₹ Cr, validated via `MarketDataValidator` | `ltp: null`, `change: 0.0` |
| **Quarterly Financials** | Yahoo / BSE | `QuarterlyRevenueService.js` | Quarterly | Base Curr | Currency normalized to INR, divided by $10^7$ | `revenue: null`, display `—` |
| **Index Historicals** | Yahoo Finance | `yahooFinance.chart()` | Daily EOD | Index pts | Percentage return math across 1W, 1M, 1Y, etc. | `returns: null` |
| **MF Daily NAV** | AMFI Official | `NAVAll.txt` HTTP GET | Daily (~9 PM) | INR / unit | Parsed pipe-delimited text into active Direct-Growth schema | Retains last verified NAV |
| **MF AUM Disclosures** | AMFI / Upvaly | Factsheets / finapi JSON | Monthly | ₹ Crores | Verified cache loading (`verified_aum_cache.json`) | `aumCr: null`, `rank: null` (`—`) |
| **Risk-Free Rate (Rf)** | Reserve Bank of India | `MacroDataService.js` | Monthly / Annual | Decimal | Mapped to historical RBI 91-Day T-bill yields (6.25% in 2026) | Default: 6.25% (0.0625) |
| **Instrument Master** | Upstox API | Upstox Complete Instrument CSV | Pre-market daily | CSV / JSON | Symbol canonicalization (`RELIANCE.NS` → `NSE_EQ`) | Local master fallback |

---

## 5. Yahoo Finance Market Data Ingestion Pipeline

### 5.1 Concurrency-Controlled Chunking
Equities quotes are requested in concurrency-controlled batches of 25 symbols using `yahooFinance.quote(chunk, {}, { validateResult: false })`:
```
Yahoo Finance Raw Quote Payload
  ├── regularMarketPrice ───────► ltp / price (Float INR)
  ├── regularMarketPreviousClose ► previousClose (Float INR)
  ├── regularMarketOpen ────────► open (Float INR)
  ├── regularMarketDayHigh ─────► dayHigh (Float INR)
  ├── regularMarketDayLow ──────► dayLow (Float INR)
  ├── fiftyTwoWeekHigh ─────────► high52 (Float INR)
  ├── fiftyTwoWeekLow ──────────► low52 (Float INR)
  ├── marketCap ────────────────► Math.floor(raw / 10,000,000) ──► marketCap (₹ Cr)
  ├── trailingPE / forwardPE ───► pe (Float, 2 decimals)
  ├── epsTrailingTwelveMonths ──► eps (Float, 2 decimals)
  └── regularMarketVolume ──────► volume (Integer shares)
```

### 5.2 Circuit Breaker Protection
To prevent cascading connection drops when Yahoo Finance throttles requests, `SectorDataService.js` incorporates an automated circuit breaker:
- Tripped after consecutive quote chunk failures.
- Temporarily switches ingestion to cached or local offline data for **60 seconds**.
- Auto-resets upon successful upstream health probe.

---

## 6. Mutual Fund Data Sourcing & Universe Coverage

### 6.1 Strict Direct-Growth Universe Definition
The explorer directory contains **2,743 active Direct-Growth mutual fund schemes** loaded by `allFundsDirectoryService.js` and stored in `backend/data/amfi_active_schemes.json`.
- All schemes must satisfy `isStrictDirectGrowth(name)`.
- Rejects: Regular plans, IDCW / dividend payout options, bonus options, and institutional share classes.

### 6.2 Transparent AUM Coverage Statistics
MarketPulse enforces honest reporting of AUM coverage:
- **Verified AUM Schemes**: Exactly **716 schemes** (**26.10% coverage**).
- **Missing / Unreported AUM Schemes**: Exactly **2,027 schemes** (**73.90% coverage**).
- **Policy**: Schemes without verified disclosures receive `aumCr: null` and `indiaMfRank: null`. They are never populated with arbitrary guesses and render cleanly as `—`.

---

## 7. Official AMC Portfolio Holdings Pipeline

### 7.1 Flagship Supported Schemes
Authentic regulatory portfolio holdings disclosures are ingested and parsed for **7 flagship schemes** via `OfficialAmcPortfolioService.js` and `HoldingsFallbackService.js`:
1. `122639`: Parag Parikh Flexi Cap Fund - Direct Plan - Growth
2. `118955`: HDFC Flexi Cap Fund - Direct Plan - Growth Option
3. `118989`: HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth
4. `119609`: SBI Equity Hybrid Fund - Direct Plan - Growth
5. `120586`: ICICI Prudential Large Cap Fund - Direct Plan - Growth
6. `118778`: Nippon India Small Cap Fund - Direct Plan - Growth Option
7. `146951`: ICICI Prudential Bharat Consumption Fund - Direct Plan - Growth (Open-Ended)

### 7.2 Unsupported Scheme Behavior (Zero Fabrication)
For all mutual fund schemes outside the 7 verified flagship schemes:
- The endpoint `GET /api/mf/:schemeCode/holdings` returns:
  ```json
  {
    "status": "DATA_UNAVAILABLE",
    "message": "Detailed constituent holdings disclosure not actively parsed for this scheme. Zero-Fabrication standard enforced.",
    "holdings": [],
    "sectorAllocations": []
  }
  ```
- No synthetic stock allocations are generated. The UI presents an explicit explanatory notice.

---

## 8. Comprehensive Stock Data Dictionary

| Field | Meaning | Source | Raw Key | Unit | Normalization Applied | Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `symbol` | Exchange Ticker Symbol | Master List | `symbol` | String | Appends `.NS` or `.BO` | Required |
| `name` | Registered Corporate Title | Master / Quote | `shortName` | String | Whitespace trimmed | `symbol` |
| `sector` | Economic Sector Taxonomy | `ALL_SECTORS` | `sectorName` | String | Mapped to 30 sectors | 'General' |
| `ltp` | Last Traded Price | Yahoo Quote | `regularMarketPrice` | INR (₹) | Must be > 0 | `null` |
| `previousClose` | Prior Session Close Price | Yahoo Quote | `regularMarketPreviousClose` | INR (₹) | Must be > 0 | `ltp` |
| `change` | Absolute Daily Price Move | Computed | `ltp - prevClose` | INR (₹) | Float (2 decimals) | `0.0` |
| `changePercent` | Daily Percentage Return | Computed | `(change / prevClose) * 100` | % | Float (2 decimals) | `0.0` |
| `marketCap` | Total Market Capitalization | Yahoo Quote | `marketCap` | ₹ Crores | Math.floor(raw / 10^7) | `null` |
| `indiaStockRank` | National Market-Cap Rank | Computed | Rank index | Integer | 1..12536 sorted by MCap DESC | `null` |
| `revenue` | Latest Quarterly Revenue | Quarterly Service| `operatingRevenue` | ₹ Crores | Divided by 10^7, currency converted | `null` (`—`) |
| `revenueYoY` | Same-Quarter YoY Growth | Computed | Calculated | % | Same-quarter prior year formula | `null` (`—`) |
| `pe` | Price-to-Earnings Ratio | Yahoo Quote | `trailingPE` | Ratio | Float (2 decimals) | `null` (`—`) |
| `eps` | Earnings Per Share (TTM) | Yahoo Quote | `epsTrailingTwelveMonths` | INR (₹) | Float (2 decimals) | `null` (`—`) |
| `ebit` | Operating Earnings | Quarterly Service| `operatingIncome` | ₹ Crores | Suppressed for Financials/Banks | `null` (`—`) |
| `high52` | 52-Week High Price | Yahoo Quote | `fiftyTwoWeekHigh` | INR (₹) | Float (2 decimals) | `null` |
| `low52` | 52-Week Low Price | Yahoo Quote | `fiftyTwoWeekLow` | INR (₹) | Float (2 decimals) | `null` |
| `percentFrom52WLow`| Recovery from 52W Low | Computed | `(ltp - low52)/low52 * 100`| % | Float (2 decimals) | `null` |
| `percentFromATH` | Drawdown from All-Time High | Computed | `(ltp - ath)/ath * 100` | % | Negative Float (2 decimals) | `null` |
| `returns['1W']` | 1-Week Trailing Return | Yahoo Chart | Close 7d ago | % | Simple percentage return | `null` (`—`) |
| `returns['1M']` | 1-Month Trailing Return | Yahoo Chart | Close 30d ago | % | Simple percentage return | `null` (`—`) |
| `returns['1Y']` | 1-Year Trailing Return | Yahoo Chart | Close 365d ago | % | Simple percentage return | `null` (`—`) |
| `returns['3Y']` | 3-Year Trailing Return | Yahoo Chart | Close 3yr ago | % | Simple percentage return | `null` (`—`) |
| `returns['5Y']` | 5-Year Trailing Return | Yahoo Chart | Close 5yr ago | % | Simple percentage return | `null` (`—`) |
| `returns['ALL']` | Lifetime Trailing Return | Yahoo Chart | Lifetime close | % | Simple percentage return | `null` (`—`) |
| `volume` | Daily Traded Share Volume | Yahoo Quote | `regularMarketVolume` | Shares | Integer count | `0` |

---

## 9. Comprehensive Mutual Fund Data Dictionary

| Field | Meaning | Source | Unit | Description / Computation | Missing Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `schemeCode` | AMFI Scheme Code | AMFI Portal | String | Unique 6-digit identifier | Required |
| `schemeName` | Registered Fund Title | AMFI Portal | String | Canonical direct growth scheme title | Required |
| `amc` | Asset Management Company | AMFI Portal | String | Standardized AMC title (e.g. PPFAS, HDFC) | 'Other' |
| `category` | Broad Asset Category | AMFI Taxonomy | String | Equity, Debt, Hybrid, Solution, Other | 'Other' |
| `subcategory` | SEBI Mandated Subcategory | AMFI Taxonomy | String | Flexi Cap, Large Cap, Small Cap, Liquid | 'Other' |
| `nav` | Net Asset Value per unit | AMFI Daily Feed | INR (₹) | Daily official net asset value | `null` (`—`) |
| `navDate` | Date of Effective NAV | AMFI Daily Feed | YYYY-MM-DD | Date string of reported NAV | 'Unavailable' |
| `aumCr` | Assets Under Management | AMC Factsheet | ₹ Crores | Verified reported AUM in Crores | `null` (`—`) |
| `aumAsOfDate` | Date of AUM Disclosure | AMC Factsheet | YYYY-MM-DD | Period end of AUM disclosure | `null` |
| `indiaMfRank` | Global National AUM Rank | Computed | Integer | 1..N across ALL Indian schemes by AUM DESC | `null` (`—`) |
| `indiaMfCategoryRank`| Category AUM Rank | Computed | Integer | 1..M within category by AUM DESC | `null` (`—`) |
| `indiaMfSubcategoryRank`| Subcategory AUM Rank | Computed | Integer | 1..K within subcategory by AUM DESC | `null` (`—`) |
| `indiaMfSectorRank`| Sectoral Thematic Rank | Computed | Integer | 1..P within thematic sector by AUM DESC | `null` (`—`) |
| `oneYearChangePct` | 1-Year Absolute Return | Computed | % | `((NAV_t - NAV_1Y) / NAV_1Y) * 100` | `null` (`—`) |
| `threeYearCagr` | 3-Year CAGR Return | Computed | % p.a. | `((NAV_t / NAV_3Y)^(1/3) - 1) * 100` | `null` (`—`) |
| `fiveYearCagr` | 5-Year CAGR Return | Computed | % p.a. | `((NAV_t / NAV_5Y)^(1/5) - 1) * 100` | `null` (`—`) |
| `inceptionCagr` | Lifetime CAGR Return | Computed | % p.a. | `((NAV_t / NAV_inc)^(1/Y) - 1) * 100` | `null` (`—`) |
| `sharpeRatio` | Primary Sharpe Ratio | LiveMfAnalytics | Ratio | 3Y Trailing Sharpe (fallback to Inception < 36M) | `null` (`—`) |
| `sortinoRatio` | Primary Sortino Ratio | LiveMfAnalytics | Ratio | 3Y Trailing Sortino (fallback to Inception < 36M)| `null` (`—`) |
| `riskRatios['3Y']` | Explicit 3Y Risk Ratios | LiveMfAnalytics | Object | `{ sharpe, sortino, volatility, return }` | `null` |
| `riskRatios['All']`| Inception Risk Ratios | LiveMfAnalytics | Object | `{ sharpe, sortino, volatility, return }` | `null` |
| `standardDeviation`| Annualized Volatility | Risk Engine | % p.a. | Monthly sample std dev multiplied by $\sqrt{12}$ | `null` (`—`) |
| `beta` | Market Sensitivity Factor | Risk Engine | Factor | Covariance(Fund, Nifty50) / Variance(Nifty50) | `1.0` |
| `alpha` | Jensen's Alpha | Risk Engine | % p.a. | Excess return over CAPM expected benchmark return| `null` |
| `isOpenEnded` | Open-Ended Status Flag | Master Filter | Boolean | Distinguishes open-ended from closed series | `true` |
| `metricProvenance`| Source & Method Stamp | Audit Engine | Object | Input source, formula label, retrieved timestamp | Auditable |

---

## 10. Stock Table Column-by-Column Specification

In `frontend/src/pages/SectorHeatmap.jsx`, the primary Stocks Performance table presents 9 distinct column groups:
1. **Rank (`#`)**: National market capitalization rank (`indiaStockRank`), formatted as `#1`, `#2`, etc.
2. **Stock**: Trading ticker with NSE/BSE badge and full registered company name.
3. **Sector**: Color-coded badge identifying the primary economic sector.
4. **Revenue (₹ Cr) / Current Qtr YoY**:
   - Line 1: Operating revenue in ₹ Crores (e.g. `₹72,275 Cr`).
   - Line 2: Colored percentage badge for same-quarter YoY (`+13.93%` emerald, `-X%` rose).
   - **Rule 12**: In sector overview rows, revenue is strictly `null` (`—`).
5. **Market Cap (₹ Cr)**: Market capitalization formatted without decimals (e.g. `₹20,16,540 Cr`).
6. **52W H/L % (Recovery from Base / Down from ATH)**:
   - Dual badge: `+24.50% / -3.20%`.
   - Sub-text reveals actual historical low and high prices: `(52W L: ₹2,150.00) (ATH: ₹3,080.00)`.
7. **Price (₹)**: Real-time LTP with daily percentage move (`₹2,980.50 (+0.82%)`).
8. **Performance Matrix (%)**: Multi-period trailing returns (1W, 1M, 6M, 1Y, 3Y, 5Y, ALL).
9. **Valuation Multiples**:
   - **P/E**: Trailing Price to Earnings ratio.
   - **EPS (₹)**: Trailing 12-month earnings per share.
   - **EBIT (₹ Cr)**: Operating income in Crores (suppressed to `—` for financial/banking scrips).

---

## 11. Quarterly Revenue & Same-Quarter YoY Methodology

### 11.1 Methodological Invariants (`QuarterlyRevenueService.js`)
1. **Real Data Sourcing**: Ingested directly from quarterly financial filings via Yahoo Finance and BSE corporate disclosures.
2. **Calendar-Quarter Prior Year Matching (`findSameQuarterPriorYear`)**:
   $$\text{YoY \%} = \frac{\text{Rev}_{\text{Current Qtr}} - \text{Rev}_{\text{Same Qtr Prior Year}}}{|\text{Rev}_{\text{Same Qtr Prior Year}}|} \times 100$$
   *Strictly compares corresponding calendar quarters (e.g., Q1 FY27 vs Q1 FY26), never sequential quarter-on-quarter (QoQ).*
3. **Zero Denominator Protection**: If prior year revenue is zero or missing, YoY returns `null` (no `Infinity` or `NaN`).
4. **Sector Row Invariant (Rule 12)**: Sector rows return `revenue: null` and `revenueYoY: null`. Summing incomplete constituent filings is strictly prohibited.

### 11.2 Worked Reconciliation: TCS vs. Market Aggregators
- **TCS Ind AS Filing (Quarter Ended June 30, 2026)**:
  - **Revenue from Operations**: **₹72,275 Cr** (MarketPulse / Standard Accounting).
  - **Other Income**: **₹1,568 Cr**.
  - **Total Income**: **₹73,843 Cr** (Displayed by generic portals under the ambiguous label "Revenue").
- **YoY Growth Calculation**:
  - Q1 FY27 Operating Revenue: ₹72,275 Cr
  - Q1 FY26 Operating Revenue: ₹63,437 Cr
  - Growth: `((72,275 - 63,437) / 63,437) * 100` = **+13.93%**.

---

## 12. Stock Performance Calculations

Trailing returns are computed in `YahooFinanceService.js` using calendar-day offsets:
- **1 Week (1W)**: Historical close 7 calendar days prior (`now - 7d`).
- **1 Month (1M)**: Historical close 30 calendar days prior (`now - 30d`).
- **6 Months (6M)**: Historical close 180 calendar days prior (`now - 180d`).
- **1 Year (1Y)**: Historical close 365 calendar days prior (`now - 365d`).
- **3 Years (3Y)**: Historical close 3 calendar years prior (`now - 3 * 365.25d`).
- **5 Years (5Y)**: Historical close 5 calendar years prior (`now - 5 * 365.25d`).
- **All-Time (ALL)**: First recorded close in the lifetime monthly chart.
$$\text{Return \%} = \frac{P_{\text{Current}} - P_{\text{Historical}}}{P_{\text{Historical}}} \times 100$$

---

## 13. Stock Ranking Architecture

Implemented in `SectorDataService.js` (`_getOrComputeGlobalRankMap`):
1. **Universe**: 12,536 unique deduplicated Indian stocks.
2. **Metric**: Full Market Capitalization descending.
3. **Cache**: Cached for 1 hour; warmed in background on server startup.
4. **Rank Immutability**: Client-side filtering, searching, or pagination does NOT re-number ranks. Reliance Industries remains `#1` regardless of active filters.

---

## 14. Mutual Fund AUM Ranking Architecture

Implemented in `IndianMfRankingService.js` (`rankMutualFundsByAUM`):
- **Criterion**: Verified Assets Under Management in Crores (`aumCr`) descending.
- **4-Tier Hierarchy**:
  1. `indiaMfRank`: Rank 1..N across ALL verified mutual fund schemes in India.
  2. `indiaMfCategoryRank`: Rank 1..M within broad category (Equity, Debt, Hybrid).
  3. `indiaMfSubcategoryRank`: Rank 1..K within SEBI subcategory (Flexi Cap, Large Cap, Small Cap).
  4. `indiaMfSectorRank`: Rank 1..P within thematic sector (Technology, Healthcare, Banking).
- **Tie-Breaking Hierarchy**:
  1. Primary: `aumCr` DESC
  2. Secondary: `schemeName` ASC (alphabetical)
  3. Tertiary: `schemeCode` ASC (numerical)
- **Unverified AUM Isolation**: The 2,027 schemes with unverified AUM receive `null` across all ranking tiers and sort to the bottom.

---

## 15. Mutual Fund Returns Methodology

Implemented in `FinancialMath.js` and `FundAnalysisEngine.js`:
- **Holding Period <= 1 Year (1W, 1M, 3M, 6M, 1Y)**: Absolute Return:
  $$\text{Absolute Return \%} = \frac{\text{NAV}_{\text{End}} - \text{NAV}_{\text{Start}}}{\text{NAV}_{\text{Start}}} \times 100$$
- **Holding Period > 1 Year (3Y, 5Y, Since Inception)**: Compound Annual Growth Rate (CAGR):
  $$\text{CAGR \%} = \left[ \left( \frac{\text{NAV}_{\text{End}}}{\text{NAV}_{\text{Start}}} \right)^{\frac{1}{\text{Years}}} - 1 \right] \times 100$$
  *Where $\text{Years} = (\text{Timestamp}_{\text{End}} - \text{Timestamp}_{\text{Start}}) / (365.25 \times 86,400,000)$.*

---

## 16. Risk Metrics & Mathematical Formulations

Implemented in `LiveMfAnalyticsService.js` and `RiskAnalyticsService.js`:

### 16.1 Sharpe Ratio (3-Year Trailing Primary)
$$\text{Sharpe} = \frac{\bar{R}_m - \bar{R}_{f,m}}{\sigma_m} \times \sqrt{12}$$
- $\bar{R}_m$: Mean monthly return over the evaluation window.
- $\bar{R}_{f,m}$: Monthly risk-free rate matched to historical RBI 91-Day T-bill yields (6.25% in 2026).
- $\sigma_m$: Sample standard deviation of excess monthly returns ($N-1$ denominator).
- **Fallback Rule**: Exposed `sharpeRatio` uses the **3-Year Trailing** window, falling back to **Since Inception** only when historical NAV history is under 36 months.

### 16.2 Sortino Ratio
$$\text{Sortino} = \frac{\bar{R}_m - \bar{R}_{f,m}}{\text{Downside Deviation}_m} \times \sqrt{12}$$
$$\text{Downside Deviation} = \sqrt{ \frac{1}{N} \sum_{t=1}^{N} \min(R_{m,t} - R_{f,m,t}, 0)^2 }$$

### 16.3 Jensen's Alpha & Market Beta
$$\beta = \frac{\text{Covariance}(R_{\text{Fund}}, R_{\text{Nifty50}})}{\text{Variance}(R_{\text{Nifty50}})}$$
$$\alpha = R_{\text{Fund, Annual}} - [R_f + \beta \times (R_{\text{Nifty50, Annual}} - R_f)]$$

### 16.4 Ground-Truth Benchmark Reconciliation
- **SBI Midcap Direct-Growth**: 3Y Sharpe **0.43** (Verified within official factsheet bounds 0.40–0.45).
- **ICICI Prudential Bharat Consumption**: 3Y Sharpe **0.30–0.35** (badged as Open-Ended).
- **Nippon India Growth**: 3Y Sharpe **0.74–0.81**.

---

## 17. Equity & Mutual Fund Screener Engine

Implemented in `backend/services/ScreenerService.js` and `backend/routes/screener.js`:
- **Multi-Metric Filtering**: Market Capitalization, P/E ratio, Revenue YoY growth, 52-Week low recovery, multi-period trailing returns, AUM, Sharpe ratio, and expense ratio.
- **`isResearchUsable()` Protocol**:
  - Automatically filters out inactive corporate shells, illiquid penny stocks (price < ₹2), and instruments missing trading quotes.
  - Ensures research analysts evaluate only active, liquid, and financially reporting entities.

---

## 18. Classification & Category Hierarchies

### 18.1 30 Indian Economic Sectors
1. Nifty Bank (`^NSEBANK`)
2. Nifty IT (`^CNXIT`)
3. Nifty Auto (`^CNXAUTO`)
4. Nifty Pharma (`^CNXPHARMA`)
5. Nifty FMCG (`^CNXFMCG`)
6. Nifty Metal (`^CNXMETAL`)
7. Nifty Energy (`^CNXENERGY`)
8. Nifty Realty (`^CNXREALTY`)
9. Nifty PSU Bank (`^CNXPSUBANK`)
10. Nifty Financial Services (`^CNXFIN`)
11. Nifty Media (`^CNXMEDIA`)
12. Nifty Infra (`^CNXINFRA`)
13. Nifty Consumer Durables (`^CNXCONSUM`)
14. Nifty 50 Index (`^NSEI`)
15. Nifty 100 Index (`^CNX100`)
16. Nifty Next 50 Index (`^NSMIDCP`)
17. Nifty Midcap 50 Index (`^NSEMDCP50`)
18. Nifty Smallcap 100 Index (`^CNXSC`)
19. Nifty 500 Index (`^CRSLDX`)
20. Technology
21. Healthcare
22. Financials
23. Energy
24. Consumer Discretionary
25. Consumer Staples
26. Industrials
27. Materials
28. Utilities
29. Real Estate
30. Communication Services

### 18.2 SEBI Mutual Fund Taxonomies
- **Equity**: Flexi Cap, Large Cap, Mid Cap, Small Cap, Large & Mid Cap, Multi Cap, Focused, ELSS Tax Saver, Value/Contra, Dividend Yield.
- **Debt**: Liquid, Overnight, Ultra Short Duration, Money Market, Short Duration, Corporate Bond, Banking & PSU, Gilt.
- **Hybrid**: Dynamic Asset Allocation (Balanced Advantage), Aggressive Hybrid, Multi Asset Allocation, Arbitrage, Equity Savings.

---

## 19. Search, Filter, Sorting & Pagination Pipeline

```
Full Ingested Dataset (12,536 Stocks / 2,743 Direct Schemes)
         │
         ▼
1. Free-Text Search (Symbol, Company Name, AMC, ISIN Prefix)
         │
         ▼
2. Category / Sector / Tab Filtering (Gainers, Losers, Market Cap)
         │
         ▼
3. Deterministic Sorting (User Selected Key ASC/DESC; Default Rank)
         │
         ▼
4. Virtualized Pagination Slice (Start = (page - 1) * limit)
         │
         ▼
Virtual DOM Render Table
```
*Key Invariant: Global rank assignments are computed at Step 0 and remain immutable across Steps 1 through 4.*

---

## 20. Complete API Reference Summary

The backend exposes **78 distinct REST and WebSocket endpoints** across 21 router modules:
- `/api/market` (7 endpoints)
- `/api/sectors` (6 endpoints)
- `/api/stocks` (3 endpoints)
- `/api/upstox` (4 endpoints)
- `/api/mf` (11 endpoints)
- `/api/portfolio` (5 endpoints)
- `/api/analytics` (3 endpoints)
- `/auth` (1 endpoint)
- `/api/news` (2 endpoints)
- `/api/economy` (2 endpoints)
- `/api/ai` (2 endpoints)
- `/api/risk` (1 endpoint)
- `/api/etf` (3 endpoints)
- `/api/smart-money` (2 endpoints)
- `/api/countries` (1 endpoint)
- `/api/screener` (5 endpoints)
- `/api/assets` (3 endpoints)
- `/api/sector-trends` (2 endpoints)
- `/api/indian-mf` (12 endpoints)
- `/api/comparison` (1 endpoint)
- `/api` (Holdings Fallback) (2 endpoints)
- `/health` (1 endpoint)

*(For full parameter structures and sample responses, see `MARKETPULSE_API_REFERENCE.md`).*

---

## 21. Frontend Architecture & 11-Page Routing Catalog

The frontend is structured in `frontend/src/App.jsx` across 11 primary pages:
1. **`SectorHeatmap.jsx`** (`/sectors`, `/heatmap`): Stocks Performance, Sector Tables, CSV Export.
2. **`IndianMfSectorAnalysis.jsx`** (`/indian-mf`, `/mutual-funds`): Mutual Funds Hub, Thematic Groups, AUM Ranks.
3. **`Dashboard.jsx`** (`/`, `/dashboard`): Executive overview, indices ticker, breadth, top performers.
4. **`StockDetails.jsx`** (`/stocks/:symbol`): Single-stock profile, financial statements, lightweight chart.
5. **`MfAnalyticsDashboard.jsx`** (`/analytics/mf`): Fund analytics workbench, peer comparison matrix.
6. **`EconomicDashboard.jsx`** (`/economy`): RBI repo rates, CPI inflation, GDP timeseries.
7. **`SmartMoneyTracker.jsx`** (`/smart-money`): Institutional FII / DII activity flows.
8. **`GlobalComparison.jsx`** (`/comparison`): Cross-market asset comparison workbench.
9. **`ScreenerPage.jsx`** (`/screener`): Quantitative stock & mutual fund screener with `isResearchUsable()`.
10. **`EtfTracker.jsx`** (`/etf`): Indian ETF listings and category performance.
11. **`Portfolio.jsx`** (`/portfolio`): User portfolio tracking and Upstox brokerage sync.

---

## 22. Frontend Component-by-Component Catalog

- **`AllMutualFundsDirectory.jsx`**: Virtualized table rendering all 2,743 Direct-Growth schemes.
- **`MfRankingTable.jsx`**: Table rendering top mutual funds with AUM badges and Scheme 146951 `(Open-Ended)` indicator.
- **`TradingViewChart.jsx`**: Canvas-rendered financial candlestick chart supporting multi-timeframe intervals.
- **`MiniRatioIndicator.jsx`**: Visual gauge indicator for Sharpe and Sortino ratios with color-coded risk bands.
- **`ExpandableAssetRow.jsx`**: Accordion row component displaying constituent equity holdings and sector weights.
- **`MarketBreadthWidget.jsx`**: Advance/Decline visual ratio bar.
- **`TopMoversWidget.jsx`**: Real-time gainers, losers, and volume shockers.

---

## 23. Data Validation & Sanitization Engine

Implemented in `backend/services/MarketDataValidator.js`:
- **Sanity Bounds**: LTP must be $> 0$; filters out corrupt `NaN` or inverted prices.
- **Market Hours Awareness**: Classifies sessions as `LIVE` (09:15 to 15:30 IST) or `EOD`.
- **Entity Classification**: Identifies banking and NBFC entities to enforce GAAP/IFRS EBIT suppression.
- **Schema Validation Suppression**: Suppresses noisy Yahoo v4 schema warnings, preventing bulk quote drops.

---

## 24. Missing Data Policy & Zero-Fabrication Rulebook

1. **Explicit `null` Storage**: Unreported data is saved strictly as `null` in databases and JSON responses.
2. **Standard Presentation**: Missing values render cleanly as `—` (em-dash).
3. **No Synthetic Fills**: No `revenue || 0`, no `aum || 1000`, no simulated prices.
4. **Sector Revenue Invariant**: Sector row revenues are strictly `null` (`—`) to prevent partial summing.

---

## 25. Caching, Freshness & Background Warming Architecture

- **In-Memory Cache TTLs**:
  - Sector Overview: 5 minutes (`CACHE_TTL = 300,000 ms`)
  - Symbol Quotes: 3 minutes (`SYMBOL_CACHE_TTL = 180,000 ms`)
  - Historical Daily Analysis: 1 hour (`HISTORICAL_CACHE_TTL = 3,600,000 ms`)
  - Mutual Fund Directory: 30 minutes (`CACHE_TTL = 1,800,000 ms`)
- **Proactive Background Warming (`warmFinancialsCache`)**:
  - Warms 288 priority constituent and large-cap stocks in background batches of 3 every 300ms on startup.
  - Ensures fast initial responses without UI thread blocking.

---

## 26. Error Handling, Timeouts & Circuit Breakers

- **10-Second Timeouts**: All external network requests wrapped in `withTimeout(promise, 10000, fallback)`.
- **Circuit Breakers**: Tripped after consecutive upstream failures; recovers after 60s.
- **Graceful Partial Failures**: Uses `Promise.allSettled()` across batch requests; single symbol drop does not crash table.

---

## 27. CSV Export Specifications

Exported directly from `SectorHeatmap.jsx` via `handleExportCSV`:
- **Filename**: `all_stocks_global_ranking_YYYY-MM-DD.csv`
- **Columns**: `#`, `Stock`, `Sector`, `Revenue (Cr INR)`, `Current Qtr YoY (%)`, `Market Cap (Cr INR)`, `Base Recovery (%)`, `ATH Distance (%)`, `Price (INR)`, `1W (%)`, `1M (%)`, `6M (%)`, `1Y (%)`, `3Y (%)`, `5Y (%)`, `ALL (%)`, `P/E`, `EPS (INR)`, `EBIT (Cr INR)`.

---

## 28. Upstox Broker Integration & OAuth Architecture

- **OAuth 2.0 Flow**: `/api/upstox/login` redirects to Upstox authorization server; `/auth/upstox/callback` exchanges code for JWT.
- **Portfolio Sync**: `POST /api/portfolio/mf/sync-upstox` fetches active user holdings and maps to AMFI scheme codes.

---

## 29. Real-Time WebSocket Streaming Specification

- **Rooms**: `ticks` (all equities ticks), `indices` (benchmark index pushes), `stock:SYMBOL` (individual candlestick updates).
- **Port**: Integrated on primary backend port `5001`.

---

## 30. Automated Test Suite Documentation

28 test suites validate the system. Critical benchmarks include:
- `test_quarterly_revenue_suite.js`: 94 PASSED, 0 FAILED.
- `test_quarterly_revenue_correctness.test.js`: 175 PASSED.
- `regression_mf_data.test.js`: 8 PASSED, 0 FAILED.
- `test_dateRangeUtils.js`: 6 PASSED, 0 FAILED.
- `master_production_audit.js`: 16 PASSED in 1.6s.
- `frontend build`: 1,947 modules transformed in 5.8s.

---

## 31. Security, CORS & Environment Configuration

- **Mandatory Disclaimer Header**: `X-Data-Disclaimer: Delayed data - not investment advice`.
- **CORS Policy**: Whitelists frontend origins in local and production environments.
- **Port**: Backend on `5001`, Frontend on `3000`.

---

## 32. Performance & Concurrency Architecture

- **Concurrent Deduplication**: Multiple simultaneous requests for the same stock batch resolve via a single shared in-flight promise.
- **Latency Benchmarks**:
  - Cached `/api/sectors`: **< 50 ms**
  - Cached `/api/sectors/all-stocks`: **< 400 ms**
  - Live stock quote batch: **< 1,200 ms**

---

## 33. Master Data-Lineage Matrix

| Metric | UI Location | API Route | Service Layer | Source | Transformation | Formatting |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Stock Price** | `SectorHeatmap.jsx` | `/api/sectors/all-stocks` | `MarketDataGateway` | Yahoo Finance | Validated > 0 | `₹X,XXX.XX` |
| **Stock Revenue** | `SectorHeatmap.jsx` | `/api/sectors/all-stocks` | `QuarterlyRevenueService`| Yahoo / BSE | Normalization, / $10^7$ | `₹XX,XXX Cr` |
| **Revenue YoY** | `SectorHeatmap.jsx` | `/api/sectors/all-stocks` | `QuarterlyRevenueService`| Yahoo / BSE | Same-quarter prior year | `+XX.XX%` |
| **Stock Rank** | `SectorHeatmap.jsx` | `/api/sectors/all-stocks` | `SectorDataService` | Master List | Ranked 1..12536 by MCap | `#X` |
| **MF NAV** | `IndianMfSectorAnalysis`| `/api/indian-mf/all-schemes`| `AmfiImportService` | AMFI NAVAll | Float parsing | `₹XX.XXXX` |
| **MF AUM** | `IndianMfSectorAnalysis`| `/api/indian-mf/all-schemes`| `IndianMfRankingService`| AMC Disclosures| Normalization to Cr | `₹XX,XXX Cr` |
| **MF Global Rank**| `IndianMfSectorAnalysis`| `/api/indian-mf/all-schemes`| `IndianMfRankingService`| AMC Disclosures| Ranked 1..716 by AUM | `#X` |
| **Sharpe Ratio** | `MiniRatioIndicator` | `/api/risk/fund/:region/:id`| `LiveMfAnalyticsService`| mfapi / RBI | 3Y Trailing with Fallback| `X.XX` |

---

## 34. Operational Q&A ("Where Does This Number Come From?")

### Q1: Where does TCS Revenue (₹72,275 Cr) come from?
- Sourced from TCS official Ind AS financial results for the quarter ended June 30, 2026.
- Raw Revenue from Operations = ₹72,275 Cr.
- Portal aggregators reporting ₹73,843 Cr include ₹1,568 Cr of Other Income (Total Income).

### Q2: Why is Scheme 146951 badged as Open-Ended?
- ICICI Prudential Bharat Consumption Fund has closed-ended fixed-term series (Series 1 to 5). Scheme 146951 is the open-ended growth vehicle. The UI badge prevents scheme-identity confusion.

### Q3: Why do some mutual funds show "—" for AUM?
- Under the Zero-Fabrication Standard, AUM is displayed only when backed by verified AMC disclosures (716 schemes). The remaining 2,027 schemes display `—` rather than synthetic guesses.

---

## 35. Formula & Calculation Master Reference

1. **Daily Price Return**:
   $$\Delta P \% = \frac{P_{\text{LTP}} - P_{\text{PrevClose}}}{P_{\text{PrevClose}}} \times 100$$
2. **Same-Quarter Prior Year Revenue YoY**:
   $$\text{YoY \%} = \frac{\text{Rev}_{\text{Current}} - \text{Rev}_{\text{PriorYear}}}{|\text{Rev}_{\text{PriorYear}}|} \times 100$$
3. **Compound Annual Growth Rate (CAGR)**:
   $$\text{CAGR \%} = \left[ \left( \frac{V_{\text{End}}}{V_{\text{Start}}} \right)^{\frac{1}{Y}} - 1 \right] \times 100$$
4. **Market Capitalization in ₹ Crores**:
   $$\text{Cap}_{\text{Cr}} = \left\lfloor \frac{\text{Shares Outstanding} \times P_{\text{LTP}}}{10,000,000} \right\rfloor$$
5. **Sortino Downside Semi-Variance**:
   $$\text{Downside Deviation} = \sqrt{ \frac{1}{N} \sum_{t=1}^{N} \min(R_t - R_{f,t}, 0)^2 } \times \sqrt{12}$$

---

## 36. Known Limitations, Glossary & Source File Appendix

### 36.1 Known Operational Constraints
1. **NSE 15-Minute Feed Delay**: Mandated by stock exchange redistribution policies.
2. **Missing Statements for Merged Scrips**: Newly listed or merged scrips legitimately lack quarterly timeseries on upstream providers; these display as `—`.
3. **AMFI Evening Synchronization**: AMC NAV feeds upload between 8:30 PM and 11:00 PM IST; intraday NAVs remain static at the prior day's close.

### 36.2 Institutional Glossary
- **AUM**: Assets Under Management — Total market value of assets managed by a fund.
- **CAGR**: Compound Annual Growth Rate — Smoothed annualized rate of return.
- **Direct Plan**: Mutual fund purchased directly without distributor commission.
- **EBIT**: Earnings Before Interest and Taxes (operating profit).
- **Growth Option**: Fund option where profits are automatically reinvested.
- **LTP**: Last Traded Price on the exchange.
- **NAV**: Net Asset Value per unit.
- **PE Ratio**: Price to Earnings multiple.
- **Sharpe Ratio**: Risk-adjusted excess return per unit of total risk.
- **Sortino Ratio**: Risk-adjusted excess return per unit of downside risk.

### 36.3 Appendix — Core Source Files
- `backend/server.js`: Server entry, router mounts, WebSocket setup.
- `backend/services/SectorDataService.js`: Stock ranking, sector rollups, constituent quoting.
- `backend/services/QuarterlyRevenueService.js`: Period-end normalization, fiscal calendar YoY math.
- `backend/services/BseFinancialDataService.js`: BSE corporate filing cross-validation.
- `backend/services/allFundsDirectoryService.js`: Direct-Growth mutual fund directory loader.
- `backend/services/IndianMfRankingService.js`: 4-tier AUM ranking engine.
- `backend/services/LiveMfAnalyticsService.js`: 3Y Trailing Sharpe/Sortino and inception fallback.
- `backend/services/OfficialAmcPortfolioService.js`: Authentic flagship fund holdings parser.
- `backend/services/ScreenerService.js`: Multi-factor screener and `isResearchUsable()` filters.
- `backend/services/MarketDataValidator.js`: Data sanitization and banking EBIT suppression.
- `frontend/src/pages/SectorHeatmap.jsx`: Stocks Performance, Sector table, CSV export.
- `frontend/src/pages/IndianMfSectorAnalysis.jsx`: Mutual funds hub and AUM ranking.
- `frontend/src/components/MfRankingTable.jsx`: Mutual fund ranking table with Open-Ended badge.
- `frontend/src/store/slices/marketSlice.js`: Redux global state store.
