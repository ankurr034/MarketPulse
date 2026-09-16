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
        ? <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        : <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    return <ArrowUpDown size={11} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />;
  };

  const formatCurrencyCr = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const num = Number(val);
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const formatPrice = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Generate page numbers with ellipsis matching reference: < 1 2 3 4 5 ... 239 >
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
    <div className="rounded-2xl border overflow-hidden flex flex-col bg-white dark:bg-[var(--bg-card)] border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all">
      
      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 select-none">
              <th className="py-3 px-3 w-10 text-center text-slate-400">#</th>
              
              {/* Stock Column */}
              <th 
                onClick={() => onSort('name')}
                className="py-3 px-3 cursor-pointer group min-w-[175px]"
              >
                <div className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Stock</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              {/* Sector Column */}
              <th className="py-3 px-3 min-w-[100px] font-semibold">Sector</th>

              {/* Funds Holding Column (Highlighted as primary ranking column) */}
              <th 
                onClick={() => onSort('fundCount')}
                className="py-3 px-3 text-center cursor-pointer group min-w-[115px]"
              >
                <div className="flex items-center justify-center gap-1 text-[#0D6B58] dark:text-emerald-400 font-extrabold hover:opacity-80 transition-opacity">
                  <span>Funds Holding</span>
                  {renderSortIcon('fundCount')}
                </div>
              </th>

              {/* Avg. Weightage Column */}
              <th 
                onClick={() => onSort('avgWeightage')}
                className="py-3 px-3 text-right cursor-pointer group min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Avg. Weightage</span>
                  {renderSortIcon('avgWeightage')}
                </div>
              </th>

              {/* Max. Weightage Column */}
              <th 
                onClick={() => onSort('maxWeightage')}
                className="py-3 px-3 text-right cursor-pointer group min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Max. Weightage</span>
                  {renderSortIcon('maxWeightage')}
                </div>
              </th>

              {/* Fund AUM Exposure Column */}
              <th 
                onClick={() => onSort('fundAum')}
                className="py-3 px-3 text-right cursor-pointer group min-w-[130px]"
              >
                <div className="flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span>Fund AUM Exposure</span>
                  {renderSortIcon('fundAum')}
                </div>
              </th>

              {/* Total Holding Value Column */}
              <th 
                onClick={() => onSort('holdingValue')}
                className="py-3 px-3 text-right cursor-pointer group min-w-[130px]"
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={11} className="py-3.5 px-3">
                    <div className="h-5 bg-slate-200/70 dark:bg-slate-800/70 rounded-md w-full" />
                  </td>
                </tr>
              ))
            ) : stocks.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-slate-500 dark:text-slate-400 text-xs">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">No stocks found</span>
                    <span className="text-[11px] text-slate-400">Try adjusting your filters or search criteria.</span>
                  </div>
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
                    className={`cursor-pointer transition-colors duration-150 select-none ${
                      isSelected 
                        ? 'bg-[#F0F7FF] dark:bg-blue-950/30 border-l-[3.5px] border-l-[#2563EB]' 
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-l-[3.5px] border-l-transparent'
                    }`}
                  >
                    {/* # Rank */}
                    <td className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {stock.rank}
                    </td>

                    {/* Stock with Logo, Name and Symbol */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        <BrandLogo symbol={stock.symbol} name={stock.name} size="md" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[170px] text-xs leading-snug">
                            {stock.name}
                          </div>
                          <div className="text-[10.5px] font-mono font-medium text-slate-400 dark:text-slate-500">
                            {stock.symbol}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-xs font-medium">
                      {stock.sector || 'General'}
                    </td>

                    {/* Funds Holding (bold green/teal count matching reference) */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-extrabold text-[13.5px] text-[#059669] dark:text-emerald-400">
                        {stock.mutualFundsHolding?.toLocaleString('en-IN') || 0}
                      </span>
                    </td>

                    {/* Avg. Weightage */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {stock.avgWeightage != null ? `${stock.avgWeightage.toFixed(2)}%` : '—'}
                    </td>

                    {/* Max. Weightage */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {stock.maxWeightage != null ? `${stock.maxWeightage.toFixed(2)}%` : '—'}
                    </td>

                    {/* Fund AUM Exposure */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 text-[11.5px]">
                      {formatCurrencyCr(stock.fundAumExposureCr || stock.totalAumOfHoldingFundsCr)}
                    </td>

                    {/* Total Holding Value */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white text-[11.5px]">
                      {formatCurrencyCr(stock.totalHoldingValueCr)}
                    </td>

                    {/* Price (₹) */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 text-xs">
                      {formatPrice(stock.price)}
                    </td>

                    {/* Market Cap */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 text-[11.5px]">
                      {formatCurrencyCr(stock.marketCapCr)}
                    </td>

                    {/* 1Y Trend */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        <TrendSparkline trend={isTrendUp ? 'up' : 'down'} width={44} height={16} />
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[var(--bg-card)]">
        <div>
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startCount}–{endCount}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalStocks.toLocaleString('en-IN')}</span> stocks
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
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
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0D6B58] text-white shadow-xs font-bold'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || loading}
            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Rows per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
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
