import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Activity, BarChart2, AlertTriangle } from 'lucide-react';
import { TradingViewChart } from '../components/TradingViewChart.jsx';
import { navigateBack } from '../store/slices/marketSlice.js';
import { formatPrice, formatMarketCap } from '../utils/currencyFormatter';

export const StockDetails = ({ socket }) => {
  const dispatch = useDispatch();
  const { activeSymbol } = useSelector(state => state.market);
  
  // Market context
  const stocks = useSelector(state => state.market.stocks);
  const advances = stocks.filter(s => s.change > 0).length;
  const declines = stocks.filter(s => s.change < 0).length;
  const indices = useSelector(state => state.market.indices);
  const nifty = indices?.['NIFTY 50'];

  const [stockMeta, setStockMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Stock details
  const fetchStockDetails = async () => {
    if (!activeSymbol) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/stocks/${encodeURIComponent(activeSymbol)}`);
      setStockMeta(res.data);
    } catch (err) {
      console.error('Error fetching stock details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockDetails();
  }, [activeSymbol]);

  // Handle WebSocket ticks updating detail stats
  useEffect(() => {
    if (!socket) return;

    const handleTickUpdate = (ticks) => {
      const activeTick = ticks.find(t => t.symbol === activeSymbol);
      if (activeTick) {
        setStockMeta(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ltp: activeTick.ltp,
            change: activeTick.change,
            changePercent: activeTick.changePercent,
            dayHigh: activeTick.dayHigh,
            dayLow: activeTick.dayLow,
            vwap: activeTick.vwap
          };
        });
      }
    };

    socket.on('tick_update', handleTickUpdate);
    return () => {
      socket.off('tick_update', handleTickUpdate);
    };
  }, [socket, activeSymbol]);

  if (loading && !stockMeta) {
    return (
      <div className="view-transition space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-[400px] w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      </div>
    );
  }

  if (!stockMeta) {
    return (
      <div className="glass-card p-12 text-center view-transition">
        <Activity size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Stock not found</h3>
        <button onClick={() => dispatch(navigateBack())} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
          ← Go back
        </button>
      </div>
    );
  }

  const isPositive = stockMeta.changePercent >= 0;

  // Stats grid items
  const stats = [
    { label: 'Open', value: stockMeta.open ? formatPrice(stockMeta.open, activeSymbol) : '—' },
    { label: 'Prev Close', value: stockMeta.previousClose ? formatPrice(stockMeta.previousClose, activeSymbol) : '—' },
    { label: 'Volume', value: stockMeta.volume ? stockMeta.volume.toLocaleString() : '—' },
    { label: 'Market Cap', value: formatMarketCap(stockMeta.marketCap, activeSymbol) },
    { label: 'P/E Ratio', value: stockMeta.pe ? stockMeta.pe : '—' },
    { label: 'Div Yield', value: stockMeta.dividendYield ? `${stockMeta.dividendYield}%` : '—' },
    { 
      label: '52W High', 
      value: stockMeta.high52 && stockMeta.ltp ? `${formatPrice(stockMeta.high52, activeSymbol)} (${(((stockMeta.ltp - stockMeta.high52) / stockMeta.high52) * 100).toFixed(1)}%)` : (stockMeta.high52 ? formatPrice(stockMeta.high52, activeSymbol) : '—'), 
      color: 'var(--gain)' 
    },
    { 
      label: '52W Low', 
      value: stockMeta.low52 && stockMeta.ltp ? `${formatPrice(stockMeta.low52, activeSymbol)} (+${(((stockMeta.ltp - stockMeta.low52) / stockMeta.low52) * 100).toFixed(1)}%)` : (stockMeta.low52 ? formatPrice(stockMeta.low52, activeSymbol) : '—'), 
      color: 'var(--loss)' 
    },
    { label: 'Support (S1)', value: stockMeta.support ? formatPrice(stockMeta.support, activeSymbol) : '—', color: 'var(--accent)' },
    { label: 'Resistance (R1)', value: stockMeta.resistance ? formatPrice(stockMeta.resistance, activeSymbol) : '—', color: '#ec4899' },
    { label: 'V.W.A.P.', value: stockMeta.vwap ? formatPrice(stockMeta.vwap, activeSymbol) : '—' },
    { label: 'E.P.S.', value: stockMeta.eps ? formatPrice(stockMeta.eps, activeSymbol) : '—' }
  ];

  return (
    <div className="view-transition space-y-5">
      {/* Top Bar with Market Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => dispatch(navigateBack())}
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80 w-fit"
          style={{ color: 'var(--accent)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
          {nifty && (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">NIFTY 50</span>
              <span className="font-bold text-slate-200">{nifty.value?.toLocaleString() || nifty.price?.toLocaleString() || '—'}</span>
              <span className={`font-medium ${nifty.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {nifty.changePercent >= 0 ? '+' : ''}{nifty.changePercent?.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="w-[1px] h-4 bg-slate-700 hidden sm:block"></div>
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">Market A/D</span>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{advances}</span>
              <span className="text-slate-600">:</span>
              <span className="text-rose-400 font-bold">{declines}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Hero Header */}
      <div className="glass-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {stockMeta.symbol}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {stockMeta.name} • {stockMeta.sector || 'General'} Sector
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="text-left font-mono">
            <span className="text-[10px] uppercase block font-semibold" style={{ color: 'var(--text-muted)' }}>LTP</span>
            <div className="text-3xl font-display font-extrabold" style={{ color: 'var(--text-primary)' }}>
              {formatPrice(stockMeta.ltp, activeSymbol)}
            </div>
          </div>

          <div className="text-left font-mono">
            <span className="text-[10px] uppercase block font-semibold" style={{ color: 'var(--text-muted)' }}>Change</span>
            <span className={`text-sm font-extrabold flex items-center gap-0.5 ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {isPositive ? '+' : ''}{stockMeta.change?.toFixed(2)} ({isPositive ? '+' : ''}{stockMeta.changePercent?.toFixed(2)}%)
            </span>
          </div>

          <div className="text-left font-mono hidden sm:block">
            <span className="text-[10px] uppercase block font-semibold" style={{ color: 'var(--text-muted)' }}>Day Range</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {formatPrice(stockMeta.dayLow, activeSymbol)} — {formatPrice(stockMeta.dayHigh, activeSymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="glass-card overflow-hidden">
        <TradingViewChart symbol={activeSymbol} socket={socket} />
      </div>

      {/* Key Statistics */}
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          <BarChart2 size={15} /> Key Statistics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 font-mono text-xs">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <span className="text-[10px] uppercase block font-semibold font-sans" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </span>
              <span className="font-bold" style={{ color: stat.color || 'var(--text-secondary)' }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 52W Range Visual */}
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
          52 Week Range
        </h3>
        <div className="relative">
          <div className="flex items-center justify-between text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>{formatPrice(stockMeta.low52, activeSymbol)}</span>
            <span>{formatPrice(stockMeta.high52, activeSymbol)}</span>
          </div>
          <div className="h-2 rounded-full relative" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--loss), var(--gain))',
                width: '100%',
                opacity: 0.4
              }}
            />
            {stockMeta.low52 && stockMeta.high52 && stockMeta.ltp && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 shadow-lg"
                style={{
                  left: `${Math.min(100, Math.max(0, ((stockMeta.ltp - stockMeta.low52) / (stockMeta.high52 - stockMeta.low52)) * 100))}%`,
                  background: 'var(--accent)',
                  borderColor: 'var(--bg-card)',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            )}
          </div>
          <div className="text-center mt-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            Current: {formatPrice(stockMeta.ltp, activeSymbol)}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
        <AlertTriangle size={14} />
        <span>Data may be delayed by 15+ minutes. This is for informational purposes only and does not constitute investment advice.</span>
      </div>
    </div>
  );
};

export default StockDetails;
