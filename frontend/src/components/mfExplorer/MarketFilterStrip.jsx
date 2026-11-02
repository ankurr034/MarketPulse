import React from 'react';
import { Pin } from 'lucide-react';
import { MARKET_FILTERS } from '../../config/mutualFundCategories';

export default function MarketFilterStrip({ 
  activeFilter, 
  onSelectFilter, 
  rankMode = 'aum', 
  onRankModeChange = null,
  isAllFundsMode = true,
  pinnedIds = [],
  onTogglePin = null
}) {
  const pinnedSet = new Set(pinnedIds || []);

  return (
    <div className="sticky top-14 sm:top-16 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-y border-slate-200 dark:border-slate-800/80 px-1.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 shadow-2xs overflow-x-auto no-scrollbar scrollbar-none flex-nowrap">
      
      {/* Horizontal Category / Fund Filters - Kept strictly in one single row on mobile with small font */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 py-0.5">
        {MARKET_FILTERS.map(filter => {
          const isActive = filter.id === 'all_funds'
            ? isAllFundsMode
            : filter.id === 'all'
              ? (!isAllFundsMode && (activeFilter === 'all' || !activeFilter))
              : (!isAllFundsMode && activeFilter === filter.id);
          const isPinned = pinnedSet.has(filter.id);

          return (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              className={`group px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10.5px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap border inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30 font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-400'
              }`}
            >
              <span>{filter.label}</span>

              {/* Pin indicator/action for non-all_funds */}
              {onTogglePin && filter.id !== 'all_funds' && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin({
                      id: filter.id,
                      label: filter.label,
                      isCategory: true
                    });
                  }}
                  className={`p-0.5 rounded transition-all cursor-pointer ${
                    isPinned
                      ? 'text-amber-400 dark:text-amber-300 opacity-100'
                      : 'opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-amber-500'
                  }`}
                  title={isPinned ? 'Unpin category' : 'Pin category to top'}
                >
                  <Pin size={10} className={isPinned ? 'fill-amber-400 text-amber-400' : ''} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
