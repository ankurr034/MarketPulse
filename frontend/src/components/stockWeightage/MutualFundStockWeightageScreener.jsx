import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Search, SlidersHorizontal, Play, RotateCcw, X, Layers, 
  ArrowLeft, ChevronRight, PieChart, ShieldCheck, Sparkles, Filter, 
  Info, BarChart3, AlertCircle
} from 'lucide-react';
import ScreenerKPIs from './ScreenerKPIs';
import StockWeightageTable from './StockWeightageTable';
import StockDetailPanel from './StockDetailPanel';
import FundPortfolioModal from './FundPortfolioModal';
import FundSelectorSidebar from './FundSelectorSidebar';
import FundTopHoldingsPanel from './FundTopHoldingsPanel';
import FundHoldingsSummarySidebar from './FundHoldingsSummarySidebar';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MutualFundStockWeightageScreener() {
  // Views: 'top10_per_fund' (default), 'all_stocks', 'stocks_by_fund'
  const [activeView, setActiveView] = useState('top10_per_fund');

  // Active Category Filter
  const [selectedCategory, setSelectedCategory] = useState('All Funds');

  // Fund-level state
  const [fundsList, setFundsList] = useState([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState('122639'); // Default to Parag Parikh Flexi Cap
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

  // Category pills list
  const categoriesList = [
    'All Funds',
    'Large Cap Funds',
    'Midcap Funds',
    'Smallcap Funds',
    'Contra Funds',
    'Value Funds',
    'ELSS Funds',
    'Focused Funds',
    'Sectoral Funds'
  ];

  // 1. Fetch mutual funds list for the fund sidebar
  const fetchFundsList = useCallback(async (cat = selectedCategory, search = fundSearch) => {
    setFundsLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== 'All Funds') params.set('category', cat);
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

  const asOfDate = selectedFundData?.asOfDate || 'August 31, 2026';

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      
      {/* ── BREADCRUMB ── */}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
        <span>Mutual Funds</span>
        <ChevronRight size={13} />
        <span className="text-[var(--text-secondary)]">Stock Weightage Screener</span>
        <ChevronRight size={13} />
        <span className="text-blue-500 font-bold">
          {activeView === 'top10_per_fund' ? 'Top 10 Stocks Per Fund' : activeView === 'all_stocks' ? 'All Stocks' : 'Stocks by Fund'}
        </span>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <SlidersHorizontal size={18} />
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] font-display">
              Stock Weightage Screener
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] max-w-2xl mt-1">
            Explore which stocks are held by mutual funds, analyse their weightage across categories, and identify institutional holdings across verified AMC disclosures.
          </p>
        </div>

        {/* Right side: As-of-date and Fund Quick Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
            Data as of <span className="font-bold text-[var(--text-primary)]">{asOfDate}</span>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search fund (e.g. Parag Parikh, HDFC)..."
              value={fundSearch}
              onChange={(e) => {
                setFundSearch(e.target.value);
                fetchFundsList(selectedCategory, e.target.value);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── CATEGORY FILTERS (Compact Pills) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categoriesList.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── VIEW SWITCHER & CONTROLS ── */}
      <div 
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)] self-start">
          <span className="text-[11px] font-bold text-[var(--text-muted)] px-2">View:</span>
          {[
            { id: 'top10_per_fund', label: 'Top 10 Stocks Per Fund' },
            { id: 'all_stocks', label: 'All Stocks' },
            { id: 'stocks_by_fund', label: 'Stocks by Fund' }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === view.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={top10OnlyToggle}
              onChange={(e) => setTop10OnlyToggle(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Show only top 10 stocks per fund</span>
          </label>

          <label 
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer select-none opacity-80"
            title="Insufficient risk flagging data for current period; verified AMC disclosures are active"
          >
            <input
              type="checkbox"
              checked={showTroubleOnly}
              onChange={(e) => setShowTroubleOnly(e.target.checked)}
              className="rounded text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Show only stocks in trouble</span>
          </label>
        </div>
      </div>

      {/* ── CONDITIONAL VIEW WORKSPACES ── */}

      {/* VIEW 1: TOP 10 STOCKS PER FUND (MAIN 3-COLUMN DESKTOP SCREENER UX) */}
      {activeView === 'top10_per_fund' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Sidebar: SELECT MUTUAL FUND (3 cols on lg, 3 cols on xl) */}
          <div className="lg:col-span-3 xl:col-span-3">
            <FundSelectorSidebar
              funds={fundsList}
              selectedSchemeCode={selectedSchemeCode}
              onSelectFund={(fund) => {
                setSelectedSchemeCode(fund.schemeCode);
              }}
              loading={fundsLoading}
              selectedCategory={selectedCategory}
              searchQuery={fundSearch}
              onSearchChange={(q) => {
                setFundSearch(q);
              }}
            />
          </div>

          {/* Center Column: MAIN FUND PANEL & TOP 10 HOLDINGS TABLE (6 cols on lg, 6 cols on xl) */}
          <div className="lg:col-span-6 xl:col-span-6">
            <FundTopHoldingsPanel
              fund={selectedFundData}
              loading={selectedFundLoading}
              onSelectStock={(sym) => {
                setSelectedStockSymbol(sym);
              }}
              onViewAllHoldings={() => {
                setActiveFundModalCode(selectedSchemeCode);
              }}
            />
          </div>

          {/* Right Sidebar: FUND HOLDINGS SUMMARY, SECTOR ALLOCATION, KEY INSIGHTS (3 cols) */}
          <div className="lg:col-span-3 xl:col-span-3">
            <FundHoldingsSummarySidebar
              fund={selectedFundData}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: ALL STOCKS (INSTITUTIONAL AGGREGATED SCREENER TABLE) */}
      {activeView === 'all_stocks' && (
        <div className="flex flex-col gap-5">
          {/* KPIs */}
          <ScreenerKPIs kpis={stockScreenerData.kpis} loading={stockScreenerLoading} />

          {/* Filter Bar for All Stocks */}
          <div 
            className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 p-3 rounded-2xl border shadow-xs" 
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search stock or symbol (e.g. HDFC Bank, Reliance, ITC)..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="w-full md:w-48 shrink-0">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Sectors</option>
                <option value="Banks">Banks / Financials</option>
                <option value="Power">Power & Energy</option>
                <option value="Diversified FMCG">FMCG</option>
                <option value="Automobiles">Automobiles</option>
                <option value="IT">Information Technology</option>
                <option value="Pharmaceuticals">Pharmaceuticals</option>
              </select>
            </div>

            <div className="w-full md:w-40 shrink-0">
              <select
                value={selectedMarketCap}
                onChange={(e) => setSelectedMarketCap(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Market Caps</option>
                <option value="Large Cap">Large Cap</option>
                <option value="Mid Cap">Mid Cap</option>
                <option value="Small Cap">Small Cap</option>
              </select>
            </div>

            <button
              onClick={() => fetchStockScreener(1)}
              className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Play size={12} className="fill-white" />
              <span>Filter</span>
            </button>
          </div>

          {/* Screener Table & Side Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className={selectedStockSymbol ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12'}>
              <StockWeightageTable
                stocks={stockScreenerData.stocks}
                pagination={stockScreenerData.pagination}
                selectedStockSymbol={selectedStockSymbol}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={(col) => {
                  let nextOrder = 'desc';
                  if (sortBy === col) nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                  setSortBy(col);
                  setSortOrder(nextOrder);
                  fetchStockScreener(1, col, nextOrder);
                }}
                onSelectStock={(stock) => setSelectedStockSymbol(stock.symbol)}
                onPageChange={(p) => fetchStockScreener(p)}
                loading={stockScreenerLoading}
              />
            </div>

            {selectedStockSymbol && (
              <div className="lg:col-span-5 xl:col-span-5">
                <StockDetailPanel
                  stockSymbol={selectedStockSymbol}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  onClose={() => setSelectedStockSymbol(null)}
                  onSelectFund={(fund) => setActiveFundModalCode(fund.schemeCode)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: STOCKS BY FUND (SELECT A STOCK AND SEE ALL MUTUAL FUNDS HOLDING IT) */}
      {activeView === 'stocks_by_fund' && (
        <div className="flex flex-col gap-4">
          <div 
            className="flex items-center gap-3 p-3.5 rounded-2xl border shadow-xs"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <Search size={16} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              placeholder="Search stock by name, symbol, or ISIN (e.g. HDFC Bank, INE040A01034, Reliance, ITC)..."
              value={stockSearchQuery}
              onChange={(e) => {
                setStockSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  setSelectedStockSymbol(e.target.value.trim());
                }
              }}
              className="flex-1 text-xs bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            {stockSearchQuery && (
              <button 
                onClick={() => {
                  setStockSearchQuery('');
                  setSelectedStockSymbol('HDFCBANK');
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <StockDetailPanel
            stockSymbol={selectedStockSymbol || 'HDFCBANK'}
            isExpanded={true}
            onToggleExpand={() => {}}
            onClose={() => {}}
            onSelectFund={(fund) => setActiveFundModalCode(fund.schemeCode)}
          />
        </div>
      )}

      {/* ── STOCK DETAIL MODAL (WHEN A STOCK IS CLICKED FROM TOP 10 HOLDINGS TABLE) ── */}
      {selectedStockSymbol && activeView === 'top10_per_fund' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border shadow-2xl bg-[var(--bg-card)] border-[var(--border-color)]">
            <StockDetailPanel
              stockSymbol={selectedStockSymbol}
              isExpanded={true}
              onToggleExpand={() => {}}
              onClose={() => setSelectedStockSymbol(null)}
              onSelectFund={(fund) => setActiveFundModalCode(fund.schemeCode)}
            />
          </div>
        </div>
      )}

      {/* ── COMPLETE FUND PORTFOLIO MODAL ── */}
      {activeFundModalCode && (
        <FundPortfolioModal
          schemeCode={activeFundModalCode}
          onClose={() => setActiveFundModalCode(null)}
        />
      )}
    </div>
  );
}
