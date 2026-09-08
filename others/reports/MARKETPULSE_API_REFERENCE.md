# MarketPulse — Complete REST & WebSocket API Reference
## Authoritative Technical Specification for All 78 Backend Endpoints
**Version**: 2.5.0 (Production Architecture)  
**Publication Date**: September 8, 2026  
**Base URL**: `http://localhost:5001` (Development) / `https://api.marketpulse.internal` (Production)  
**Mandatory Response Header**: `X-Data-Disclaimer: Delayed data - not investment advice`  
**Standard Error Format**: `{ "error": true, "message": "Descriptive reason", "code": 404 }`  

---

## 1. Table of Mounted Router Modules

| Prefix | Router File | Endpoint Count | Purpose / Domain |
| :--- | :--- | :--- | :--- |
| `/api/market` | `backend/routes/market.js` | 7 | Market indices, breadth, session status, top gainers/losers, global heatmap. |
| `/api/sectors` | `backend/routes/sectors.js` | 6 | 30 NSE/BSE sectors, constituent rankings, all-stocks directory, top movers. |
| `/api/stocks` | `backend/routes/stocks.js` | 3 | Individual stock quotes, company profiles, OHLCV chart history. |
| `/api/upstox` | `backend/routes/upstox.js` | 4 | Upstox OAuth authentication, token exchange, live streaming status. |
| `/api/mf` | `backend/routes/mf.js` | 11 | AMCs, mutual fund categories, search, popular funds, NAV history, holdings. |
| `/api/portfolio` | `backend/routes/portfolio.js` | 5 | User mutual fund portfolio tracking, Upstox portfolio sync, holdings deletion. |
| `/api/analytics` | `backend/routes/analytics.js` | 3 | Sector growth analytics, fund house AUM distribution, sector allocations. |
| `/auth` | `backend/routes/auth.js` | 1 | Upstox OAuth callback handler. |
| `/api/news` | `backend/routes/news.js` | 2 | Financial market news feed and NLP sentiment score. |
| `/api/economy` | `backend/routes/economy.js` | 2 | Macroeconomic indicators by country (GDP, Inflation, Interest Rates). |
| `/api/ai` | `backend/routes/ai.js` | 2 | Market sentiment insights and fund performance predictions. |
| `/api/risk` | `backend/routes/risk.js` | 1 | Comprehensive fund risk ratios (Sharpe, Sortino, Alpha, Beta, Max Drawdown). |
| `/api/etf` | `backend/routes/etf.js` | 3 | ETF listing, categorization, and detailed quote metrics. |
| `/api/smart-money` | `backend/routes/smartmoney.js` | 2 | FII/DII institutional activity signals and sector rotation flows. |
| `/api/countries` | `backend/routes/countries.js` | 1 | Global country market performance heatmap. |
| `/api/screener` | `backend/routes/screener.js` | 5 | Stock & Mutual Fund multi-factor screening engines and filter metadata. |
| `/api/assets` | `backend/routes/assets.js` | 3 | Cross-asset sector lookups and unified asset detail router. |
| `/api/sector-trends` | `backend/routes/sectorTrends.js` | 2 | Multi-sector performance comparison and historical trend data. |
| `/api/indian-mf` | `backend/routes/indianMf.js` | 12 | 4-tier ranked direct schemes, sector groupings, macro correlation, audit reports. |
| `/api/comparison` | `backend/routes/comparison.js` | 1 | Multi-asset side-by-side comparison payload. |
| `/api` (Holdings Fallback) | `backend/routes/holdingsFallback.js` | 2 | Fallback stock holdings lookup and secondary NAV timeseries. |
| `/health` | `backend/server.js` | 1 | Service liveness and timestamp check. |
| **TOTAL** | **21 Router Modules** | **78 Endpoints** | Comprehensive market intelligence API coverage |

---

## 2. Detailed Endpoint Specifications by Module

### 2.1 Market & Macro Router (`/api/market`)

#### `GET /api/market/status`
- **Description**: Returns the real-time operational status of Indian stock exchanges (NSE/BSE).
- **Parameters**: None.
- **Sample Response**:
  ```json
  {
    "isOpen": true,
    "session": "REGULAR",
    "marketTime": "2026-09-08T11:45:00.000Z",
    "timezone": "Asia/Kolkata",
    "exchange": "NSE"
  }
  ```
- **Status Codes**: `200 OK`.

#### `GET /api/market/indices`
- **Description**: Real-time snapshot of benchmark Indian and global indices (`^NSEI`, `^NSEBANK`, `^BSESN`, `^GSPC`).
- **Query Params**: `region` (`india` | `global` | `all`, default: `all`).
- **Sample Response**:
  ```json
  [
    {
      "symbol": "^NSEI",
      "name": "Nifty 50",
      "price": 24850.30,
      "change": 142.50,
      "changePercent": 0.58,
      "dayHigh": 24910.15,
      "dayLow": 24780.00
    }
  ]
  ```

#### `GET /api/market/breadth`
- **Description**: Advance/Decline/Unchanged counts and breadth ratio across NSE active securities.
- **Sample Response**:
  ```json
  {
    "advances": 1420,
    "declines": 890,
    "unchanged": 112,
    "advanceDeclineRatio": 1.60,
    "timestamp": "2026-09-08T11:45:00.000Z"
  }
  ```

#### `GET /api/market/top-performers`
- **Description**: Real-time listing of top percentage gainers, losers, and volume shockers.
- **Query Params**: `type` (`gainers` | `losers` | `volume`, default: `gainers`), `limit` (default: 10).

#### `GET /api/market/heatmap`
- **Description**: Treemap data representation of market capitalization and daily return.

#### `GET /api/market/news`
- **Description**: Aggregated market news headlines with timestamp and editorial source.

#### `GET /api/market/economic`
- **Description**: Core Indian macroeconomic indicators (RBI Repo Rate, Inflation, Forex Reserves).

---

### 2.2 Sectors & Equities Router (`/api/sectors`)

#### `GET /api/sectors`
- **Description**: Returns all 30 Indian economic sectors with aggregate performance, breadth, and valuation.
- **Query Params**: `timeframe` (`1D` | `1W` | `1M` | `1Y`), `region` (`india` | `all`).
- **Cache**: 5 minutes in-memory (`CACHE_TTL = 300,000 ms`).
- **Sample Response**:
  ```json
  [
    {
      "id": "nifty-bank",
      "name": "Nifty Bank",
      "indexTicker": "^NSEBANK",
      "performance": { "1D": 0.45, "1W": -0.80, "1M": 2.10, "1Y": 14.20 },
      "advances": 7,
      "declines": 5,
      "unchanged": 0,
      "totalStocks": 12,
      "revenue": null,
      "revenueYoY": null,
      "ebit": null
    }
  ]
  ```
- **Note**: Rule 12 strictly enforces `revenue: null` and `revenueYoY: null` at the sector level. EBIT is suppressed for banking/NBFC sectors.

#### `GET /api/sectors/all-stocks`
- **Description**: The primary high-performance directory of all 12,536 Indian equities ranked by Market Capitalization descending.
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 50)
  - `search` (Symbol or company name prefix)
  - `sector` (Optional sector filter)
  - `sortBy` (`marketCap` | `revenue` | `revenueYoY` | `changePercent` | `pe`)
  - `sortOrder` (`asc` | `desc`)
- **Sample Response Item**:
  ```json
  {
    "indiaStockRank": 1,
    "symbol": "RELIANCE.NS",
    "name": "Reliance Industries Limited",
    "sector": "Energy",
    "ltp": 2980.50,
    "change": 24.10,
    "changePercent": 0.82,
    "marketCap": 2016540,
    "revenue": 309468,
    "revenueYoY": 27.02,
    "pe": 28.4,
    "eps": 104.9,
    "percentFrom52WLow": 24.5,
    "percentFromATH": -3.2,
    "returns": { "1W": 1.2, "1M": -0.5, "1Y": 22.4, "3Y": 48.1, "5Y": 112.5 }
  }
  ```

#### `GET /api/sectors/:sectorId`
- **Description**: Full constituent breakdown of a specific sector with real-time stock quotes and corporate financials.

#### `GET /api/sectors/definitions`
- **Description**: Static metadata defining all 30 sectors, index tickers, and constituent mappings.

#### `GET /api/sectors/top-movers`
- **Description**: Top moving sectors ranked by daily percentage performance.

#### `GET /api/sectors/search`
- **Description**: Autocomplete search endpoint across sector titles and constituent equities.

---

### 2.3 Individual Stocks Router (`/api/stocks`)

#### `GET /api/stocks/:symbol`
- **Description**: Comprehensive company profile, real-time quote, valuation multiples, and historical performance.
- **Path Params**: `symbol` (e.g. `TCS.NS`, `INFY.NS`).

#### `GET /api/stocks/:symbol/chart`
- **Description**: OHLCV candlestick time-series for TradingView lightweight charts.
- **Query Params**: `interval` (`1m`, `5m`, `15m`, `1d`, `1wk`, `1mo`), `range` (`1d`, `5d`, `1mo`, `1y`, `5y`, `max`).

#### `GET /api/stocks/`
- **Description**: Batch multi-quote lookup for an array of comma-separated symbols.

---

### 2.4 Mutual Funds Explorer & Ranks (`/api/indian-mf` & `/api/mf`)

#### `GET /api/indian-mf/all-direct-schemes`
- **Description**: Complete array of all **2,743 active Direct-Growth** mutual fund schemes with 4-tier AUM ranks.
- **Sample Response Item**:
  ```json
  {
    "schemeCode": "122639",
    "schemeName": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    "amc": "PPFAS Mutual Fund",
    "category": "Equity",
    "subcategory": "Flexi Cap",
    "nav": 90.5289,
    "navDate": "2026-09-04",
    "aumCr": 148429,
    "indiaMfRank": 1,
    "indiaMfCategoryRank": 1,
    "indiaMfSubcategoryRank": 1,
    "indiaMfSectorRank": null,
    "returns": { "1D": -0.12, "1W": -0.71, "1M": -3.03, "1Y": -2.11, "3Y": 13.34, "5Y": 12.21, "All": 18.06 },
    "sharpeRatio": 0.88,
    "sortinoRatio": 1.35
  }
  ```

#### `GET /api/indian-mf/sectors-overview`
- **Description**: Mutual fund schemes categorized into thematic sectors with aggregated AUM and constituent funds.

#### `GET /api/indian-mf/sectors/flat`
- **Description**: Flattened list of sectoral and thematic mutual funds ordered by AUM descending.

#### `GET /api/indian-mf/macro/snapshot`
- **Description**: Macroeconomic indicators paired with sector-level fund performance.

#### `GET /api/indian-mf/macro/correlation-summary`
- **Description**: Cross-correlation matrix between RBI repo rate, CPI inflation, and major mutual fund categories.

#### `GET /api/indian-mf/all-ranked-funds`
- **Description**: Fast in-memory cached ranking of all mutual funds with verified AUM.

#### `GET /api/mf/:schemeCode/holdings`
- **Description**: Ingests authentic underlying equity constituent holdings for supported flagship schemes.
- **Response for Flagship Scheme (e.g. 122639)**:
  ```json
  {
    "schemeCode": "122639",
    "schemeName": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    "status": "VERIFIED",
    "asOfDate": "2026-08-31",
    "totalHoldings": 42,
    "holdings": [
      { "symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "weightPct": 7.85, "sector": "Banking" },
      { "symbol": "ITC.NS", "name": "ITC Ltd", "weightPct": 6.20, "sector": "Consumer Goods" }
    ],
    "sectorAllocations": [
      { "sector": "Financial Services", "weightPct": 28.5 },
      { "sector": "Technology", "weightPct": 18.2 }
    ]
  }
  ```
- **Response for Non-Flagship Scheme**: Returns status `DATA_UNAVAILABLE` with empty holdings and explanatory text (Zero Fabrication).

#### `GET /api/mf/:schemeCode/nav`
- **Description**: Historical daily NAV time-series loaded from mfapi / AMFI archives.

#### `GET /api/mf/amcs`
- **Description**: Unique list of all registered Indian Asset Management Companies.

#### `GET /api/mf/categories`
- **Description**: Hierarchy of broad categories (Equity, Debt, Hybrid) and SEBI subcategories.

---

### 2.5 Risk & Analytics Router (`/api/risk` & `/api/analytics`)

#### `GET /api/risk/fund/:region/:id`
- **Description**: Comprehensive risk analytics engine. Returns 3-Year Trailing and Since Inception Sharpe, Sortino, Alpha, Beta, Volatility, and Maximum Drawdown.
- **Sample Response**:
  ```json
  {
    "schemeCode": "119609",
    "schemeName": "SBI Equity Hybrid Fund - Direct Plan - Growth",
    "sharpeRatio": 0.68,
    "sortinoRatio": 1.03,
    "standardDeviation": 9.42,
    "beta": 0.72,
    "alpha": 3.85,
    "maxDrawdown": -12.40,
    "riskRatios": {
      "3Y": { "sharpe": 0.68, "sortino": 1.03, "volatility": 9.42 },
      "All": { "sharpe": 0.75, "sortino": 1.15, "volatility": 9.80 }
    },
    "metricWindowUsed": "3Y",
    "historicalBenchmark": "^NSEI",
    "riskFreeRate": 0.0625
  }
  ```

---

### 2.6 Screener Engine Router (`/api/screener`)

#### `POST /api/screener/stocks`
- **Description**: Multi-factor quantitative equity screener filtering 12,536 Indian equities.
- **Request Body**:
  ```json
  {
    "marketCapMin": 10000,
    "marketCapMax": 500000,
    "peMin": 5,
    "peMax": 35,
    "revenueYoYMin": 10.0,
    "pctFrom52WLowMin": 15.0,
    "sector": "Technology",
    "researchUsableOnly": true,
    "limit": 50
  }
  ```
- **Filter `researchUsableOnly`**: When `true`, automatically applies `ScreenerService.isResearchUsable()`, filtering out companies without active quotes, dormant scrips, and penny stocks trading under ₹2.

#### `POST /api/screener/funds`
- **Description**: Multi-factor mutual fund screener filtering 2,743 Direct-Growth schemes.
- **Request Body**:
  ```json
  {
    "category": "Equity",
    "subcategory": "Flexi Cap",
    "aumMin": 5000,
    "cagr3YMin": 12.0,
    "sharpeMin": 0.50,
    "sortinoMin": 0.80,
    "limit": 50
  }
  ```

#### `GET /api/screener/filters`
- **Description**: Returns allowed ranges, distinct sectors, AMCs, and available filter boundaries.

---

### 2.7 Upstox Broker Integration Router (`/api/upstox` & `/auth`)

#### `GET /api/upstox/login`
- **Description**: Generates the official Upstox OAuth 2.0 authorization URL for user authentication.

#### `GET /auth/upstox/callback`
- **Description**: OAuth redirection callback handler; captures authorization code and issues JWT session.

#### `POST /api/upstox/token`
- **Description**: Exchanges authorization code for access token via Upstox API v2.

#### `GET /api/upstox/status`
- **Description**: Reports whether an active authenticated Upstox broker session is established.

---

### 2.8 System Health Check (`/health`)

#### `GET /health`
- **Description**: Lightweight health check endpoint for uptime monitoring and container orchestration.
- **Sample Response**:
  ```json
  {
    "status": "ok",
    "time": "2026-09-08T11:45:00.000Z"
  }
  ```

---

## 3. Real-Time WebSocket Streaming Specification

The MarketPulse backend runs a Socket.io server integrated onto port `5001`.

### 3.1 Client Inbound Events
- `join_ticks`: Subscribes the client socket to the `ticks` room for high-frequency stock quote updates.
- `join_indices`: Subscribes to the `indices` room for live Nifty / Sensex tick pushes.
- `watch_stock(symbol)`: Dynamically watches an individual ticker (e.g. `watch_stock('TCS.NS')`), joining room `stock:TCS.NS`.
- `unwatch_stock(symbol)`: Leaves the individual stock room.

### 3.2 Server Outbound Events
- `tick`: Emitted to `ticks` room on market price changes:
  ```json
  { "symbol": "TCS.NS", "price": 4320.50, "change": 15.20, "changePct": 0.35, "volume": 124500 }
  ```
- `index_tick`: Emitted to `indices` room:
  ```json
  { "symbol": "^NSEI", "price": 24850.30, "change": 142.50, "changePct": 0.58 }
  ```
