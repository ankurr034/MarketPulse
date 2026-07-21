import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveSymbol, setTopMovers } from '../store/slices/marketSlice';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function TopMoversWidget() {
  const dispatch = useDispatch();
  const topGainers = useSelector(state => state.market.topGainers);
  const topLosers = useSelector(state => state.market.topLosers);
  const [activeTab, setActiveTab] = useState('gainers');

  useEffect(() => {
    const fetchMovers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/sectors/top-movers?count=10`);
        dispatch(setTopMovers(res.data));
      } catch (err) {
        console.error('Failed to fetch top movers:', err.message);
      }
    };
    fetchMovers();
    const interval = setInterval(fetchMovers, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const items = activeTab === 'gainers' ? topGainers : topLosers;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setActiveTab('gainers')}
          className={`toggle-pill flex items-center gap-1.5 ${activeTab === 'gainers' ? 'active' : ''}`}
        >
          <TrendingUp size={14} /> Top Gainers
        </button>
        <button
          onClick={() => setActiveTab('losers')}
          className={`toggle-pill flex items-center gap-1.5 ${activeTab === 'losers' ? 'active' : ''}`}
        >
          <TrendingDown size={14} /> Top Losers
        </button>
      </div>

      <div className="space-y-1">
        {items.length === 0 && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-9 w-full" />
            ))}
          </div>
        )}
        {items.map((stock, i) => (
          <button
            key={stock.symbol}
            onClick={() => dispatch(setActiveSymbol(stock.symbol))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-[var(--bg-card-hover)] text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {stock.symbol}
                </div>
                <div className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
                  {stock.name}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {stock.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—'}
              </div>
              <div className={`text-xs font-medium flex items-center justify-end gap-0.5 ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                {stock.changePercent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
