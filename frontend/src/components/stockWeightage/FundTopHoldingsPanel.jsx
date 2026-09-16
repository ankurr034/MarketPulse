import React, { useState } from 'react';
import { 
  Building2, PieChart, ShieldCheck, TrendingUp, Calendar, 
  ChevronRight, ExternalLink, Info, ArrowUpRight, BarChart3, Layers
} from 'lucide-react';

export default function FundTopHoldingsPanel({
  fund = null,
  loading = false,
  onSelectStock = () => {},
  onViewAllHoldings = () => {}
}) {
  const [activeTab, setActiveTab] = useState('top10');

  if (loading) {
    return (
      <div 
        className="rounded-2xl border p-8 flex flex-col items-center justify-center min-h-[450px]"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-[var(--text-muted)] font-medium">Loading verified fund holdings...</p>
      </div>
    );
  }

  if (!fund || !fund.available) {
    return (
      <div 
        className="rounded-2xl border p-12 text-center flex flex-col items-center justify-center min-h-[450px]"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <Building2 size={36} className="text-[var(--text-muted)] mb-3 opacity-40" />
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Select a Mutual Fund</h4>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
          Select a verified mutual fund from the left panel to inspect its top 10 stock holdings, sector weightages, and institutional insights.
        </p>
      </div>
    );
  }

  const formatAum = (aum) => {
    if (aum === null || aum === undefined || isNaN(aum) || Number(aum) <= 0) return 'N/A';
    const num = Number(aum);
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const top10 = fund.top10Holdings || (fund.holdings || []).slice(0, 10);
  const totalHoldingsCount = fund.totalHoldings || (fund.holdings || []).length;

  const initials = (fund.amc || fund.schemeName || 'MF')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div 
      className="flex flex-col rounded-2xl border overflow-hidden shadow-xs"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {/* 1. Fund Header Panel */}
      <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {fund.schemeName}
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {fund.amc || 'Mutual Fund'} · <span className="text-[var(--text-secondary)] font-medium">{fund.category || 'Equity Scheme'}</span>
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {fund.plan || 'Direct Plan'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {fund.option || 'Growth'}
                </span>
                {fund.category && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {fund.category}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  As of {fund.asOfDate || 'August 31, 2026'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-[var(--bg-secondary)] p-2.5 px-4 rounded-xl border self-start sm:self-auto" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Fund AUM
              </div>
              <div className="text-sm sm:text-base font-extrabold font-mono text-[var(--text-primary)]">
                {formatAum(fund.fundAumCr)}
              </div>
            </div>
            <div className="h-7 w-px bg-[var(--border-color)]" />
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Total Stocks
              </div>
              <div className="text-sm sm:text-base font-extrabold font-mono text-[var(--text-primary)]">
                {totalHoldingsCount}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Tabs Bar */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
          {[
            { id: 'top10', label: 'Top 10 Holdings' },
            { id: 'overview', label: 'Fund Overview' },
            { id: 'distribution', label: 'Holdings Distribution' },
            { id: 'historical', label: 'Historical Holdings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tab Content */}
      {activeTab === 'top10' && (
        <div>
          {/* Table Container */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10.5px] font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Stock Name</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3">Market Cap</th>
                  <th className="py-2.5 px-3 text-right">Weightage</th>
                  <th className="py-2.5 px-3 text-right">Holding Value</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {top10.map((pos, idx) => {
                  const sym = pos.symbol || pos.stock || '—';
                  const name = pos.stockName || pos.name || pos.companyName || sym;
                  const weight = pos.weightPct ?? pos.weightPercent ?? 0;
                  const valCr = pos.marketValueCr ?? pos.valueCr ?? null;

                  return (
                    <tr 
                      key={pos.isin || pos.symbol || idx}
                      onClick={() => onSelectStock(sym)}
                      className="hover:bg-blue-500/5 transition-colors cursor-pointer group"
                    >
                      {/* Rank # */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-[var(--text-muted)]">
                        {idx + 1}
                      </td>

                      {/* Stock Name */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                            {name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                            <span className="font-semibold text-blue-500 dark:text-blue-400">{sym}</span>
                            {pos.isin && (
                              <>
                                <span>•</span>
                                <span>{pos.isin}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="py-3 px-3 text-[var(--text-secondary)] font-medium">
                        {pos.sector || pos.industry || 'General'}
                      </td>

                      {/* Market Cap */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                          Large Cap
                        </span>
                      </td>

                      {/* Weightage % with Mini Bar */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono font-bold text-[var(--text-primary)]">
                            {weight.toFixed(2)}%
                          </span>
                          <div className="w-16 h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${Math.min(100, (weight / 15) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Holding Value ₹ Cr */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text-primary)]">
                        {valCr !== null ? `₹${valCr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr` : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <span>See All Funds</span>
                          <ArrowUpRight size={11} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer View All Holdings Button */}
          {totalHoldingsCount > 10 && (
            <div className="p-3 border-t bg-[var(--bg-secondary)]/50 flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs text-[var(--text-muted)]">
                Showing top 10 of <span className="font-bold text-[var(--text-primary)]">{totalHoldingsCount}</span> disclosed holdings
              </span>
              <button
                onClick={onViewAllHoldings}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>View Complete Portfolio ({totalHoldingsCount} stocks)</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="p-5 text-xs text-[var(--text-secondary)] space-y-3">
          <p>
            <span className="font-bold text-[var(--text-primary)]">{fund.schemeName}</span> is an institutional mutual fund scheme managed by <span className="font-semibold text-[var(--text-primary)]">{fund.amc}</span> in the <span className="font-semibold text-[var(--text-primary)]">{fund.category}</span> category.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Total Disclosed Holdings</div>
              <div className="text-sm font-extrabold font-mono text-[var(--text-primary)] mt-1">{totalHoldingsCount} Securities</div>
            </div>
            <div className="p-3 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Verified Reporting Date</div>
              <div className="text-sm font-extrabold font-mono text-[var(--text-primary)] mt-1">{fund.asOfDate || 'August 31, 2026'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="p-5 text-xs text-[var(--text-secondary)] space-y-2">
          <p className="text-[var(--text-muted)]">
            Distribution of portfolio weightages across disclosed holdings.
          </p>
          <div className="space-y-2 pt-2">
            {top10.slice(0, 5).map((pos, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{pos.stockName || pos.symbol}</span>
                <span className="font-mono font-bold text-blue-500">{pos.weightPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'historical' && (
        <div className="p-6 text-center text-xs text-[var(--text-muted)]">
          <Calendar size={24} className="mx-auto mb-2 opacity-40" />
          <p>Multi-period archived disclosure history will populate as new monthly reporting cycles are published.</p>
        </div>
      )}
    </div>
  );
}
