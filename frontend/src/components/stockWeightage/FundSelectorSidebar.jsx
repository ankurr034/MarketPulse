import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function FundSelectorSidebar({
  funds = [],
  selectedSchemeCode = null,
  onSelectFund = () => {},
  loading = false,
  selectedCategory = 'all',
  searchQuery = '',
  onSearchChange = () => {}
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const formatAum = (aum) => {
    if (aum === null || aum === undefined || isNaN(aum) || Number(aum) <= 0) return '—';
    const num = Number(aum);
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const filteredFunds = useMemo(() => {
    const q = (localSearch || searchQuery).trim().toLowerCase();
    if (!q) return funds;
    return funds.filter(f => 
      (f.schemeName && f.schemeName.toLowerCase().includes(q)) ||
      (f.amc && f.amc.toLowerCase().includes(q)) ||
      (f.schemeCode && String(f.schemeCode).includes(q))
    );
  }, [funds, localSearch, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredFunds.length / pageSize));
  const paginatedFunds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFunds.slice(start, start + pageSize);
  }, [filteredFunds, currentPage]);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  return (
    <div 
      className="flex flex-col rounded-2xl border overflow-hidden shadow-xs bg-white dark:bg-[var(--bg-card)] border-[var(--border-color)]"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2.5">
          Select Mutual Fund
        </h3>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search fund name..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              onSearchChange(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Fund Cards List */}
      <div className="flex-1 divide-y divide-[var(--border-color)] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading mutual funds...</span>
          </div>
        ) : filteredFunds.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No mutual funds found.
          </div>
        ) : (
          paginatedFunds.map((fund) => {
            const isSelected = String(fund.schemeCode) === String(selectedSchemeCode);

            // Clean scheme name for display
            let displayName = fund.schemeName || 'Mutual Fund Scheme';
            displayName = displayName
              .replace(/ - Direct Plan - Growth Option/i, '')
              .replace(/ - Direct - Growth/i, '')
              .replace(/ - Direct Plan/i, '');

            return (
              <button
                key={fund.schemeCode}
                onClick={() => onSelectFund(fund)}
                className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-500 rounded-lg mx-1 my-0.5 w-[calc(100%-8px)]' 
                    : 'hover:bg-slate-50 dark:hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {/* Left: Logo + Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrandLogo 
                    identifier={fund.amc || fund.schemeName}
                    name={fund.schemeName}
                    size={28}
                    rounded="rounded-lg"
                  />

                  <div className="min-w-0">
                    <h4 
                      className={`text-xs font-semibold truncate leading-tight ${
                        isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-[var(--text-primary)]'
                      }`}
                      title={fund.schemeName}
                    >
                      {displayName}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Direct - Growth
                    </p>
                  </div>
                </div>

                {/* Right: Green AUM font */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatAum(fund.fundAumCr)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-2.5 border-t border-[var(--border-color)] flex items-center justify-center gap-1 text-xs">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>

        {[1, 2, 3, 4, 5].map((page) => {
          if (page > totalPages) return null;
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-6 h-6 flex items-center justify-center rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {page}
            </button>
          );
        })}

        {totalPages > 5 && (
          <>
            <span className="text-slate-400 px-0.5">...</span>
            <button
              onClick={() => handlePageChange(totalPages)}
              className={`w-6 h-6 flex items-center justify-center rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                currentPage === totalPages
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
