import { useSelector } from 'react-redux';
import { TrendingUp, TrendingDown } from 'lucide-react';

const INDEX_KEYS = [
  { key: 'NIFTY 50', label: 'NIFTY 50' },
  { key: 'NIFTY 100', label: 'NIFTY 100' },
  { key: 'NIFTY NEXT 50', label: 'NIFTY NEXT 50' },
  { key: 'NIFTY 500', label: 'NIFTY 500' },
  { key: 'SENSEX', label: 'SENSEX' },
  { key: 'BANK NIFTY', label: 'BANK NIFTY' },
  { key: 'S&P 500', label: 'S&P 500' },
  { key: 'NASDAQ', label: 'NASDAQ' },
  { key: 'FTSE 100', label: 'FTSE 100' },
  { key: 'NIKKEI 225', label: 'NIKKEI 225' }
];

export default function MarketIndicesTicker() {
  const indices = useSelector(state => state.market.indices);
  
  // Build display items from indices object
  const items = INDEX_KEYS.map(({ key, label }) => {
    const idx = indices?.[key];
    if (!idx) return { label, value: '—', change: 0, changePercent: 0 };
    return {
      label,
      value: typeof idx.value === 'number' ? idx.value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—',
      change: idx.change || 0,
      changePercent: idx.changePercent || 0
    };
  });

  const renderItem = (item, i) => (
    <div key={`${item.label}-${i}`} className="inline-flex items-center gap-3 px-5 py-1.5 whitespace-nowrap">
      <span className="font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${item.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
        {item.changePercent >= 0 
          ? <TrendingUp size={11} /> 
          : <TrendingDown size={11} />
        }
        {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
      </span>
    </div>
  );

  return (
    <div className="ticker-scroll-container w-full border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
      <div className="ticker-scroll-content">
        {items.map(renderItem)}
        {/* Duplicate for seamless loop */}
        {items.map((item, i) => renderItem(item, i + items.length))}
      </div>
    </div>
  );
}
