import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, ChevronRight, PieChart as PieChartIcon, 
  Building2, Landmark, TrendingUp, Flag, Disc, Star, 
  HelpCircle, X, Check, Award, Layers, BarChart3,
  ExternalLink, Briefcase
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

  // 6 Category pills matching reference design
  const categoryPills = [
    { label: 'All Funds', icon: Building2 },
    { label: 'Large Cap', icon: Landmark },
    { label: 'Mid Cap', icon: TrendingUp },
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
        const queryCat = cat.includes('Funds') ? cat : `${cat} Funds`;
        params.set('category', queryCat);
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
      
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pb-1">
        <span>Mutual Funds</span>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-900 dark:text-white font-bold">Stock Weightage Screener</span>
      </nav>

      {/* ── 1. HEADER ROW WITH TITLE, DATA DISCLAIMER BADGE & HOW TO USE BUTTON ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stock Weightage Screener
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Discover which stocks are held by mutual funds, analyse their weightage across categories, sectors and identify market trends.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center max-w-2xl">
              {/* Data Disclaimer Badge matching reference green container */}
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200">
                <p className="text-[10px] leading-tight text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">Data Disclaimer:</span> Mutual fund holdings and AUM data shown in this screener could be  based on the old and previous data available in our verified data sources. Some holdings may be from an earlier reporting period and may not reflect the funds' current portfolio positions. Data is provided for informational and analytical purposes only and should not be considered real-time or investment advice.
                </p>
              </div>

              {/* How to use? Button */}
              <button
                onClick={() => setShowHowToUseModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <HelpCircle size={14} className="text-blue-500" />
                <span>How to use?</span>
              </button>
            </div>
          </div>

          {/* ── 2. CATEGORY PILLS (6 PILLS MATCHING REFERENCE DESIGN) ── */}
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
                      ? 'bg-[#0D6B58] text-white shadow-xs'
                      : 'bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-white' : 'text-blue-500'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── 3. FILTER BAR (SORT BY & SEARCH BAR) ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSort = e.target.value;
                  setSortBy(newSort);
                  fetchStockScreener(1, newSort, sortOrder);
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="fundCount">Number of Funds Holdings</option>
                <option value="universeWeightPct">MF Universe Weightage (%)</option>
                <option value="holdingValue">Total AUM Exposure</option>
                <option value="sector">Sector</option>
                <option value="name">Stock Name</option>
                <option value="avgWeightage">Avg. Weightage</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock (e.g. HDFC Bank, Reliance...)"
                value={stockSearchQuery}
                onChange={(e) => {
                  setStockSearchQuery(e.target.value);
                  fetchStockScreener(1, sortBy, sortOrder);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {stockSearchQuery && (
                <button 
                  onClick={() => {
                    setStockSearchQuery('');
                    fetchStockScreener(1, sortBy, sortOrder);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ── 4. SUB-NAVIGATION TABS (ROW 3 MATCHING REFERENCE DESIGN) ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0D6B58] text-white shadow-xs'
                      : 'bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-blue-500'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
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
