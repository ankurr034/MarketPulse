import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Download, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import BrandLogo from './BrandLogo';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function StockAllFundsModal({ 
  symbol, 
  onClose = () => {},
  onSelectFund = () => {} 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('weightage');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (!symbol) return;
    let isMounted = true;
    setLoading(true);

    axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/${symbol}/funds?limit=500`)
      .then(res => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load all funds for stock:', err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [symbol]);

  const rawFunds = data?.funds || [];

  // Filter
  const filteredFunds = rawFunds.filter(f => {
    if (categoryFilter !== 'all' && f.category && !f.category.toLowerCase().includes(categoryFilter.toLowerCase())) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (f.schemeName && f.schemeName.toLowerCase().includes(q)) ||
             (f.amc && f.amc.toLowerCase().includes(q));
    }
    return true;
  });

  // Sort
  filteredFunds.sort((a, b) => {
    let valA, valB;
    if (sortBy === 'fundAum') {
      valA = a.fundAumCr ?? 0;
      valB = b.fundAumCr ?? 0;
    } else if (sortBy === 'holdingValue') {
      valA = a.holdingValueCr ?? 0;
      valB = b.holdingValueCr ?? 0;
    } else if (sortBy === 'name') {
      return sortOrder === 'asc' ? a.schemeName.localeCompare(b.schemeName) : b.schemeName.localeCompare(a.schemeName);
    } else {
      valA = a.weightage ?? 0;
      valB = b.weightage ?? 0;
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const total = filteredFunds.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paged = filteredFunds.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    if (filteredFunds.length === 0) return;
    const headers = ['Rank', 'Mutual Fund', 'AMC', 'Category', 'Weightage (%)', 'Holding Value (Cr)', 'Fund AUM (Cr)'];
    const rows = filteredFunds.map((f, i) => [
      i + 1,
      `"${(f.schemeName || '').replace(/"/g, '""')}"`,
      `"${(f.amc || '').replace(/"/g, '""')}"`,
      `"${(f.category || '').replace(/"/g, '""')}"`,
      f.weightage ?? '',
      f.holdingValueCr ?? '',
      f.fundAumCr ?? ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_Holding_Mutual_Funds.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo symbol={symbol} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  All Mutual Funds Holding {data?.stock?.name || symbol}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {total.toLocaleString('en-IN')} verified schemes holding this equity security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={filteredFunds.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme name or AMC..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Large Cap">Large Cap</option>
              <option value="Mid Cap">Mid Cap</option>
              <option value="Small Cap">Small Cap</option>
              <option value="Contra">Contra</option>
              <option value="Value">Value</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="weightage">Sort by Weightage</option>
              <option value="holdingValue">Sort by Holding Value</option>
              <option value="fundAum">Sort by Fund AUM</option>
              <option value="name">Sort by Scheme Name</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading holdings...</div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b text-[11px] font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Mutual Fund Scheme</th>
                  <th className="py-2.5 px-3">AMC</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Weightage</th>
                  <th className="py-2.5 px-3 text-right">Holding Value</th>
                  <th className="py-2.5 px-3 text-right">Fund AUM</th>
                  <th className="py-2.5 px-3 text-center w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paged.map((f, i) => (
                  <tr key={f.schemeCode || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {f.schemeName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {f.amc}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {f.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {f.weightage != null ? `${f.weightage.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {f.holdingValueCr != null ? `₹ ${Number(f.holdingValueCr).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {f.fundAumCr != null ? `₹ ${Number(f.fundAumCr).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          onClose();
                          onSelectFund(f.schemeCode);
                        }}
                        className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        title="View fund portfolio"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-white dark:bg-[var(--bg-card)]">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString('en-IN')} schemes
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
