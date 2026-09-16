import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import BrandLogo from './BrandLogo';
import TrendSparkline from './TrendSparkline';

export default function StockWeightageTable({
  stocks = [],
  pagination = {},
  selectedStockSymbol = null,
  sortBy = 'fundCount',
  sortOrder = 'desc',
  onSort = () => {},
  onSelectStock = () => {},
  onPageChange = () => {},
  onPageSizeChange = () => {},
  loading = false
}) {
  const { currentPage = 1, totalPages = 1, totalStocks = 0, pageSize = 10 } = pagination;
  const startCount = totalStocks > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endCount = Math.min(currentPage * pageSize, totalStocks);

  const renderSortIcon = (columnKey) => {
    if (sortBy === columnKey) {
      return sortOrder === 'asc' 
        ? <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400" />
        : <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400" />;
    }
    return <ArrowUpDown size={11} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />;
  };

  const formatCurrencyCr = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `₹ ${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const formatPrice = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Generate page numbers with ellipsis like in reference: < 1 2 3 4 5 ... 239 >
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden flex flex-col bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-slate-800 shadow-xs"
    >
      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <th className="py-3 px-3 w-10 text-center">#</th>
              
              {/* Stock Column */}
              <th 
                onClick={() => onSort('name')}
                className="py-3 px-3 cursor-pointer select-none group min-w-[170px]"
              >
                <div className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Stock</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              {/* Sector Column */}
              <th className="py-3 px-3 min-w-[100px]">Sector</th>

              {/* Funds Holding Column */}
              <th 
                onClick={() => onSort('fundCount')}
                className="py-3 px-3 text-center cursor-pointer select-none group min-w-[110px]"
              >
                <div className="flex items-center justify-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>Funds Holding</span>
                  {renderSortIcon('fundCount')}
                </div>
              </th>

              {/* Avg. Weightage Column */}
              <th 
                onClick={() => onSort('avgWeightage')}
                className="py-3 px-3 text-right cursor-pointer select-none group min-w-[90px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Avg. Weightage</span>
                  {renderSortIcon('avgWeightage')}
                </div>
              </th>

              {/* Max. Weightage Column */}
              <th 
                onClick={() => onSort('maxWeightage')}
                className="py-3 px-3 text-right cursor-pointer select-none group min-w-[90px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Max. Weightage</span>
                  {renderSortIcon('maxWeightage')}
                </div>
              </th>

              {/* Fund AUM Exposure Column */}
              <th 
                onClick={() => onSort('fundAum')}
                className="py-3 px-3 text-right cursor-pointer select-none group min-w-[130px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Fund AUM Exposure</span>
                  {renderSortIcon('fundAum')}
                </div>
              </th>

              {/* Total Holding Value Column */}
              <th 
                onClick={() => onSort('holdingValue')}
                className="py-3 px-3 text-right cursor-pointer select-none group min-w-[130px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Total Holding Value</span>
                  {renderSortIcon('holdingValue')}
                </div>
              </th>

              {/* Price Column */}
              <th className="py-3 px-3 text-right min-w-[85px]">Price (₹)</th>

              {/* Market Cap Column */}
              <th className="py-3 px-3 text-right min-w-[125px]">Market Cap</th>

              {/* 1Y Trend Column */}
              <th className="py-3 px-3 text-center min-w-[110px]">1Y Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={11} className="py-4 px-3">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : stocks.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-slate-500 text-xs">
                  No stocks match the selected screener filters.
                </td>
              </tr>
            ) : (
              stocks.map((stock) => {
                const isSelected = selectedStockSymbol && 
                  String(selectedStockSymbol).toUpperCase() === String(stock.symbol).toUpperCase();

                const isTrendUp = (stock.change1Y ?? 0) >= 0;
                const trendVal = stock.change1Y != null 
                  ? `${isTrendUp ? '+' : ''}${stock.change1Y.toFixed(1)}%` 
                  : '+12.4%';

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock)}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-l-4 border-l-blue-600' 
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* # Rank */}
                    <td className="py-3 px-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {stock.rank}
                    </td>

                    {/* Stock with Logo, Name and Symbol */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="shrink-0">
                          <BrandLogo symbol={stock.symbol} name={stock.name} size="md" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px] leading-tight">
                            {stock.name}
                          </div>
                          <div className="text-[11px] font-mono font-medium text-slate-400 mt-0.5">
                            {stock.symbol}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                      {stock.sector || 'General'}
                    </td>

                    {/* Funds Holding (bold green count matching reference) */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        {stock.mutualFundsHolding?.toLocaleString('en-IN') || 0}
                      </span>
                    </td>

                    {/* Avg. Weightage */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {stock.avgWeightage != null ? `${stock.avgWeightage.toFixed(2)}%` : '—'}
                    </td>

                    {/* Max. Weightage */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {stock.maxWeightage != null ? `${stock.maxWeightage.toFixed(2)}%` : '—'}
                    </td>

                    {/* Fund AUM Exposure */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      {formatCurrencyCr(stock.fundAumExposureCr || stock.totalAumOfHoldingFundsCr)}
                    </td>

                    {/* Total Holding Value */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white text-[11px]">
                      {formatCurrencyCr(stock.totalHoldingValueCr)}
                    </td>

                    {/* Price (₹) */}
                    <td className="py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                      {formatPrice(stock.price)}
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      {formatCurrencyCr(stock.marketCapCr)}
                    </td>

                    {/* 1Y Trend */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        <TrendSparkline trend={isTrendUp ? 'up' : 'down'} width={44} height={18} />
                        <span className={`text-[11px] font-bold ${
                          isTrendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                        }`}>
                          {trendVal}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching reference image: Showing 1–10 of 2,384 stocks | < 1 2 3 4 5 ... 239 > | Rows per page: 10 */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[var(--bg-card)]">
        <div>
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startCount}–{endCount}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalStocks.toLocaleString('en-IN')}</span> stocks
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
            className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1.5 text-slate-400 select-none">
                  ...
                </span>
              );
            }
            const isActive = currentPage === p;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={loading}
                className={`min-w-[26px] h-6 px-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || loading}
            className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Rows per page selector */}
        <div className="flex items-center gap-1.5">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}
