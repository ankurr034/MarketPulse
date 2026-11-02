import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveSector, setSectors, setLoading, setActiveSymbol, setTimeframe } from '../store/slices/marketSlice';
import { 
  Building, Building2, Landmark, Cpu, Car, Pill, ShoppingBag, 
  Hammer, Zap, Tv, HardHat, TrendingUp, Download, RefreshCw, 
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, ArrowRight, X, Activity,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import axios from 'axios';
import MacroCorrelationSection from '../components/MacroCorrelationSection';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Period list
const PERIODS = ['1W', '1M', '6M', '1Y', '3Y', '5Y', 'ALL'];

// Format currency numbers with Indian commas
const formatIndianNumber = (num, minDec = 2, maxDec = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec
  });
};

// Format large volumes as Cr / L / K
const formatVolumeValue = (vol) => {
  if (vol === null || vol === undefined || isNaN(vol) || vol === 0) return '—';
  const num = Number(vol);
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} K`;
  }
  return num.toLocaleString('en-IN');
};

// Map sector types to clean themed Lucide icons & colors
const getSectorTheming = (name = '', id = '') => {
  const lower = (name + ' ' + id).toLowerCase();
  if (lower.includes('realt') || lower.includes('real estate') || lower.includes('property')) {
    return {
      icon: <Building size={16} className="text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    };
  }
  if (lower.includes('bank') || lower.includes('psu bank')) {
    return {
      icon: <Landmark size={16} className="text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
    };
  }
  if (lower.includes('fin') || lower.includes('financial')) {
    return {
      icon: <Building2 size={16} className="text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    };
  }
  if (lower.includes('it') || lower.includes('tech')) {
    return {
      icon: <Cpu size={16} className="text-purple-600 dark:text-purple-400" />,
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
    };
  }
  if (lower.includes('pharma') || lower.includes('health')) {
    return {
      icon: <Pill size={16} className="text-cyan-600 dark:text-cyan-400" />,
      bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800'
    };
  }
  if (lower.includes('auto')) {
    return {
      icon: <Car size={16} className="text-orange-600 dark:text-orange-400" />,
      bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800'
    };
  }
  if (lower.includes('fmcg') || lower.includes('consum')) {
    return {
      icon: <ShoppingBag size={16} className="text-rose-600 dark:text-rose-400" />,
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
    };
  }
  if (lower.includes('metal')) {
    return {
      icon: <Hammer size={16} className="text-slate-600 dark:text-slate-400" />,
      bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
    };
  }
  if (lower.includes('energy') || lower.includes('oil') || lower.includes('power')) {
    return {
      icon: <Zap size={16} className="text-yellow-600 dark:text-yellow-400" />,
      bg: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800'
    };
  }
  if (lower.includes('media')) {
    return {
      icon: <Tv size={16} className="text-pink-600 dark:text-pink-400" />,
      bg: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800'
    };
  }
  if (lower.includes('infra')) {
    return {
      icon: <HardHat size={16} className="text-indigo-600 dark:text-indigo-400" />,
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
    };
  }
  return {
    icon: <TrendingUp size={16} className="text-sky-600 dark:text-sky-400" />,
    bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
  };
};

// Stock logo badge palette
const getStockBadge = (symbol = '') => {
  const clean = symbol.replace('.NS', '').replace('.BO', '').toUpperCase();
  const first = clean.charAt(0) || 'S';
  
  if (clean.includes('HDFC')) {
    return { letter: 'H', bg: 'bg-blue-600 text-white' };
  }
  if (clean.includes('ICICI')) {
    return { letter: 'i', bg: 'bg-amber-600 text-white' };
  }
  if (clean.includes('SBI')) {
    return { letter: 'S', bg: 'bg-sky-600 text-white' };
  }
  if (clean.includes('AXIS')) {
    return { letter: 'A', bg: 'bg-red-800 text-white' };
  }
  if (clean.includes('KOTAK')) {
    return { letter: 'K', bg: 'bg-red-600 text-white' };
  }
  if (clean.includes('TCS')) {
    return { letter: 'T', bg: 'bg-indigo-600 text-white' };
  }
  if (clean.includes('INFY')) {
    return { letter: 'I', bg: 'bg-blue-500 text-white' };
  }
  if (clean.includes('RELIANCE')) {
    return { letter: 'R', bg: 'bg-blue-700 text-white' };
  }
  if (clean.includes('TATA')) {
    return { letter: 'T', bg: 'bg-blue-600 text-white' };
  }
  if (clean.includes('SUN')) {
    return { letter: 'S', bg: 'bg-orange-500 text-white' };
  }

  // Consistent fallback based on char code
  const palettes = [
    'bg-blue-600 text-white',
    'bg-emerald-600 text-white',
    'bg-purple-600 text-white',
    'bg-indigo-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-cyan-600 text-white',
    'bg-teal-600 text-white'
  ];
  const idx = (clean.charCodeAt(0) + (clean.charCodeAt(1) || 0)) % palettes.length;
  return { letter: first, bg: palettes[idx] };
};

// Authentic multi-period returns from real historical backend price data
const getMultiPeriodReturns = (item) => {
  const rets = (item?.returns && typeof item.returns === 'object' && Object.keys(item.returns).length > 0)
    ? item.returns
    : (item?.performance && typeof item.performance === 'object' ? item.performance : null);

  if (rets) {
    return {
      '1W': rets['1W'] !== undefined && rets['1W'] !== null ? Number(rets['1W']) : null,
      '1M': rets['1M'] !== undefined && rets['1M'] !== null ? Number(rets['1M']) : null,
      '6M': rets['6M'] !== undefined && rets['6M'] !== null ? Number(rets['6M']) : null,
      '1Y': rets['1Y'] !== undefined && rets['1Y'] !== null ? Number(rets['1Y']) : null,
      '3Y': rets['3Y'] !== undefined && rets['3Y'] !== null ? Number(rets['3Y']) : null,
      '5Y': rets['5Y'] !== undefined && rets['5Y'] !== null ? Number(rets['5Y']) : null,
      'ALL': rets['ALL'] !== undefined && rets['ALL'] !== null ? Number(rets['ALL']) : null
    };
  }
  return { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
};

export default function SectorHeatmap() {
  const dispatch = useDispatch();
  const { sectors, region, timeframe, assetClass, loading, lastUpdated } = useSelector(state => state.market);

  // Hidden page toggle for Macro Trend Analysis on Stocks page (like Facts and Figures in Mutual Funds)
  const [showMacroTrends, setShowMacroTrends] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'macro' || params.get('tab') === 'macro-trends' || params.get('view') === 'macro';
  });

  // Filter & interaction state
  const [viewMode, setViewMode] = useState('sectors'); // 'sectors' | 'all_stocks' | 'etfs'
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('all');
  const [expandedSectorId, setExpandedSectorId] = useState(null);
  
  // All Stocks dataset state
  const [allStocksData, setAllStocksData] = useState([]);
  const [allStocksLoading, setAllStocksLoading] = useState(false);
  const [globalSortKey, setGlobalSortKey] = useState('globalRank');
  const [globalSortDirection, setGlobalSortDirection] = useState('asc'); // 'asc' | 'desc'
  
  // ETFs dataset state (Groww & Zerodha compliant category coverage)
  const [etfsData, setEtfsData] = useState([]);
  const [etfsLoading, setEtfsLoading] = useState(false);
  const [etfCategoryFilter, setEtfCategoryFilter] = useState('all'); // 'all' | 'index' | 'commodity' | 'sectoral' | 'global' | 'debt'
  
  // Expanded inline sector detail states
  const [sectorDetailCache, setSectorDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [stockFilterTab, setStockFilterTab] = useState('all'); // 'all' | 'gainers' | 'losers' | 'volume' | 'marketCap'
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [visibleStockCount, setVisibleStockCount] = useState(5);
  const autoSwitchedFromSectorsRef = useRef(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Refresh trigger state
  const [isRefreshing, setIsRefreshing] = useState(false);



  // Search handlers with automatic view mode management
  const handleSearchChange = useCallback((query) => {
    setStockSearchQuery(query);
    setCurrentPage(1);
    if (query && query.trim().length > 0) {
      if (viewMode === 'sectors') {
        autoSwitchedFromSectorsRef.current = true;
        setViewMode('all_stocks');
      }
    } else {
      if (autoSwitchedFromSectorsRef.current) {
        autoSwitchedFromSectorsRef.current = false;
        setViewMode('sectors');
      }
    }
  }, [viewMode]);

  const handleClearSearch = useCallback(() => {
    setStockSearchQuery('');
    setCurrentPage(1);
    if (autoSwitchedFromSectorsRef.current) {
      autoSwitchedFromSectorsRef.current = false;
      setViewMode('sectors');
    }
  }, []);

  // Format actual backend/store update timestamp
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '—';
    const d = new Date(lastUpdated);
    if (isNaN(d.getTime())) return '—';
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  }, [lastUpdated]);

  // Fetch Sectors, All Ranked Stocks & ETFs
  const fetchSectorsData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [sectorsRes, allStocksRes, etfsRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/sectors?region=${region}&timeframe=${timeframe}&assetClass=${assetClass}`),
        axios.get(`${API_BASE}/sectors/all-stocks?region=${region}&timeframe=${timeframe}&assetClass=${assetClass}`),
        axios.get(`${API_BASE}/sectors/all-etfs?timeframe=${timeframe}`)
      ]);

      if (sectorsRes.status === 'fulfilled') {
        dispatch(setSectors(sectorsRes.value.data));
      }
      if (allStocksRes.status === 'fulfilled' && Array.isArray(allStocksRes.value.data)) {
        setAllStocksData(allStocksRes.value.data);
      }
      if (etfsRes.status === 'fulfilled' && Array.isArray(etfsRes.value.data)) {
        setEtfsData(etfsRes.value.data);
      }
    } catch (err) {
      console.error('Failed to fetch sectors/stocks/etfs:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, region, timeframe, assetClass]);

  useEffect(() => {
    fetchSectorsData();
    const interval = setInterval(fetchSectorsData, 60000);
    return () => clearInterval(interval);
  }, [fetchSectorsData]);

  // Dedicated immediate load for ETFs when user switches to 'etfs' viewMode
  useEffect(() => {
    if (viewMode === 'etfs' && etfsData.length === 0 && !etfsLoading) {
      setEtfsLoading(true);
      axios.get(`${API_BASE}/sectors/all-etfs?timeframe=${timeframe}`)
        .then(res => {
          if (Array.isArray(res.data)) {
            setEtfsData(res.data);
          }
        })
        .catch(err => {
          console.error('Failed to load ETFs:', err);
        })
        .finally(() => {
          setEtfsLoading(false);
        });
    }
  }, [viewMode, etfsData.length, etfsLoading, timeframe]);

  // Fetch individual sector constituents when expanded
  useEffect(() => {
    if (!expandedSectorId) return;

    // Check if already in cache
    if (sectorDetailCache[expandedSectorId]) return;

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/sectors/${expandedSectorId}?timeframe=${timeframe}`);
        setSectorDetailCache(prev => ({
          ...prev,
          [expandedSectorId]: res.data
        }));
      } catch (err) {
        console.error('Failed to fetch sector details for', expandedSectorId, err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [expandedSectorId, timeframe, sectorDetailCache]);

  // Summary Metrics Computation
  const summary = useMemo(() => {
    const totalSectors = sectors.length;
    const advancingSectors = sectors.filter(s => (s.changePercent || 0) > 0).length;
    const decliningSectors = sectors.filter(s => (s.changePercent || 0) < 0).length;
    const advancingSectorsPct = totalSectors > 0 ? Math.round((advancingSectors / totalSectors) * 100) : 0;
    const decliningSectorsPct = totalSectors > 0 ? Math.round((decliningSectors / totalSectors) * 100) : 0;

    let upStocks = 0;
    let downStocks = 0;
    let totalConstituentStocks = 0;

    sectors.forEach(s => {
      upStocks += (s.advances || 0);
      downStocks += (s.declines || 0);
      totalConstituentStocks += (s.totalStocks || s.stocks?.length || (s.advances || 0) + (s.declines || 0) || 0);
    });

    const unchangedStocks = Math.max(0, totalConstituentStocks - upStocks - downStocks);
    const upStocksPct = totalConstituentStocks > 0 ? Math.round((upStocks / totalConstituentStocks) * 100) : 0;
    const downStocksPct = totalConstituentStocks > 0 ? Math.round((downStocks / totalConstituentStocks) * 100) : 0;
    const unchangedStocksPct = totalConstituentStocks > 0 ? Math.round((unchangedStocks / totalConstituentStocks) * 100) : 0;

    return {
      totalSectors,
      advancingSectors,
      decliningSectors,
      advancingSectorsPct,
      decliningSectorsPct,
      upStocks,
      downStocks,
      unchangedStocks,
      totalConstituentStocks,
      upStocksPct,
      downStocksPct,
      unchangedStocksPct
    };
  }, [sectors]);

  // Combined and deduplicated all stocks across universe
  const allRankedUniverse = useMemo(() => {
    if (allStocksData && allStocksData.length > 0) {
      return allStocksData;
    }
    // Fallback: derive deduplicated stocks from loaded sectors
    const map = new Map();
    sectors.forEach(s => {
      (s.stocks || []).forEach(st => {
        if (!map.has(st.symbol)) {
          map.set(st.symbol, {
            ...st,
            sector: s.name,
            sectorId: s.id,
            sectorName: s.name
          });
        }
      });
    });
    const derived = Array.from(map.values());
    derived.sort((a, b) => {
      if (a.globalRank !== null && b.globalRank !== null) return a.globalRank - b.globalRank;
      if (a.globalRank !== null) return -1;
      if (b.globalRank !== null) return 1;
      return (b.marketCap || 0) - (a.marketCap || 0);
    });
    return derived;
  }, [allStocksData, sectors]);

  // Column sort comparator for all metrics
  const sortComparator = useCallback((a, b, key, dir) => {
    let aVal, bVal;
    if (key === 'stock' || key === 'symbol') {
      aVal = (a.cleanSymbol || a.symbol || a.name || '').toLowerCase();
      bVal = (b.cleanSymbol || b.symbol || b.name || '').toLowerCase();
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (key === 'sector') {
      aVal = (a.sector || a.sectorName || a.name || '').toLowerCase();
      bVal = (b.sector || b.sectorName || b.name || '').toLowerCase();
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (key === 'globalRank' || key === 'rank') {
      aVal = a.indiaStockRank ?? a.globalRank;
      bVal = b.indiaStockRank ?? b.globalRank;
    } else if (key === 'revenue') {
      aVal = a.revenue;
      bVal = b.revenue;
    } else if (key === 'marketCap') {
      aVal = a.marketCapCr ?? (a.marketCap ? (a.marketCap > 1e9 ? a.marketCap / 1e7 : a.marketCap) : a.totalMarketCap);
      bVal = b.marketCapCr ?? (b.marketCap ? (b.marketCap > 1e9 ? b.marketCap / 1e7 : b.marketCap) : b.totalMarketCap);
    } else if (key === '52w' || key === 'recoveryFromBase') {
      aVal = a.percentFrom52WLow ?? a.recoveryFromBasePercent;
      bVal = b.percentFrom52WLow ?? b.recoveryFromBasePercent;
    } else if (key === 'price' || key === 'ltp') {
      aVal = a.ltp ?? a.price ?? a.indexPrice;
      bVal = b.ltp ?? b.price ?? b.indexPrice;
    } else if (key.startsWith('return_')) {
      const p = key.replace('return_', '');
      const aRets = getMultiPeriodReturns(a);
      const bRets = getMultiPeriodReturns(b);
      aVal = aRets[p];
      bVal = bRets[p];
    } else if (key === 'pe') {
      aVal = a.pe;
      bVal = b.pe;
    } else if (key === 'eps') {
      aVal = a.eps;
      bVal = b.eps;
    } else if (key === 'ebit') {
      aVal = a.ebit;
      bVal = b.ebit;
    }

    const aValid = aVal !== null && aVal !== undefined && !isNaN(aVal);
    const bValid = bVal !== null && bVal !== undefined && !isNaN(bVal);
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;

    return dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  }, []);

  const handleGlobalSort = useCallback((key) => {
    if (globalSortKey === key) {
      if (globalSortDirection === 'desc') {
        setGlobalSortDirection('asc');
      } else if (globalSortDirection === 'asc') {
        setGlobalSortKey('globalRank');
        setGlobalSortDirection('asc');
      }
    } else {
      setGlobalSortKey(key);
      setGlobalSortDirection(key === 'stock' || key === 'globalRank' || key === 'sector' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  }, [globalSortKey, globalSortDirection]);

  const renderSortIndicator = useCallback((field) => {
    if (globalSortKey === field) {
      return globalSortDirection === 'asc' ? (
        <ArrowUp size={10} className="text-blue-600 dark:text-blue-400 shrink-0 inline ml-1" />
      ) : (
        <ArrowDown size={10} className="text-blue-600 dark:text-blue-400 shrink-0 inline ml-1" />
      );
    }
    return <ArrowUpDown size={9} className="text-slate-400 opacity-40 shrink-0 inline ml-1" />;
  }, [globalSortKey, globalSortDirection]);

  // Filtered & sorted for All Stocks table
  const processedAllStocks = useMemo(() => {
    let list = [...allRankedUniverse];

    // Filter by selected sector if a specific sector is chosen
    if (selectedSectorFilter && selectedSectorFilter !== 'all' && selectedSectorFilter !== 'all_stocks' && selectedSectorFilter !== 'etfs') {
      const targetFilter = selectedSectorFilter.toLowerCase().trim();
      list = list.filter(stk => {
        const sId = (stk.sectorId || '').toLowerCase().trim();
        const sName = (stk.sector || stk.sectorName || '').toLowerCase().trim();
        return sId === targetFilter || sName === targetFilter || sId.includes(targetFilter) || targetFilter.includes(sId) || sName.includes(targetFilter) || targetFilter.includes(sName);
      });
    }

    // Filter by search query across complete stock dataset
    if (stockSearchQuery.trim()) {
      const q = stockSearchQuery.toLowerCase().trim();
      list = list.filter(stk => {
        const symbol = (stk.symbol || '').toLowerCase();
        const cleanSymbol = symbol.replace('.ns', '').replace('.bo', '');
        const name = (stk.name || '').toLowerCase();
        const bseSymbol = (stk.bseSymbol || '').toLowerCase();
        const ticker = (stk.ticker || '').toLowerCase();
        const sector = (stk.sector || stk.sectorName || '').toLowerCase();

        return (
          cleanSymbol.includes(q) ||
          symbol.includes(q) ||
          name.includes(q) ||
          bseSymbol.includes(q) ||
          ticker.includes(q) ||
          sector.includes(q)
        );
      });
    }

    // Filter by tab (preserves immutable stock.globalRank)
    if (stockFilterTab === 'gainers') {
      list = list.filter(s => s.direction === 'ADVANCING' || (s.changePercent || 0) > 0).sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    } else if (stockFilterTab === 'losers') {
      list = list.filter(s => s.direction === 'DECLINING' || (s.changePercent || 0) < 0).sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    } else if (stockFilterTab === 'unchanged') {
      list = list.filter(s => s.direction === 'UNCHANGED' || s.changePercent === 0);
    } else if (stockFilterTab === 'largeCap') {
      list = list.filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r <= 100 : false;
      });
    } else if (stockFilterTab === 'midCap') {
      list = list.filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r > 100 && r <= 250 : false;
      });
    } else if (stockFilterTab === 'smallCap') {
      list = list.filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r > 250 && r <= 500 : false;
      });
    } else if (stockFilterTab === 'microCap') {
      list = list.filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r > 500 : false;
      });
    } else if (stockFilterTab === 'marketCap' || stockFilterTab === 'all') {
      // Default sort strictly by globalRank ASC (1, 2, 3... nulls at end)
      list.sort((a, b) => {
        if (a.globalRank !== null && b.globalRank !== null) return a.globalRank - b.globalRank;
        if (a.globalRank !== null) return -1;
        if (b.globalRank !== null) return 1;
        return (b.marketCap || 0) - (a.marketCap || 0);
      });
    }

    // Apply header column sorting if user interacted with column sort
    if (globalSortKey && globalSortKey !== 'globalRank') {
      list = [...list].sort((a, b) => sortComparator(a, b, globalSortKey, globalSortDirection));
    }

    return list;
  }, [allRankedUniverse, selectedSectorFilter, stockSearchQuery, stockFilterTab, globalSortKey, globalSortDirection, sortComparator]);

  // Filtered & sorted for ETFs table (Groww & Zerodha compliant)
  const processedEtfs = useMemo(() => {
    let list = [...etfsData];

    // Filter by ETF Category
    if (etfCategoryFilter !== 'all') {
      list = list.filter(e => e.category === etfCategoryFilter);
    }

    // Filter by search query across ETF name, symbol, underlying, AMC, category
    if (stockSearchQuery.trim()) {
      const q = stockSearchQuery.toLowerCase().trim();
      list = list.filter(etf => {
        const symbol = (etf.symbol || '').toLowerCase();
        const cleanSymbol = (etf.cleanSymbol || symbol.replace('.ns', '').replace('.bo', '')).toLowerCase();
        const name = (etf.name || '').toLowerCase();
        const underlying = (etf.underlying || '').toLowerCase();
        const amc = (etf.amc || '').toLowerCase();
        const cat = (etf.categoryLabel || etf.category || '').toLowerCase();

        return (
          cleanSymbol.includes(q) ||
          symbol.includes(q) ||
          name.includes(q) ||
          underlying.includes(q) ||
          amc.includes(q) ||
          cat.includes(q)
        );
      });
    }

    // Filter by tab (preserves immutable etf.globalRank)
    if (stockFilterTab === 'gainers') {
      list = list.filter(s => s.direction === 'ADVANCING' || (s.changePercent || 0) > 0).sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    } else if (stockFilterTab === 'losers') {
      list = list.filter(s => s.direction === 'DECLINING' || (s.changePercent || 0) < 0).sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    } else if (stockFilterTab === 'unchanged') {
      list = list.filter(s => s.direction === 'UNCHANGED' || s.changePercent === 0);
    } else if (stockFilterTab === 'marketCap' || stockFilterTab === 'all') {
      // Default sort strictly by AUM / marketCapCr descending
      list.sort((a, b) => (b.marketCapCr || 0) - (a.marketCapCr || 0));
    }

    // Apply header column sorting if user interacted with column sort
    if (globalSortKey && globalSortKey !== 'globalRank' && stockFilterTab === 'all') {
      list.sort((a, b) => {
        let aVal = a[globalSortKey];
        let bVal = b[globalSortKey];

        if (globalSortKey === 'stock' || globalSortKey === 'symbol') {
          aVal = a.symbol || '';
          bVal = b.symbol || '';
          return globalSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (globalSortKey === 'sector' || globalSortKey === 'category') {
          aVal = a.categoryLabel || a.category || '';
          bVal = b.categoryLabel || b.category || '';
          return globalSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (globalSortKey.startsWith('return_')) {
          const p = globalSortKey.replace('return_', '');
          aVal = a.returns ? a.returns[p] : null;
          bVal = b.returns ? b.returns[p] : null;
        }

        if (aVal === null || aVal === undefined || isNaN(aVal)) aVal = -999999999;
        if (bVal === null || bVal === undefined || isNaN(bVal)) bVal = -999999999;

        return globalSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return list;
  }, [etfsData, etfCategoryFilter, stockSearchQuery, stockFilterTab, globalSortKey, globalSortDirection]);

  // Filtered Sectors
  const filteredSectors = useMemo(() => {
    let list = sectors;
    if (selectedSectorFilter !== 'all' && selectedSectorFilter !== 'all_stocks' && selectedSectorFilter !== 'etfs') {
      list = sectors.filter(s => s.id === selectedSectorFilter);
    }
    if (globalSortKey && globalSortKey !== 'globalRank') {
      list = [...list].sort((a, b) => sortComparator(a, b, globalSortKey, globalSortDirection));
    }
    return list;
  }, [sectors, selectedSectorFilter, globalSortKey, globalSortDirection, sortComparator]);

  // Pagination calculations
  const totalItemsCount = viewMode === 'all_stocks' 
    ? processedAllStocks.length 
    : viewMode === 'etfs'
      ? processedEtfs.length
      : filteredSectors.length;
  const totalPages = Math.ceil(totalItemsCount / (rowsPerPage === 'all' ? totalItemsCount || 1 : rowsPerPage));

  const paginatedSectors = useMemo(() => {
    if (rowsPerPage === 'all') return filteredSectors;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSectors.slice(start, start + rowsPerPage);
  }, [filteredSectors, currentPage, rowsPerPage]);

  const paginatedAllStocks = useMemo(() => {
    if (rowsPerPage === 'all') return processedAllStocks;
    const start = (currentPage - 1) * rowsPerPage;
    return processedAllStocks.slice(start, start + rowsPerPage);
  }, [processedAllStocks, currentPage, rowsPerPage]);

  const paginatedEtfs = useMemo(() => {
    if (rowsPerPage === 'all') return processedEtfs;
    const start = (currentPage - 1) * rowsPerPage;
    return processedEtfs.slice(start, start + rowsPerPage);
  }, [processedEtfs, currentPage, rowsPerPage]);

  // Toggle Sector Expansion
  const handleToggleExpand = (sectorId) => {
    if (expandedSectorId === sectorId) {
      setExpandedSectorId(null);
    } else {
      setExpandedSectorId(sectorId);
      setStockFilterTab('all');
      setStockSearchQuery('');
      setVisibleStockCount(5);
    }
  };

  // Format date as DD MMM YYYY (e.g. 16 Jun 2023)
  const formatBaseAthDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const raw = String(dateStr).split('T')[0];
      const parts = raw.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${monthNames[monthIdx]} ${year}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[d.getUTCMonth()];
        const year = d.getUTCFullYear();
        return `${day} ${month} ${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Render compact sub-metrics (MCap, Price, P/E, EPS) below sector or stock name
  // Only renders metrics that are available and non-zero; omits unavailable ones like P/E, EPS for Nifty Bank
  const renderSubMetrics = (item, isStock = false) => {
    if (!item) return null;
    const isGlobal = region === 'global';
    const curSym = isGlobal ? '$' : '₹';
    const items = [];

    // 1. Market Cap
    const rawMCap = isStock
      ? (item.marketCapCr ?? (item.marketCap ? (item.marketCap > 1e9 ? Math.round(item.marketCap / 10000000) : item.marketCap) : null))
      : (item.totalMarketCap ? (item.totalMarketCap > 1e9 ? Math.round(item.totalMarketCap / 10000000) : item.totalMarketCap) : null);
    if (rawMCap !== null && rawMCap !== undefined && !isNaN(rawMCap) && Number(rawMCap) > 0) {
      items.push({
        label: 'MCap',
        val: curSym + formatIndianNumber(rawMCap, 0, 0) + (isGlobal ? 'B' : ' Cr')
      });
    }

    // 2. Price
    const rawPrice = isStock ? (item.ltp || item.price) : (item.indexPrice || item.price || item.ltp);
    if (rawPrice !== null && rawPrice !== undefined && !isNaN(rawPrice) && Number(rawPrice) > 0) {
      items.push({
        label: 'P',
        val: curSym + formatIndianNumber(rawPrice, 2, 2)
      });
    }

    // 3. P/E (only if valid, positive, non-zero, not null/undefined/dash)
    const rawPe = item.pe;
    if (rawPe !== null && rawPe !== undefined && !isNaN(rawPe) && Number(rawPe) > 0) {
      items.push({
        label: 'P/E',
        val: formatIndianNumber(rawPe, 2, 2)
      });
    }

    // 4. EPS (only if valid, non-zero, not null/undefined/dash)
    const rawEps = item.eps;
    if (rawEps !== null && rawEps !== undefined && !isNaN(rawEps) && Number(rawEps) !== 0) {
      items.push({
        label: 'EPS',
        val: curSym + formatIndianNumber(rawEps, 2, 2)
      });
    }

    if (items.length === 0) return null;

    return (
      <div className="sm:hidden text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-tight overflow-hidden">
        {items.map((m, idx) => (
          <span key={m.label} className="inline-flex items-center gap-0.5 whitespace-nowrap">
            {idx > 0 && <span className="opacity-40 mr-1">•</span>}
            <span>{m.label}:</span>
            <strong className="text-slate-700 dark:text-slate-300 font-semibold font-mono">{m.val}</strong>
          </span>
        ))}
      </div>
    );
  };

  // Render % from 52W Low / % from ATH with (52W L: ₹X on Date) (ATH: ₹Y on Date)
  const renderBaseAthMetrics = (item) => {
    const low52Price = item?.week52Low ?? item?.fiftyTwoWeekLow ?? item?.low52 ?? item?.longTermBaseLow ?? item?.baseLow ?? null;
    const athPrice = item?.allTimeHigh ?? item?.fiftyTwoWeekHigh ?? item?.high52 ?? item?.ath ?? item?.ATH ?? null;
    const currentPrice = item?.price ?? item?.ltp ?? item?.indexPrice ?? null;

    let recovery = item?.percentFrom52WLow ?? item?.pctFrom52WLow ?? item?.recoveryFromBasePercent ?? null;
    let athDist = item?.percentFromATH ?? item?.pctFromATH ?? item?.distanceFromATHPercent ?? null;

    if (recovery === null && currentPrice && low52Price && low52Price > 0) {
      recovery = parseFloat((((currentPrice - low52Price) / low52Price) * 100).toFixed(2));
    }
    if (athDist === null && currentPrice && athPrice && athPrice > 0) {
      athDist = parseFloat((((currentPrice - athPrice) / athPrice) * 100).toFixed(2));
    }

    const hasRecovery = recovery !== null && typeof recovery === 'number' && !isNaN(recovery);
    const hasAthDist = athDist !== null && typeof athDist === 'number' && !isNaN(athDist);

    if (!hasRecovery && !hasAthDist) {
      return <span className="text-slate-400">—</span>;
    }

    const recoveryText = hasRecovery ? `${recovery > 0 ? '+' : ''}${recovery.toFixed(2)}%` : '—';
    const athDistText = hasAthDist ? `${athDist <= 0 ? '' : '+'}${athDist.toFixed(2)}%` : '—';

    const low52Date = formatBaseAthDate(item?.week52LowDate ?? item?.longTermBaseLowDate ?? item?.baseLowDate);
    const athDate = formatBaseAthDate(item?.allTimeHighDate ?? item?.athDate ?? item?.ATHDate);

    const hasLowSub = low52Price !== null;
    const hasAthSub = athPrice !== null;

    return (
      <div className="flex flex-col items-center justify-center text-center py-0.5">
        <div 
          className="flex items-center justify-center font-mono font-bold text-xs"
          title="From 52W Low = (Price − 52W Low) / 52W Low × 100&#10;From ATH = (Price − ATH) / ATH × 100"
        >
          <span className={
            hasRecovery && recovery > 0
              ? 'text-emerald-500'
              : hasRecovery && recovery < 0
              ? 'text-rose-500'
              : 'text-slate-400'
          }>
            {recoveryText}
          </span>
          <span className="text-slate-400 dark:text-slate-500 mx-1.5 font-normal">/</span>
          <span className={
            hasAthDist && athDist < 0
              ? 'text-rose-500'
              : hasAthDist && athDist === 0
              ? 'text-emerald-500'
              : 'text-slate-400'
          }>
            {athDistText}
          </span>
        </div>
        {(hasLowSub || hasAthSub) && (() => {
          const itemIsGlobal = (region === 'global') || (item?.currency === 'USD') || (item?.symbol && !item.symbol.endsWith('.NS') && !item.symbol.endsWith('.BO'));
          const curSym = itemIsGlobal ? '$' : '₹';
          return (
            <div className="text-[9px] text-slate-400 dark:text-slate-400 font-mono tracking-tight whitespace-nowrap mt-0.5 leading-tight">
              {hasLowSub && (
                <div>(52W L: {curSym}{formatIndianNumber(low52Price, 2, 2)}{low52Date ? ` on ${low52Date}` : ''})</div>
              )}
              {hasAthSub && (
                <div>(ATH: {curSym}{formatIndianNumber(athPrice, 2, 2)}{athDate ? ` on ${athDate}` : ''})</div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  // Render Revenue cell: Line 1 current reported Revenue (₹ Cr), Line 2 quarterly same-quarter Revenue YoY %
  const renderRevenueCell = (item) => {
    const revenueVal = (item?.revenue !== undefined && item?.revenue !== null && !isNaN(item.revenue))
      ? Number(item.revenue)
      : null;
    const yoyVal = (item?.revenueYoY !== undefined && item?.revenueYoY !== null && !isNaN(item.revenueYoY))
      ? Number(item.revenueYoY)
      : null;

    const formattedRevenue = (revenueVal !== null && revenueVal !== undefined && !isNaN(revenueVal))
      ? formatIndianNumber(revenueVal, 0, 0)
      : '—';

    const isPos = yoyVal !== null && yoyVal > 0;
    const isNeg = yoyVal !== null && yoyVal < 0;

    return (
      <div className="flex flex-col items-end py-0.5">
        <span className="font-mono text-slate-800 dark:text-slate-200">
          {formattedRevenue}
        </span>
        <span
          className={`text-[10px] font-mono font-medium leading-tight ${
            isPos ? 'text-emerald-600 dark:text-emerald-400' :
            isNeg ? 'text-rose-600 dark:text-rose-400' :
            'text-slate-400'
          }`}
        >
          {yoyVal !== null ? `${isPos ? '+' : ''}${yoyVal.toFixed(2)}%` : '—'}
        </span>
      </div>
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (viewMode === 'etfs') {
      if (!processedEtfs || processedEtfs.length === 0) return;

      const headers = [
        '# (Rank)',
        'ETF Symbol',
        'Name',
        'AMC',
        'Category',
        'Underlying Benchmark',
        'Price (INR)',
        '1D Change (%)',
        'Base Recovery (%)',
        'ATH Distance (%)',
        '1W (%)',
        '1M (%)',
        '6M (%)',
        '1Y (%)',
        '3Y (%)',
        '5Y (%)',
        'ALL (%)',
        'AUM (Cr INR)',
        'Expense Ratio'
      ];

      const rows = processedEtfs.map((etf) => {
        const rets = getMultiPeriodReturns(etf);
        const rec = etf.percentFrom52WLow !== null && etf.percentFrom52WLow !== undefined ? `${etf.percentFrom52WLow > 0 ? '+' : ''}${etf.percentFrom52WLow.toFixed(2)}%` : '—';
        const athDist = etf.percentFromATH !== null && etf.percentFromATH !== undefined ? `${etf.percentFromATH.toFixed(2)}%` : '—';
        return [
          etf.globalRank !== null && etf.globalRank !== undefined ? etf.globalRank : '—',
          `"${etf.cleanSymbol || ''}"`,
          `"${etf.name || ''}"`,
          `"${etf.amc || ''}"`,
          `"${etf.categoryLabel || etf.category || ''}"`,
          `"${etf.underlying || ''}"`,
          etf.ltp ? etf.ltp.toFixed(2) : '—',
          etf.changePercent !== null && etf.changePercent !== undefined ? `${etf.changePercent > 0 ? '+' : ''}${etf.changePercent.toFixed(2)}%` : '—',
          rec,
          athDist,
          rets['1W'] !== null ? `${rets['1W']}%` : '—',
          rets['1M'] !== null ? `${rets['1M']}%` : '—',
          rets['6M'] !== null ? `${rets['6M']}%` : '—',
          rets['1Y'] !== null ? `${rets['1Y']}%` : '—',
          rets['3Y'] !== null ? `${rets['3Y']}%` : '—',
          rets['5Y'] !== null ? `${rets['5Y']}%` : '—',
          rets['ALL'] !== null ? `${rets['ALL']}%` : '—',
          etf.aumCr || '—',
          etf.expenseRatio || '—'
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `indian_etfs_universe_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (viewMode === 'all_stocks') {
      if (!processedAllStocks || processedAllStocks.length === 0) return;

      const headers = [
        '# (India Rank)',
        'Stock',
        'Sector',
        'Revenue (Cr INR)',
        'Current Qtr YoY (%)',
        'Market Cap (Cr INR)',
        'Base Recovery (%)',
        'ATH Distance (%)',
        'Price (INR)',
        '1W (%)',
        '1M (%)',
        '6M (%)',
        '1Y (%)',
        '3Y (%)',
        '5Y (%)',
        'ALL (%)',
        'P/E',
        'EPS (INR)',
        'EBIT (Cr INR)'
      ];

      const rows = processedAllStocks.map((stk) => {
        const rets = getMultiPeriodReturns(stk);
        const rec = stk.percentFrom52WLow !== null && stk.percentFrom52WLow !== undefined ? `${stk.percentFrom52WLow > 0 ? '+' : ''}${stk.percentFrom52WLow.toFixed(2)}%` : '—';
        const athDist = stk.percentFromATH !== null && stk.percentFromATH !== undefined ? `${stk.percentFromATH.toFixed(2)}%` : '—';
        return [
          stk.globalRank !== null && stk.globalRank !== undefined ? stk.globalRank : '—',
          `"${(stk.symbol || '').replace('.NS', '')} - ${stk.name || ''}"`,
          `"${stk.sector || stk.sectorName || ''}"`,
          stk.revenue !== null && stk.revenue !== undefined ? stk.revenue.toFixed(2) : '—',
          stk.revenueYoY !== null && stk.revenueYoY !== undefined ? `${stk.revenueYoY > 0 ? '+' : ''}${stk.revenueYoY.toFixed(2)}%` : '—',
          stk.marketCap || '—',
          rec,
          athDist,
          stk.ltp ? stk.ltp.toFixed(2) : '—',
          rets['1W'] !== null ? `${rets['1W']}%` : '—',
          rets['1M'] !== null ? `${rets['1M']}%` : '—',
          rets['6M'] !== null ? `${rets['6M']}%` : '—',
          rets['1Y'] !== null ? `${rets['1Y']}%` : '—',
          rets['3Y'] !== null ? `${rets['3Y']}%` : '—',
          rets['5Y'] !== null ? `${rets['5Y']}%` : '—',
          rets['ALL'] !== null ? `${rets['ALL']}%` : '—',
          stk.pe ? stk.pe.toFixed(2) : '—',
          stk.eps ? stk.eps.toFixed(2) : '—',
          stk.ebit ? stk.ebit.toFixed(2) : '—'
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `all_stocks_global_ranking_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (!sectors || sectors.length === 0) return;

    const headers = [
      '#',
      'Sector',
      'Revenue (Cr INR)',
      'Current Qtr YoY (%)',
      'Up Stocks',
      'Down Stocks',
      'Total Stocks',
      'Market Cap (Cr INR)',
      'Base Recovery (%)',
      'ATH Distance (%)',
      'Price (INR)',
      '1W (%)',
      '1M (%)',
      '6M (%)',
      '1Y (%)',
      '3Y (%)',
      '5Y (%)',
      'ALL (%)',
      'P/E',
      'EPS (INR)',
      'EBIT (Cr INR)'
    ];

    const rows = filteredSectors.map((s, index) => {
      const rets = getMultiPeriodReturns(s);
      const rec = s.recoveryFromBasePercent !== null && s.recoveryFromBasePercent !== undefined ? `${s.recoveryFromBasePercent > 0 ? '+' : ''}${s.recoveryFromBasePercent.toFixed(2)}%` : '—';
      const athDist = s.distanceFromATHPercent !== null && s.distanceFromATHPercent !== undefined ? `${s.distanceFromATHPercent.toFixed(2)}%` : '—';
      return [
        index + 1,
        `"${s.name || ''}"`,
        s.revenue !== null && s.revenue !== undefined ? s.revenue.toFixed(2) : '—',
        s.revenueYoY !== null && s.revenueYoY !== undefined ? `${s.revenueYoY > 0 ? '+' : ''}${s.revenueYoY.toFixed(2)}%` : '—',
        s.advances || 0,
        s.declines || 0,
        s.totalStocks || s.stocks?.length || 0,
        s.totalMarketCap || '—',
        rec,
        athDist,
        s.indexPrice ? s.indexPrice.toFixed(2) : '—',
        rets['1W'] !== null ? `${rets['1W']}%` : '—',
        rets['1M'] !== null ? `${rets['1M']}%` : '—',
        rets['6M'] !== null ? `${rets['6M']}%` : '—',
        rets['1Y'] !== null ? `${rets['1Y']}%` : '—',
        rets['3Y'] !== null ? `${rets['3Y']}%` : '—',
        rets['5Y'] !== null ? `${rets['5Y']}%` : '—',
        rets['ALL'] !== null ? `${rets['ALL']}%` : '—',
        s.pe ? s.pe.toFixed(2) : '—',
        s.eps ? s.eps.toFixed(2) : '—',
        s.ebit ? s.ebit.toFixed(2) : '—'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stocks_performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get constituent stocks for the currently expanded sector
  const getExpandedStocks = (sector) => {
    const detail = sectorDetailCache[sector.id] || sector;
    let list = detail.stocks || [];

    // Filter by search query
    if (stockSearchQuery.trim()) {
      const q = stockSearchQuery.toLowerCase().trim();
      list = list.filter(stk => 
        (stk.symbol && stk.symbol.toLowerCase().includes(q)) ||
        (stk.name && stk.name.toLowerCase().includes(q))
      );
    }

    // Filter by tab (preserves immutable stock.globalRank)
    if (stockFilterTab === 'gainers') {
      list = [...list].filter(s => s.direction === 'ADVANCING' || (s.changePercent || 0) > 0).sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    } else if (stockFilterTab === 'losers') {
      list = [...list].filter(s => s.direction === 'DECLINING' || (s.changePercent || 0) < 0).sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    } else if (stockFilterTab === 'unchanged') {
      list = [...list].filter(s => s.direction === 'UNCHANGED' || s.changePercent === 0);
    } else if (stockFilterTab === 'volume') {
      list = [...list].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (stockFilterTab === 'largeCap') {
      list = [...list].filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r <= 100 : false;
      });
    } else if (stockFilterTab === 'midCap') {
      list = [...list].filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r > 100 && r <= 250 : false;
      });
    } else if (stockFilterTab === 'smallCap') {
      list = [...list].filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r > 250 && r <= 500 : false;
      });
    } else if (stockFilterTab === 'microCap') {
      list = [...list].filter(s => {
        const r = s.indiaStockRank ?? s.globalRank;
        return r !== null && r !== undefined ? r > 500 : false;
      });
    } else if (stockFilterTab === 'marketCap') {
      list = [...list].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }

    // Apply header column sorting if user interacted with column sort
    if (globalSortKey && globalSortKey !== 'globalRank') {
      list = [...list].sort((a, b) => sortComparator(a, b, globalSortKey, globalSortDirection));
    }

    return list;
  };

  return (
    <div className="w-full space-y-4 md:space-y-5 animate-in fade-in duration-300">
      {/* ── HEADER: STOCKS PERFORMANCE & MACRO TREND ANALYSIS (LIKE FACTS & FIGURES IN MUTUAL FUNDS) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-slate-100">
            Stocks Performance
          </h1>

          {/* Macro Trend Analysis Toggle Button (Right side of Stocks Performance, like Facts & Figures in Mutual Funds) */}
          <button
            onClick={() => setShowMacroTrends(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 border ${
              showMacroTrends
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20 ring-2 ring-blue-500/30'
                : 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
            title="Click to view Macro Trend Analysis hidden page"
          >
            <TrendingUp size={14} className={showMacroTrends ? 'text-amber-300' : 'text-blue-500'} />
            <span>Macro Trend Analysis</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 font-mono">
              {showMacroTrends ? '▲ Hide' : '▼ View'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-start sm:self-auto bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-2xs">
          <span>🕒 Last updated: {formattedLastUpdated}</span>
          <button 
            onClick={fetchSectorsData}
            disabled={isRefreshing}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh live performance data"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>


      {/* ── MACRO TREND ANALYSIS (HIDDEN PAGE LIKE FACTS & FIGURES IN MUTUAL FUNDS) ── */}
      {showMacroTrends && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Header */}
          <div className="flex items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                <Activity size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    Macro Trend Analysis
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                    Stocks Pulse
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Historical correlation between macroeconomic indicators and sector index growth.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMacroTrends(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Hide Macro Trend Analysis"
            >
              <X size={14} />
              <span>Hide Macro Trends</span>
            </button>
          </div>

          {/* Stored Macro Trend Analysis Page Content */}
          <div className="rounded-xl overflow-hidden">
            <MacroCorrelationSection isInsideHiddenPage={true} />
          </div>
        </div>
      )}
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 -mt-1">
            {viewMode === 'etfs'
              ? 'All Exchange Traded Funds (ETFs) Traded on NSE & BSE with Live Prices & Returns'
              : viewMode === 'all_stocks' 
                ? 'All Indian NSE/BSE Stocks Ranked by Market Capitalization' 
                : 'Explore Indian NSE sectors and constituent equities with Indian Market Ranks'}
          </p>

      {/* ── SUMMARY CARDS: SINGLE 2-COLUMN CARD ON SMARTPHONE, 6 CARDS ON DESKTOP ── */}
      {/* Mobile view: Single compact card with two columns */}
      <div className="sm:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-2xs">
        <div className="grid grid-cols-2 gap-2 divide-x divide-slate-100 dark:divide-slate-800">
          
          {/* Column 1: Sectors (Total, Advancing, Declining) */}
          <div className="space-y-1.5 pr-1">
            {/* Total Sectors */}
            <div 
              onClick={() => { setViewMode('sectors'); setSelectedSectorFilter('all'); setCurrentPage(1); }}
              className="cursor-pointer active:opacity-70 transition-opacity"
            >
              <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Total Sectors
              </div>
              <div className="mt-0.5 text-xs font-bold text-slate-900 dark:text-slate-100 font-mono flex items-center gap-1">
                <span>{summary.totalSectors}</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-normal">NSE</span>
              </div>
            </div>

            {/* Advancing */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Advancing
              </div>
              <div className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span>{summary.advancingSectors}</span>
                <span className="text-[9px] font-medium text-emerald-500">({summary.advancingSectorsPct}%)</span>
              </div>
            </div>

            {/* Declining */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Declining
              </div>
              <div className="mt-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1">
                <span>{summary.decliningSectors}</span>
                <span className="text-[9px] font-medium text-rose-500">({summary.decliningSectorsPct}%)</span>
              </div>
            </div>
          </div>

          {/* Column 2: Stocks (Up Stocks, Down Stocks, Ranked Stocks) */}
          <div className="space-y-1.5 pl-2">
            {/* Up Stocks */}
            <div 
              onClick={() => { setViewMode('all_stocks'); setStockFilterTab('gainers'); setCurrentPage(1); }}
              className="cursor-pointer active:opacity-70 transition-opacity"
            >
              <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Up Stocks
              </div>
              <div className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span>{formatIndianNumber(summary.upStocks, 0, 0)}</span>
                <span className="text-[9px] font-medium text-emerald-500">({summary.upStocksPct}%)</span>
              </div>
            </div>

            {/* Down Stocks */}
            <div 
              onClick={() => { setViewMode('all_stocks'); setStockFilterTab('losers'); setCurrentPage(1); }}
              className="pt-1 border-t border-slate-100 dark:border-slate-800 cursor-pointer active:opacity-70 transition-opacity"
            >
              <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Down Stocks
              </div>
              <div className="mt-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1">
                <span>{formatIndianNumber(summary.downStocks, 0, 0)}</span>
                <span className="text-[9px] font-medium text-rose-500">({summary.downStocksPct}%)</span>
              </div>
            </div>

            {/* Ranked Stocks */}
            <div 
              onClick={() => { setViewMode('all_stocks'); setStockFilterTab('all'); setCurrentPage(1); }}
              className="pt-1 border-t border-slate-100 dark:border-slate-800 cursor-pointer active:opacity-70 transition-opacity"
            >
              <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Ranked Stocks
              </div>
              <div className="mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1">
                <span>{formatIndianNumber(allRankedUniverse.length || summary.totalConstituentStocks, 0, 0)}</span>
                <span className="text-[8px] text-blue-500 font-medium">→</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Desktop view: 6 separate cards */}
      <div className="hidden sm:grid sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Total Sectors */}
        <div 
          onClick={() => { setViewMode('sectors'); setSelectedSectorFilter('all'); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Sectors
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {summary.totalSectors}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            All NSE Sectors
          </div>
        </div>

        {/* Card 2: Advancing */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Advancing
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {summary.advancingSectors} <span className="text-sm font-semibold">({summary.advancingSectorsPct}%)</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Sectors
          </div>
        </div>

        {/* Card 3: Declining */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Declining
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {summary.decliningSectors} <span className="text-sm font-semibold">({summary.decliningSectorsPct}%)</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Sectors
          </div>
        </div>

        {/* Card 4: Up Stocks */}
        <div 
          onClick={() => { setViewMode('all_stocks'); setStockFilterTab('gainers'); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Up Stocks
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatIndianNumber(summary.upStocks, 0, 0)} <span className="text-sm font-semibold">({summary.upStocksPct}%)</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Out of {formatIndianNumber(summary.totalConstituentStocks, 0, 0)}
          </div>
        </div>

        {/* Card 5: Down Stocks */}
        <div 
          onClick={() => { setViewMode('all_stocks'); setStockFilterTab('losers'); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-rose-500/50 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Down Stocks
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatIndianNumber(summary.downStocks, 0, 0)} <span className="text-sm font-semibold">({summary.downStocksPct}%)</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Out of {formatIndianNumber(summary.totalConstituentStocks, 0, 0)}
          </div>
        </div>

        {/* Card 6: Total Ranked Stocks */}
        <div 
          onClick={() => { setViewMode('all_stocks'); setStockFilterTab('all'); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Ranked Stocks
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {formatIndianNumber(allRankedUniverse.length || summary.totalConstituentStocks, 0, 0)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            View All Stocks →
          </div>
        </div>
      </div>

      {/* ── CONTROLS ROW: VIEW TOGGLE + DROPDOWN + STOCK SEARCH BAR + EXPORT CSV ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* View Mode Toggle Pill */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
            <button
              onClick={() => {
                autoSwitchedFromSectorsRef.current = false;
                setViewMode('sectors');
                if (selectedSectorFilter === 'all_stocks' || selectedSectorFilter === 'etfs') setSelectedSectorFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'sectors'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-400/80 dark:border-blue-500/80 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              Sectors View
            </button>
            <button
              onClick={() => {
                autoSwitchedFromSectorsRef.current = false;
                setViewMode('all_stocks');
                setSelectedSectorFilter('all_stocks');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'all_stocks'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-400/80 dark:border-blue-500/80 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              All Indian Stocks (Ranked)
            </button>
            <button
              onClick={() => {
                autoSwitchedFromSectorsRef.current = false;
                setViewMode('etfs');
                setSelectedSectorFilter('etfs');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'etfs'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-400/80 dark:border-blue-500/80 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              ETF's
            </button>
          </div>

          {/* Sector Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedSectorFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSectorFilter(val);
                if (val === 'all_stocks') {
                  setViewMode('all_stocks');
                } else if (val === 'etfs') {
                  setViewMode('etfs');
                } else {
                  setViewMode('sectors');
                }
                autoSwitchedFromSectorsRef.current = false;
                setCurrentPage(1);
              }}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[140px]"
            >
              <option value="all">All Sectors</option>
              <option value="all_stocks">All Indian Stocks (Market-Cap Rank)</option>
              <option value="etfs">All Indian ETFs</option>
              {sectors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Stock Search Bar */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search stocks..."
              value={stockSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
            />
            {stockSearchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs ml-auto shrink-0"
        >
          <Download size={13} className="text-slate-500 dark:text-slate-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* ── CONDITIONAL RENDER: SECTOR TABLE VS ALL STOCKS TABLE VS ETFS TABLE ── */}
      {viewMode === 'etfs' ? (
        /* ══════════════════════════════════════════════════════════════ */
        /* ── VIEW ALL ETFS TABLE (GROWW & ZERODHA CLASSIFICATION) ── */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs space-y-0">
          {/* Subheader Toolbar: Groww & Zerodha Category Filter Pills + Filter Tabs + Search */}
          <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-display">
                  Indian Exchange Traded Funds (ETFs) — <span className="font-mono text-slate-500 font-normal">{processedEtfs.length} ETFs Available</span>
                </h3>

                {/* Groww & Zerodha ETF Category Pills */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {[
                    { key: 'all', label: 'All ETFs' },
                    { key: 'index', label: 'Index' },
                    { key: 'commodity', label: 'Gold & Silver' },
                    { key: 'sectoral', label: 'Sectoral & Thematic' },
                    { key: 'global', label: 'Global / US' },
                    { key: 'debt', label: 'Debt & Liquid' }
                  ].map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setEtfCategoryFilter(cat.key);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-[11px] font-semibold rounded-md transition-all ${
                        etfCategoryFilter === cat.key
                          ? 'bg-blue-600 text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Input across ETFs */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ETFs (e.g. NIFTYBEES, GOLDBEES)..."
                  value={stockSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-64 shadow-2xs"
                />
                {stockSearchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Performance / Ranking Slices Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sort & Filter:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'gainers', label: 'Top Gainers' },
                  { key: 'losers', label: 'Top Losers' },
                  { key: 'marketCap', label: 'By AUM / Size' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setStockFilterTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-[11px] font-semibold rounded-md transition-all ${
                      stockFilterTab === tab.key
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ETF Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 w-8 text-center">#</th>
                  <th className="py-3 px-3">ETF / Scheme</th>
                  <th className="py-3 px-3">Category & Benchmark</th>
                  <th className="py-3 px-3 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 text-center">
                    <div className="font-bold text-slate-700 dark:text-slate-200">52W H/L %</div>
                    <div className="text-[9px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                      (Up from 52W Low / Down from ATH)
                    </div>
                  </th>

                  {/* Performance Header with Subcolumns */}
                  <th colSpan={7} className="py-1 px-3 text-center border-l border-r border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 pb-1">Performance (%)</div>
                    <div className="grid grid-cols-7 gap-1 pt-1 border-t border-slate-200 dark:border-slate-800 font-medium text-[9px]">
                      <span>1W</span>
                      <span>1M</span>
                      <span>6M</span>
                      <span>1Y</span>
                      <span>3Y</span>
                      <span>5Y</span>
                      <span>ALL</span>
                    </div>
                  </th>

                  <th className="py-3 px-3 text-right">AUM (₹ Cr)</th>
                  <th className="py-3 px-3 text-center">Expense Ratio</th>
                  <th className="py-3 px-3 text-center">Trade / Buy</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedEtfs.length > 0 ? (
                  paginatedEtfs.map((etf, eIdx) => {
                    const badge = getStockBadge(etf.symbol);
                    const etfRets = getMultiPeriodReturns(etf);
                    const cleanSymbol = etf.cleanSymbol || (etf.symbol || '').replace('.NS', '').replace('.BO', '');
                    const isPositive = (etf.changePercent || 0) > 0;
                    const isNegative = (etf.changePercent || 0) < 0;

                    const categoryBadgeColors = {
                      index: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
                      commodity: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
                      sectoral: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
                      global: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
                      debt: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    };
                    const catBadgeClass = categoryBadgeColors[etf.category] || categoryBadgeColors.index;

                    return (
                      <tr
                        key={etf.symbol || eIdx}
                        onClick={() => dispatch(setActiveSymbol(etf.symbol))}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        {/* # Rank */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                          #{etf.globalRank || eIdx + 1}
                        </td>

                        {/* ETF Symbol + Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${badge.bg}`}>
                              {badge.letter}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {cleanSymbol}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={etf.name}>
                                {etf.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category & Underlying */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold border ${catBadgeClass}`}>
                              {etf.categoryLabel || etf.category}
                            </span>
                            <span className="text-[9.5px] text-slate-400 truncate max-w-[150px]" title={etf.underlying}>
                              {etf.underlying}
                            </span>
                          </div>
                        </td>

                        {/* Price (₹) & Day Change */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {etf.ltp ? formatIndianNumber(etf.ltp, 2, 2) : '—'}
                          </div>
                          {etf.changePercent !== null && etf.changePercent !== undefined ? (
                            <div className={`text-[10px] font-mono font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                              {isPositive ? '+' : ''}{etf.changePercent.toFixed(2)}%
                            </div>
                          ) : null}
                        </td>

                        {/* Base / ATH Metrics */}
                        <td className="py-2.5 px-3 text-center">
                          {renderBaseAthMetrics(etf)}
                        </td>

                        {/* Multi-Period Performance Subcolumns */}
                        {PERIODS.map(p => {
                          const sVal = etfRets[p];
                          const sPos = sVal !== null && sVal > 0;
                          const sNeg = sVal !== null && sVal < 0;
                          return (
                            <td 
                              key={p} 
                              className={`py-2.5 px-1 text-center font-mono font-medium text-[11px] ${
                                sPos ? 'text-emerald-600 dark:text-emerald-400' :
                                sNeg ? 'text-rose-600 dark:text-rose-400' :
                                'text-slate-400'
                              }`}
                            >
                              {sVal !== null ? `${sPos ? '+' : ''}${sVal.toFixed(2)}%` : '—'}
                            </td>
                          );
                        })}

                        {/* AUM (₹ Cr) */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {etf.aumCr ? `${formatIndianNumber(etf.aumCr, 0, 0)} Cr` : '—'}
                        </td>

                        {/* Expense Ratio */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 text-xs">
                          {etf.expenseRatio || '—'}
                        </td>

                        {/* Trade / Buy Action Button */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(setActiveSymbol(etf.symbol));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md transition-all shadow-2xs cursor-pointer"
                            title={`Buy or Trade ${cleanSymbol} with live charts & order execution`}
                          >
                            <span>Trade</span>
                            <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-slate-400 italic">
                      {etfsLoading || isRefreshing ? 'Loading ETFs performance data...' : 'No ETFs match the selected category and search criteria'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'all_stocks' ? (
        /* ══════════════════════════════════════════════════════════════ */
        /* ── VIEW ALL STOCKS GLOBAL MARKET-CAP RANKING TABLE ── */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs space-y-0">
          {/* Subheader Toolbar: Filter Tabs + Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-display">
                  {selectedSectorFilter && selectedSectorFilter !== 'all' && selectedSectorFilter !== 'all_stocks' && selectedSectorFilter !== 'etfs'
                    ? `${sectors.find(s => s.id === selectedSectorFilter || s.name === selectedSectorFilter)?.name || 'Sector'} Stocks`
                    : 'All Indian Stocks Universe'} — <span className="font-mono text-slate-500 font-normal">{processedAllStocks.length} Ranked Stocks</span>
                </h3>
                {selectedSectorFilter && selectedSectorFilter !== 'all' && selectedSectorFilter !== 'all_stocks' && selectedSectorFilter !== 'etfs' && (
                  <button
                    onClick={() => {
                      setSelectedSectorFilter('all_stocks');
                      setCurrentPage(1);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    (Show All Stocks)
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {[
                  { key: 'all', label: 'All Stocks' },
                  { key: 'largeCap', label: 'Large Cap' },
                  { key: 'midCap', label: 'Mid Cap' },
                  { key: 'smallCap', label: 'Small Cap' },
                  { key: 'microCap', label: 'Micro Cap' },
                  { key: 'gainers', label: 'Top Gainers' },
                  { key: 'losers', label: 'Top Losers' },
                  { key: 'marketCap', label: 'By Market Cap' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setStockFilterTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-[11px] font-semibold rounded-md transition-all ${
                      stockFilterTab === tab.key
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input across All Stocks */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search stocks..."
                value={stockSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 shadow-2xs"
              />
              {stockSearchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ── DESKTOP TABLE: As it was before for laptop or desktop ── */}
          <div className="hidden sm:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-160px)] scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-2xs">
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th onClick={() => handleGlobalSort('globalRank')} className={`sticky top-0 left-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 w-8 text-center cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'globalRank' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <span>#</span>
                      {renderSortIndicator('globalRank')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('stock')} className={`sticky top-0 left-8 z-40 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 py-3 px-3 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] min-w-[180px] ${globalSortKey === 'stock' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center gap-1">
                      <span>Stock</span>
                      {renderSortIndicator('stock')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('sector')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'sector' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center gap-1">
                      <span>Sector</span>
                      {renderSortIndicator('sector')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('revenue')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'revenue' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <div>
                        <div>Revenue {region === 'global' ? '($B)' : '(₹ Cr)'}</div>
                        <div className="text-[9px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                          Current Qtr YoY
                        </div>
                      </div>
                      {renderSortIndicator('revenue')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('marketCap')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'marketCap' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Market Cap {region === 'global' ? '($B)' : '(₹ Cr)'}</span>
                      {renderSortIndicator('marketCap')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('52w')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 text-center cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === '52w' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">
                          52W H/L %
                        </div>
                        <div className="text-[9px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                          (Up from 52W Low / Down from ATH)
                        </div>
                      </div>
                      {renderSortIndicator('52w')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('price')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'price' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Price {region === 'global' ? '($)' : '(₹)'}</span>
                      {renderSortIndicator('price')}
                    </div>
                  </th>

                  {/* Performance Header with Subcolumns */}
                  <th colSpan={7} className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1 px-3 text-center border-l border-r">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 pb-1">
                      Performance (%)
                    </div>
                    <div className="grid grid-cols-7 gap-1 pt-1 border-t border-slate-200 dark:border-slate-800 font-medium text-[9px]">
                      {PERIODS.map(p => (
                        <span 
                          key={p} 
                          onClick={(e) => { e.stopPropagation(); handleGlobalSort(`return_${p}`); }}
                          className={`cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-0.5 ${globalSortKey === `return_${p}` ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                        >
                          <span>{p}</span>
                          {renderSortIndicator(`return_${p}`)}
                        </span>
                      ))}
                    </div>
                  </th>

                  <th onClick={() => handleGlobalSort('pe')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'pe' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>P/E</span>
                      {renderSortIndicator('pe')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('eps')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'eps' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>EPS {region === 'global' ? '($)' : '(₹)'}</span>
                      {renderSortIndicator('eps')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('ebit')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'ebit' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>EBIT {region === 'global' ? '($B)' : '(₹ Cr)'}</span>
                      {renderSortIndicator('ebit')}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedAllStocks.length > 0 ? (
                  paginatedAllStocks.map((stock, sIdx) => {
                    const badge = getStockBadge(stock.symbol);
                    const stockRets = getMultiPeriodReturns(stock);
                    const cleanSymbol = (stock.symbol || '').replace('.NS', '').replace('.BO', '');

                    return (
                      <tr 
                        key={stock.symbol || sIdx}
                        onClick={() => dispatch(setActiveSymbol(stock.symbol))}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        {/* # Global Rank */}
                        <td className="w-8 min-w-[32px] max-w-[32px] sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400 transition-colors">
                          {(stock.indiaStockRank ?? stock.globalRank) !== null && (stock.indiaStockRank ?? stock.globalRank) !== undefined ? `#${stock.indiaStockRank ?? stock.globalRank}` : '—'}
                        </td>

                        {/* Stock Badge + Symbol */}
                        <td className="sticky left-8 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] py-2.5 px-3 min-w-[180px] transition-colors">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${badge.bg}`}>
                              {badge.letter}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {cleanSymbol}
                              </span>
                              {stock.name && stock.name !== cleanSymbol && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                  {stock.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sector Column */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {stock.sector || stock.sectorName || 'General'}
                          </span>
                        </td>

                        {/* Revenue (Current Qtr YoY) */}
                        <td className="py-2.5 px-3 text-right">
                          {renderRevenueCell(stock)}
                        </td>

                        {/* Market Cap (₹ Cr) */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {(stock.marketCapCr ?? (stock.marketCap ? (stock.marketCap > 1e9 ? Math.round(stock.marketCap / 10000000) : stock.marketCap) : null)) != null
                            ? formatIndianNumber(stock.marketCapCr ?? (stock.marketCap > 1e9 ? Math.round(stock.marketCap / 10000000) : stock.marketCap), 0, 0)
                            : '—'}
                        </td>

                        {/* Base / ATH Metrics */}
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {renderBaseAthMetrics(stock)}
                        </td>

                        {/* Price (₹) */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {stock.ltp ? formatIndianNumber(stock.ltp, 2, 2) : '—'}
                        </td>

                        {/* Multi-Period Performance Subcolumns */}
                        {PERIODS.map(p => {
                          const sVal = stockRets[p];
                          const sPos = sVal !== null && sVal > 0;
                          const sNeg = sVal !== null && sVal < 0;
                          return (
                            <td 
                              key={p} 
                              className={`py-2.5 px-1 text-center font-mono font-medium text-[11px] ${
                                sPos ? 'text-emerald-600 dark:text-emerald-400' :
                                sNeg ? 'text-rose-600 dark:text-rose-400' :
                                sVal === 0 ? 'text-slate-600 dark:text-slate-300' :
                                'text-slate-400'
                              }`}
                            >
                              {sVal !== null && !isNaN(sVal) ? `${sPos ? '+' : ''}${sVal.toFixed(2)}%` : '—'}
                            </td>
                          );
                        })}

                        {/* P/E */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {stock.pe ? formatIndianNumber(stock.pe, 2, 2) : '—'}
                        </td>

                        {/* EPS */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {stock.eps ? formatIndianNumber(stock.eps, 2, 2) : '—'}
                        </td>

                        {/* EBIT */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {stock.ebit ? formatIndianNumber(stock.ebit, 0, 0) : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-400 italic">
                      No stocks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE TABLE: Groww-style Compact Stocks Screener with Fixed First Column ── */}
          <div className="sm:hidden overflow-x-auto overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-2xs">
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  {/* Stock - sticky top-0 left-0 on mobile */}
                  <th className="py-2 px-2 text-left sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 w-[185px] min-w-[185px] max-w-[185px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                    Stock
                  </th>

                  {/* 52W H/L % - scrollable */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-1.5 text-center border-r min-w-[90px]">
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">
                      52W H/L %
                    </div>
                    <div className="text-[7.5px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                      (52W L / ATH)
                    </div>
                  </th>

                  {/* Performance Header with Subcolumns */}
                  <th colSpan={7} className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1 px-1 text-center border-r">
                    <div className="text-[8.5px] font-bold text-slate-700 dark:text-slate-300 pb-0.5">
                      Performance (%)
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-800 font-medium text-[7.5px]">
                      <span>1W</span>
                      <span>1M</span>
                      <span>6M</span>
                      <span>1Y</span>
                      <span>3Y</span>
                      <span>5Y</span>
                      <span>ALL</span>
                    </div>
                  </th>

                  {/* Revenue */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-2 text-right min-w-[85px]">
                    <div className="text-[9px]">Revenue (₹ Cr)</div>
                    <div className="text-[7.5px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                      Current Qtr YoY
                    </div>
                  </th>

                  {/* EBIT */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-2 text-right text-[9px]">EBIT (₹ Cr)</th>

                  {/* Sector */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-2 text-left text-[9px]">Sector</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedAllStocks.length > 0 ? (
                  paginatedAllStocks.map((stock, sIdx) => {
                    const badge = getStockBadge(stock.symbol);
                    const stockRets = getMultiPeriodReturns(stock);
                    const cleanSymbol = (stock.symbol || '').replace('.NS', '').replace('.BO', '');

                    return (
                      <tr 
                        key={stock.symbol || sIdx}
                        onClick={() => dispatch(setActiveSymbol(stock.symbol))}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        {/* Stock Badge + Symbol + Submetrics - sticky */}
                        <td className="py-2 px-2 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800 w-[185px] min-w-[185px] max-w-[185px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(stock.indiaStockRank ?? stock.globalRank) != null && (
                              <span className="font-mono text-[9px] font-bold text-slate-400 shrink-0">
                                #{stock.indiaStockRank ?? stock.globalRank}
                              </span>
                            )}
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${badge.bg}`}>
                              {badge.letter}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {cleanSymbol}
                              </span>
                              {stock.name && stock.name !== cleanSymbol && (
                                <span className="text-[9px] text-slate-400 truncate max-w-[125px]">
                                  {stock.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Below Stock Name: MarketCap, Price, P/E, EPS for mobile */}
                          {renderSubMetrics(stock, true)}
                        </td>

                        {/* 52W H/L % */}
                        <td className="py-1.5 px-1 text-center font-mono text-[8.5px] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 min-w-[90px]">
                          {renderBaseAthMetrics(stock)}
                        </td>

                        {/* Multi-Period Performance Subcolumns */}
                        {PERIODS.map(p => {
                          const sVal = stockRets[p];
                          const sPos = sVal !== null && sVal > 0;
                          const sNeg = sVal !== null && sVal < 0;
                          return (
                            <td 
                              key={p} 
                              className={`py-1.5 px-1 text-center font-mono font-medium text-[8.5px] ${
                                sPos ? 'text-emerald-600 dark:text-emerald-400' :
                                sNeg ? 'text-rose-600 dark:text-rose-400' :
                                sVal === 0 ? 'text-slate-600 dark:text-slate-300' :
                                'text-slate-400'
                              }`}
                            >
                              {sVal !== null && !isNaN(sVal) ? `${sPos ? '+' : ''}${sVal.toFixed(2)}%` : '—'}
                            </td>
                          );
                        })}

                        {/* Revenue (Current Qtr YoY) */}
                        <td className="py-1.5 px-2 text-right text-[9.5px]">
                          {renderRevenueCell(stock)}
                        </td>

                        {/* EBIT */}
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300 text-[8.5px]">
                          {stock.ebit ? formatIndianNumber(stock.ebit, 0, 0) : '—'}
                        </td>

                        {/* Sector Column */}
                        <td className="py-1.5 px-2 text-left text-[9px]">
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {stock.sector || stock.sectorName || 'General'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 italic">
                      No stocks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* ── SECTOR PERFORMANCE TABLE WITH ACCORDION ROWS ── */
        /* ══════════════════════════════════════════════════════════════ */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          {/* ── DESKTOP TABLE: As it was before for laptop or desktop ── */}
          <div className="hidden sm:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-160px)] scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-2xs">
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th onClick={() => handleGlobalSort('globalRank')} className={`sticky top-0 left-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 w-8 text-center cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'globalRank' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <span>#</span>
                      {renderSortIndicator('globalRank')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('sector')} className={`sticky top-0 left-8 z-40 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 py-3 px-3 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] min-w-[200px] ${globalSortKey === 'sector' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center gap-1">
                      <span>Sector</span>
                      {renderSortIndicator('sector')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('revenue')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'revenue' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <div>
                        <div>Revenue {region === 'global' ? '($B)' : '(₹ Cr)'}</div>
                        <div className="text-[9px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                          Current Qtr YoY
                        </div>
                      </div>
                      {renderSortIndicator('revenue')}
                    </div>
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-center">Up / Down / Total</th>
                  <th onClick={() => handleGlobalSort('marketCap')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'marketCap' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Market Cap {region === 'global' ? '($B)' : '(₹ Cr)'}</span>
                      {renderSortIndicator('marketCap')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('52w')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 text-center cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === '52w' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">
                          52W H/L %
                        </div>
                        <div className="text-[9px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                          (Up from 52W Low / Down from ATH)
                        </div>
                      </div>
                      {renderSortIndicator('52w')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('price')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'price' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Price {region === 'global' ? '($)' : '(₹)'}</span>
                      {renderSortIndicator('price')}
                    </div>
                  </th>

                  {/* Performance Header with Subcolumns */}
                  <th colSpan={7} className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1 px-3 text-center border-l border-r">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 pb-1">
                      Performance (%)
                    </div>
                    <div className="grid grid-cols-7 gap-1 pt-1 border-t border-slate-200 dark:border-slate-800 font-medium text-[9px]">
                      {PERIODS.map(p => (
                        <span 
                          key={p} 
                          onClick={(e) => { e.stopPropagation(); handleGlobalSort(`return_${p}`); }}
                          className={`cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-0.5 ${globalSortKey === `return_${p}` ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                        >
                          <span>{p}</span>
                          {renderSortIndicator(`return_${p}`)}
                        </span>
                      ))}
                    </div>
                  </th>

                  <th onClick={() => handleGlobalSort('pe')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'pe' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>P/E</span>
                      {renderSortIndicator('pe')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('eps')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'eps' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>EPS {region === 'global' ? '($)' : '(₹)'}</span>
                      {renderSortIndicator('eps')}
                    </div>
                  </th>
                  <th onClick={() => handleGlobalSort('ebit')} className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-3 text-right cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${globalSortKey === 'ebit' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>EBIT {region === 'global' ? '($B)' : '(₹ Cr)'}</span>
                      {renderSortIndicator('ebit')}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedSectors.length > 0 ? (
                  paginatedSectors.map((sector, idx) => {
                    const isExpanded = expandedSectorId === sector.id;
                    const theming = getSectorTheming(sector.name, sector.id);
                    const periodReturns = getMultiPeriodReturns(sector);
                    const rowIndex = (currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + idx + 1;
                    const constituentList = sector.stocks || [];

                    return (
                      <React.Fragment key={sector.id}>
                        {/* Main Sector Row */}
                        <tr 
                          id={`sector-row-${sector.id}`}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group ${
                          isExpanded ? 'bg-blue-50/40 dark:bg-blue-950/30' : ''
                        }`}>
                          {/* # */}
                          <td className={`w-8 min-w-[32px] max-w-[32px] sticky left-0 z-10 py-3 px-3 text-center font-mono text-slate-400 font-medium transition-colors ${
                            isExpanded 
                              ? 'bg-blue-50 dark:bg-slate-900 group-hover:bg-blue-100/80 dark:group-hover:bg-slate-800' 
                              : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                          }`}>
                            {rowIndex}
                          </td>

                          {/* Sector Name & Icon with Dropdown Toggle */}
                          <td className={`sticky left-8 z-10 py-3 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors ${
                            isExpanded 
                              ? 'bg-blue-50 dark:bg-slate-900 group-hover:bg-blue-100/80 dark:group-hover:bg-slate-800' 
                              : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                          }`}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExpand(sector.id);
                                }}
                                className={`p-1 rounded-md transition-all border flex items-center justify-center ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 hover:border-blue-300'
                                }`}
                                title={isExpanded ? 'Hide stocks' : 'Show stocks'}
                              >
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${theming.bg}`}>
                                {theming.icon}
                              </div>
                              <button
                                onClick={() => handleToggleExpand(sector.id)}
                                className="text-left font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              >
                                {sector.name}
                              </button>
                            </div>
                          </td>

                          {/* Revenue (Current Qtr YoY) */}
                          <td className="py-3 px-3 text-right">
                            {renderRevenueCell(sector)}
                          </td>

                          {/* Up / Down / Total */}
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sector.advances || 0}</span>
                            <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">{sector.declines || 0}</span>
                            <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{sector.totalStocks || constituentList.length || 0}</span>
                          </td>

                          {/* Market Cap (₹ Cr) */}
                          <td className="py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                            {(sector.totalMarketCap ? (sector.totalMarketCap > 1e9 ? Math.round(sector.totalMarketCap / 10000000) : sector.totalMarketCap) : null) != null
                              ? formatIndianNumber(sector.totalMarketCap > 1e9 ? Math.round(sector.totalMarketCap / 10000000) : sector.totalMarketCap, 0, 0)
                              : '—'}
                          </td>

                          {/* 52W High / Low */}
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {renderBaseAthMetrics(sector)}
                          </td>

                          {/* Price (₹) */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {(sector.indexPrice || sector.price || sector.ltp) ? formatIndianNumber(sector.indexPrice || sector.price || sector.ltp, 2, 2) : '—'}
                          </td>

                          {/* Multi-Period Performance Subcolumns */}
                          {PERIODS.map(p => {
                            const val = periodReturns[p];
                            const isPos = val !== null && val > 0;
                            const isNeg = val !== null && val < 0;
                            return (
                              <td 
                                key={p} 
                                className={`py-3 px-1 text-center font-mono font-medium text-[11px] ${
                                  isPos ? 'text-emerald-600 dark:text-emerald-400' :
                                  isNeg ? 'text-rose-600 dark:text-rose-400' :
                                  'text-slate-400'
                                }`}
                              >
                                {val !== null ? `${isPos ? '+' : ''}${val.toFixed(2)}%` : '—'}
                              </td>
                            );
                          })}

                          {/* P/E */}
                          <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {sector.pe ? formatIndianNumber(sector.pe, 2, 2) : '—'}
                          </td>

                          {/* EPS (₹) */}
                          <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {sector.eps ? formatIndianNumber(sector.eps, 2, 2) : '—'}
                          </td>

                          {/* EBIT (₹ Cr) */}
                          <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {sector.ebit ? formatIndianNumber(sector.ebit, 0, 0) : '—'}
                          </td>
                        </tr>

                        {/* Constituent Stocks (Desktop - rendered directly as sibling <tr> rows without nested card/table) */}
                        {isExpanded && (() => {
                          const constituentStocks = getExpandedStocks(sector);
                          const displayedStocks = constituentStocks.slice(0, 5);

                          if (detailLoading && (!constituentStocks || constituentStocks.length === 0)) {
                            return (
                              <tr className="bg-blue-50/10 dark:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800/60">
                                <td colSpan={17} className="py-4 text-center text-slate-400 italic text-xs">
                                  Loading {sector.name} stocks...
                                </td>
                              </tr>
                            );
                          }

                          if (constituentStocks.length === 0) {
                            return (
                              <tr className="bg-blue-50/10 dark:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800/60">
                                <td colSpan={17} className="py-4 text-center text-slate-400 italic text-xs">
                                  No constituent stocks found for {sector.name}
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <>
                              {displayedStocks.map((stock, sIdx) => {
                                const badge = getStockBadge(stock.symbol);
                                const stockRets = getMultiPeriodReturns(stock);
                                const cleanSymbol = (stock.symbol || '').replace('.NS', '').replace('.BO', '');

                                return (
                                  <tr
                                    key={stock.symbol || sIdx}
                                    onClick={() => dispatch(setActiveSymbol(stock.symbol))}
                                    className="bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer group"
                                  >
                                    {/* # India Rank */}
                                    <td className="w-8 min-w-[32px] max-w-[32px] sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 py-2.5 px-3 text-center font-mono text-[11px] text-slate-400 transition-colors">
                                      {(stock.indiaStockRank ?? stock.globalRank) != null ? `#${stock.indiaStockRank ?? stock.globalRank}` : '—'}
                                    </td>

                                    {/* Stock Name + Badge (indented to show hierarchy) */}
                                    <td className="sticky left-8 z-10 bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] py-2.5 px-3 pl-8 min-w-[180px] transition-colors">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${badge.bg}`}>
                                          {badge.letter}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                            {cleanSymbol}
                                          </span>
                                          {stock.name && stock.name !== cleanSymbol && (
                                            <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                              {stock.name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Revenue (Current Qtr YoY) */}
                                    <td className="py-2.5 px-3 text-right">
                                      {renderRevenueCell(stock)}
                                    </td>

                                    {/* Up / Down / Total */}
                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">
                                      —
                                    </td>

                                    {/* Market Cap (₹ Cr) */}
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                      {(stock.marketCapCr ?? (stock.marketCap ? (stock.marketCap > 1e9 ? Math.round(stock.marketCap / 1e7) : stock.marketCap) : null)) != null
                                        ? formatIndianNumber(stock.marketCapCr ?? (stock.marketCap > 1e9 ? Math.round(stock.marketCap / 1e7) : stock.marketCap), 0, 0)
                                        : '—'}
                                    </td>

                                    {/* 52W High / Low */}
                                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                      {renderBaseAthMetrics(stock)}
                                    </td>

                                    {/* Price (₹) */}
                                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                                      {(stock.ltp || stock.price) ? formatIndianNumber(stock.ltp || stock.price, 2, 2) : '—'}
                                    </td>

                                    {/* Multi-Period Performance Subcolumns */}
                                    {PERIODS.map(p => {
                                      const sVal = stockRets[p];
                                      const sPos = sVal !== null && sVal > 0;
                                      const sNeg = sVal !== null && sVal < 0;
                                      return (
                                        <td
                                          key={p}
                                          className={`py-2.5 px-1 text-center font-mono font-medium text-[11px] ${
                                            sPos ? 'text-emerald-600 dark:text-emerald-400' :
                                            sNeg ? 'text-rose-600 dark:text-rose-400' :
                                            sVal === 0 ? 'text-slate-600 dark:text-slate-300' :
                                            'text-slate-400'
                                          }`}
                                        >
                                          {sVal !== null && !isNaN(sVal) ? `${sPos ? '+' : ''}${sVal.toFixed(2)}%` : '—'}
                                        </td>
                                      );
                                    })}

                                    {/* P/E */}
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                      {stock.pe ? formatIndianNumber(stock.pe, 2, 2) : '—'}
                                    </td>

                                    {/* EPS (₹) */}
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                      {stock.eps ? formatIndianNumber(stock.eps, 2, 2) : '—'}
                                    </td>

                                    {/* EBIT (₹ Cr) */}
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                      {stock.ebit ? formatIndianNumber(stock.ebit, 0, 0) : '—'}
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* View All Stocks inline action row */}
                              <tr className="bg-slate-50/60 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <td colSpan={17} className="py-2.5 px-4 text-left">
                                  <div className="sticky left-4 inline-block">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSectorFilter(sector.id);
                                        setViewMode('all_stocks');
                                        setCurrentPage(1);
                                      }}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span>View All {constituentStocks.length || sector.totalStocks || constituentList.length} {sector.name} Stocks →</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-400 italic">
                      {loading ? 'Loading sectors performance data...' : 'No sector data available matching your criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE TABLE: Groww-style Compact Screener with Fixed First Column ── */}
          <div className="sm:hidden overflow-x-auto overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-2xs">
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  {/* Sector - sticky top-0 left-0 on mobile */}
                  <th className="py-2 px-2 text-left sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 w-[185px] min-w-[185px] max-w-[185px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                    Sector
                  </th>

                  {/* 52W H/L % - scrollable */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-1.5 text-center border-r min-w-[90px]">
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">
                      52W H/L %
                    </div>
                    <div className="text-[7.5px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                      (52W L / ATH)
                    </div>
                  </th>

                  {/* Performance Header with Subcolumns */}
                  <th colSpan={7} className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1 px-1 text-center border-r">
                    <div className="text-[8.5px] font-bold text-slate-700 dark:text-slate-300 pb-0.5">
                      Performance (%)
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-800 font-medium text-[7.5px]">
                      <span>1W</span>
                      <span>1M</span>
                      <span>6M</span>
                      <span>1Y</span>
                      <span>3Y</span>
                      <span>5Y</span>
                      <span>ALL</span>
                    </div>
                  </th>

                  {/* Revenue */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-2 text-right min-w-[85px]">
                    <div className="text-[9px]">Revenue (₹ Cr)</div>
                    <div className="text-[7.5px] font-medium text-slate-400 dark:text-slate-400 normal-case tracking-normal">
                      Current Qtr YoY
                    </div>
                  </th>

                  {/* EBIT */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-2 text-right text-[9px]">EBIT (₹ Cr)</th>

                  {/* Up / Down / Total */}
                  <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-2 text-center text-[9px]">Up / Down / Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedSectors.length > 0 ? (
                  paginatedSectors.map((sector, idx) => {
                    const isExpanded = expandedSectorId === sector.id;
                    const theming = getSectorTheming(sector.name, sector.id);
                    const periodReturns = getMultiPeriodReturns(sector);
                    const rowIndex = (currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + idx + 1;
                    const constituentList = sector.stocks || [];

                    return (
                      <React.Fragment key={sector.id}>
                        {/* Main Sector Row */}
                        <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group ${
                          isExpanded ? 'bg-blue-50/40 dark:bg-blue-950/30' : ''
                        }`}>
                          {/* Sector Name & Icon + Submetrics (MCap, Price, P/E, EPS) - sticky */}
                          <td className={`py-2 px-2 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 w-[185px] min-w-[185px] max-w-[185px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors ${
                            isExpanded 
                              ? 'bg-blue-50 dark:bg-slate-900 group-hover:bg-blue-100/80 dark:group-hover:bg-slate-800' 
                              : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[9px] text-slate-400 font-medium shrink-0">#{rowIndex}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExpand(sector.id);
                                }}
                                className={`p-1 rounded-md transition-all border flex items-center justify-center shrink-0 ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 hover:border-blue-300'
                                }`}
                                title={isExpanded ? 'Hide stocks' : 'Show stocks'}
                              >
                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 text-[10px] ${theming.bg}`}>
                                {theming.icon}
                              </div>
                              <button
                                onClick={() => handleToggleExpand(sector.id)}
                                className="text-left font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-[11px] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer truncate min-w-0 flex-1"
                                title={sector.name}
                              >
                                {sector.name}
                              </button>
                            </div>

                            {/* Below Sector Name: MarketCap, Price, P/E, EPS for mobile */}
                            {renderSubMetrics(sector, false)}
                          </td>

                          {/* 52W H/L % */}
                          <td className="py-1.5 px-1 text-center font-mono text-[8.5px] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 min-w-[90px]">
                            {renderBaseAthMetrics(sector)}
                          </td>

                          {/* Multi-Period Performance Subcolumns */}
                          {PERIODS.map(p => {
                            const val = periodReturns[p];
                            const isPos = val !== null && val > 0;
                            const isNeg = val !== null && val < 0;
                            return (
                              <td 
                                key={p} 
                                className={`py-1.5 px-1 text-center font-mono font-medium text-[8.5px] ${
                                  isPos ? 'text-emerald-600 dark:text-emerald-400' :
                                  isNeg ? 'text-rose-600 dark:text-rose-400' :
                                  'text-slate-400'
                                }`}
                              >
                                {val !== null ? `${isPos ? '+' : ''}${val.toFixed(2)}%` : '—'}
                              </td>
                            );
                          })}

                          {/* Revenue (Current Qtr YoY) */}
                          <td className="py-1.5 px-2 text-right text-[9.5px]">
                            {renderRevenueCell(sector)}
                          </td>

                          {/* EBIT */}
                          <td className="py-1.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300 text-[8.5px]">
                            {sector.ebit ? formatIndianNumber(sector.ebit, 0, 0) : '—'}
                          </td>

                          {/* Up / Down / Total */}
                          <td className="py-1.5 px-2 text-center font-mono text-[8.5px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sector.advances || 0}</span>
                            <span className="text-slate-300 dark:text-slate-600 mx-0.5">/</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">{sector.declines || 0}</span>
                            <span className="text-slate-300 dark:text-slate-600 mx-0.5">/</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{sector.totalStocks || constituentList.length || 0}</span>
                          </td>
                        </tr>

                        {/* Constituent Stocks (Mobile - rendered directly as sibling <tr> rows without nested card/table) */}
                        {isExpanded && (() => {
                          const constituentStocks = getExpandedStocks(sector);
                          const displayedStocks = constituentStocks.slice(0, 5);

                          if (detailLoading && (!constituentStocks || constituentStocks.length === 0)) {
                            return (
                              <tr className="bg-blue-50/10 dark:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800/60">
                                <td colSpan={12} className="py-3 px-2 text-center text-slate-400 italic text-[10px]">
                                  Loading {sector.name} stocks...
                                </td>
                              </tr>
                            );
                          }

                          if (constituentStocks.length === 0) {
                            return (
                              <tr className="bg-blue-50/10 dark:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800/60">
                                <td colSpan={12} className="py-3 px-2 text-center text-slate-400 italic text-[10px]">
                                  No constituent stocks found
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <>
                              {displayedStocks.map((stock, sIdx) => {
                                const badge = getStockBadge(stock.symbol);
                                const stockRets = getMultiPeriodReturns(stock);
                                const cleanSymbol = (stock.symbol || '').replace('.NS', '').replace('.BO', '');

                                return (
                                  <tr 
                                    key={stock.symbol || sIdx}
                                    onClick={() => dispatch(setActiveSymbol(stock.symbol))}
                                    className="bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors group"
                                  >
                                    {/* Stock Badge + Symbol + Submetrics - sticky */}
                                    <td className="py-2 px-2 pl-3 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800 w-[185px] min-w-[185px] max-w-[185px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {(stock.indiaStockRank ?? stock.globalRank) != null && (
                                          <span className="font-mono text-[9px] font-bold text-slate-400 shrink-0">
                                            #{stock.indiaStockRank ?? stock.globalRank}
                                          </span>
                                        )}
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${badge.bg}`}>
                                          {badge.letter}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {cleanSymbol}
                                          </span>
                                          {stock.name && stock.name !== cleanSymbol && (
                                            <span className="text-[9px] text-slate-400 truncate max-w-[125px]">
                                              {stock.name}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Below Stock Name: MarketCap, Price, P/E, EPS for mobile */}
                                      {renderSubMetrics(stock, true)}
                                    </td>

                                    {/* 52W H/L % */}
                                    <td className="py-1.5 px-1 text-center font-mono text-[8.5px] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 min-w-[90px]">
                                      {renderBaseAthMetrics(stock)}
                                    </td>

                                    {/* Multi-Period Performance Subcolumns */}
                                    {PERIODS.map(p => {
                                      const sVal = stockRets[p];
                                      const sPos = sVal !== null && sVal > 0;
                                      const sNeg = sVal !== null && sVal < 0;
                                      return (
                                        <td 
                                          key={p} 
                                          className={`py-1.5 px-1 text-center font-mono font-medium text-[8.5px] ${
                                            sPos ? 'text-emerald-600 dark:text-emerald-400' :
                                            sNeg ? 'text-rose-600 dark:text-rose-400' :
                                            sVal === 0 ? 'text-slate-600 dark:text-slate-300' :
                                            'text-slate-400'
                                          }`}
                                        >
                                          {sVal !== null && !isNaN(sVal) ? `${sPos ? '+' : ''}${sVal.toFixed(2)}%` : '—'}
                                        </td>
                                      );
                                    })}

                                    {/* Revenue (Current Qtr YoY) */}
                                    <td className="py-1.5 px-2 text-right text-[9.5px]">
                                      {renderRevenueCell(stock)}
                                    </td>

                                    {/* EBIT */}
                                    <td className="py-1.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300 text-[8.5px]">
                                      {stock.ebit ? formatIndianNumber(stock.ebit, 0, 0) : '—'}
                                    </td>

                                    {/* Up / Down / Total */}
                                    <td className="py-1.5 px-2 text-center font-mono text-[8.5px] text-slate-400">
                                      —
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* View All Stocks inline action row */}
                              <tr className="bg-slate-50/60 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <td colSpan={12} className="py-1.5 px-0 text-left">
                                  <div className="sticky left-0 inline-block px-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSectorFilter(sector.id);
                                        setViewMode('all_stocks');
                                        setCurrentPage(1);
                                      }}
                                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>View All {constituentStocks.length || sector.totalStocks || constituentList.length} {sector.name} Stocks →</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 italic">
                      {loading ? 'Loading sectors performance data...' : 'No sector data available matching your criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TABLE FOOTER: DISCLAIMER & PAGINATION ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/60 dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400">
          {/* Footnote */}
          <div className="text-[11px]">
            * All prices are in INR. Data delayed by 15 minutes. Source: NSE
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-4">
            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-all ${
                    currentPage === pageNum
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>

            {/* Rows per page selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="text-[11px] whitespace-nowrap">Rows per page:</span>
              <div className="relative">
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 pr-6 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value="all">All</option>
                </select>
                <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}