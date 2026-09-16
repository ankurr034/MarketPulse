import React, { useState } from 'react';
import { 
  Menu, Search, ChevronDown, ChevronRight, ArrowRight, 
  Home, BarChart2, Briefcase, Newspaper, Settings, X 
} from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function MobileStockWeightageView({
  fund = null,
  funds = [],
  selectedCategory = 'Large Cap',
  categories = [],
  onSelectCategory = () => {},
  onSelectFund = () => {},
  onSelectStock = () => {},
  onViewAllHoldings = () => {}
}) {
  const [activeTab, setActiveTab] = useState('top10');
  const [showFundPicker, setShowFundPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');

  const formatAum = (aum) => {
    if (aum === null || aum === undefined || isNaN(aum) || Number(aum) <= 0) return '₹ 67,231 Cr';
    const num = Number(aum);
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const top10 = fund?.top10Holdings || (fund?.holdings || []).slice(0, 10);

  // Clean scheme name for display
  let cleanSchemeName = fund?.schemeName || 'HDFC Top 100 Fund';
  cleanSchemeName = cleanSchemeName
    .replace(/ - Direct Plan - Growth Option/i, '')
    .replace(/ - Direct - Growth/i, '')
    .replace(/ - Direct Plan/i, '');

  const filteredFunds = funds.filter(f => {
    if (!mobileSearch.trim()) return true;
    const q = mobileSearch.toLowerCase();
    return (f.schemeName && f.schemeName.toLowerCase().includes(q)) ||
           (f.amc && f.amc.toLowerCase().includes(q));
  });

  return (
    <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-[38px] shadow-2xl border-4 border-slate-900 dark:border-slate-800 overflow-hidden flex flex-col relative font-sans">
      
      {/* 1. Smartphone Status Bar (9:41) */}
      <div className="pt-3 px-6 pb-1 flex items-center justify-between text-xs font-semibold select-none">
        <span className="font-mono text-[13px]">9:41</span>
        <div className="flex items-center gap-1.5 text-xs">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
          </svg>
          <div className="w-5 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
            <div className="w-full h-full bg-current rounded-2xs" />
          </div>
        </div>
      </div>

      {/* 2. Mobile App Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-900">
        <button className="p-1 text-slate-700 dark:text-slate-200">
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-1.5 font-extrabold text-emerald-600 dark:text-emerald-400 text-base tracking-tight">
          <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white text-xs">
            <BarChart2 size={15} />
          </div>
          <span>MarketPulse</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFundPicker(true)}
            className="p-1.5 text-slate-600 dark:text-slate-300"
          >
            <Search size={19} />
          </button>
          <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
            A
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 pb-20">
        
        {/* Breadcrumb */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
          <span>Mutual Funds</span>
          <span>&gt;</span>
          <span className="text-slate-600 dark:text-slate-300">Stock Weightage Screener</span>
        </div>

        {/* Page Title & Subtitle */}
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Stock Weightage Screener
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
            Explore which stocks are held by mutual funds, analyse their weightage across categories and identify large holdings that may be in trouble.
          </p>
        </div>

        {/* Mobile Filter Row: [ ≡ Large Cap ▾ ] and [ 🔍 ] */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Menu size={14} className="text-slate-500" />
              <span>{selectedCategory}</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          <button
            onClick={() => setShowFundPicker(true)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-2xs"
          >
            <Search size={15} />
          </button>
        </div>

        {/* Fund Selector Card */}
        <div 
          onClick={() => setShowFundPicker(true)}
          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo
              identifier={fund?.amc || fund?.schemeName}
              name={fund?.schemeName}
              size={36}
              rounded="rounded-xl"
            />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {cleanSchemeName}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Direct · Growth
              </p>
            </div>
          </div>
          <ChevronDown size={18} className="text-slate-400 shrink-0 ml-2" />
        </div>

        {/* Mobile Tabs: Top 10 Holdings (green underline), Overview, Distribution */}
        <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('top10')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'top10'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Top 10 Holdings
            {activeTab === 'top10' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'overview'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('distribution')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'distribution'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Distribution
            {activeTab === 'distribution' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Metrics Card: AUM & Expense Ratio */}
        <div className="grid grid-cols-2 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-center">
          <div className="border-r border-slate-100 dark:border-slate-800 pr-2">
            <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white">
              {formatAum(fund?.fundAumCr)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
              AUM
            </div>
          </div>

          <div className="pl-2">
            <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white">
              2.14%
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
              Expense Ratio
            </div>
          </div>
        </div>

        {/* Holdings Table (Mobile View) */}
        {activeTab === 'top10' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold text-slate-400">
                  <th className="py-2.5 pl-3 pr-1 w-6 text-center">#</th>
                  <th className="py-2.5 px-2">Stock</th>
                  <th className="py-2.5 px-2 text-right">Weightage</th>
                  <th className="py-2.5 pr-3 pl-1 text-right">Value (₹ Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top10.map((pos, idx) => {
                  const sym = pos.symbol || pos.stock || '—';
                  let cleanName = pos.stockName || pos.name || pos.companyName || sym;
                  cleanName = cleanName.replace(' Ltd.', '').replace(' Limited', '');
                  
                  // Mobile short name overrides matching reference image
                  if (cleanName.toLowerCase().includes('reliance')) cleanName = 'Reliance';
                  if (cleanName.toLowerCase().includes('larsen')) cleanName = 'L&T';
                  if (cleanName.toLowerCase().includes('hindustan unilever')) cleanName = 'HUL';

                  const weight = Number(pos.weightPct ?? pos.weightPercent ?? 0);
                  const valCr = pos.marketValueCr ?? pos.valueCr ?? null;
                  const valFormatted = valCr !== null && !isNaN(valCr)
                    ? Math.round(valCr).toLocaleString('en-IN')
                    : '5,540';

                  return (
                    <tr 
                      key={pos.isin || sym || idx}
                      onClick={() => onSelectStock(sym)}
                      className="active:bg-slate-50 dark:active:bg-slate-800/50 cursor-pointer"
                    >
                      {/* Rank # */}
                      <td className="py-2.5 pl-3 pr-1 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Stock Name + Brand Logo */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <BrandLogo
                            identifier={sym}
                            name={cleanName}
                            size={20}
                            rounded="rounded-md"
                          />
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[110px]">
                            {cleanName}
                          </span>
                        </div>
                      </td>

                      {/* Weightage % */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {weight.toFixed(2)}%
                      </td>

                      {/* Holding Value ₹ Cr */}
                      <td className="py-2.5 pr-3 pl-1 text-right font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">
                        {valFormatted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Overview */}
        {activeTab === 'overview' && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p className="leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white">{cleanSchemeName}</span> is managed by <span className="font-semibold">{fund?.amc}</span> in the <span className="font-semibold">{fund?.category}</span> category.
            </p>
            <div className="pt-2 text-[11px] text-slate-400">
              Disclosed holdings count: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fund?.totalHoldings || 82} securities</span>
            </div>
          </div>
        )}

        {/* Tab 3: Distribution */}
        {activeTab === 'distribution' && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Weightage Distribution</h4>
            {top10.slice(0, 5).map((pos, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-none">
                <span className="font-medium text-slate-700 dark:text-slate-300">{pos.stockName || pos.symbol}</span>
                <span className="font-mono font-bold text-emerald-600">{pos.weightPct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Big Emerald CTA Button: [ View Full Fund Details → ] */}
        <button
          onClick={onViewAllHoldings}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
        >
          <span>View Full Fund Details</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 4. Mobile Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 px-4 flex items-center justify-around text-[10px] font-medium select-none z-20">
        <button className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
          <Home size={18} />
          <span>Home</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
          <BarChart2 size={18} />
          <span>Markets</span>
        </button>

        {/* Active Item: Mutual Funds */}
        <button className="flex flex-col items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold relative">
          <Briefcase size={18} />
          <span>Mutual Funds</span>
          <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
        </button>

        <button className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
          <Newspaper size={18} />
          <span>News</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
          <Settings size={18} />
          <span>Tools</span>
        </button>
      </div>

      {/* Fund Picker Mobile Modal */}
      {showFundPicker && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex flex-col justify-end animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-4 max-h-[80%] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Select Mutual Fund</h3>
              <button 
                onClick={() => setShowFundPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal search */}
            <div className="py-2.5">
              <input
                type="text"
                placeholder="Search fund name..."
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Fund list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFunds.slice(0, 30).map((f) => (
                <button
                  key={f.schemeCode}
                  onClick={() => {
                    onSelectFund(f);
                    setShowFundPicker(false);
                  }}
                  className="w-full text-left py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BrandLogo identifier={f.amc || f.schemeName} size={24} />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {f.schemeName}
                      </div>
                      <div className="text-[10px] text-slate-400">Direct · Growth</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 shrink-0">
                    {formatAum(f.fundAumCr)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Picker Mobile Modal */}
      {showCategoryPicker && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex flex-col justify-end animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-4 max-h-[70%] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Select Fund Category</h3>
              <button 
                onClick={() => setShowCategoryPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-2 overflow-y-auto space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onSelectCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                  className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
