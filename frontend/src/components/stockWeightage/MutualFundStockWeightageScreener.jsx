import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Search, SlidersHorizontal, ChevronRight, PieChart, ShieldCheck, 
  Calendar, Info, Building2, Landmark, TrendingUp, Flag, Disc, Star, 
  Target, Smartphone, Monitor
} from 'lucide-react';
import StockWeightageTable from './StockWeightageTable';
import StockDetailPanel from './StockDetailPanel';
import FundPortfolioModal from './FundPortfolioModal';
import FundSelectorSidebar from './FundSelectorSidebar';
import FundTopHoldingsPanel from './FundTopHoldingsPanel';
import FundHoldingsSummarySidebar from './FundHoldingsSummarySidebar';
import MobileStockWeightageView from './MobileStockWeightageView';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MutualFundStockWeightageScreener() {
  // Views: 'top10_per_fund' (default), 'all_stocks', 'stocks_by_fund'
  const [activeView, setActiveView] = useState('top10_per_fund');

  // Active Category Filter
  const [selectedCategory, setSelectedCategory] = useState('Large Cap');

  // Device mode preview: 'auto' (responsive), 'desktop', 'smartphone'
  const [deviceMode, setDeviceMode] = useState('auto');

  // Fund-level state
  const [fundsList, setFundsList] = useState([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState('119018'); // Default to HDFC Large Cap / Top 100
  const [selectedFundData, setSelectedFundData] = useState(null);
  const [selectedFundLoading, setSelectedFundLoading] = useState(false);
  const [fundSearch, setFundSearch] = useState('');

  // Stock screener state (for 'all_stocks' view)
  const [stockScreenerData, setStockScreenerData] = useState({ kpis: {}, stocks: [], pagination: {} });
  const [stockScreenerLoading, setStockScreenerLoading] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedMarketCap, setSelectedMarketCap] = useState('all');
  const [sortBy, setSortBy] = useState('fundCount');
  const [sortOrder, setSortOrder] = useState('desc');
  const [stockPage, setStockPage] = useState(1);

  // Selected Stock for Stock Detail Panel
  const [selectedStockSymbol, setSelectedStockSymbol] = useState(null);
  const [activeFundModalCode, setActiveFundModalCode] = useState(null);
  const [showTroubleOnly, setShowTroubleOnly] = useState(false);
  const [top10OnlyToggle, setTop10OnlyToggle] = useState(true);

  // Category pills list with icons matching reference image
  const categoryPills = [
    { label: 'All Funds', icon: Building2 },
    { label: 'Large Cap', icon: Landmark },
    { label: 'Mid Cap', icon: TrendingUp },
    { label: 'Small Cap', icon: Flag },
    { label: 'Contra', icon: Disc },
    { label: 'Value', icon: Star },
    { label: 'ELSS', icon: ShieldCheck },
    { label: 'Focused', icon: Target },
    { label: 'Sectoral', icon: PieChart }
  ];

  // 1. Fetch mutual funds list for the fund sidebar
  const fetchFundsList = useCallback(async (cat = selectedCategory, search = fundSearch) => {
    setFundsLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== 'All Funds') {
        const queryCat = cat.includes('Funds') ? cat : `${cat} Funds`;
        params.set('category', queryCat);
      }
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', 100);

      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/funds?${params.toString()}`);
      const funds = res.data.funds || [];
      setFundsList(funds);

      // If currently selected fund is not in the filtered list, select the first available
      if (funds.length > 0 && !funds.some(f => String(f.schemeCode) === String(selectedSchemeCode))) {
        setSelectedSchemeCode(funds[0].schemeCode);
      }
    } catch (err) {
      console.error('Failed to load funds list:', err);
    } finally {
      setFundsLoading(false);
    }
  }, [selectedCategory, fundSearch, selectedSchemeCode]);

  // 2. Fetch selected fund complete portfolio
  const fetchFundPortfolio = useCallback(async (code) => {
    if (!code) return;
    setSelectedFundLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/fund/${code}`);
      setSelectedFundData(res.data);
    } catch (err) {
      console.error(`Failed to load portfolio for fund ${code}:`, err);
    } finally {
      setSelectedFundLoading(false);
    }
  }, []);

  // 3. Fetch all stocks screener
  const fetchStockScreener = useCallback(async (page = 1, currentSortBy = sortBy, currentSortOrder = sortOrder) => {
    setStockScreenerLoading(true);
    try {
      const params = new URLSearchParams();
      if (stockSearchQuery.trim()) params.set('search', stockSearchQuery.trim());
      if (selectedSector !== 'all') params.set('sector', selectedSector);
      if (selectedMarketCap !== 'all') params.set('marketCap', selectedMarketCap);
      params.set('sortBy', currentSortBy);
      params.set('sortOrder', currentSortOrder);
      params.set('page', page);
      params.set('limit', 10);

      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage?${params.toString()}`);
      setStockScreenerData(res.data);
      setStockPage(page);

      if (!selectedStockSymbol && res.data.stocks && res.data.stocks.length > 0) {
        setSelectedStockSymbol(res.data.stocks[0].symbol);
      }
    } catch (err) {
      console.error('Failed to load stock weightage data:', err);
    } finally {
      setStockScreenerLoading(false);
    }
  }, [stockSearchQuery, selectedSector, selectedMarketCap, sortBy, sortOrder, selectedStockSymbol]);

  // Initial load
  useEffect(() => {
    fetchFundsList();
    fetchStockScreener(1);
  }, []);

  // Whenever selectedSchemeCode changes, fetch its portfolio
  useEffect(() => {
    if (selectedSchemeCode) {
      fetchFundPortfolio(selectedSchemeCode);
    }
  }, [selectedSchemeCode, fetchFundPortfolio]);

  // Category selection handler
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    fetchFundsList(cat, fundSearch);
  };

  const asOfDate = '11-Sep-2026';

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* ── DEVICE VIEW TOGGLE (Interactive Preview for Smartphone / Desktop) ── */}
      <div className="flex items-center justify-between pb-1">
        {/* Desktop Breadcrumb */}
        <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span>Mutual Funds</span>
          <ChevronRight size={13} className="text-slate-400" />
          <span className="text-slate-600 dark:text-slate-300">Stock Weightage Screener</span>
          <ChevronRight size={13} className="text-slate-400" />
          <span className="text-slate-900 dark:text-white font-bold">
            {activeView === 'top10_per_fund' ? 'Top 10 Stocks Per Fund' : activeView === 'all_stocks' ? 'All Stocks' : 'Stocks by Fund'}
          </span>
        </nav>

        {/* Device Switcher Pill */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold ml-auto border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              deviceMode === 'desktop'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Force Desktop View"
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            onClick={() => setDeviceMode('smartphone')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              deviceMode === 'smartphone'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Force Smartphone View"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Smartphone</span>
          </button>

          <button
            onClick={() => setDeviceMode('auto')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              deviceMode === 'auto'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Responsive Auto Mode"
          >
            Auto
          </button>
        </div>
      </div>

      {/* ── SMARTPHONE VIEW RENDERER (Rendered on mobile viewport or when Smartphone mode is active) ── */}
      {(deviceMode === 'smartphone' || (deviceMode === 'auto' && typeof window !== 'undefined' && window.innerWidth < 768)) && (
        <div className={deviceMode === 'auto' ? 'block md:hidden' : 'block'}>
          <MobileStockWeightageView
            fund={selectedFundData}
            funds={fundsList}
            selectedCategory={selectedCategory}
            categories={categoryPills.map(c => c.label)}
            onSelectCategory={handleSelectCategory}
            onSelectFund={(fund) => setSelectedSchemeCode(fund.schemeCode)}
            onSelectStock={(sym) => setSelectedStockSymbol(sym)}
            onViewAllHoldings={() => setActiveFundModalCode(selectedSchemeCode)}
          />
        </div>
      )}

      {/* ── DESKTOP VIEW RENDERER (Rendered on desktop viewport or when Desktop mode is active) ── */}
      {(deviceMode === 'desktop' || deviceMode === 'auto') && (
        <div className={`space-y-4 ${deviceMode === 'auto' ? 'hidden md:block' : 'block'}`}>

          {/* ── PAGE TITLE & AS-OF DATE HEADER ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stock Weightage Screener
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                Explore which stocks are held by mutual funds, analyse their weightage across categories, and identify large holdings that may be in trouble.
              </p>
            </div>

            {/* As-of-Date pill badge with Calendar icon and Info icon */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0 self-start sm:self-center">
              <Calendar size={14} className="text-sky-600" />
              <span>Data as of {asOfDate}</span>
              <Info size={13} className="text-sky-500 cursor-pointer" />
            </div>
          </div>

          {/* ── CATEGORY FILTERS (Rounded Pills with Icons) ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryPills.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedCategory === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => handleSelectCategory(item.label)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-500'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── VIEW SWITCHER & CONTROL BAR ── */}
          <div 
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-white dark:bg-[var(--bg-card)] border-[var(--border-color)] shadow-xs"
          >
            {/* Left Controls: View Switcher & Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented View Switcher */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">View:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[
                    { id: 'all_stocks', label: 'All Stocks' },
                    { id: 'top10_per_fund', label: 'Top 10 Stocks Per Fund' },
                    { id: 'stocks_by_fund', label: 'Stocks by Fund' }
                  ].map(view => (
                    <button
                      key={view.id}
                      onClick={() => setActiveView(view.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeView === view.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Fund Category Dropdown */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-slate-400 leading-none mb-1">
                  Select Fund Category
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleSelectCategory(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {categoryPills.map(c => (
                    <option key={c.label} value={c.label}>
                      {c.label === 'All Funds' ? 'All Categories' : `${c.label} Funds`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Mutual Fund Dropdown */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-slate-400 leading-none mb-1">
                  Select Mutual Fund
                </span>
                <select
                  value={selectedSchemeCode}
                  onChange={(e) => setSelectedSchemeCode(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer max-w-[280px] truncate"
                >
                  {fundsList.map(f => (
                    <option key={f.schemeCode} value={f.schemeCode}>
                      {f.schemeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Toggles */}
            <div className="flex items-center gap-4">
              {/* iOS-Style Green Toggle Switch */}
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setTop10OnlyToggle(!top10OnlyToggle)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    top10OnlyToggle ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      top10OnlyToggle ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span>Show only top 10 stocks per fund</span>
              </label>

              {/* Checkbox: Show only stocks in trouble */}
              <label 
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none"
                title="Institutional risk flagging"
              >
                <input
                  type="checkbox"
                  checked={showTroubleOnly}
                  onChange={(e) => setShowTroubleOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Show only stocks in trouble</span>
                <Info size={12} className="text-slate-400" />
              </label>
            </div>
          </div>

          {/* ── 3-COLUMN REFERENCE LAYOUT ── */}
          {activeView === 'top10_per_fund' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Column 1: Select Mutual Fund (Left Sidebar, 3 cols) */}
              <div className="lg:col-span-3">
                <FundSelectorSidebar
                  funds={fundsList}
                  selectedSchemeCode={selectedSchemeCode}
                  onSelectFund={(fund) => setSelectedSchemeCode(fund.schemeCode)}
                  loading={fundsLoading}
                  selectedCategory={selectedCategory}
                  searchQuery={fundSearch}
                  onSearchChange={(q) => setFundSearch(q)}
                />
              </div>

              {/* Column 2: Main Fund Panel & Top 10 Holdings Table (Center, 6 cols) */}
              <div className="lg:col-span-6">
                <FundTopHoldingsPanel
                  fund={selectedFundData}
                  loading={selectedFundLoading}
                  onSelectStock={(sym) => setSelectedStockSymbol(sym)}
                  onViewAllHoldings={() => setActiveFundModalCode(selectedSchemeCode)}
                />
              </div>

              {/* Column 3: Fund Holdings Summary, Sector Allocation, Key Insights (Right, 3 cols) */}
              <div className="lg:col-span-3">
                <FundHoldingsSummarySidebar
                  fund={selectedFundData}
                />
              </div>
            </div>
          )}

          {/* ── ALL STOCKS MASTER SCREENER VIEW ── */}
          {activeView === 'all_stocks' && (
            <div className="space-y-4">
              <StockWeightageTable
                stocks={stockScreenerData.stocks}
                loading={stockScreenerLoading}
                pagination={stockScreenerData.pagination}
                selectedStockSymbol={selectedStockSymbol}
                onSelectStock={(sym) => setSelectedStockSymbol(sym)}
                onPageChange={(p) => fetchStockScreener(p, sortBy, sortOrder)}
                onSortChange={(col, ord) => {
                  setSortBy(col);
                  setSortOrder(ord);
                  fetchStockScreener(stockPage, col, ord);
                }}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchQuery={stockSearchQuery}
                onSearchChange={(q) => {
                  setStockSearchQuery(q);
                  fetchStockScreener(1, sortBy, sortOrder);
                }}
                selectedSector={selectedSector}
                onSectorChange={(s) => {
                  setSelectedSector(s);
                  fetchStockScreener(1, sortBy, sortOrder);
                }}
                selectedMarketCap={selectedMarketCap}
                onMarketCapChange={(m) => {
                  setSelectedMarketCap(m);
                  fetchStockScreener(1, sortBy, sortOrder);
                }}
              />
            </div>
          )}

          {/* ── STOCKS BY FUND VIEW ── */}
          {activeView === 'stocks_by_fund' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-4">
                <FundSelectorSidebar
                  funds={fundsList}
                  selectedSchemeCode={selectedSchemeCode}
                  onSelectFund={(fund) => setSelectedSchemeCode(fund.schemeCode)}
                  loading={fundsLoading}
                  selectedCategory={selectedCategory}
                  searchQuery={fundSearch}
                  onSearchChange={(q) => setFundSearch(q)}
                />
              </div>

              <div className="lg:col-span-8">
                <FundTopHoldingsPanel
                  fund={selectedFundData}
                  loading={selectedFundLoading}
                  onSelectStock={(sym) => setSelectedStockSymbol(sym)}
                  onViewAllHoldings={() => setActiveFundModalCode(selectedSchemeCode)}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── STOCK DETAIL MODAL (Stock -> Funds Lookup) ── */}
      {selectedStockSymbol && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-6">
            <StockDetailPanel
              symbol={selectedStockSymbol}
              onClose={() => setSelectedStockSymbol(null)}
              onSelectFund={(schemeCode) => {
                setSelectedStockSymbol(null);
                setSelectedSchemeCode(schemeCode);
                setActiveFundModalCode(schemeCode);
              }}
            />
          </div>
        </div>
      )}

      {/* ── COMPLETE FUND PORTFOLIO MODAL (Fund -> Complete Portfolio) ── */}
      {activeFundModalCode && (
        <FundPortfolioModal
          schemeCode={activeFundModalCode}
          onClose={() => setActiveFundModalCode(null)}
          onSelectStock={(sym) => {
            setActiveFundModalCode(null);
            setSelectedStockSymbol(sym);
          }}
        />
      )}

    </div>
  );
}
