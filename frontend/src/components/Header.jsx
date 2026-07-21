import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveSector, setActiveSymbol, setRegion, setAssetClass, setTimeframe, setTheme, setActiveView, setSearchQuery, setSearchResults, setUpstoxConnected } from '../store/slices/marketSlice';
import { Search, Sun, Moon, BarChart3, AlertTriangle, X, TrendingUp, Grid3X3 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Header() {
  const dispatch = useDispatch();
  const { region, timeframe, theme, searchQuery, assetClass, upstoxConnected } = useSelector(state => state.market);
  const [localQuery, setLocalQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState({ sectors: [], stocks: [] });
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!localQuery || localQuery.trim().length < 2) {
      setResults({ sectors: [], stocks: [] });
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

  const handleSectorClick = (sectorId) => {
    dispatch(setActiveSector(sectorId));
    setSearchOpen(false);
    setLocalQuery('');
  };

  const handleStockClick = (symbol) => {
    dispatch(setActiveSymbol(symbol));
    setSearchOpen(false);
    setLocalQuery('');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    dispatch(setTheme(next));
    if (next === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  };

  // Init theme on mount
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    }
  }, []);

  const regions = [
    { value: 'all', label: 'All' },
    { value: 'india', label: '🇮🇳 India' },
    { value: 'global', label: '🌍 Global' }
  ];

  const assetClasses = [
    { value: 'stocks', label: 'Stocks' },
    { value: 'sector-explorer', label: 'Sector Explorer' },
    { value: 'sector-trends', label: 'Sector Trends' },
    { value: 'mf-explore', label: 'Explore Funds' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'indian-mf', label: 'Indian MFs' }
  ];

  const hasResults = results.sectors.length > 0 || results.stocks.length > 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {/* Main header row */}
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <button 
            onClick={() => { dispatch(setActiveView('heatmap')); dispatch(setActiveSector(null)); dispatch(setActiveSymbol(null)); }}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              MarketPulse
            </span>
          </button>

          {/* Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search stocks, sectors..."
                value={localQuery}
                onChange={(e) => { setLocalQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-9 pr-8 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1"
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
                  <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No results found</div>
                )}
                {results.sectors.length > 0 && (
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
                {results.stocks.length > 0 && (
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
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1 p-0.5 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {regions.map(r => (
                <button
                  key={r.value}
                  onClick={() => dispatch(setRegion(r.value))}
                  className={`toggle-pill text-xs ${region === r.value ? 'active' : ''}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Asset Class toggle - hidden on mobile */}
            <div className="hidden md:flex items-center gap-1 p-0.5 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {assetClasses.map(a => (
                <button
                  key={a.value}
                  onClick={() => {
                    dispatch(setAssetClass(a.value));
                    if (a.value === 'mf-explore') {
                      dispatch(setActiveView('mf-explore'));
                    } else if (a.value === 'analytics') {
                      dispatch(setActiveView('mf-analytics'));
                    } else if (a.value === 'sector-explorer') {
                      dispatch(setActiveView('sector-explorer'));
                    } else if (a.value === 'sector-trends') {
                      dispatch(setActiveView('sector-trends'));
                    } else if (a.value === 'indian-mf') {
                      dispatch(setActiveView('indian-mf'));
                    } else {
                      dispatch(setActiveView('heatmap'));
                    }
                  }}
                  className={`toggle-pill text-xs ${assetClass === a.value ? 'active' : ''}`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Upstox Connect Button */}
            <a 
              href="http://localhost:5001/api/upstox/login"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: upstoxConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                color: upstoxConnected ? '#22c55e' : '#818cf8',
                border: `1px solid ${upstoxConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${upstoxConnected ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'}`}></div>
              {upstoxConnected ? 'Upstox Active' : 'Connect Upstox'}
            </a>

            {/* Disclaimer badge */}
            <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
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
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile toggles row */}
        <div className="flex md:hidden items-center gap-2 pb-2 overflow-x-auto">
          <div className="flex items-center gap-1 p-0.5 rounded-full shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {regions.map(r => (
              <button
                key={r.value}
                onClick={() => dispatch(setRegion(r.value))}
                className={`toggle-pill text-xs ${region === r.value ? 'active' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
