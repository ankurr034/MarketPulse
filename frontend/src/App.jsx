import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import useWebSocket from './hooks/useWebSocket';
import axios from 'axios';
import { setSectors, setStocks, setIndices, setHowToUseOpen, setRegion, setAssetClass, setActiveView } from './store/slices/marketSlice';
import { setCredentials, setUser, logout, setError, setAuthModalOpen } from './store/slices/authSlice';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Layout
import Header from './components/Header';
import Footer from './components/Footer';
import MarketIndicesTicker from './components/MarketIndicesTicker';
import TopMoversWidget from './components/TopMoversWidget';
import SectorHeatmap from './pages/SectorHeatmap';
import LandingPage from './pages/LandingPage';
import HowToUseModal from './components/HowToUseModal';
import AuthModal from './components/AuthModal';
import { WorkbenchProvider } from './context/WorkbenchContext';

// Lazy-loaded pages for fast initial bundle loading
const SectorDetail = lazy(() => import('./pages/SectorDetail'));
const StockDetails = lazy(() => import('./pages/StockDetails'));
// const MfExplorer = lazy(() => import('./components/MfExplorer'));
const MfAnalyticsDashboard = lazy(() => import('./pages/MfAnalyticsDashboard'));
// const SectorExplorer = lazy(() => import('./components/SectorExplorer'));
// const SectorTrendsDashboard = lazy(() => import('./components/SectorTrendsDashboard'));
const IndianMfSectorAnalysis = lazy(() => import('./pages/IndianMfSectorAnalysis'));
const ComparisonWorkbench = lazy(() => import('./components/ComparisonWorkbench'));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage'));

const PageFallback = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-[var(--text-muted)] animate-pulse">Loading module...</span>
    </div>
  </div>
);

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeView, theme, region, timeframe, assetClass, howToUseOpen } = useSelector(state => state.market);

  // Initialize WebSocket connection
  useWebSocket();

  // Check Upstox connection status
  useEffect(() => {
    const checkUpstoxStatus = async () => {
      try {
        // Also check if url has ?upstox=connected
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('upstox') === 'connected') {
          dispatch({ type: 'market/setUpstoxConnected', payload: true });
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        const res = await axios.get(`${API_BASE}/upstox/status`);
        dispatch({ type: 'market/setUpstoxConnected', payload: res.data.connected });
      } catch (err) {
        console.error('Upstox status error:', err);
      }
    };
    checkUpstoxStatus();
  }, [dispatch]);

  // Check and restore Auth status (token from URL query or localStorage)
  useEffect(() => {
    const handleAuthInit = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authParam = urlParams.get('auth');
        if (authParam === 'db_unavailable') {
          dispatch(setError('Authentication database service is currently unavailable. Please try again shortly.'));
          dispatch(setAuthModalOpen(true));
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
        if (authParam === 'error') {
          const msg = urlParams.get('message') || 'Authentication failed.';
          dispatch(setError(msg));
          dispatch(setAuthModalOpen(true));
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
        if (authParam === 'google_success') {
          window.history.replaceState({}, document.title, window.location.pathname);
          try {
            const sessionRes = await axios.get(`${API_BASE}/auth/session`, { withCredentials: true });
            if (sessionRes.data?.token) {
              dispatch(setCredentials({ token: sessionRes.data.token, user: sessionRes.data.user }));
              axios.defaults.headers.common['Authorization'] = `Bearer ${sessionRes.data.token}`;
            }
          } catch (err) {
            console.warn('Failed to restore session from cookie:', err.message);
          }
          return;
        }
        const tokenParam = urlParams.get('token');

        if (tokenParam) {
          dispatch(setCredentials({ token: tokenParam, user: null }));
          axios.defaults.headers.common['Authorization'] = `Bearer ${tokenParam}`;
          window.history.replaceState({}, document.title, window.location.pathname);

          try {
            const meRes = await axios.get(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${tokenParam}` }
            });
            if (meRes.data?.user) {
              dispatch(setUser(meRes.data.user));
            }
          } catch (err) {
            console.warn('Failed to fetch user from tokenParam:', err.message);
          }
          return;
        }

        const storedToken = localStorage.getItem('marketpulse_token');
        if (storedToken) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          try {
            const meRes = await axios.get(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (meRes.data?.user) {
              dispatch(setUser(meRes.data.user));
            }
          } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
              dispatch(logout());
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      }
    };

    handleAuthInit();
  }, [dispatch]);

  // Fetch Sectors Data when not in heatmap view (SectorHeatmap manages its own data fetching)
  useEffect(() => {
    if (activeView === 'heatmap') return;
    let isSubscribed = true;

    const fetchSectors = async () => {
      try {
        const res = await axios.get(`${API_BASE}/sectors?region=${region}&timeframe=${timeframe}&assetClass=${assetClass}`);
        if (isSubscribed) {
          dispatch(setSectors(res.data));
        }
      } catch (err) {
        console.error('Failed to fetch sectors:', err);
      }
    };

    fetchSectors();
    const interval = setInterval(fetchSectors, 60000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [region, timeframe, assetClass, dispatch, activeView]);

  // Fetch continuous indices for the ticker bar (refreshes every 20s)
  useEffect(() => {
    let isSubscribed = true;
    const fetchIndices = async () => {
      try {
        const res = await axios.get(`${API_BASE}/market/indices`);
        if (isSubscribed) {
          dispatch(setIndices(res.data));
        }
      } catch (err) {
        console.error('Failed to fetch indices:', err);
      }
    };

    fetchIndices();
    const interval = setInterval(fetchIndices, 20000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [dispatch]);

  // Fetch Stocks universe once on startup (refreshed only when user is viewing stock details)
  useEffect(() => {
    let isSubscribed = true;
    const fetchStocks = async () => {
      try {
        const res = await axios.get(`${API_BASE}/stocks`);
        if (isSubscribed) {
          dispatch(setStocks(res.data));
        }
      } catch (err) {
        console.error('Failed to fetch stocks:', err);
      }
    };

    fetchStocks();
    if (activeView === 'stock-detail') {
      const interval = setInterval(fetchStocks, 60000);
      return () => {
        isSubscribed = false;
        clearInterval(interval);
      };
    }
    return () => {
      isSubscribed = false;
    };
  }, [dispatch, activeView]);

  // Apply theme class on mount
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Synchronize route URL to Redux state on direct URL loads or browser back/forward navigation
  useEffect(() => {
    const path = location.pathname;
    if (path === '/stocks') {
      dispatch(setRegion('india'));
      dispatch(setAssetClass('stocks'));
      dispatch(setHowToUseOpen(false));
      if (activeView !== 'stock-detail' && activeView !== 'sector-detail') {
        dispatch(setActiveView('heatmap'));
      }
    } else if (path === '/mutual-funds') {
      dispatch(setAssetClass('indian-mf'));
      dispatch(setActiveView('indian-mf'));
      dispatch(setHowToUseOpen(false));
    } else if (path === '/analytics') {
      dispatch(setAssetClass('analytics'));
      dispatch(setActiveView('mf-analytics'));
      dispatch(setHowToUseOpen(false));
    } else if (path === '/global-stocks') {
      dispatch(setRegion('global'));
      dispatch(setAssetClass('stocks'));
      dispatch(setHowToUseOpen(false));
      if (activeView !== 'stock-detail' && activeView !== 'sector-detail') {
        dispatch(setActiveView('heatmap'));
      }
    } else if (path === '/how-to-use') {
      dispatch(setHowToUseOpen(true));
      dispatch(setActiveView('landing'));
    } else if (path === '/disclaimer') {
      dispatch(setActiveView('disclaimer'));
      dispatch(setHowToUseOpen(false));
    } else if (path === '/') {
      dispatch(setActiveView('landing'));
      dispatch(setHowToUseOpen(false));
    }
  }, [location.pathname, dispatch]);

  const renderStocksView = () => {
    if (activeView === 'stock-detail') return <StockDetails socket={null} />;
    if (activeView === 'sector-detail') return <SectorDetail />;
    return <SectorHeatmap />;
  };

  const renderGlobalStocksView = () => {
    if (activeView === 'stock-detail') return <StockDetails socket={null} />;
    if (activeView === 'sector-detail') return <SectorDetail />;
    return <SectorHeatmap />;
  };

  return (
    <WorkbenchProvider>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        {/* Header with search, toggles */}
        <Header />

        {/* Market indices ticker strip on inner pages */}
        {location.pathname !== '/' && location.pathname !== '/how-to-use' && location.pathname !== '/disclaimer' && <MarketIndicesTicker />}

        {/* Main content area */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Primary content */}
            <div className="flex-1 min-w-0">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/stocks" element={renderStocksView()} />
                  <Route path="/mutual-funds" element={<IndianMfSectorAnalysis />} />
                  <Route path="/analytics" element={<MfAnalyticsDashboard />} />
                  <Route path="/global-stocks" element={renderGlobalStocksView()} />
                  <Route path="/how-to-use" element={<LandingPage />} />
                  <Route path="/disclaimer" element={<DisclaimerPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>

            {/* Sidebar - Top Movers (visible on sector-detail view) */}
            {(location.pathname === '/stocks' || location.pathname === '/global-stocks') && activeView === 'sector-detail' && (
              <aside className="w-full lg:w-[280px] shrink-0">
                <div className="lg:sticky lg:top-[72px]">
                  <TopMoversWidget />
                </div>
              </aside>
            )}
          </div>
        </main>

        {/* Footer with disclaimers */}
        <Footer />
        <Suspense fallback={null}>
          <ComparisonWorkbench />
        </Suspense>

        {/* How to Use Modal */}
        <HowToUseModal 
          isOpen={howToUseOpen || location.pathname === '/how-to-use'} 
          onClose={() => {
            dispatch(setHowToUseOpen(false));
            if (location.pathname === '/how-to-use') {
              navigate('/');
            }
          }} 
        />

        {/* Auth Modal for Login, Signup & Google OAuth */}
        <AuthModal />

        {/* Decorative background elements */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-[300px] -right-[200px] w-[600px] h-[600px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] rounded-full opacity-[0.02]"
            style={{ background: 'radial-gradient(circle, var(--gain) 0%, transparent 70%)' }}
          />
        </div>
      </div>
    </WorkbenchProvider>
  );
}

export default App;
