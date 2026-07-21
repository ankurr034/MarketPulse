# MarketPulse — Sector Analysis Dashboard

> **For informational purposes only — not investment advice.**

A modern, responsive market analysis dashboard showing sector-wise performance for **Indian (NSE)** and **Global (US/GICS)** markets. Drill into any sector to view constituent stocks, sort by performance, and analyze individual stock charts with technical indicators.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind](https://img.shields.io/badge/TailwindCSS-3-cyan) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![Yahoo Finance](https://img.shields.io/badge/Data-Yahoo%20Finance-red)

---

## ✨ Features

### Sector Heatmap
- **13 Indian sectors** (Nifty Bank, IT, Auto, Pharma, FMCG, Metal, Energy, Realty, PSU Bank, Financial Services, Media, Infra, Consumer Durables)
- **11 Global sectors** (Technology, Healthcare, Financials, Energy, Consumer Discretionary, Consumer Staples, Industrials, Materials, Utilities, Real Estate, Communication Services)
- **Grid View**: Color-coded cards with advance/decline ratio bars
- **Treemap View**: Size-weighted tiles with color intensity reflecting % change
- Region toggle: India / Global / All
- Timeframe toggle: 1D / 1W / 1M / YTD

### Sector Drill-Down
- Sortable stock table (by % change, price, volume, name)
- Inline filter for quick stock search
- Area chart showing sector performance
- AI-generated sector analysis summary
- Top gainer/loser badges

### Stock Detail
- TradingView Lightweight Charts (candlestick)
- Technical indicators: SMA, EMA, Bollinger Bands, RSI, MACD, VWAP
- Key statistics: Market Cap, P/E, EPS, Volume, 52W Range
- 52-week range visualizer

### Dashboard Features
- **Top Gainers / Top Losers** widget (cross-sector, top 10 each)
- **Market Indices Ticker**: Nifty 50, Sensex, Bank Nifty, S&P 500, NASDAQ, FTSE 100
- **Dark / Light theme** toggle
- **Search**: Find stocks and sectors by name
- **Responsive**: Mobile-first design, works on all screen sizes
- **Skeleton loaders**: Smooth loading states
- **Real-time ticks**: WebSocket-powered price updates

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Charts | TradingView Lightweight Charts, Recharts |
| State | Redux Toolkit |
| Real-time | Socket.io |
| Backend | Node.js, Express |
| Data | Yahoo Finance (via `yahoo-finance2`) |
| Fonts | Inter, Outfit (Google Fonts) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm** 9+

### Setup

```bash
# Clone the repo
cd API_WORK

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Run Development Servers

```bash
# From the project root:
npm run dev
```

This starts both servers concurrently:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001

### Environment Variables (Optional)

Create `backend/.env`:

```env
PORT=5001
```

No API keys are required — Yahoo Finance does not need authentication.

---

## 📊 Data Source

- **Provider**: Yahoo Finance (unofficial, via `yahoo-finance2` npm package)
- **Coverage**: ~200 stocks across NSE (India) and NYSE/NASDAQ (US)
- **Update frequency**: Data cached for 5 minutes, WebSocket ticks every 1.5s
- **Delay**: Data is typically delayed by **15+ minutes** for Indian markets

### ⚠️ Data Limitations

- Yahoo Finance is an unofficial data source and may have intermittent availability
- Some NSE tickers may not return data due to Yahoo's coverage gaps
- Data should NOT be used for real-time trading decisions
- Rate limiting is handled via staggered batch requests and caching
- The data provider can be swapped by implementing the same interface in `SectorDataService.js`

### Swapping Data Providers

The backend is designed with a clean interface. To swap Yahoo Finance for another provider:

1. Implement the same methods in `YahooFinanceService.js` (or create a new service)
2. The `SectorDataService` consumes quotes via `getQuotes(symbols[])` — any provider returning `{ symbol, name, ltp, change, changePercent, volume, ... }` is compatible
3. Update the import in `SectorDataService.js`

Compatible alternatives: Alpha Vantage, Twelve Data, Finnhub, IEX Cloud.

---

## 📁 Project Structure

```
API_WORK/
├── backend/
│   ├── server.js              # Express + Socket.io entry
│   ├── routes/
│   │   ├── sectors.js         # Sector endpoints
│   │   ├── stocks.js          # Stock search/detail/chart
│   │   └── market.js          # Indices, breadth, heatmap
│   └── services/
│       ├── SectorDataService.js    # Sector definitions + aggregation
│       ├── YahooFinanceService.js  # Yahoo Finance API wrapper
│       └── SimulatorService.js     # Real-time tick simulation
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── SectorHeatmap.jsx   # Main landing page
│   │   │   ├── SectorDetail.jsx    # Sector drill-down
│   │   │   └── StockDetails.jsx    # Stock chart + stats
│   │   ├── components/
│   │   │   ├── Header.jsx          # Search, toggles, theme
│   │   │   ├── Footer.jsx          # Disclaimers
│   │   │   ├── TopMoversWidget.jsx # Gainers/Losers sidebar
│   │   │   ├── MarketIndicesTicker.jsx
│   │   │   ├── SparklineChart.jsx
│   │   │   └── TradingViewChart.jsx
│   │   ├── store/
│   │   │   └── slices/marketSlice.js
│   │   └── hooks/useWebSocket.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── docker-compose.yml
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

---

## 📜 Disclaimer

This application is a **market analysis tool for educational and informational purposes only**. It does not constitute financial advice, investment recommendations, or an offer to buy or sell securities. Data is sourced from third-party providers and may be delayed, inaccurate, or incomplete. Always consult a qualified financial advisor before making investment decisions.

No personal financial data is collected, stored, or processed by this application.

---

## License

MIT
