# MarketPulse — Financial Market & Sector Performance Platform

> **For informational and analytical purposes only — not investment advice.**

MarketPulse is a modern, full-stack financial market analytics platform providing comprehensive performance insights across **Indian (NSE)** and **Global (US/GICS)** equities, sector indices, and Indian Mutual Funds.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind](https://img.shields.io/badge/TailwindCSS-3-cyan) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![Yahoo Finance](https://img.shields.io/badge/Data-Yahoo%20Finance-red) ![AMFI](https://img.shields.io/badge/Mutual%20Funds-AMFI%20Official-orange)

---

## ✨ Key Platform Features

### 📈 Stocks Performance Dashboard
- **Comprehensive Sector Overview**: Compare 19 Indian NSE sectors and global indices at a glance.
- **Dynamic Header & Timestamp**: Live data update timestamp with interactive refresh (`↻`).
- **6 Key Breadth Summary Cards**:
  - *Total Sectors*
  - *Advancing Sectors*
  - *Declining Sectors*
  - *Up Stocks*
  - *Down Stocks*
  - *Unchanged Stocks*
- **Inline Constituent Drill-Down**: In-row dropdown accordion toggle (`⌵` / `⌃`) adjacent to the sector name to expand constituent stocks inline without page reload.
- **Stock-Level Sub-Filters & Search**: Filter constituents within an expanded sector by *All Stocks*, *Top Gainers*, *Top Losers*, *By Volume*, or *By Market Cap*, plus instant text search.
- **Export Capabilities**: Dynamic CSV export containing complete sector financials and multi-period returns.
- **Pagination & Controls**: Configurable row counts (10, 20, 50, All) and "Show More" progressive disclosure.

---

### 📊 Accounting-Grade Fundamentals Engine
- **Reported EBIT (Operating Profit in ₹ Cr)**:
  - Computed from reported TTM financial statement metrics:
    $$\text{EBIT (₹ Cr)} = \frac{\text{Reported Total Revenue (TTM)} \times \text{Reported Operating Margin (TTM)}}{10,000,000}$$
  - **Financial Institutions Rule**: Commercial banks and NBFCs (e.g., HDFC Bank, ICICI Bank, SBI) evaluate EBIT strictly to `null` (`—`) in accordance with GAAP/IFRS standards (as interest expense is an operating cost of capital).
  - Non-financial corporations display authentic operating income figures.
- **Reported Net Profit (₹ Cr)**:
  - Sourced directly from reported `defaultKeyStatistics.netIncomeToCommon` (TTM) or verified compatible shares $\times$ EPS.
- **Data Integrity**: Zero fabricated or hardcoded financial metrics; unavailable values strictly display `—`.

---

### ⏳ Authentic Multi-Period Performance Returns
- **Real Historical Returns**: Computes true price percentage changes across historical lookback windows:
  - **1W**: 1 week ago close
  - **1M**: 4 weeks (1 month) ago close
  - **6M**: 26 weeks (6 months) ago close
  - **1Y**: 52 weeks (1 year) ago close
  - **3Y**: 156 weeks (3 years) ago close
  - **5Y**: 60 months (5 years) ago close
  - **ALL**: Inception / First trade listing date close
- **Distinct 5Y vs Inception (ALL)**: Accurately differentiates 5-year performance from lifetime all-time performance (e.g. Infosys +143,260% ALL vs -33.14% 5Y).

---

### 📑 Indian Mutual Funds & Sector Analysis
- **AMFI Official Data Pipeline**: Live NAV synchronization directly from AMFI.
- **AUM-Weighted Portfolio Analytics**: Sector allocation breakdown, top equity holdings, and fund comparison.
- **Scheme Directory**: Filter across Large Cap, Mid Cap, Small Cap, Flexi Cap, Sectoral/Thematic, and Commodity ETFs.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide Icons |
| **Charts** | TradingView Lightweight Charts, Recharts |
| **State Management** | Redux Toolkit |
| **Backend** | Node.js, Express.js |
| **Data Providers** | Yahoo Finance (`yahoo-finance2`), AMFI Official NAV Portal |
| **Real-time** | WebSocket (Socket.io) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm** 9+

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/ankurr034/MarketPulse.git
cd MarketPulse

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

### Run the Application

```bash
# Start both backend and frontend concurrently from root:
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API Server**: `http://localhost:5001`

---

## 📡 API Endpoints Summary

| Endpoint | Method | Description |
|---|:---:|---|
| `/api/sectors` | `GET` | All sectors with live LTP, advances/declines, market cap, EBIT, Net Profit, and returns |
| `/api/sectors/:sectorId` | `GET` | Detailed sector data with constituent stock financials and returns |
| `/api/stocks/search` | `GET` | Search equities by ticker symbol or company name |
| `/api/stocks/:symbol` | `GET` | Full stock quote, fundamentals, and support/resistance levels |
| `/api/indian-mf/directory` | `GET` | Searchable directory of Indian mutual fund schemes |
| `/api/indian-mf/sector-breakdown` | `GET` | Sector holdings breakdown across Indian mutual funds |

---

## 📜 Disclaimer

This application is built as an **analytical and educational platform for market visualization**. It does not constitute financial, legal, or investment advice. Data is sourced from third-party feeds and may be delayed. Always perform independent due diligence or consult a SEBI/SEC registered financial advisor before making investment decisions.

---

## 📄 License

MIT
