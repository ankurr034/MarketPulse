import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setActiveSector, 
  setActiveSymbol, 
  setRegion, 
  setAssetClass, 
  setTheme, 
  setActiveView, 
  setHowToUseOpen 
} from '../store/slices/marketSlice';
import { setAuthModalOpen, logout } from '../store/slices/authSlice';
import { Search, Sun, Moon, AlertTriangle, X, TrendingUp, Grid3X3, User, Menu, LogOut, Layers, PieChart } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { region, theme, activeView } = useSelector(state => state.market);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const [localQuery, setLocalQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState({ sectors: [], stocks: [], funds: [], subcategories: [] });
  const [searching, setSearching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const debounceRef = useRef(null);

  // Close search & user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
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
        setResults(res.data);
      } catch (err) {
        console.error('Search error:', err);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localQuery]);

  const handleSubcategoryClick = (sub) => {
    dispatch(setAssetClass('indian-mf'));
    setSearchOpen(false);
    setLocalQuery('');
    navigate(`/mutual-funds?market=${encodeURIComponent(sub.marketFilter || 'all')}&sub=${encodeURIComponent(sub.id)}`, {
      state: { selectedSubcategory: sub.id, marketFilter: sub.marketFilter, focusSearch: false }
    });
  };

  const handleFundClick = (fund) => {
    dispatch(setAssetClass('indian-mf'));
    setSearchOpen(false);
    setLocalQuery('');
    navigate(`/mutual-funds?q=${encodeURIComponent(fund.name)}&schemeCode=${encodeURIComponent(fund.schemeCode || '')}`, {
      state: { searchQuery: fund.name, selectedSchemeCode: fund.schemeCode }
    });
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Non-blocking fallback
    } finally {
      delete axios.defaults.headers.common['Authorization'];
      dispatch(logout());
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
    }
  };

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

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    dispatch(setTheme(next));
    if (next === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('dark');
    }
  };

  // Init theme on mount
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Navigation handlers
  const handleNavLanding = () => {
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('landing'));
    dispatch(setHowToUseOpen(false));
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNavStocks = () => {
    dispatch(setRegion('india'));
    dispatch(setAssetClass('stocks'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('heatmap'));
    dispatch(setHowToUseOpen(false));
    navigate('/stocks');
    setMobileMenuOpen(false);
  };

  const handleNavMutualFunds = () => {
    dispatch(setAssetClass('indian-mf'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('indian-mf'));
    dispatch(setHowToUseOpen(false));
    navigate('/mutual-funds');
    setMobileMenuOpen(false);
  };

  const handleNavAnalytics = () => {
    dispatch(setAssetClass('analytics'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('mf-analytics'));
    dispatch(setHowToUseOpen(false));
    navigate('/analytics');
    setMobileMenuOpen(false);
  };

  const handleNavGlobalStocks = () => {
    dispatch(setRegion('global'));
    dispatch(setAssetClass('stocks'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('heatmap'));
    dispatch(setHowToUseOpen(false));
    navigate('/global-stocks');
    setMobileMenuOpen(false);
  };

  const handleNavHowToUse = () => {
    dispatch(setHowToUseOpen(true));
    navigate('/how-to-use');
    setMobileMenuOpen(false);
  };

  const isStocksActive = location.pathname === '/stocks';
  const isMfActive = location.pathname === '/mutual-funds';
  const isAnalyticsActive = location.pathname === '/analytics';
  const isGlobalActive = location.pathname === '/global-stocks';
  const isHowToUseActive = location.pathname === '/how-to-use';

  const hasResults = (results.subcategories && results.subcategories.length > 0) ||
    (results.funds && results.funds.length > 0) ||
    (results.stocks && results.stocks.length > 0) ||
    (results.sectors && results.sectors.length > 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-[1600px] mx-auto px-4 md:px-6">
        {/* Main header row */}
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Logo */}
          <button 
            onClick={handleNavLanding}
            className="flex items-center gap-2 shrink-0 group focus:outline-none"
            title="The lal Street - Home"
          >
            <img 
              src={theme === 'dark' ? '/branding/logo-dark-trimmed.png' : '/branding/logo-light-trimmed.png'} 
              alt="The lal Street"
              className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              onError={(e) => {
                // Fallback to original if trimmed not loaded
                e.target.src = theme === 'dark' ? '/branding/logo-dark.png' : '/branding/logo-light.png';
              }}
            />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 shrink-0 text-sm font-medium">
            <button
              onClick={handleNavStocks}
              className={`transition-colors py-1.5 border-b-2 text-xs xl:text-sm font-semibold ${
                isStocksActive 
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Stocks
            </button>

            <button
              onClick={handleNavMutualFunds}
              className={`transition-colors py-1.5 border-b-2 text-xs xl:text-sm font-semibold ${
                isMfActive 
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Mutual Funds
            </button>

            <button
              onClick={handleNavAnalytics}
              className={`transition-colors py-1.5 border-b-2 text-xs xl:text-sm font-semibold ${
                isAnalyticsActive 
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Analytics
            </button>

            <button
              onClick={handleNavGlobalStocks}
              className={`transition-colors py-1.5 border-b-2 text-xs xl:text-sm font-semibold ${
                isGlobalActive 
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Global Stocks
            </button>

            <button
              onClick={handleNavHowToUse}
              className={`transition-colors py-1.5 border-b-2 text-xs xl:text-sm font-semibold ${
                isHowToUseActive 
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              How to Use
            </button>
          </nav>

          {/* Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search stocks, mutual funds, ETFs..."
                value={localQuery}
                onChange={(e) => { setLocalQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-9 pr-8 py-2 rounded-lg text-xs sm:text-sm transition-colors focus:outline-none focus:ring-1"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)'
                }}
              />
              {localQuery && (
                <button onClick={() => { setLocalQuery(''); setSearchOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchOpen && localQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                {searching && (
                  <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Searching...</div>
                )}
                {!searching && !hasResults && (
                  <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No matching funds, stocks, subcategories, or sectors found</div>
                )}
                {results.subcategories && results.subcategories.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                      <span>Mutual Fund Subcategories</span>
                      <span className="text-[9px] opacity-75">{results.subcategories.length}</span>
                    </div>
                    {results.subcategories.slice(0, 5).map(sub => (
                      <button
                        key={`sub-${sub.id}`}
                        onClick={() => handleSubcategoryClick(sub)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Layers size={14} className="text-indigo-500 shrink-0" />
                        <span className="font-medium truncate">{sub.name}</span>
                        <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-medium whitespace-nowrap">
                          {sub.parentCategory || 'Category'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {results.funds && results.funds.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                      <span>Mutual Funds & Schemes</span>
                      <span className="text-[9px] opacity-75">{results.funds.length}</span>
                    </div>
                    {results.funds.slice(0, 6).map(f => (
                      <button
                        key={`fund-${f.schemeCode || f.name}`}
                        onClick={() => handleFundClick(f)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <PieChart size={14} className="text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-xs sm:text-sm">{f.name}</div>
                          <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {f.amc ? `${f.amc} • ` : ''}{f.subLabel || f.category || 'Direct Scheme'}
                          </div>
                        </div>
                        {f.nav && (
                          <span className="text-xs font-mono font-semibold ml-auto shrink-0 text-emerald-600 dark:text-emerald-400">
                            ₹{f.nav}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {results.stocks && results.stocks.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                      Stocks
                    </div>
                    {results.stocks.slice(0, 8).map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => handleStockClick(s.symbol)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span className="font-medium">{s.symbol}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.sectors && results.sectors.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                      Sectors
                    </div>
                    {results.sectors.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSectorClick(s.id)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Grid3X3 size={14} style={{ color: 'var(--accent)' }} />
                        {s.name}
                        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{s.region === 'india' ? '🇮🇳' : '🌍'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Disclaimer badge on extra large screens */}
            <div className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <AlertTriangle size={11} />
              Delayed ~15 min
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* User profile avatar matching mockup */}
            <div ref={userMenuRef} className="relative">
              <button 
                onClick={() => {
                  if (!isAuthenticated) {
                    dispatch(setAuthModalOpen(true));
                  } else {
                    setUserMenuOpen(!userMenuOpen);
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isAuthenticated 
                    ? 'bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700' 
                    : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20'
                }`}
                title={isAuthenticated ? (user?.name || user?.email || 'The lal Street Account') : 'Sign In / Register'}
              >
                {isAuthenticated && (user?.name || user?.email) ? (
                  <span>{(user.name || user.email)[0].toUpperCase()}</span>
                ) : (
                  <User size={16} />
                )}
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && isAuthenticated && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{ 
                    background: 'var(--bg-card)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)' 
                  }}
                >
                  <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {user?.name || 'Investor'}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Open menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={handleNavStocks}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center justify-between ${
                isStocksActive ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <span>Stocks</span>
              <span className="text-xs opacity-75">NSE/BSE Performance</span>
            </button>

            <button
              onClick={handleNavMutualFunds}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center justify-between ${
                isMfActive ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <span>Mutual Funds</span>
              <span className="text-xs opacity-75">AMFI Analytics</span>
            </button>

            <button
              onClick={handleNavAnalytics}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center justify-between ${
                isAnalyticsActive ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <span>Analytics</span>
              <span className="text-xs opacity-75">Stock Weightage Screener</span>
            </button>

            <button
              onClick={handleNavGlobalStocks}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center justify-between ${
                isGlobalActive ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <span>Global Stocks</span>
              <span className="text-xs opacity-75">GICS Sectors</span>
            </button>

            <button
              onClick={handleNavHowToUse}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center justify-between ${
                isHowToUseActive ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <span>How to Use</span>
              <span className="text-xs opacity-75">Platform Guide</span>
            </button>

            {/* Account row in mobile drawer */}
            <div className="pt-2 border-t mt-1" style={{ borderColor: 'var(--border-color)' }}>
              {!isAuthenticated ? (
                <button
                  onClick={() => {
                    dispatch(setAuthModalOpen(true));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center justify-between text-blue-600 dark:text-blue-400 hover:bg-blue-600/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <User size={16} />
                    <span>Sign In / Register</span>
                  </span>
                  <span className="text-xs opacity-75">Account</span>
                </button>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-xs">
                    <span className="text-[var(--text-muted)]">Signed in as </span>
                    <span className="font-semibold text-[var(--text-primary)]">{user?.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
