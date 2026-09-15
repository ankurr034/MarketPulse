import React from 'react';
import { Info, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

export default function StockWeightageTable({
  stocks = [],
  pagination = {},
  selectedStockSymbol = null,
  sortBy = 'fundCount',
  sortOrder = 'desc',
  onSort = () => {},
  onSelectStock = () => {},
  onPageChange = () => {},
  loading = false
}) {
  const { currentPage = 1, totalPages = 1, totalStocks = 0, pageSize = 10 } = pagination;
  const startCount = totalStocks > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endCount = Math.min(currentPage * pageSize, totalStocks);

  // Column sort helper
  const renderSortIcon = (columnKey) => {
    if (sortBy === columnKey) {
      return sortOrder === 'asc' 
        ? <ArrowUp size={12} className="text-blue-400" />
        : <ArrowDown size={12} className="text-blue-400" />;
    }
    return <ArrowUpDown size={11} className="text-[var(--text-muted)] opacity-40 group-hover:opacity-100 transition-opacity" />;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30">1</span>;
    }
    if (rank === 2) {
      return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-slate-400/15 text-slate-300 border border-slate-400/30">2</span>;
    }
    if (rank === 3) {
      return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-amber-700/20 text-amber-600 dark:text-amber-500 border border-amber-600/30">3</span>;
    }
    return <span className="text-xs font-mono font-medium text-[var(--text-muted)]">#{rank}</span>;
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden flex flex-col shadow-xs"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}
    >
      {/* Table Header / Title */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-display">
            Top Stocks by Mutual Fund Weightage
          </h3>
          <div className="relative group cursor-help">
            <Info size={14} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" />
            <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-[11px] shadow-xl z-30 leading-snug">
              Ranked by the count of distinct equity mutual funds holding each stock and their individual portfolio allocations.
            </div>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] font-mono">
          {totalStocks > 0 ? `Showing ${startCount}–${endCount} of ${totalStocks}` : '0 stocks'}
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
              <th className="py-3 px-3 w-12 text-center">#</th>
              
              {/* Stock Name Column */}
              <th 
                onClick={() => onSort('name')}
                className="py-3 px-3.5 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                  <span>Stock</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              {/* Sector Column */}
              <th className="py-3 px-3">Sector</th>

              {/* Mutual Funds Holding Column */}
              <th 
                onClick={() => onSort('fundCount')}
                className="py-3 px-3.5 text-right cursor-pointer select-none group"
              >
                <div className="flex items-center justify-end gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                  <span>MFs Holding</span>
                  {renderSortIcon('fundCount')}
                </div>
              </th>

              {/* Holding Value Column */}
              <th 
                onClick={() => onSort('holdingValue')}
                className="py-3 px-3.5 text-right cursor-pointer select-none group"
              >
                <div className="flex items-center justify-end gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                  <span>Holding Value</span>
                  {renderSortIcon('holdingValue')}
                </div>
              </th>

              {/* Avg Weightage Column */}
              <th 
                onClick={() => onSort('avgWeightage')}
                className="py-3 px-3.5 text-right cursor-pointer select-none group"
              >
                <div className="flex items-center justify-end gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                  <span>Avg Weight</span>
                  {renderSortIcon('avgWeightage')}
                </div>
              </th>

              {/* Max Weightage Column */}
              <th 
                onClick={() => onSort('maxWeightage')}
                className="py-3 px-3.5 text-right cursor-pointer select-none group"
              >
                <div className="flex items-center justify-end gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                  <span>Max Weight</span>
                  {renderSortIcon('maxWeightage')}
                </div>
              </th>

              <th className="py-3 px-3 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-3.5">
                    <div className="h-4 bg-slate-700/15 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : stocks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-[var(--text-muted)] text-xs">
                  No stocks match the selected screener filters. Try clearing your search query or filters.
                </td>
              </tr>
            ) : (
              stocks.map((stock) => {
                const isSelected = selectedStockSymbol && String(selectedStockSymbol).toUpperCase() === String(stock.symbol).toUpperCase();
                
                // Visual intensity indicator for Max Weightage (capped at 10% for bar ratio)
                const maxWeightVal = stock.maxWeightage || 0;
                const weightBarRatio = Math.min(100, Math.max(8, (maxWeightVal / 10) * 100));

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock)}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-l-4 border-l-blue-500 bg-blue-500/10 dark:bg-blue-950/30' 
                        : 'hover:bg-slate-500/5'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-3 text-center">
                      {getRankBadge(stock.rank)}
                    </td>

                    {/* Stock Name & Symbol */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center font-bold font-mono text-[11px] text-blue-400 shrink-0">
                          {stock.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)] truncate max-w-[170px]" title={stock.name}>
                            {stock.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)]">
                              {stock.symbol}
                            </span>
                            {stock.marketCapCategory && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                                {stock.marketCapCategory}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-3.5 px-3 text-[var(--text-secondary)] font-medium truncate max-w-[130px]">
                      {stock.sector}
                    </td>

                    {/* Mutual Funds Holding Count */}
                    <td className="py-3.5 px-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        {stock.mutualFundsHolding} {stock.mutualFundsHolding === 1 ? 'fund' : 'funds'}
                      </span>
                    </td>

                    {/* Holding Value */}
                    <td className="py-3.5 px-3.5 text-right font-mono font-semibold text-[var(--text-primary)]">
                      {stock.totalHoldingValueCr != null 
                        ? `₹ ${stock.totalHoldingValueCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr` 
                        : '—'}
                    </td>

                    {/* Avg Weightage */}
                    <td className="py-3.5 px-3.5 text-right font-mono text-[var(--text-secondary)]">
                      {stock.avgWeightage != null ? `${stock.avgWeightage}%` : '—'}
                    </td>

                    {/* Max Weightage with visual intensity bar */}
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono font-bold text-amber-400">
                          {stock.maxWeightage != null ? `${stock.maxWeightage}%` : '—'}
                        </span>
                        {stock.maxWeightage != null && (
                          <div className="w-14 h-1 rounded-full bg-slate-700/20 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-amber-400 transition-all"
                              style={{ width: `${weightBarRatio}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock(stock);
                        }}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-700/20'
                        }`}
                        title="View stock details"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-xs text-[var(--text-muted)] font-mono">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
              const pageIdx = idx + 1;
              const isActive = currentPage === pageIdx;
              return (
                <button
                  key={pageIdx}
                  onClick={() => onPageChange(pageIdx)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {pageIdx}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
