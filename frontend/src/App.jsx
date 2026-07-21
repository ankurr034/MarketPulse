import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import useWebSocket from './hooks/useWebSocket';
import axios from 'axios';
import { setSectors, setStocks, setIndices } from './store/slices/marketSlice';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Layout
import Header from './components/Header';
import Footer from './components/Footer';
import MarketIndicesTicker from './components/MarketIndicesTicker';
import TopMoversWidget from './components/TopMoversWidget';

// Pages
import SectorHeatmap from './pages/SectorHeatmap';
import SectorDetail from './pages/SectorDetail';
import StockDetails from './pages/StockDetails';
import MfExplorer from './components/MfExplorer';
import MfAnalytics from './components/MfAnalytics';
import MfAnalyticsDashboard from './pages/MfAnalyticsDashboard';
import SectorExplorer from './components/SectorExplorer';
import SectorTrendsDashboard from './components/SectorTrendsDashboard';
import IndianMfSectorAnalysis from './pages/IndianMfSectorAnalysis';
import { WorkbenchProvider } from './context/WorkbenchContext';
import ComparisonWorkbench from './components/ComparisonWorkbench';

function App() {
  const dispatch = useDispatch();
  const { activeView, theme, region, timeframe, assetClass } = useSelector(state => state.market);

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

  // Fetch Sectors Data
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const res = await axios.get(`${API_BASE}/sectors?region=${region}&timeframe=${timeframe}&assetClass=${assetClass}`);
        dispatch(setSectors(res.data));
      } catch (err) {
        console.error('Failed to fetch sectors:', err);
      }
    };

    fetchSectors();
    const interval = setInterval(fetchSectors, 60000); // refresh every min
    return () => clearInterval(interval);
  }, [region, timeframe, assetClass, dispatch]);

  // Fetch Stocks & Indices on mount
  useEffect(() => {
    const fetchStocksAndIndices = async () => {
      try {
        const [stocksRes, indicesRes] = await Promise.all([
          axios.get(`${API_BASE}/stocks`),
          axios.get(`${API_BASE}/market/indices`)
        ]);
        dispatch(setStocks(stocksRes.data));
        dispatch(setIndices(indicesRes.data));
      } catch (err) {
        console.error('Failed to fetch stocks/indices:', err);
      }
    };
    fetchStocksAndIndices();
    const interval = setInterval(fetchStocksAndIndices, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Apply theme class on mount
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  // Render active page
  const renderPage = () => {
    switch (activeView) {
      case 'sector-detail':
        return <SectorDetail />;
      case 'stock-detail':
        return <StockDetails socket={null} />;
      case 'mf-explore':
        return <MfExplorer />;
      case 'mf-analytics':
        return <MfAnalyticsDashboard />;
      case 'sector-explorer':
        return <SectorExplorer />;
      case 'sector-trends':
        return <SectorTrendsDashboard />;
      case 'indian-mf':
        return <IndianMfSectorAnalysis />;
      case 'heatmap':
      default:
        return <SectorHeatmap />;
    }
  };

  return (
    <WorkbenchProvider>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        {/* Header with search, toggles */}
        <Header />

        {/* Market indices ticker strip */}
        <MarketIndicesTicker />

        {/* Main content area */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-6 py-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Primary content */}
            <div className="flex-1 min-w-0">
              {renderPage()}
            </div>

            {/* Sidebar - Top Movers (visible on heatmap and sector-detail views) */}
            {(activeView === 'heatmap' || activeView === 'sector-detail') && (
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
        <ComparisonWorkbench />

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
