import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveSymbol, navigateBack } from '../store/slices/marketSlice';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, ChevronUp, ChevronDown, BarChart2, TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';
import { TradingViewChart } from '../components/TradingViewChart';
import SparklineChart from '../components/SparklineChart';
import axios from 'axios';
import { formatPrice, formatMarketCap } from '../utils/currencyFormatter';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Sort options
const SORT_OPTIONS = [
  { key: 'changePercent', label: '% Change', desc: true },
  { key: 'ltp', label: 'Price', desc: true },
  { key: 'volume', label: 'Volume', desc: true },
  { key: 'marketCap', label: 'Market Cap', desc: true },
  { key: 'name', label: 'Name', desc: false }
];

export default function SectorDetail() {
  const dispatch = useDispatch();
  const { activeSector, timeframe } = useSelector(state => state.market);
  const [sectorData, setSectorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('changePercent');
  const [sortDesc, setSortDesc] = useState(true);
  const [filterText, setFilterText] = useState('');

  // Fetch sector detail
  useEffect(() => {
    if (!activeSector) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/sectors/${activeSector}`);
        setSectorData(res.data);
      } catch (err) {
        console.error('Failed to fetch sector detail:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
    const interval = setInterval(fetchDetail, 60000);
    return () => clearInterval(interval);
  }, [activeSector, timeframe]);

  // Sort and filter stocks
  const displayStocks = useMemo(() => {
    if (!sectorData?.stocks) return [];
    let filtered = [...sectorData.stocks];

    // Filter
    if (filterText) {
      const q = filterText.toLowerCase();
      filtered = filtered.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortKey] ?? 0;
      let bVal = b[sortKey] ?? 0;
      if (sortKey === 'name') {
        aVal = (a.name || a.symbol || '').toLowerCase();
        bVal = (b.name || b.symbol || '').toLowerCase();
        return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sortDesc ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [sectorData, sortKey, sortDesc, filterText]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(key !== 'name');
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortKey !== columnKey) return <ChevronDown size={12} className="opacity-30" />;
    return sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };



  if (loading && !sectorData) {
    return (
      <div className="view-transition space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-48 w-full" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
        </div>
      </div>
    );
  }

  if (!sectorData) {
    return (
      <div className="glass-card p-12 text-center view-transition">
        <Activity size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Sector not found</h3>
        <button onClick={() => dispatch(navigateBack())} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
          ← Back to sectors
        </button>
      </div>
    );
  }

  const sector = sectorData || {};
  const pct = sector.changePercent || 0;
  const isPositive = pct > 0;
  const chartColor = isPositive ? 'var(--gain)' : 'var(--loss)';

  return (
    <div className="view-transition space-y-5">
      {/* Back + sector header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => dispatch(navigateBack())}
            className="flex items-center gap-1 text-xs font-medium mb-1.5 transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            <ArrowLeft size={14} /> Back to sectors
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{sector.region === 'india' ? '🇮🇳' : '🌍'}</span>
            <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
              {sector.name || activeSector}
            </h1>
            <span className={`text-lg font-bold flex items-center gap-0.5 ${isPositive ? 'text-gain' : pct < 0 ? 'text-loss' : ''}`} style={pct === 0 ? { color: 'var(--text-muted)' } : {}}>
              {isPositive ? '+' : ''}{pct.toFixed(2)}%
              {isPositive ? <ArrowUpRight size={18} /> : pct < 0 ? <ArrowDownRight size={18} /> : <Minus size={14} />}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span className="text-gain">{sector.advanceCount || 0} advancing</span> · <span className="text-loss">{sector.declineCount || 0} declining</span> · {displayStocks.length} stocks
          </p>
        </div>
      </div>

      {/* Sector chart + AI summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TradingView Chart */}
        <div className="lg:col-span-2 glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-4" style={{ color: 'var(--text-muted)' }}>
            <BarChart2 size={13} /> Sector Performance
          </h3>
          <div className="-mx-2 -mb-2">
            <TradingViewChart symbol={sectorData.indexSymbol || sectorData.id} socket={null} />
          </div>
        </div>

        {/* AI Summary */}
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Sparkles size={13} /> Sector Analysis
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {sectorData.aiSummary || 'Analysis is being generated...'}
          </p>

          {/* Top gainer/loser badges */}
          {sectorData.gainers && sectorData.gainers.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-gain" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Top Gainer:</span>
                <span className="text-xs font-bold text-gain">{sectorData.gainers[0].symbol} ({sectorData.gainers[0].changePercent > 0 ? '+' : ''}{sectorData.gainers[0].changePercent?.toFixed(2)}%)</span>
              </div>
              {sectorData.losers && sectorData.losers.length > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingDown size={13} className="text-loss" />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Top Loser:</span>
                  <span className="text-xs font-bold text-loss">{sectorData.losers[0].symbol} ({sectorData.losers[0].changePercent?.toFixed(2)}%)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stocks table */}
      <div className="glass-card overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Constituent Stocks
          </h3>
          <input
            type="text"
            placeholder="Filter stocks..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3 py-1.5 rounded-md text-xs focus:outline-none focus:ring-1"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent)',
              width: '180px'
            }}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th onClick={() => handleSort('name')} className="min-w-[140px]">
                  <span className="flex items-center gap-1">Company <SortIcon columnKey="name" /></span>
                </th>
                <th onClick={() => handleSort('ltp')} className="text-right">
                  <span className="flex items-center justify-end gap-1">Price <SortIcon columnKey="ltp" /></span>
                </th>
                <th onClick={() => handleSort('changePercent')} className="text-right">
                  <span className="flex items-center justify-end gap-1">Change <SortIcon columnKey="changePercent" /></span>
                </th>
                <th onClick={() => handleSort('volume')} className="text-right hidden sm:table-cell">
                  <span className="flex items-center justify-end gap-1">Volume <SortIcon columnKey="volume" /></span>
                </th>
                <th onClick={() => handleSort('marketCap')} className="text-right hidden lg:table-cell">
                  <span className="flex items-center justify-end gap-1">M.Cap (Cr) <SortIcon columnKey="marketCap" /></span>
                </th>
                <th onClick={() => handleSort('pe')} className="text-right hidden xl:table-cell">
                  <span className="flex items-center justify-end gap-1">P/E <SortIcon columnKey="pe" /></span>
                </th>
                <th className="text-right hidden xl:table-cell">
                  <span className="flex items-center justify-end gap-1">52W Range</span>
                </th>
                <th className="text-right hidden md:table-cell w-[70px]">Trend</th>
              </tr>
            </thead>
            <tbody>
              {displayStocks.map((stock, i) => {
                const cp = stock.changePercent || 0;
                const isUp = cp > 0;
                const isDown = cp < 0;

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => dispatch(setActiveSymbol(stock.symbol))}
                    className="cursor-pointer"
                    style={isUp ? { background: 'var(--gain-bg)' } : isDown ? { background: 'var(--loss-bg)' } : {}}
                  >
                    <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</div>
                      <div className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{stock.name}</div>
                    </td>
                    <td className="text-right font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatPrice(stock.ltp, stock.symbol)}
                    </td>
                    <td className="text-right">
                      <div className={`flex items-center justify-end gap-0.5 font-mono text-sm font-semibold ${isUp ? 'text-gain' : isDown ? 'text-loss' : ''}`} style={!isUp && !isDown ? { color: 'var(--text-muted)' } : {}}>
                        {isUp ? <ArrowUpRight size={14} /> : isDown ? <ArrowDownRight size={14} /> : null}
                        {isUp ? '+' : ''}{cp.toFixed(2)}%
                      </div>
                      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {stock.change > 0 ? '+' : ''}{stock.change?.toFixed(2) || '—'}
                      </div>
                      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      </div>
                    </td>
                    <td className="text-right font-mono text-xs hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {stock.volume ? (stock.volume > 1000000 ? `${(stock.volume / 1000000).toFixed(1)}M` : stock.volume > 1000 ? `${(stock.volume / 1000).toFixed(1)}K` : stock.volume.toLocaleString()) : '—'}
                    </td>
                    <td className="text-right font-mono text-sm hidden lg:table-cell" style={{ color: 'var(--text-primary)' }}>
                      {formatMarketCap(stock.marketCap, stock.symbol)}
                    </td>
                    <td className="text-right font-mono text-sm hidden xl:table-cell" style={{ color: 'var(--text-primary)' }}>
                      {stock.pe ? stock.pe.toFixed(2) : '—'}
                    </td>
                    <td className="text-right font-mono text-xs hidden xl:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {stock.low52 && stock.high52 ? `${stock.low52} - ${stock.high52}` : '—'}
                    </td>
                    <td className="text-right hidden md:table-cell">
                      {stock.sparkline && stock.sparkline.length > 1 ? (
                        <SparklineChart data={stock.sparkline} positive={cp >= 0} width={50} height={18} />
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {displayStocks.length === 0 && !loading && (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            {filterText ? 'No stocks match your filter' : 'No stocks found for this sector'}
          </div>
        )}
      </div>
    </div>
  );
}
