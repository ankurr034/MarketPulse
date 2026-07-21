import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stocks: [],
  indices: {},
  sectors: [],
  activeSymbol: null,
  activeSector: null,
  activeView: 'heatmap', // 'heatmap' | 'sector-detail' | 'stock-detail' | 'mf-portfolio' | 'mf-holdings'
  activeMfScheme: null,
  region: 'all', // 'india' | 'global' | 'all'
  assetClass: 'stocks', // 'stocks' | 'mutual-funds'
  timeframe: '1D', // '1D' | '1M' | '1Y' | '5Y'
  theme: localStorage.getItem('mp-theme') || 'dark',
  topGainers: [],
  topLosers: [],
  searchQuery: '',
  searchResults: { sectors: [], stocks: [] },
  lastUpdated: null,
  marketStatus: { status: 'Closed', countdown: 0 },
  loading: false,
  upstoxConnected: false
};

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setStocks: (state, action) => {
      state.stocks = action.payload;
    },
    updateStockTicks: (state, action) => {
      const ticksMap = {};
      action.payload.forEach(tick => {
        ticksMap[tick.symbol] = tick;
      });
      state.stocks = state.stocks.map(s => {
        const tick = ticksMap[s.symbol];
        if (tick) {
          return {
            ...s,
            ltp: tick.ltp,
            change: tick.change,
            changePercent: tick.changePercent,
            volume: tick.volume,
            dayHigh: tick.dayHigh,
            dayLow: tick.dayLow,
            vwap: tick.vwap
          };
        }
        return s;
      });
    },
    setIndices: (state, action) => {
      state.indices = action.payload;
    },
    updateIndicesTicks: (state, action) => {
      state.indices = action.payload;
    },
    setSectors: (state, action) => {
      state.sectors = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setActiveSymbol: (state, action) => {
      state.activeSymbol = action.payload;
      if (action.payload) {
        state.activeView = 'stock-detail';
      }
    },
    setActiveSector: (state, action) => {
      state.activeSector = action.payload;
      if (action.payload) {
        state.activeView = 'sector-detail';
      }
    },
    setActiveMfScheme: (state, action) => {
      state.activeMfScheme = action.payload;
      if (action.payload) {
        state.activeView = 'mf-portfolio';
      }
    },
    setActiveView: (state, action) => {
      state.activeView = action.payload;
    },
    setRegion: (state, action) => {
      state.region = action.payload;
    },
    setAssetClass: (state, action) => {
      state.assetClass = action.payload;
    },
    setTimeframe: (state, action) => {
      state.timeframe = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('mp-theme', action.payload);
    },
    setTopMovers: (state, action) => {
      state.topGainers = action.payload.gainers || [];
      state.topLosers = action.payload.losers || [];
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setMarketStatus: (state, action) => {
      state.marketStatus = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUpstoxConnected: (state, action) => {
      state.upstoxConnected = action.payload;
    },
    navigateBack: (state) => {
      if (state.activeView === 'stock-detail') {
        if (state.activeSector) {
          state.activeView = 'sector-detail';
        } else {
          state.activeView = 'heatmap';
        }
        state.activeSymbol = null;
      } else if (state.activeView === 'sector-detail') {
        state.activeView = 'heatmap';
        state.activeSector = null;
      }
    }
  }
});

export const {
  setStocks,
  updateStockTicks,
  setIndices,
  updateIndicesTicks,
  setSectors,
  setActiveSymbol,
  setActiveSector,
  setActiveMfScheme,
  setActiveView,
  setRegion,
  setAssetClass,
  setTimeframe,
  setTheme,
  setTopMovers,
  setSearchQuery,
  setSearchResults,
  setMarketStatus,
  setLoading,
  setUpstoxConnected,
  navigateBack
} = marketSlice.actions;

export default marketSlice.reducer;
