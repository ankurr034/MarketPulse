import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  X, Download, CheckCircle2, TrendingUp, Search,
  ExternalLink, Eye, AlertCircle, BarChart2, Calendar, 
  Maximize2, Minimize2, Shield, Info, Building2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function StockDetailPanel({
  stockSymbol,
  isExpanded = false,
  onToggleExpand = () => {},
  onClose = () => {},
  onSelectFund = () => {}
}) {
  const [detail, setDetail] = useState(null);
  const [fundsData, setFundsData] = useState({ funds: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mf-holdings');
  const [fundSearch, setFundSearch] = useState('');

  // Load stock detail & holding funds whenever stockSymbol changes
  useEffect(() => {
    if (!stockSymbol) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/${stockSymbol}`),
      axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/${stockSymbol}/funds?limit=25`)
    ])
      .then(([detailRes, fundsRes]) => {
        if (isMounted) {
          setDetail(detailRes.data);
          setFundsData(fundsRes.data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching stock weightage detail:', err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [stockSymbol]);

  // Export CSV of funds holding this stock
  const exportCsv = () => {
    if (!fundsData || !fundsData.funds || fundsData.funds.length === 0) return;

    const headers = ['Rank', 'Mutual Fund (Scheme)', 'AMC', 'Category', 'Stock Weightage (%)', 'Fund AUM (Cr)', 'Holding Value (Cr)', 'Shares Held'];
    const rows = fundsData.funds.map(f => [
      f.rank,
      `"${(f.schemeName || '').replace(/"/g, '""')}"`,
      `"${(f.amc || '').replace(/"/g, '""')}"`,
      `"${(f.category || '').replace(/"/g, '""')}"`,
      f.weightage ?? '',
      f.fundAumCr ?? '',
      f.holdingValueCr ?? '',
      f.sharesHeld ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stockSymbol}_Mutual_Fund_Holdings.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filter schemes in the detail list
  const filteredFunds = useMemo(() => {
    if (!fundsData?.funds) return [];
    if (!fundSearch.trim()) return fundsData.funds;
    const q = fundSearch.toLowerCase();
    return fundsData.funds.filter(f => 
      (f.schemeName || '').toLowerCase().includes(q) ||
      (f.amc || '').toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q)
    );
  }, [fundsData?.funds, fundSearch]);

  if (!stockSymbol) {
    return (
      <div className="rounded-2xl border p-12 text-center text-xs shadow-xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        Select a stock from the screener table to view its institutional mutual fund ownership breakdown.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[var(--text-muted)]">Loading institutional portfolio data for {stockSymbol}...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border p-12 text-center text-xs shadow-xs text-[var(--text-muted)]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        Institutional holdings data currently unavailable for {stockSymbol}.
      </div>
    );
  }

  const { ownershipSummary = {}, distribution = [], keyTakeaways = [], quote } = detail;

  const tabs = [
    { id: 'mf-holdings', label: 'Mutual Fund Holdings', count: fundsData?.funds?.length || 0 },
    { id: 'distribution', label: 'Weightage Distribution' },
    { id: 'insights', label: 'Institutional Insights' }
  ];

  return (
    <div
      className="rounded-2xl border flex flex-col gap-4 p-4 sm:p-5 shadow-xs animate-in fade-in duration-200"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}
    >
      {/* 1. Header: Stock Identity & Actions */}
      <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold font-mono text-xs text-blue-400">
              {detail.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-display text-[var(--text-primary)] truncate">
                  {detail.name}
                </h2>
                {detail.marketCapCategory && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                    {detail.marketCapCategory}
                  </span>
                )}
                {detail.sector && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                    {detail.sector}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-2">
                <span>NSE: <strong className="text-[var(--text-secondary)]">{detail.symbol}</strong></span>
                {detail.isin && <span>• ISIN: {detail.isin}</span>}
              </div>
            </div>
          </div>

          {/* Live / Cached Price Banner */}
          {quote?.price != null && (
            <div className="flex items-baseline gap-2.5 mt-3 pt-2.5 border-t border-[var(--border-color)]">
              <span className="text-lg sm:text-xl font-bold font-mono text-[var(--text-primary)]">
                ₹ {quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              {quote.change != null && (
                <span className={`inline-flex items-center text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  quote.change >= 0 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {quote.change >= 0 ? `+${quote.change}` : quote.change} ({quote.changePercent >= 0 ? `+${quote.changePercent}%` : `${quote.changePercent}%`})
                </span>
              )}
              {quote.asOf && (
                <span className="text-[10px] text-[var(--text-muted)] font-mono ml-auto">
                  Market Price as of {quote.asOf}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title={isExpanded ? "Restore split layout" : "Expand to full width"}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Close panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Key Ownership Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Mutual Funds Hold</div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {ownershipSummary.mutualFundsHolding != null ? `${ownershipSummary.mutualFundsHolding} schemes` : '—'}
          </div>
        </div>
        <div className="p-3 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Total Holding Value</div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5 truncate">
            {ownershipSummary.totalHoldingValueCr != null 
              ? `₹ ${ownershipSummary.totalHoldingValueCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr` 
              : '—'}
          </div>
        </div>
        <div className="p-3 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Average Weight</div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--text-secondary)] mt-0.5">
            {ownershipSummary.avgWeightage != null ? `${ownershipSummary.avgWeightage}%` : '—'}
          </div>
        </div>
        <div className="p-3 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Peak Weightage</div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-400 mt-0.5">
            {ownershipSummary.maxWeightage != null ? `${ownershipSummary.maxWeightage}%` : '—'}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto no-scrollbar pt-1 text-xs font-medium">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count != null && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Tab Content Area */}
      {activeTab === 'mf-holdings' && (
        <div className="flex flex-col gap-3">
          {/* Search & Export Toolbar */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter schemes or AMC..."
                value={fundSearch}
                onChange={(e) => setFundSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors shrink-0"
              title="Download CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Holdings Scheme Table */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                  <tr className="border-b text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Mutual Fund Scheme</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Weightage</th>
                    <th className="py-2.5 px-3 text-right">Fund AUM</th>
                    <th className="py-2.5 px-3 text-right">Holding Value</th>
                    <th className="py-2.5 px-3 text-center w-16">Portfolio</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {filteredFunds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--text-muted)] text-xs">
                        No mutual fund holdings matched your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredFunds.map(fund => {
                      const weightVal = fund.weightage || 0;
                      const barWidth = Math.min(100, Math.max(10, (weightVal / 10) * 100));

                      return (
                        <tr key={fund.schemeCode} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-[var(--text-muted)]">
                            {fund.rank}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]" title={fund.schemeName}>
                              {fund.schemeName}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                              {fund.amc}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-muted)] truncate max-w-[100px]">
                            {fund.category}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-mono font-bold text-emerald-400">
                                {fund.weightage != null ? `${fund.weightage}%` : '—'}
                              </span>
                              {fund.weightage != null && (
                                <div className="w-12 h-1 rounded-full bg-slate-700/20 overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${barWidth}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">
                            {fund.fundAumCr != null ? `₹ ${fund.fundAumCr.toLocaleString('en-IN')} Cr` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--text-primary)]">
                            {fund.holdingValueCr != null ? `₹ ${fund.holdingValueCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => onSelectFund(fund)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[var(--bg-secondary)] hover:bg-blue-600 hover:text-white text-[var(--text-secondary)] transition-colors border border-[var(--border-color)]"
                              title="View full scheme portfolio"
                            >
                              <Eye size={11} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center justify-between">
              <span>Weightage Distribution Across Holding Funds</span>
              <BarChart2 size={14} className="text-blue-400" />
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="bucket" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      borderColor: 'var(--border-color)', 
                      borderRadius: '10px', 
                      fontSize: '11px',
                      color: 'var(--text-primary)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Funds Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-[11px] text-[var(--text-muted)] font-medium">As-of Statement Date</div>
              <div className="text-sm font-bold font-mono text-[var(--text-primary)] mt-1">
                {ownershipSummary.asOfDate || 'Latest Disclosed Statement'}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Ingested directly from verified AMC portfolio disclosure workbooks.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-[11px] text-[var(--text-muted)] font-medium">Allocation Range</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                {ownershipSummary.avgWeightage != null ? `${ownershipSummary.avgWeightage}% avg` : '—'} • {ownershipSummary.maxWeightage != null ? `${ownershipSummary.maxWeightage}% max` : '—'}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Reflects active conviction weighting within equity portfolios.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="flex flex-col gap-3">
          <div className="p-4 rounded-xl border bg-[var(--bg-secondary)] space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
              <span>💡 Institutional Insights</span>
            </div>
            <div className="space-y-2">
              {keyTakeaways.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-[var(--bg-secondary)] flex flex-col justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs text-[var(--text-muted)] italic leading-relaxed">
              "Institutional holdings provide powerful transparency into where fund managers deploy capital. High mutual fund presence signifies institutional liquidity and consensus, but always examine company fundamentals, debt levels, and valuations before investing."
            </p>
            <div className="text-[11px] font-mono font-semibold text-blue-400 text-right mt-2">
              — TheLalStreet Research Analytics
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

