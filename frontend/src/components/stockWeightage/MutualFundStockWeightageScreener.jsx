import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, SlidersHorizontal, Play, RotateCcw, X, Layers, ArrowLeft } from 'lucide-react';
import ScreenerKPIs from './ScreenerKPIs';
import StockWeightageTable from './StockWeightageTable';
import StockDetailPanel from './StockDetailPanel';
import FundPortfolioModal from './FundPortfolioModal';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MutualFundStockWeightageScreener() {
  const [data, setData] = useState({ kpis: {}, stocks: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState(null);
  const [activeFundModalCode, setActiveFundModalCode] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedMarketCap, setSelectedMarketCap] = useState('all');
  const [sortBy, setSortBy] = useState('fundCount');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch screener results
  const fetchScreener = useCallback(async (page = 1, currentSortBy = sortBy, currentSortOrder = sortOrder) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedSector !== 'all') params.set('sector', selectedSector);
      if (selectedMarketCap !== 'all') params.set('marketCap', selectedMarketCap);
      params.set('sortBy', currentSortBy);
      params.set('sortOrder', currentSortOrder);
      params.set('page', page);
      params.set('limit', 10);

      const res = await axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage?${params.toString()}`);
      setData(res.data);
      setCurrentPage(page);

      // Dynamically select the first stock returned if none is selected
      if (!selectedStockSymbol && res.data.stocks && res.data.stocks.length > 0) {
        setSelectedStockSymbol(res.data.stocks[0].symbol);
      }
    } catch (err) {
      console.error('Failed to load stock weightage screener data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSector, selectedMarketCap, sortBy, sortOrder, selectedStockSymbol]);

  useEffect(() => {
    fetchScreener(1);
  }, []);

  const handleRunScreener = (e) => {
    e?.preventDefault();
    fetchScreener(1, sortBy, sortOrder);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSector('all');
    setSelectedMarketCap('all');
    setSortBy('fundCount');
    setSortOrder('desc');
    // Fetch directly with reset parameters
    fetchScreener(1, 'fundCount', 'desc');
  };

  const handleSort = (columnKey) => {
    let nextOrder = 'desc';
    if (sortBy === columnKey) {
      nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    }
    setSortBy(columnKey);
    setSortOrder(nextOrder);
    fetchScreener(1, columnKey, nextOrder);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedSector !== 'all' || selectedMarketCap !== 'all' || sortBy !== 'fundCount';

  const sectorsList = [
    { value: 'all', label: 'All Sectors' },
    { value: 'Banks', label: 'Banks / Financials' },
    { value: 'Power', label: 'Power & Energy' },
    { value: 'Diversified FMCG', label: 'FMCG' },
    { value: 'Automobiles', label: 'Automobiles' },
    { value: 'IT', label: 'Information Technology' },
    { value: 'Pharmaceuticals', label: 'Pharmaceuticals' },
    { value: 'Other', label: 'Other Sectors' }
  ];

  const marketCapList = [
    { value: 'all', label: 'All Market Caps' },
    { value: 'Large Cap', label: 'Large Cap' },
    { value: 'Mid Cap', label: 'Mid Cap' },
    { value: 'Small Cap', label: 'Small Cap' }
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <SlidersHorizontal size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-[var(--text-primary)]">
                Stock Weightage Screener
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Institutional Holdings
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Screen Indian stocks by institutional mutual fund presence, total holding value, and portfolio allocations.
            </p>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors self-start sm:self-auto"
          >
            <RotateCcw size={12} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* 2. Filter Bar */}
      <form 
        onSubmit={handleRunScreener} 
        className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 p-3 rounded-2xl border shadow-xs" 
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        {/* Search Stock */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search stock or symbol (e.g. REC, Power Grid, ITC, HDFC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchScreener(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sector Filter */}
        <div className="w-full md:w-48 shrink-0">
          <select
            value={selectedSector}
            onChange={(e) => {
              setSelectedSector(e.target.value);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {sectorsList.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Market Cap Filter */}
        <div className="w-full md:w-40 shrink-0">
          <select
            value={selectedMarketCap}
            onChange={(e) => {
              setSelectedMarketCap(e.target.value);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {marketCapList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Run Button */}
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs shrink-0"
        >
          <Play size={12} className="fill-white" />
          <span>Filter</span>
        </button>
      </form>

      {/* 3. KPI Metric Cards */}
      <ScreenerKPIs kpis={data.kpis} loading={loading} />

      {/* 4. Split-Screen / Fullscreen Workspace */}
      {isExpanded && selectedStockSymbol ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsExpanded(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors self-start shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Screener Table</span>
          </button>
          <StockDetailPanel
            stockSymbol={selectedStockSymbol}
            isExpanded={true}
            onToggleExpand={() => setIsExpanded(false)}
            onClose={() => {
              setIsExpanded(false);
              setSelectedStockSymbol(null);
            }}
            onSelectFund={(fund) => setActiveFundModalCode(fund.schemeCode)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Screener Table (Left column) */}
          <div className={selectedStockSymbol ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12'}>
            <StockWeightageTable
              stocks={data.stocks}
              pagination={data.pagination}
              selectedStockSymbol={selectedStockSymbol}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onSelectStock={(stock) => setSelectedStockSymbol(stock.symbol)}
              onPageChange={(p) => fetchScreener(p)}
              loading={loading}
            />
          </div>

          {/* Stock Detail Panel (Right column) */}
          {selectedStockSymbol && (
            <div className="lg:col-span-5 xl:col-span-5">
              <StockDetailPanel
                stockSymbol={selectedStockSymbol}
                isExpanded={false}
                onToggleExpand={() => setIsExpanded(true)}
                onClose={() => setSelectedStockSymbol(null)}
                onSelectFund={(fund) => setActiveFundModalCode(fund.schemeCode)}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. Reverse Lookup Modal: Fund -> Complete Portfolio */}
      {activeFundModalCode && (
        <FundPortfolioModal
          schemeCode={activeFundModalCode}
          onClose={() => setActiveFundModalCode(null)}
        />
      )}
    </div>
  );
}

