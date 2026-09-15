import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Download, Search, Building2, PieChart, ShieldCheck, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function FundPortfolioModal({ schemeCode, onClose = () => {} }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schemeCode) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/fund/${schemeCode}`)
      .then(res => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.response?.data?.reason || 'Failed to fetch fund portfolio disclosure');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [schemeCode]);

  const exportCsv = () => {
    if (!data || !data.holdings || data.holdings.length === 0) return;

    const headers = ['Rank', 'Stock Name', 'Symbol', 'ISIN', 'Sector', 'Weightage (%)', 'Shares Held', 'Holding Value (Cr)'];
    const rows = data.holdings.map(h => [
      h.rank ?? '',
      `"${(h.stockName || h.name || '').replace(/"/g, '""')}"`,
      h.symbol ?? '',
      h.isin ?? '',
      `"${(h.sector || '').replace(/"/g, '""')}"`,
      h.weightPct ?? '',
      h.sharesHeld ?? h.quantity ?? '',
      h.marketValueCr ?? h.valueCr ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.schemeName || 'Fund').replace(/[^a-zA-Z0-9]/g, '_')}_Portfolio.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredHoldings = (data?.holdings || []).filter(h => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (h.stockName || h.name || '').toLowerCase().includes(q) ||
      (h.symbol || '').toLowerCase().includes(q) ||
      (h.sector || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Scheme Complete Portfolio
              </span>
              {data?.asOfDate && (
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Statement as on {data.asOfDate}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold font-display text-[var(--text-primary)] mt-1.5 truncate">
              {data?.schemeName || (loading ? 'Loading scheme portfolio...' : `Scheme ${schemeCode}`)}
            </h2>
            <div className="flex items-center gap-2.5 text-xs text-[var(--text-muted)] mt-1 flex-wrap">
              <span>{data?.amc || 'Mutual Fund'}</span>
              <span>•</span>
              <span>{data?.category || 'Equity'}</span>
              {data?.fundAumCr != null && (
                <>
                  <span>•</span>
                  <span>Fund AUM: <strong className="text-[var(--text-primary)] font-mono">₹ {data.fundAumCr.toLocaleString('en-IN')} Cr</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data?.holdings?.length > 0 && (
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Export portfolio as CSV"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 sm:px-5 py-3 border-b bg-[var(--bg-secondary)] flex items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search stocks in this fund..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="text-xs text-[var(--text-muted)] font-mono">
            {filteredHoldings.length} of {data?.totalHoldings || 0} holdings
          </div>
        </div>

        {/* Portfolio Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-muted)] font-mono">Loading official portfolio disclosure...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <AlertCircle size={32} className="text-amber-400" />
              <div className="text-sm font-semibold text-[var(--text-primary)]">Portfolio Data Unavailable</div>
              <div className="text-xs text-[var(--text-muted)] max-w-md">{error}</div>
            </div>
          ) : filteredHoldings.length === 0 ? (
            <div className="text-center py-16 text-xs text-[var(--text-muted)]">
              No holdings matched your filter.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-[var(--bg-secondary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Stock Name</th>
                    <th className="py-2.5 px-3">Sector</th>
                    <th className="py-2.5 px-3 text-right">Weightage</th>
                    <th className="py-2.5 px-3 text-right">Shares Held</th>
                    <th className="py-2.5 px-3 text-right">Holding Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {filteredHoldings.map((h, i) => {
                    const weightVal = h.weightPct || 0;
                    const barWidth = Math.min(100, Math.max(8, (weightVal / 10) * 100));

                    return (
                      <tr key={i} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-[var(--text-muted)]">
                          {h.rank ?? i + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[var(--text-primary)] truncate">
                            {h.stockName || h.name}
                          </div>
                          {h.symbol && (
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">
                              {h.symbol}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] truncate max-w-[140px]">
                          {h.sector || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono font-bold text-emerald-400">
                              {h.weightPct != null ? `${h.weightPct}%` : '—'}
                            </span>
                            {h.weightPct != null && (
                              <div className="w-12 h-1 rounded-full bg-slate-700/20 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${barWidth}%` }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[var(--text-muted)]">
                          {h.sharesHeld != null ? h.sharesHeld.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--text-primary)]">
                          {h.marketValueCr != null ? `₹ ${h.marketValueCr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
