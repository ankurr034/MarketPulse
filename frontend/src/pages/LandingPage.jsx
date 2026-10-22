import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setActiveSector, 
  setActiveSymbol, 
  setRegion, 
  setAssetClass, 
  setActiveView, 
  setHowToUseOpen 
} from '../store/slices/marketSlice';
import { 
  Search, 
  ArrowRight, 
  BarChart3, 
  PieChart, 
  SlidersHorizontal, 
  Globe, 
  BookOpen, 
  TrendingUp, 
  Grid3X3, 
  X,
  ShieldAlert,
  Layers
} from 'lucide-react';
import axios from 'axios';
import { MF_CATEGORIES, MARKET_FILTERS } from '../config/mutualFundCategories';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function LandingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme } = useSelector(state => state.market);
  
  const [localQuery, setLocalQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState({ sectors: [], stocks: [], funds: [], subcategories: [] });
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Instantaneous client-side subcategory matching from verified taxonomy
  const clientSubcategories = useMemo(() => {
    if (!localQuery || localQuery.trim().length < 2) return [];
    const q = localQuery.toLowerCase().trim();
    const matches = [];

    Object.entries(MF_CATEGORIES).forEach(([catKey, subs]) => {
      subs.forEach(sub => {
        if (sub.id === 'all') return;
        const subLabel = sub.label.toLowerCase();
        const subId = sub.id.toLowerCase();
        if (subLabel.includes(q) || q.includes(subLabel) || subId.includes(q)) {
          const marketFilterObj = MARKET_FILTERS.find(m => m.id === catKey);
          matches.push({
            id: sub.id,
            subType: sub.id,
            label: sub.label,
            marketFilter: catKey,
            parentGroup: marketFilterObj?.label || catKey.toUpperCase()
          });
        }
      });
    });

    return matches.slice(0, 6);
  }, [localQuery]);

  const displaySubcategories = useMemo(() => {
    const apiSubs = results.subcategories || [];
    if (apiSubs.length > 0) return apiSubs;
    return clientSubcategories;
  }, [results.subcategories, clientSubcategories]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic querying unified backend search (sectors, stocks, mutual funds, subcategories)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!localQuery || localQuery.trim().length < 2) {
      setResults({ sectors: [], stocks: [], funds: [], subcategories: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/sectors/search?q=${encodeURIComponent(localQuery.trim())}`);
        setResults({
          sectors: res.data?.sectors || [],
          stocks: res.data?.stocks || [],
          funds: res.data?.funds || [],
          subcategories: res.data?.subcategories || []
        });
      } catch (err) {
        console.error('Search error:', err);
      }
      setSearching(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [localQuery]);

  const handleSectorClick = (sectorId) => {
    dispatch(setActiveSector(sectorId));
    setSearchOpen(false);
    setLocalQuery('');
    navigate('/stocks');
  };

  const handleStockClick = (symbol) => {
    dispatch(setActiveSymbol(symbol));
    setSearchOpen(false);
    setLocalQuery('');
    navigate('/stocks');
  };

  const handleSubcategoryClick = (sub) => {
    dispatch(setAssetClass('indian-mf'));
    dispatch(setActiveView('indian-mf'));
    setSearchOpen(false);
    setLocalQuery('');
    navigate(`/mutual-funds?market=${sub.marketFilter || 'all'}&sub=${sub.subType || sub.id || 'all'}`, {
      state: {
        activeMarketFilter: sub.marketFilter || 'all',
        selectedSubCategory: sub.subType || sub.id || 'all'
      }
    });
  };

  const handleFundClick = (fund) => {
    dispatch(setAssetClass('indian-mf'));
    dispatch(setActiveView('indian-mf'));
    setSearchOpen(false);
    setLocalQuery('');
    navigate(`/mutual-funds?q=${encodeURIComponent(fund.name || fund.schemeName)}&schemeCode=${fund.schemeCode || fund.id}`, {
      state: {
        searchQuery: fund.name || fund.schemeName,
        schemeCode: fund.schemeCode || fund.id,
        activeModalFund: fund
      }
    });
  };

  const handleSearchSubmit = () => {
    const q = localQuery.trim();
    if (!q) return;

    if (displaySubcategories.length > 0) {
      handleSubcategoryClick(displaySubcategories[0]);
      return;
    }
    if (results.funds && results.funds.length > 0 && (!results.stocks || results.stocks.length === 0)) {
      handleFundClick(results.funds[0]);
      return;
    }
    if (results.stocks && results.stocks.length > 0 && (!results.funds || results.funds.length === 0)) {
      handleStockClick(results.stocks[0].symbol);
      return;
    }
    if (results.sectors && results.sectors.length > 0) {
      handleSectorClick(results.sectors[0].id);
      return;
    }
    dispatch(setAssetClass('indian-mf'));
    dispatch(setActiveView('indian-mf'));
    setSearchOpen(false);
    navigate(`/mutual-funds?q=${encodeURIComponent(q)}`, {
      state: { searchQuery: q }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleNavStocks = () => {
    dispatch(setRegion('india'));
    dispatch(setAssetClass('stocks'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('heatmap'));
    navigate('/stocks');
  };

  const handleNavMutualFunds = () => {
    dispatch(setAssetClass('indian-mf'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('indian-mf'));
    navigate('/mutual-funds');
  };

  const handleNavAnalytics = () => {
    dispatch(setAssetClass('analytics'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('mf-analytics'));
    navigate('/analytics');
  };

  const handleNavGlobalStocks = () => {
    dispatch(setRegion('global'));
    dispatch(setAssetClass('stocks'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('heatmap'));
    navigate('/global-stocks');
  };

  const quickPills = [
    { label: 'HDFC Bank', action: () => handleStockClick('HDFCBANK.NS') },
    { label: 'Reliance', action: () => handleStockClick('RELIANCE.NS') },
    { label: 'SBI', action: () => handleStockClick('SBIN.NS') },
    { label: 'Nifty 50', action: handleNavStocks },
    { label: 'Index Funds', action: handleNavMutualFunds },
  ];

  const hasResults = 
    (results.sectors && results.sectors.length > 0) || 
    (results.stocks && results.stocks.length > 0) || 
    (results.funds && results.funds.length > 0) || 
    displaySubcategories.length > 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-12 sm:space-y-16 py-6 sm:py-10 animate-in fade-in duration-300">
      
      {/* ── HERO SECTION ── */}
      <section className="relative text-center max-w-4xl mx-auto px-4 pt-4 sm:pt-8 space-y-6">
        {/* Subtle Candlestick / Chart Background Silhouette */}
        <div className="absolute inset-0 -top-12 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-15 overflow-hidden" aria-hidden="true">
          <svg className="w-full max-w-3xl h-64 text-blue-500/20 dark:text-cyan-500/20" viewBox="0 0 800 240" fill="none">
            {/* Candlesticks pattern */}
            <path d="M40 80v80M40 100h16v40H40zM100 60v100M100 80h16v60H100zM160 40v90M160 50h16v60H160zM220 90v110M220 110h16v70H220zM280 50v100M280 70h16v50H280zM340 30v120M340 50h16v70H340zM400 70v100M400 90h16v60H400zM460 40v110M460 60h16v70H460zM520 80v90M520 100h16v50H520zM580 30v130M580 50h16v80H580zM640 60v100M640 80h16v60H640zM700 40v110M700 60h16v70H700zM760 70v90M760 90h16v50H760z" stroke="currentColor" strokeWidth="2" fill="currentColor" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
          Invest Smarter with{' '}
          <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-300 text-transparent bg-clip-text">
            Data &amp; Insights
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl font-normal max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
          Stocks, Mutual Funds, Global Markets and Powerful Analytics — all in one place.
        </p>

        {/* Search Bar Container */}
        <div className="relative max-w-2xl mx-auto pt-2" ref={searchRef}>
          <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden border transition-all focus-within:ring-2 focus-within:ring-blue-500/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <Search size={20} className="ml-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search stocks, mutual funds, ETFs..."
              value={localQuery}
              onChange={(e) => { setLocalQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3.5 text-sm sm:text-base bg-transparent border-none outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {localQuery && (
              <button onClick={() => { setLocalQuery(''); setSearchOpen(false); }} className="p-1 mr-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} />
              </button>
            )}
            <button 
              onClick={handleSearchSubmit}
              className="w-10 h-10 mr-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
              title="Search"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Autocomplete Search Dropdown */}
          {searchOpen && localQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-50 max-h-96 overflow-y-auto text-left border divide-y divide-[var(--border-color)]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              {searching && (
                <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Searching universe...</div>
              )}
              {!searching && !hasResults && (
                <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No matching funds, stocks, subcategories, or sectors found</div>
              )}

              {/* 1. Mutual Fund Subcategories */}
              {displaySubcategories.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                    <span>Mutual Fund Subcategories</span>
                    <span className="text-[9px] font-mono lowercase">explore category</span>
                  </div>
                  {displaySubcategories.map(sub => (
                    <button
                      key={`${sub.marketFilter}_${sub.id || sub.label}`}
                      onClick={() => handleSubcategoryClick(sub)}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Layers size={15} className="text-blue-500 shrink-0" />
                      <span className="font-semibold">{sub.label}</span>
                      <span className="text-xs ml-auto shrink-0 font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                        {sub.parentGroup || sub.marketFilter}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 2. Mutual Funds & Direct Schemes */}
              {results.funds && results.funds.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                    <span>Mutual Funds &amp; Schemes</span>
                    <span className="text-[9px] font-mono lowercase">verified AMFI universe</span>
                  </div>
                  {results.funds.slice(0, 6).map(f => (
                    <button
                      key={f.schemeCode || f.id}
                      onClick={() => handleFundClick(f)}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <PieChart size={15} className="text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{f.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-2">
                          <span>{f.amc || f.family}</span>
                          {f.nav != null && <span>• NAV: ₹{Number(f.nav).toFixed(2)}</span>}
                        </div>
                      </div>
                      <span className="text-xs ml-auto shrink-0 font-mono text-[var(--text-muted)]">
                        {f.subLabel || f.parentCategoryLabel || 'Fund'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 3. Stocks */}
              {results.stocks && results.stocks.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                    Stocks
                  </div>
                  {results.stocks.slice(0, 6).map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => handleStockClick(s.symbol)}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <TrendingUp size={15} className="text-cyan-500 shrink-0" />
                      <span className="font-semibold">{s.symbol}</span>
                      <span className="text-xs truncate ml-1 flex-1" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                      <span className="text-xs ml-auto shrink-0 font-mono text-[var(--text-muted)]">{s.sectorName || 'Equity'}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 4. Sectors */}
              {results.sectors && results.sectors.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                    Sectors
                  </div>
                  {results.sectors.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSectorClick(s.id)}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Grid3X3 size={15} className="text-blue-500 shrink-0" />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{s.region === 'india' ? '🇮🇳 NSE' : '🌍 Global'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Pill Filter Buttons */}
          <div className="flex items-center justify-center flex-wrap gap-2 pt-3">
            {quickPills.map((pill, idx) => (
              <button
                key={idx}
                onClick={pill.action}
                className="px-3 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105"
                style={{ 
                  background: 'var(--bg-card)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)' 
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4 FEATURE NAVIGATION CARDS ── */}
      <section className="px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Stocks */}
          <div
            onClick={handleNavStocks}
            className="group relative rounded-2xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Background subtle sparkline */}
            <svg className="absolute right-0 bottom-0 w-36 h-20 opacity-10 text-blue-500 group-hover:opacity-20 transition-opacity" viewBox="0 0 100 40" fill="none">
              <path d="M0 35 Q 25 30, 45 15 T 90 8 L 100 12" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>

            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
                  Stocks
                </h3>
                <p className="text-xs sm:text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Track, analyze and discover Indian stocks with real-time data and insights.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-end relative z-10">
              <div className="w-9 h-9 rounded-full bg-blue-600/10 group-hover:bg-blue-600 group-hover:text-white text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all duration-200">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

          {/* Card 2: Mutual Funds */}
          <div
            onClick={handleNavMutualFunds}
            className="group relative rounded-2xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Background subtle sparkline */}
            <svg className="absolute right-0 bottom-0 w-36 h-20 opacity-10 text-emerald-500 group-hover:opacity-20 transition-opacity" viewBox="0 0 100 40" fill="none">
              <path d="M0 38 Q 30 20, 55 25 T 95 6 L 100 10" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>

            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <PieChart size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
                  Mutual Funds
                </h3>
                <p className="text-xs sm:text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Explore and compare top mutual funds with detailed analytics.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-end relative z-10">
              <div className="w-9 h-9 rounded-full bg-emerald-600/10 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all duration-200">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

          {/* Card 3: Analytics */}
          <div
            onClick={handleNavAnalytics}
            className="group relative rounded-2xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Background subtle sparkline */}
            <svg className="absolute right-0 bottom-0 w-36 h-20 opacity-10 text-purple-500 group-hover:opacity-20 transition-opacity" viewBox="0 0 100 40" fill="none">
              <path d="M0 32 Q 25 15, 60 28 T 92 4 L 100 9" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>

            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
                  Analytics
                </h3>
                <p className="text-xs sm:text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Deep insights with our Stock Weightage Screener and advanced tools.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-end relative z-10">
              <div className="w-9 h-9 rounded-full bg-purple-600/10 group-hover:bg-purple-600 group-hover:text-white text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all duration-200">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

          {/* Card 4: Global Stocks */}
          <div
            onClick={handleNavGlobalStocks}
            className="group relative rounded-2xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Background subtle sparkline */}
            <svg className="absolute right-0 bottom-0 w-36 h-20 opacity-10 text-amber-500 group-hover:opacity-20 transition-opacity" viewBox="0 0 100 40" fill="none">
              <path d="M0 30 Q 35 35, 50 18 T 95 10 L 100 15" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>

            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
                  Global Stocks
                </h3>
                <p className="text-xs sm:text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Track international markets and global stocks with ease.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-end relative z-10">
              <div className="w-9 h-9 rounded-full bg-amber-600/10 group-hover:bg-amber-600 group-hover:text-white text-amber-600 dark:text-amber-400 flex items-center justify-center transition-all duration-200">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO USE CALL-TO-ACTION BANNER ── */}
      <section className="px-4">
        <div 
          className="rounded-2xl p-5 sm:p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
          style={{ 
            background: 'var(--bg-card)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                New to The lal Street?
              </h3>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Learn how to use the platform with our step-by-step guide.
              </p>
            </div>
          </div>

          <button
            onClick={() => { dispatch(setHowToUseOpen(true)); navigate('/how-to-use'); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-xs shrink-0 self-stretch sm:self-auto justify-center"
          >
            <span>How to Use</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

    </div>
  );
}
