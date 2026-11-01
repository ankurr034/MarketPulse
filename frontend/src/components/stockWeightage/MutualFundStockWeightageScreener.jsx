import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, ChevronRight, PieChart as PieChartIcon, 
  Building2, Landmark, TrendingUp, Flag, Disc, Star, 
  HelpCircle, X, Check, Award, Layers, BarChart3,
  ExternalLink, Briefcase, Filter, SlidersHorizontal
} from 'lucide-react';
import StockWeightageTable from './StockWeightageTable';
import StockDetailPanel from './StockDetailPanel';
import StockAllFundsModal from './StockAllFundsModal';
import FundPortfolioModal from './FundPortfolioModal';
import FundSelectorSidebar from './FundSelectorSidebar';
import FundTopHoldingsPanel from './FundTopHoldingsPanel';
import FundHoldingsSummarySidebar from './FundHoldingsSummarySidebar';
import BrandLogo from './BrandLogo';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MutualFundStockWeightageScreener() {
  // Navigation tabs: 'most_held', 'sector_view'
  const [activeTab, setActiveTab] = useState('most_held');

  // Category filter matching reference pills: 'All Funds', 'Large Cap', 'Mid Cap', 'Small Cap', 'Contra', 'Value'
  const [selectedCategory, setSelectedCategory] = useState('All Funds');

  // Filter bar controls
  const [sortBy, setSortBy] = useState('fundCount');
  const [sortOrder, setSortOrder] = useState('desc');
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Master screener state
  const [stockScreenerData, setStockScreenerData] = useState({ kpis: {}, stocks: [], pagination: {} });
  const [stockScreenerLoading, setStockScreenerLoading] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Stock for the right-side detail panel (default to top stock on load so it is NEVER blank)
  const [selectedStockSymbol, setSelectedStockSymbol] = useState(null);

  // Sector view data
  const [sectorsData, setSectorsData] = useState(null);
  const [sectorsLoading, setSectorsLoading] = useState(false);

  // Fund-level state (for 'top10_per_fund' view)
  const [fundsList, setFundsList] = useState([]);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState('119018'); // Default to HDFC Large Cap
  const [selectedFundData, setSelectedFundData] = useState(null);
  const [selectedFundLoading, setSelectedFundLoading] = useState(false);
  const [fundSearch, setFundSearch] = useState('');

  // Modals
  const [activeStockAllFundsSym, setActiveStockAllFundsSym] = useState(null);
  const [activeFundModalCode, setActiveFundModalCode] = useState(null);
  const [showHowToUseModal, setShowHowToUseModal] = useState(false);

  // Category pills matching reference design
  const categoryPills = [
    { label: 'All Funds', icon: Building2 },
    { label: 'Large & Mid Cap', icon: Landmark },
    { label: 'Small Cap', icon: Flag },
    { label: 'Contra', icon: Disc },
    { label: 'Value', icon: Star }
  ];

  // Sub-navigation view tabs matching reference design
  const navTabs = [
    { id: 'most_held', label: 'Most Held Stocks', icon: Building2 },
    { id: 'sector_view', label: 'Sector View', icon: PieChartIcon }
  ];

  // 1. Fetch stock screener results
  const fetchStockScreener = useCallback(async (
    page = 1,
    currentSortBy = sortBy,
    currentSortOrder = sortOrder,
    currentPageSize = pageSize,
    category = selectedCategory
  ) => {
    setStockScreenerLoading(true);
    try {
      const params = new URLSearchParams();
      if (stockSearchQuery.trim()) params.set('search', stockSearchQuery.trim());
      if (category && category !== 'All Funds') params.set('category', category);

      params.set('sortBy', currentSortBy);
      params.set('sortOrder', currentSortOrder);
      params.set('page', page);
      params.set('limit', currentPageSize);

      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage?${params.toString()}`);
      setStockScreenerData(res.data);
      setStockPage(page);

      // Default select first stock if none selected so right side is NEVER blank!
      if (res.data?.stocks?.length > 0) {
        if (!selectedStockSymbol || !res.data.stocks.some(s => s.symbol === selectedStockSymbol)) {
          setSelectedStockSymbol(res.data.stocks[0].symbol);
        }
      }
    } catch (err) {
      console.error('Failed to load stock weightage data:', err);
    } finally {
      setStockScreenerLoading(false);
    }
  }, [stockSearchQuery, selectedCategory, sortBy, sortOrder, pageSize, selectedStockSymbol]);

  // 2. Fetch sectors breakdown
  const fetchSectors = useCallback(async () => {
    setSectorsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/sectors`);
      setSectorsData(res.data);
    } catch (err) {
      console.error('Failed to load sector breakdown:', err);
    } finally {
      setSectorsLoading(false);
    }
  }, []);

  // 3. Fetch mutual funds list (for 'top10_per_fund' view)
  const fetchFundsList = useCallback(async (cat = selectedCategory, search = fundSearch) => {
    setFundsLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== 'All Funds') {
        params.set('category', cat);
      }
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', 250);

      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/funds?${params.toString()}`);
      const funds = res.data.funds || [];
      setFundsList(funds);

      if (funds.length > 0 && !funds.some(f => String(f.schemeCode) === String(selectedSchemeCode))) {
        setSelectedSchemeCode(funds[0].schemeCode);
      }
    } catch (err) {
      console.error('Failed to load funds list:', err);
    } finally {
      setFundsLoading(false);
    }
  }, [selectedCategory, fundSearch, selectedSchemeCode]);

  // 4. Fetch selected fund complete portfolio
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

  // Initial load
  useEffect(() => {
    fetchStockScreener(1);
    fetchSectors();
    fetchFundsList();
  }, []);

  // Live search query debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStockScreener(1, sortBy, sortOrder, pageSize, selectedCategory);
    }, 350);
    return () => clearTimeout(timer);
  }, [stockSearchQuery]);

  // Whenever selectedSchemeCode changes, fetch its portfolio
  useEffect(() => {
    if (selectedSchemeCode && activeTab === 'top10_per_fund') {
      fetchFundPortfolio(selectedSchemeCode);
    }
  }, [selectedSchemeCode, activeTab, fetchFundPortfolio]);

  // Tab change handler
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'most_held') {
      setSortBy('fundCount');
      setSortOrder('desc');
      fetchStockScreener(1, 'fundCount', 'desc');
    } else if (tabId === 'sector_view') {
      fetchSectors();
    }
  };

  // Category filter handler
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    fetchStockScreener(1, sortBy, sortOrder, pageSize, cat);
    if (activeTab === 'top10_per_fund') {
      fetchFundsList(cat, fundSearch);
    }
  };

  // Stock selection handler
  const handleSelectStock = (stockOrSym) => {
    if (!stockOrSym) return;
    const sym = typeof stockOrSym === 'object'
      ? (stockOrSym.symbol || stockOrSym.stock || stockOrSym.stockSymbol)
      : stockOrSym;
    if (sym) {
      setSelectedStockSymbol(String(sym).toUpperCase());
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* ── 1. UNIFIED NOTICEABLE FILTER BAR (COMPACT & SLIM, ALL AT SINGLE PLACE) ── */}
      <div className="rounded-xl sm:rounded-2xl border border-emerald-500/35 dark:border-emerald-500/40 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900/95 dark:to-emerald-950/30 p-2 sm:p-2.5 shadow-xs flex flex-col gap-1.5 sm:gap-2">
        
        {/* Row 1: View Mode Switch + Search Input + Help */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          {/* Sub-Nav View Tabs (Most Held Stocks vs Sector View) */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0D6B58] text-white shadow-2xs ring-1 ring-emerald-400/30'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box & How to Use */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
              <input
                type="text"
                placeholder="Search stock or symbol..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                className="w-full pl-6 pr-6 py-1 text-[11px] sm:text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
              />
              {stockSearchQuery && (
                <button
                  onClick={() => setStockSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowHowToUseModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer shrink-0"
            >
              <HelpCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">How to use?</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter Pills (All visible at single place, flex-wrap, no scrollbar!) */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600/10 dark:bg-emerald-500/20 text-[#0D6B58] dark:text-emerald-400 font-extrabold text-[9.5px] sm:text-[10px] uppercase tracking-wider shrink-0 border border-emerald-600/20 dark:border-emerald-500/25">
            <Filter size={10} className="text-[#0D6B58] dark:text-emerald-400" />
            <span>Category:</span>
          </div>

          {categoryPills.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedCategory === item.label;

            return (
              <button
                key={item.label}
                onClick={() => handleSelectCategory(item.label)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0D6B58] to-[#0a5243] text-white shadow-2xs ring-1 ring-emerald-500/40'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400'
                }`}
              >
                <Icon size={11} className={isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>

          {/* ── 5. TAB VIEWS ── */}

          {/* VIEW A: MASTER STOCK SCREENER SPLIT VIEW (Most Held Stocks) */}
          {activeTab === 'most_held' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Panel: Master Stock Screener Table (7 cols on lg, 7 on xl) */}
              <div className={`${selectedStockSymbol ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'}`}>
                <StockWeightageTable
                  stocks={stockScreenerData.stocks}
                  loading={stockScreenerLoading}
                  pagination={stockScreenerData.pagination}
                  selectedStockSymbol={selectedStockSymbol}
                  onSelectStock={handleSelectStock}
                  onPageChange={(p) => fetchStockScreener(p, sortBy, sortOrder, pageSize)}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    fetchStockScreener(1, sortBy, sortOrder, size);
                  }}
                  onSort={(col) => {
                    const newOrder = (sortBy === col && sortOrder === 'desc') ? 'asc' : 'desc';
                    setSortBy(col);
                    setSortOrder(newOrder);
                    fetchStockScreener(stockPage, col, newOrder, pageSize);
                  }}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </div>

              {/* Right Panel: Stock Detail Panel (5 cols on lg, 5 on xl) */}
              {selectedStockSymbol && (
                <div className="lg:col-span-6 xl:col-span-5 sticky top-20">
                  <StockDetailPanel
                    stockSymbol={selectedStockSymbol}
                    onClose={() => setSelectedStockSymbol(null)}
                    onSelectFund={(schemeCode) => {
                      setSelectedSchemeCode(schemeCode);
                      setActiveFundModalCode(schemeCode);
                    }}
                    onViewAllFunds={(sym) => setActiveStockAllFundsSym(sym)}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW B: SECTOR VIEW */}
          {activeTab === 'sector_view' && (
            <div className="rounded-2xl border p-5 bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Mutual Fund Sector Allocation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aggregate capital deployed by mutual funds across sectors and industries
                  </p>
                </div>
                {sectorsData?.totalValueAnalysedCr && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800">
                    Total Disclosed Value: ₹ {Number(sectorsData.totalValueAnalysedCr).toLocaleString('en-IN')} Cr
                  </span>
                )}
              </div>

              {sectorsLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading sector analytics...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Sector</th>
                        <th className="py-3 px-3 text-right">Holding Value (₹ Cr)</th>
                        <th className="py-3 px-3 text-right">% of Disclosed Portfolio</th>
                        <th className="py-3 px-3 text-center">Funds Holding</th>
                        <th className="py-3 px-3 text-center">Stocks Count</th>
                        <th className="py-3 px-3">Top 3 Held Stocks</th>
                        <th className="py-3 px-3 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sectorsData?.sectors?.map((sec, idx) => (
                        <tr key={sec.sector} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{sec.sector}</td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                            ₹ {Number(sec.totalHoldingValueCr).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {sec.percentageOfTotal}%
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {sec.fundsHoldingCount}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                            {sec.stocksCount}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {sec.topStocks?.map(st => (
                                <button
                                  key={st.symbol}
                                  onClick={() => {
                                    handleSelectStock(st.symbol);
                                    setActiveTab('most_held');
                                  }}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 cursor-pointer"
                                  title={`${st.name} held by ${st.fundsHolding} funds`}
                                >
                                  {st.symbol}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedSector(sec.sector);
                                setActiveTab('most_held');
                                fetchStockScreener(1, sortBy, sortOrder, pageSize);
                              }}
                              className="px-2 py-1 rounded text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 cursor-pointer"
                            >
                              Filter Sector
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW C: MARKET TRENDS */}
          {activeTab === 'market_trends' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--bg-card)]">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Top Consensus Picks
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {stockScreenerData?.kpis?.mostHeldStock || 'HDFC Bank Ltd.'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Held by the greatest number of mutual funds across all direct equity growth schemes.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--bg-card)]">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Funds Tracked
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {stockScreenerData?.kpis?.mutualFundsTracked || 136} Schemes
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Verified statutory portfolio disclosures across all major AMCs.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--bg-card)]">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Disclosed Capital Analyzed
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    ₹ {Number(stockScreenerData?.kpis?.totalHoldingValueAnalysedCr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Combined equity holdings value computed across all indexed positions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW D: TOP 10 STOCKS PER FUND (3-COLUMN FUND-CENTRIC VIEW) */}
          {activeTab === 'top10_per_fund' && (
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
                  onSelectStock={handleSelectStock}
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

      {/* ── ALL FUNDS HOLDING STOCK MODAL ── */}
      {activeStockAllFundsSym && (
        <StockAllFundsModal
          symbol={activeStockAllFundsSym}
          onClose={() => setActiveStockAllFundsSym(null)}
          onSelectFund={(code) => {
            setActiveStockAllFundsSym(null);
            setSelectedSchemeCode(code);
            setActiveFundModalCode(code);
          }}
        />
      )}

      {/* ── COMPLETE FUND PORTFOLIO MODAL ── */}
      {activeFundModalCode && (
        <FundPortfolioModal
          schemeCode={activeFundModalCode}
          onClose={() => setActiveFundModalCode(null)}
          onSelectStock={(sym) => {
            setActiveFundModalCode(null);
            handleSelectStock(sym);
          }}
        />
      )}

      {/* ── HOW TO USE MODAL ── */}
      {showHowToUseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} className="text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  How to Use Stock Weightage Screener
                </h3>
              </div>
              <button
                onClick={() => setShowHowToUseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>1. Stock-Centric Intelligence:</strong> Unlike traditional mutual fund tools that show one fund at a time, this screener aggregates ALL mutual fund portfolios to reveal where institutional money is concentrated.
              </p>
              <p>
                <strong>2. Key Metrics Explained:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                <li><strong>Funds Holding:</strong> Total count of distinct Direct + Growth schemes holding this stock.</li>
                <li><strong>Avg. Weightage:</strong> Average allocation percentage among schemes that hold it.</li>
                <li><strong>Max. Weightage:</strong> Highest single-scheme allocation percentage.</li>
                <li><strong>Fund AUM Exposure:</strong> Total AUM of all schemes holding this stock.</li>
                <li><strong>Total Holding Value:</strong> Combined rupee value of the stock held across all funds.</li>
              </ul>
              <p>
                <strong>3. Interactive Split View:</strong> Click any stock in the table to instantly view all holding funds, weightage distribution brackets, quarterly trend charts, and sector allocation on the right panel.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHowToUseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
