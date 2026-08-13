import React from 'react';
import { MF_CATEGORIES, PRIMARY_TAB_TO_CAT_KEY } from '../../config/mutualFundCategories';
import { ChevronRight, Filter } from 'lucide-react';

export default function MfCategorySidebar({
  primaryCategory,
  activeMarketFilter,
  selectedSubCategory,
  onSelectSubCategory,
  fundCountsBySub = {}
}) {
  // Determine which category list to display based on active primary tab or market filter
  let catKey = 'equity';
  if (activeMarketFilter && activeMarketFilter !== 'all') {
    catKey = activeMarketFilter;
  } else if (primaryCategory && PRIMARY_TAB_TO_CAT_KEY[primaryCategory]) {
    catKey = PRIMARY_TAB_TO_CAT_KEY[primaryCategory];
  }

  const subCategories = MF_CATEGORIES[catKey] || MF_CATEGORIES.equity;
  const categoryHeaderTitle = catKey.toUpperCase() + ' CATEGORIES';

  return (
    <aside className="w-full lg:w-60 shrink-0 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 space-y-4 self-start lg:sticky lg:top-20 shadow-xl">
      {/* Category Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-indigo-400" />
          <h3 className="text-xs font-extrabold text-slate-200 tracking-wider">
            {categoryHeaderTitle}
          </h3>
        </div>
        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
          Screener
        </span>
      </div>

      {/* Subcategory List */}
      <nav className="space-y-1">
        {subCategories.map(sub => {
          const isActive = selectedSubCategory === sub.id;
          const count = fundCountsBySub[sub.id] ?? null;

          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubCategory(sub.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90'
              }`}
            >
              <span className="truncate flex items-center gap-2">
                <ChevronRight
                  size={12}
                  className={`transition-transform duration-150 ${
                    isActive ? 'text-white translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`}
                />
                {sub.label}
              </span>
              {count != null && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-indigo-900/60 text-indigo-200'
                      : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Summary Info */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between text-slate-300 font-semibold">
          <span>Ranking Engine:</span>
          <span className="text-emerald-400 font-mono text-[10px]">CAGR + Sharpe + 1Y</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Dynamic peer-group scoring. Top 3 schemes marked with ★.
        </p>
      </div>
    </aside>
  );
}
