import React from 'react';
import { MARKET_FILTERS } from '../../config/mutualFundCategories';

export default function MarketFilterStrip({ 
  activeFilter, 
  onSelectFilter, 
  rankMode = 'aum', 
  onRankModeChange = null,
  isAllFundsMode = false 
}) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      
      {/* Horizontal Market Filters */}
      <div className="flex items-center gap-1.5 min-w-max overflow-x-auto scrollbar-none py-0.5">
        <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider mr-2 flex items-center gap-1">
          MARKET FILTER:
        </span>
        {MARKET_FILTERS.map(filter => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Rank By selector (AUM vs Performance Composite) */}
      {onRankModeChange && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            RANK BY:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => onRankModeChange('aum')}
              className={`px-2.5 py-0.5 text-xs font-bold rounded transition-colors ${
                rankMode === 'aum'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              AUM ↓
            </button>
            <button
              onClick={() => onRankModeChange('performance')}
              className={`px-2.5 py-0.5 text-xs font-bold rounded transition-colors ${
                rankMode === 'performance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Performance (Composite)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
