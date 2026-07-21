import { useSelector } from 'react-redux';

export default function Footer() {
  const lastUpdated = useSelector(state => state.market.lastUpdated);

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <footer className="w-full border-t py-3 px-4 md:px-6" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/>
          </svg>
          For informational purposes only — not investment advice
        </span>
        <span>Data source: Yahoo Finance (delayed ~15 min)</span>
        <span>Last updated: {formatTime(lastUpdated)}</span>
      </div>
    </footer>
  );
}
