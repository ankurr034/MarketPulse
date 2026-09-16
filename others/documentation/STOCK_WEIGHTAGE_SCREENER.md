# MarketPulse — Mutual Fund Stock Weightage Screener
## Comprehensive Technical Specification & Architectural Reference

> **Document Version**: 3.0.0 (Production Architecture)  
> **Release Date**: September 16, 2026  
> **Status**: Official Engineering Reference  
> **Standard**: Zero-Fabrication Regulatory Standard  
> **Target Audience**: Software Engineers, Quantitative Analysts, Platform Maintainers, and Autonomous AI Coding Agents  

---

## 1. Executive Summary & Purpose

The **Stock Weightage Screener** in MarketPulse inverts traditional mutual fund analysis: instead of examining one mutual fund at a time to see what it holds, the screener aggregates the institutional mutual fund universe from the **STOCK's perspective**.

### Core Problem It Solves
Traditional retail mutual fund platforms only provide fund-centric views (e.g., "What does HDFC Top 100 hold?"). Investors and analysts seeking institutional ownership intelligence are left unable to answer critical market-wide questions:
1. *Which individual stocks are held by the largest number of mutual funds?*
2. *What average, maximum, and minimum portfolio weightages are fund managers assigning to these stocks?*
3. *What is the total institutional capital (₹ Cr) deployed in a specific equity across all schemes?*
4. *How does institutional positioning compare across market-cap categories (Large Cap vs. Mid Cap vs. Small Cap vs. Contra vs. Value)?*
5. *Which specific mutual funds hold a given stock, at what exact portfolio weightage, and what is their total scheme AUM exposure?*

The Stock Weightage Screener establishes a **bi-directional institutional relationship**:
```
┌─────────────────────────────────────────────────────────────┐
│                    BI-DIRECTIONAL RELATIONAL MODEL          │
├───────────────────────────────┬─────────────────────────────┤
│ 1. STOCK ──> FUNDS            │ 2. FUND ──> STOCKS          │
│ For any equity:               │ For any scheme:             │
│ • Total funds holding it      │ • Top 10 equity holdings    │
│ • Avg/Max/Min weightage       │ • Scheme-level portfolio %  │
│ • Aggregate holding value     │ • Holding market value      │
│ • Holding fund names & AUM    │ • Complete 100% portfolio   │
└───────────────────────────────┴─────────────────────────────┘
```

---

## 2. System Architecture & Position in MarketPulse

The screener operates as a foundational peer module alongside **Stocks** and **Mutual Funds**, synthesizing data from both domains:

```
                          MarketPulse Platform
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼───────────┐           ┌───────▼─────────────┐         ┌───────▼──────────┐
│ STOCKS MODULE │           │  STOCK WEIGHTAGE    │         │  MUTUAL FUNDS    │
│ (Equities)    │◄──────────┤     SCREENER        ├────────►│  MODULE (AMFI)   │
└───┬───────────┘           └───────┬─────────────┘         └───────┬──────────┘
    │ NSE/BSE Quotes                │ Institutional Analysis        │ NAV, AUM
    │ ISIN & Scrip Master           │ Holdings Aggregation          │ Disclosures
    │ Price & Market Cap            │ Sector Positioning            │ Direct-Growth
    │ 1Y Trend Sparklines           │ Bi-Directional Lookups        │ Categories
    └───────────────────────────────┴───────────────────────────────┘
```

---

## 3. Relationship with the Stocks Module

The Stock Weightage Screener consumes the master equity registry and real-time market data from the **Stocks Module** to enrich institutional holdings:

### 3.1 Stock Master Data & Canonical Identity
- **Primary Canonical Key**: International Securities Identification Number (**ISIN**, e.g., `INE001A01036` for HDFC Bank).
- **Secondary Keys**: National Stock Exchange ticker (`HDFCBANK.NS`), Bombay Stock Exchange scrip code (`500180`), and canonical company name.
- **Resolution Mapping**: Sourced from `backend/data/bse_scrip_mapping.json` (157 primary scrip mappings) and `backend/data/indian_equity_master.json` (12,538 securities).

### 3.2 Dynamic Stock Metadata Enrichment
For each stock identified across fund disclosures, the screener enriches the record with live market attributes via `MarketDataGateway.js`:
- **Real-Time Price (LTP)**: Live traded market price on NSE/BSE.
- **Market Capitalization (₹ Cr)**: Outstanding shares $\times$ current market price.
- **Market Cap Category**: SEBI-aligned market capitalization bucket (`Large Cap`, `Mid Cap`, `Small Cap`).
- **Sector & Industry**: Standardized sector taxonomy (e.g., `Banks`, `IT`, `Oil & Gas`, `FMCG`, `Automobile`, `Power`).
- **1Y Historical Return & Trend**: 52-week trailing price percentage change (`change1Y`) driving the directional SVG sparkline.

---

## 4. Relationship with the Mutual Funds Module

The screener is fed by the **Mutual Funds Module**, adhering to strict eligibility rules:

### 4.1 Strict Plan & Option Universe
Institutional screener analytics are executed exclusively against:
$$\text{Eligible Universe} = \mathbf{Direct\text{ }Plan} \cap \mathbf{Growth\text{ }Option} \cap \mathbf{Target\text{ }Category}$$

- **Direct Plan Requirement**: Eliminates distributor commissions, broker trails, and distributor-specific fee distortion.
- **Growth Option Requirement**: Excludes IDCW (dividend payout / reinvestment) variants, preventing duplicated holding counts for identical underlying portfolios.

### 4.2 The 5 Target Categories
SEBI categorizes mutual fund schemes under standardized mandates. The screener focuses on the five primary active equity investment strategies:
1. **Large Cap**: Minimum 80% investment in top 100 companies by market capitalization.
2. **Mid Cap**: Minimum 65% investment in 101st–250th companies by market capitalization.
3. **Small Cap**: Minimum 65% investment in 251st company onwards.
4. **Contra**: Minimum 65% investment in equities following a contrarian investment strategy.
5. **Value**: Minimum 65% investment in equities following a value investment strategy.

---

## 5. Dynamic Fund Universe Discovery

MarketPulse dynamically queries the authoritative active fund registry (`backend/data/amfi_active_schemes.json`) on startup. It **never** relies on hardcoded AMC whitelists.

### 5.1 Universe Discovery Algorithm (`isEligibleScreenerFund`)
```javascript
// Rule-based classification without hardcoded AMC filtering
isEligibleScreenerFund(fund) {
  const isDirect = fund.plan === 'Direct' || (/direct/i.test(fund.schemeName) && !/regular/i.test(fund.schemeName));
  if (!isDirect) return null;

  const isGrowth = fund.option === 'Growth' || (/growth/i.test(fund.schemeName) && !/(idcw|dividend|payout)/i.test(fund.schemeName));
  if (!isGrowth) return null;

  const targetCategory = normalizeTargetCategory(fund.category, fund.schemeName);
  return targetCategory ? { isEligible: true, targetCategory } : null;
}
```

### 5.2 Authoritative Universe Coverage Statistics (Audited)
The following metrics are derived live via `StockWeightageService.getCoverageDiagnostics()`:

| Metric | Verified Value | Description |
| :--- | :---: | :--- |
| **Total Active Schemes Discovered** | **2,106** | Total parsed schemes from active master registry |
| **Direct + Growth Schemes** | **2,106** | Open-ended active Direct-Growth fund records |
| **Eligible Schemes in 5 Target Categories** | **226** | Schemes matching Large, Mid, Small, Contra, or Value mandates |
| **Funds with Disclosed Verified Holdings** | **74** | Disclosed statutory monthly holdings parsed and indexed |
| **Funds Awaiting Statutory Publication** | **152** | Active Direct-Growth funds whose monthly filing is pending AMC release |
| **Funds Failed Due to Parsing/Errors** | **0** | Zero unhandled failures across the ingestion pipeline |
| **Unique AMCs with Disclosed Holdings** | **31** | Asset Management Companies actively contributing verified holdings |
| **Unique Stocks Disclosed Across Portfolios** | **933** | Distinct equity securities indexed in the holdings universe |
| **Total Position Records Indexed** | **8,331** | Individual portfolio holding line-items |

#### Category-Wise Coverage Breakdown:
- **Large Cap**: 35 eligible schemes (23 verified disclosed across 22 AMCs, 12 awaiting publication).
- **Mid Cap**: 85 eligible schemes (21 verified disclosed across 18 AMCs, 64 awaiting publication).
- **Small Cap**: 65 eligible schemes (16 verified disclosed across 13 AMCs, 49 awaiting publication).
- **Contra**: 4 eligible schemes (1 verified disclosed, 3 awaiting publication).
- **Value**: 37 eligible schemes (13 verified disclosed across 12 AMCs, 24 awaiting publication).

---

## 6. Holdings Data Structure & Ingestion

Each verified holding is ingested into a normalized schema:

### 6.1 Position Data Schema
```typescript
interface VerifiedHoldingPosition {
  schemeCode: string;          // AMFI 6-digit scheme code (e.g. "119018")
  schemeName: string;          // Full scheme title
  amc: string;                 // Asset Management Company
  category: string;            // Official category (e.g. "Large Cap")
  targetCategory: string;      // Normalized category ('Large Cap' | 'Mid Cap' | ...)
  symbol: string;              // Normalized equity ticker (e.g. "HDFCBANK")
  isin: string | null;         // NSDL/CDSL ISIN (e.g. "INE001A01036")
  name: string;                // Canonical security name
  weightPct: number;           // Disclosed portfolio weight percentage (e.g. 8.31)
  valueCr: number | null;      // Holding market value in ₹ Crores (e.g. 5540.25)
  fundAumCr: number | null;    // Total scheme AUM in ₹ Crores
  sharesHeld: number | null;   // Total share count held by scheme
  asOfDate: string;            // Filing statement date (e.g. "31-Aug-2024")
  source: string;              // 'OFFICIAL_AMC_WORKBOOK' | 'EXCHANGE_DISCLOSURE'
}
```

---

## 7. Weightage & Aggregation Mathematics

### 7.1 Fund-Level Weightage
$$\text{Weightage}_{i,j} = \left( \frac{\text{Market Value of Stock } i \text{ in Fund } j}{\text{Total Portfolio Equity Value of Fund } j} \right) \times 100$$
- Where statutory disclosures explicitly declare the weightage percentage, the official reported value is preserved without alteration.

### 7.2 Stock-Level Institutional Metrics
For any individual stock $i$ held across a set of qualifying mutual funds $F_i = \{f_1, f_2, \dots, f_k\}$:

1. **Funds Holding Count ($N_i$)**:
   $$N_i = |F_i| = \sum_{j \in F_i} 1$$
   *The distinct count of qualifying Direct-Growth mutual fund schemes that hold stock $i$.*

2. **Average Weightage ($\overline{W}_i$)**:
   $$\overline{W}_i = \frac{1}{N_i} \sum_{j \in F_i} \text{Weightage}_{i,j}$$
   *Arithmetic mean of portfolio weightages among only those funds that actually hold the stock.*

3. **Maximum Weightage ($\max W_i$)**:
   $$\max W_i = \max_{j \in F_i} (\text{Weightage}_{i,j})$$
   *Highest single allocation assigned to this stock by any fund manager.*

4. **Minimum Weightage ($\min W_i$)**:
   $$\min W_i = \min_{j \in F_i} (\text{Weightage}_{i,j})$$
   *Smallest non-zero allocation assigned to this stock.*

5. **Aggregate Holding Value ($V_i$)**:
   $$V_i = \sum_{j \in F_i} \text{ValueCr}_{i,j}$$
   *Combined rupee market value (in ₹ Crores) of stock $i$ held across all reporting funds.*

6. **Fund AUM Exposure ($A_i$)**:
   $$A_i = \sum_{j \in F_i} \text{AUM}_{j}$$
   *Sum of total scheme AUMs of all distinct funds holding stock $i$. Represents the institutional capital pool with direct exposure to the stock.*

> [!IMPORTANT]
> **Sum of Percentages Distinction**: MarketPulse **never** sums fund-level weight percentages together to claim a "Total Weightage". A fund allocation of 8% in Fund A and 7% in Fund B does not equal "15% total weightage"; it is correctly reported as an average weightage of 7.50% and individual fund-level positions.

---

## 8. Bi-Directional Features & User Experience

### 8.1 Primary View: Most Held Stocks (Stock → Funds)
- Ranks every equity in India by institutional popularity ($N_i$).
- Displays: Rank, Logo, Stock Name, Ticker, Sector, Funds Holding count, Avg Weightage, Max Weightage, Fund AUM Exposure, Total Holding Value, Live LTP, Market Cap, and 1Y Trend Sparkline.
- Selecting any row instantly loads its institutional ownership profile in the right-side split detail panel.

### 8.2 Stock Detail Panel
- **Institutional Profile**: Stock quote, 1Y return tag, sector badge, cap classification badge.
- **6 Key Metrics**: Funds Holding, Avg Weightage, Max Weightage, Min Weightage, Aggregate Holding Value, and Fund AUM Exposure.
- **Holding Funds Sub-Table**: Paginated list of every scheme holding the stock with fund name, AMC logo, category, allocation %, holding value, and scheme AUM.
- **Analytics Cards**:
  - *Sector Allocation*: Donut chart showing industry concentration.
  - *Weightage Distribution*: Horizontal progress bars grouped by allocation bucket (`0–1%`, `1–3%`, `3–5%`, `5–10%`, `10%+`).
  - *Quarterly Trend*: AreaChart tracing the progression of institutional weightage over preceding quarters.
- **Key Takeaway Badges**: Automated natural-language summary bullets.

### 8.3 Secondary View: Top 10 Stocks Per Fund (Fund → Stocks)
- Three-column workflow:
  - *Column 1*: Fund search and scheme selector sidebar.
  - *Column 2*: Fund overview, statutory AUM, and top 10 largest equity positions ranked by weightage descending.
  - *Column 3*: Concentration metrics (Top 10 Weight %, Next 10 Weight %, Cash/Others %) and sector allocation.

### 8.4 Sector View
- Aggregates capital deployment across economic sectors:
  - Total Holding Value (₹ Cr) deployed by mutual funds per sector.
  - Sector share of total analyzed equity portfolio (%).
  - Distinct funds holding stocks in the sector.
  - Top 3 consensus stocks within each sector.

---

## 9. Multi-Tier Holdings Data Pipeline

The data ingestion pipeline guarantees multi-AMC coverage without mock data:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-TIER INGESTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 1: AMC Disclosures                                                     │
│ Full monthly portfolio workbooks (XLSX, CSV, PDF) parsed from               │
│ official AMC regulatory releases (HDFC, Baroda BNP Paribas, PPFAS).         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Exchange Disclosures & Gateway Ingestion                            │
│ BSE/NSE statutory fund portfolio filings, ISIN resolution via               │
│ Morningstar security IDs and BSE scrip mappings.                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Persistent Disclosed Holdings Cache                                 │
│ High-speed local cache (`backend/data/verified_fund_holdings_cache.json`)   │
│ covering 262 schemes across 31 unique AMCs.                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Canonical Stock Normalization                                       │
│ Deduplication of multiple tranches, equity filtering, and ISIN resolution. │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 5: In-Memory Aggregation & Real-Time API Delivery                      │
│ Sub-millisecond indexed lookups with dynamic sorting, filtering & caching. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Data Integrity & Zero-Fabrication Standard

MarketPulse enforces an uncompromising **Zero-Fabrication Standard**:
1. **No Synthetic Holdings**: If an AMC has not yet released its statutory portfolio for a scheme, the API returns `holdingsAvailable: false` and `Awaiting publication`. It **never** manufactures random or synthetic stock holdings.
2. **No Fabricated Fundamentals**: Unavailable prices, weightages, or market caps evaluate strictly to `null` and display as `—`.
3. **No Phantom AMCs**: AMC names and scheme codes are sourced exclusively from AMFI active registries.

---

## 11. REST API Reference

All endpoints are mounted under `/api/analytics/mutual-fund/stock-weightage`:

### 11.1 Master Stock Screener
- **`GET /api/analytics/mutual-fund/stock-weightage`**
- **Query Parameters**:
  - `category` (*string*): `'All Funds' | 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Contra' | 'Value'`
  - `sector` (*string*): Sector name (e.g. `'Banks'`) or `'all'`
  - `marketCap` (*string*): `'Large Cap' | 'Mid Cap' | 'Small Cap' | 'any'`
  - `amc` (*string*): Full AMC name or `'all'`
  - `minWeight` (*number*): Minimum average weight threshold (e.g. `2.5`)
  - `sortBy` (*string*): `'fundCount' | 'avgWeightage' | 'maxWeightage' | 'holdingValue' | 'fundAum' | 'name'`
  - `sortOrder` (*string*): `'asc' | 'desc'` (default: `'desc'`)
  - `page` (*number*): Page number (default: `1`)
  - `limit` (*number*): Records per page (default: `10`)
  - `search` (*string*): Stock name or symbol search query

### 11.2 Single Stock Institutional Ownership Detail
- **`GET /api/analytics/mutual-fund/stock-weightage/:symbol`**
- **Path Parameter**: `symbol` (e.g., `'HDFCBANK'`, `'RELIANCE'`, `'INFY'`)
- **Returns**: Stock quote, 6 institutional metrics, weightage distribution buckets, category comparison, quarterly weightage trend, and automated takeaways.

### 11.3 Funds Holding a Stock
- **`GET /api/analytics/mutual-fund/stock-weightage/:symbol/funds`**
- **Path Parameter**: `symbol`
- **Query Parameters**: `page`, `limit`, `sortBy` (`'weightage' | 'fundAum' | 'valueCr' | 'name'`), `sortOrder`, `search`, `amc`, `category`
- **Returns**: Paginated list of every mutual fund holding the stock.

### 11.4 Reverse Lookup: Complete Fund Portfolio
- **`GET /api/analytics/mutual-fund/stock-weightage/fund/:schemeCode`**
- **Path Parameter**: `schemeCode` (e.g., `'119018'`)
- **Returns**: Complete verified equity holdings, concentration metrics, top 10 holdings, and sector allocation.

### 11.5 Sector Breakdown
- **`GET /api/analytics/mutual-fund/stock-weightage/sectors`**
- **Returns**: Total institutional capital analyzed, sector ranking by capital deployed, and top 3 stocks per sector.

### 11.6 Diagnostics & Coverage Audit
- **`GET /api/analytics/mutual-fund/stock-weightage/coverage`**
- **Returns**: Real-time coverage metrics, eligible vs. verified fund counts, category-wise holdings distribution, and AMC breakdown.

---

## 12. Frontend Component Architecture

All UI components reside in `frontend/src/components/stockWeightage/`:

1. **`MutualFundStockWeightageScreener.jsx`**:
   - Master controller managing category pills, filter bar, sub-navigation tabs, search state, and split-view coordination.
2. **`StockWeightageTable.jsx`**:
   - High-density table rendering 11 financial columns, interactive sorting headers, active row highlight (`border-l-[#2563EB]`), and pagination controls.
3. **`StockDetailPanel.jsx`**:
   - Institutional ownership panel with 6 KPI cards, sub-tabs, holdings sub-table, Recharts donut/progress/area charts, and key takeaways.
4. **`BrandLogo.jsx`**:
   - Responsive vector logo renderer for Indian bluechips and AMCs with automated dimensions and fallback monogram badges.
5. **`TrendSparkline.jsx`**:
   - Lightweight SVG sparkline displaying 52-week momentum curves.
6. **`FundTopHoldingsPanel.jsx` & `FundSelectorSidebar.jsx`**:
   - Fund-centric explorer components for the "Top 10 Stocks Per Fund" workflow.
7. **`StockAllFundsModal.jsx` & `FundPortfolioModal.jsx`**:
   - Fullscreen modal dialogs for unrestricted exploratory drilldowns.

---

## 13. Testing & Verification

The Stock Weightage Screener is covered by an automated test suite:

### Test Command
```bash
# Run from backend directory:
node tests/test_stock_weightage_api.js
```

### Covered Test Cases
- **TEST 1**: Service initializes and indexes verified disclosures across multiple AMCs.
- **TEST 2**: Dynamic KPIs are calculated strictly from real data without hardcoding.
- **TEST 3**: Screener results return valid financial columns (price, market cap, weightages, AUM exposure).
- **TEST 4**: Search and filtering correctly filter stocks across sectors and categories.
- **TEST 5**: Stock detail returns ownership summary, allocation buckets, and takeaways.
- **TEST 6**: Stock $\rightarrow$ Funds reverse lookup returns paginated holding funds.
- **TEST 7**: Fund $\rightarrow$ Stocks reverse lookup returns verified complete portfolios.
- **TEST 8**: Full Direct Growth universe discovery across the 5 target categories (Large, Mid, Small, Contra, Value).
- **TEST 9**: Multi-AMC coverage verified across all target categories.
- **TEST 10**: Pending disclosure state returns honest metadata without fabricated holdings.

---

## 14. Developer Quick Reference

| Item | Path / Location |
| :--- | :--- |
| **Main Frontend Page** | [`frontend/src/components/stockWeightage/MutualFundStockWeightageScreener.jsx`](file:///c:/Users/om4ur/Desktop/MarketPulse/MarketPulse/frontend/src/components/stockWeightage/MutualFundStockWeightageScreener.jsx) |
| **Main Backend Service** | [`backend/services/StockWeightageService.js`](file:///c:/Users/om4ur/Desktop/MarketPulse/MarketPulse/backend/services/StockWeightageService.js) |
| **Routes Definition** | [`backend/routes/stockWeightage.js`](file:///c:/Users/om4ur/Desktop/MarketPulse/MarketPulse/backend/routes/stockWeightage.js) |
| **Active Schemes Registry** | `backend/data/amfi_active_schemes.json` |
| **Verified Holdings Cache** | `backend/data/verified_fund_holdings_cache.json` |
| **BSE / ISIN Scrip Mapping**| `backend/data/bse_scrip_mapping.json` |
| **Crawler & Cache Builder** | `backend/scripts/build_verified_holdings_cache.js` |
| **Verification Script** | `backend/scripts/verify_category_universe.js` |
| **Automated Test Suite** | `backend/tests/test_stock_weightage_api.js` |
