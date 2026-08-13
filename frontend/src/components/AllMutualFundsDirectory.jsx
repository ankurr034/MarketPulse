import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, BookOpen, ChevronDown, Filter, FileText } from 'lucide-react';
import * as ReactWindow from 'react-window';
import * as ReactWindowInfiniteLoader from 'react-window-infinite-loader';
import ExpandableAssetRow from './ExpandableAssetRow';

const List = ReactWindow.VariableSizeList || ReactWindow.default?.VariableSizeList || ReactWindow.List;
const InfiniteLoader = ReactWindowInfiniteLoader.default || ReactWindowInfiniteLoader;

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const Row = React.memo(({ index, style, data }) => {
  const { schemes, handleToggleRow } = data;
  const fund = schemes[index];
  if (!fund) {
    return (
      <div style={style} className="p-4 border-b border-[var(--border-color)]/50 animate-pulse flex items-center justify-between">
        <div className="w-1/2 h-5 bg-[var(--bg-secondary)] rounded-md"></div>
        <div className="w-1/4 h-5 bg-[var(--bg-secondary)] rounded-md"></div>
      </div>
    );
  }
  return (
    <div style={style}>
      <ExpandableAssetRow 
        asset={fund} 
        onToggle={(isExpanded) => handleToggleRow(index, isExpanded)} 
      />
    </div>
  );
});

export default function AllMutualFundsDirectory({ externalSearchQuery = '' }) {
  const [schemes, setSchemes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const currentRequestId = useRef(0);
  
  // Track loaded pages
  const loadedPagesMap = useRef({});

  // Sync external search query
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Reset when search or category changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      setSchemes([]);
      setTotalCount(0);
      setExpandedRows({});
      loadedPagesMap.current = {};
      if (listRef.current) {
        listRef.current.scrollTo(0);
      }
      fetchPage(1, searchQuery, selectedCategory);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedCategory]);

  const fetchPage = async (page, query, category = selectedCategory) => {
    if (loadedPagesMap.current[page]) return;
    loadedPagesMap.current[page] = true;
    
    const requestId = ++currentRequestId.current;
    
    setLoading(true);
    try {
      let url = `${API_BASE}/indian-mf/all-schemes?page=${page}&pageSize=100&search=${encodeURIComponent(query)}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      const res = await axios.get(url);
      
      // If a newer search has been triggered, discard this response
      if (requestId !== currentRequestId.current) return;

      const data = res.data;
      setTotalCount(data.totalCount);
      
      setSchemes(prev => {
        const newSchemes = [...prev];
        const startIndex = (page - 1) * 100;
        for (let i = 0; i < data.schemes.length; i++) {
          newSchemes[startIndex + i] = data.schemes[i];
        }
        return newSchemes;
      });
    } catch (err) {
      if (requestId === currentRequestId.current) {
        console.error('Failed to load schemes page:', err);
      }
    } finally {
      if (requestId === currentRequestId.current) {
        setLoading(false);
      }
    }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [isMobile]);

  const isItemLoaded = index => !!schemes[index];

  const loadMoreItems = (startIndex, stopIndex) => {
    const startPage = Math.floor(startIndex / 20) + 1;
    const stopPage = Math.floor(stopIndex / 20) + 1;
    
    const promises = [];
    for (let page = startPage; page <= stopPage; page++) {
      if (!loadedPagesMap.current[page]) {
        promises.push(fetchPage(page, searchQuery, selectedCategory));
      }
    }
    return Promise.all(promises);
  };

  const getItemSize = index => {
    if (expandedRows[index]) {
      return isMobile ? 950 : 500;
    }
    return 76;
  };

  const handleToggleRow = (index, isExpanded) => {
    setExpandedRows(prev => ({ ...prev, [index]: isExpanded }));
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  };

  const itemData = {
    schemes,
    handleToggleRow
  };

  return (
    <div className="mt-8 sm:mt-12 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Premium Hero Header */}
      <div className="bg-gradient-to-br from-indigo-500/[0.08] via-[var(--bg-card)] to-purple-500/[0.06] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm relative overflow-hidden">
        {/* Decorative blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/2"></div>
        
        <div className="w-14 h-14 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] flex items-center justify-center shadow-sm mb-2">
          <BookOpen className="text-indigo-500" size={28} />
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-display tracking-tight">
          Complete Fund Directory
        </h2>
        <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl mx-auto">
          Access the master directory of all 40,000+ Indian mutual fund schemes. Search by exact scheme name or AMFI code.
        </p>
      </div>

      {/* Search Bar & Filter Workspace */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-[var(--text-muted)] group-focus-within:text-indigo-400 transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search by fund name, keyword, or AMFI code (e.g. 122639)..." 
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner font-medium text-sm sm:text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="relative group sm:w-64 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter className="text-[var(--text-muted)] group-focus-within:text-indigo-400 transition-colors" size={18} />
          </div>
          <select 
            className="w-full h-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-3.5 pl-11 pr-10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner font-medium text-sm sm:text-base appearance-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <optgroup label="Equity">
              <option value="Arbitrage Fund">Arbitrage Fund</option>
              <option value="Contra">Contra</option>
              <option value="Dividend Yield">Dividend Yield</option>
              <option value="ELSS (Tax Savings)">ELSS (Tax Savings)</option>
              <option value="Flexi Cap">Flexi Cap</option>
              <option value="Focused Fund">Focused Fund</option>
              <option value="Index Funds">Index Funds</option>
              <option value="Large & Mid-Cap">Large & Mid-Cap</option>
              <option value="Large-Cap">Large-Cap</option>
              <option value="Mid-Cap">Mid-Cap</option>
              <option value="Multi-Cap">Multi-Cap</option>
              <option value="Sector / Thematic">Sector / Thematic</option>
              <option value="Small-Cap">Small-Cap</option>
              <option value="Value">Value</option>
            </optgroup>
            <optgroup label="Debt">
              <option value="Banking & PSU">Banking & PSU</option>
              <option value="Corporate Bond">Corporate Bond</option>
              <option value="Credit Risk">Credit Risk</option>
              <option value="Dynamic Bond">Dynamic Bond</option>
              <option value="Floating Rate">Floating Rate</option>
              <option value="Government Bond">Government Bond</option>
              <option value="Liquid">Liquid</option>
              <option value="Long Duration">Long Duration</option>
              <option value="Low Duration">Low Duration</option>
              <option value="Medium to Long Duration">Medium to Long Duration</option>
              <option value="Medium Duration">Medium Duration</option>
              <option value="Money Market">Money Market</option>
              <option value="Overnight">Overnight</option>
              <option value="Short Duration">Short Duration</option>
              <option value="Ultra Short Duration">Ultra Short Duration</option>
            </optgroup>
            <optgroup label="Commodities & ETFs">
              <option value="Commodities & Gold">Commodities & Gold</option>
              <option value="Gold ETF">Gold ETF</option>
              <option value="Silver ETF">Silver ETF</option>
              <option value="ETFs & Index Funds">ETFs & Index Funds</option>
            </optgroup>
            <optgroup label="Hybrid & Others">
              <option value="Aggressive Allocation">Aggressive Allocation</option>
              <option value="Conservative Allocation">Conservative Allocation</option>
              <option value="Dynamic Asset Allocation">Dynamic Asset Allocation</option>
              <option value="Equity Savings">Equity Savings</option>
              <option value="Multi Asset">Multi Asset</option>
              <option value="Children">Children</option>
              <option value="Retirement">Retirement</option>
              <option value="Fund of Funds">Fund of Funds</option>
              <option value="Other">Other</option>
            </optgroup>
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown className="text-[var(--text-muted)]" size={16} />
          </div>
        </div>
      </div>

      {/* Stats & Results */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm flex flex-col relative">
        <div className="px-5 py-3 border-b border-[var(--border-color)]/50 bg-[var(--bg-secondary)]/30 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <FileText size={14} /> Directory Listings
          </span>
          {loading && totalCount === 0 ? (
            <span className="text-xs font-semibold text-indigo-400 animate-pulse">Loading directory...</span>
          ) : (
            <span className="text-xs font-semibold bg-[var(--bg-secondary)] px-2 py-1 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)]">
              {totalCount.toLocaleString()} funds found
            </span>
          )}
        </div>

        <div className="min-h-[500px]">
          {loading && totalCount === 0 ? (
            <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-[var(--text-muted)] gap-4 mt-10">
              <span className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-sm font-medium">Fetching directory index...</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-[var(--text-muted)] gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)]">
                <Search className="text-[var(--text-muted)] opacity-50" size={28} />
              </div>
              <p className="text-sm font-medium">No schemes found matching "{searchQuery}".</p>
            </div>
          ) : (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={totalCount}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <List
                  className="List custom-scrollbar"
                  height={600}
                  itemCount={totalCount}
                  itemSize={getItemSize}
                  onItemsRendered={onItemsRendered}
                  ref={(el) => {
                    ref(el);
                    listRef.current = el;
                  }}
                  width="100%"
                  itemData={itemData}
                >
                  {Row}
                </List>
              )}
            </InfiniteLoader>
          )}
        </div>
      </div>
    </div>
  );
}
