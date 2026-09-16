import React, { useState, useMemo } from 'react';
import { Search, Building2, CheckCircle2, ChevronRight, Layers, ShieldCheck } from 'lucide-react';

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

  const formatAum = (aum) => {
    if (aum === null || aum === undefined || isNaN(aum) || Number(aum) <= 0) return '—';
    const num = Number(aum);
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
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

  return (
    <div 
      className="flex flex-col h-full rounded-2xl border overflow-hidden shadow-xs"
      style={{ 
        background: 'var(--bg-card)', 
        borderColor: 'var(--border-color)' 
      }}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Layers size={13} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Select Mutual Fund
            </h3>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
            {filteredFunds.length} Funds
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search fund name..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              onSearchChange(e.target.value);
            }}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Fund List Scrollable Area */}
      <div className="flex-1 overflow-y-auto divide-y max-h-[620px] scrollbar-thin" style={{ borderColor: 'var(--border-color)' }}>
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading verified funds...</span>
          </div>
        ) : filteredFunds.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">
            No mutual funds found matching your criteria.
          </div>
        ) : (
          filteredFunds.map((fund) => {
            const isSelected = String(fund.schemeCode) === String(selectedSchemeCode);
            const initials = (fund.amc || fund.schemeName || 'MF')
              .split(' ')
              .slice(0, 2)
              .map(w => w[0])
              .join('')
              .toUpperCase();

            return (
              <button
                key={fund.schemeCode}
                onClick={() => onSelectFund(fund)}
                className={`w-full text-left p-3 flex items-start gap-2.5 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-500/10 border-l-3 border-blue-500' 
                    : 'hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {/* Logo / Initials Icon */}
                <div 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}
                >
                  {initials}
                </div>

                {/* Fund Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-[var(--text-primary)]'
                      }`}
                      title={fund.schemeName}
                    >
                      {fund.schemeName}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-muted)]">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Direct · Growth
                    </span>
                    <span>•</span>
                    <span className="truncate">{fund.amc || 'Mutual Fund'}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {formatAum(fund.fundAumCr)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {fund.positionsCount || fund.totalHoldings || 0} stocks
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 size={15} className="text-blue-500 shrink-0 self-center" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
