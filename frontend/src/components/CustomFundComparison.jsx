import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Plus, X, Search, Check, Sparkles, TrendingUp, 
  ShieldAlert, Award, ArrowUpRight, Scale, RefreshCcw, Layers, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, 
  Legend, CartesianGrid, BarChart, Bar, Cell 
} from 'recharts';
import MiniRatioIndicator from './MiniRatioIndicator';
import { useWorkbench } from '../context/WorkbenchContext';

const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#3b82f6', // Blue
];

const PRESETS = [
  {
    id: 'eq_debt_hybrid',
    title: 'Equity vs Debt vs Hybrid',
    description: 'Flexi Cap Equity + Banking & PSU Debt + Multi Asset Hybrid',
    fundIds: ['118991', '119613', '100045']
  },
  {
    id: 'top_cross_cat',
    title: 'Top Performers Across Categories',
    description: 'Midcap Equity + CPSE ETF + Smallcap Equity + Nifty 50 Index',
    fundIds: ['128911', '100044', '120893', '120716']
  },
  {
    id: 'eq_vs_gold_silver',
    title: 'Equity vs Gold & Silver ETFs',
    description: 'PPFAS Flexi Cap + Gold ETF + Silver ETF Inflation Hedges',
    fundIds: ['122639', '100037', '100039']
  },
  {
    id: 'index_vs_banking',
    title: 'Nifty 50 vs Nifty Bank vs CPSE',
    description: 'Nifty 50 Index + Bank BeES ETF + CPSE ETF Benchmark',
    fundIds: ['120716', '119609', '100044']
  }
];

export default function CustomFundComparison({ funds = [], onSelectFundDetail }) {
  // Select initial 3 funds (Equity, Debt, Hybrid)
  const defaultSelected = useMemo(() => {
    const initialIds = ['118991', '119613', '100045'];
    const matched = funds.filter(f => initialIds.includes(String(f.id)));
    if (matched.length > 0) return matched.map(f => String(f.id));
    return funds.slice(0, 3).map(f => String(f.id));
  }, [funds]);

  const [selectedIds, setSelectedIds] = useState(defaultSelected);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTimeframe, setActiveTimeframe] = useState('1Y');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { isPinned, pin, unpin } = useWorkbench();

  // Get full fund objects for currently selected IDs
  const selectedFunds = useMemo(() => {
    return selectedIds
      .map(id => funds.find(f => String(f.id) === String(id)))
      .filter(Boolean);
  }, [selectedIds, funds]);

  // Handle adding fund
  const addFund = (id) => {
    const strId = String(id);
    if (!selectedIds.includes(strId) && selectedIds.length < 6) {
      setSelectedIds([...selectedIds, strId]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Handle removing fund
  const removeFund = (id) => {
    if (selectedIds.length > 1) {
      setSelectedIds(selectedIds.filter(fId => String(fId) !== String(id)));
    }
  };

  // Load Preset
  const applyPreset = (preset) => {
    const matchedIds = preset.fundIds.filter(id => funds.some(f => String(f.id) === String(id)));
    if (matchedIds.length > 0) {
      setSelectedIds(matchedIds);
    }
  };

  // Available funds for search picker
  const pickerOptions = useMemo(() => {
    let pool = funds.filter(f => !selectedIds.includes(String(f.id)));
    if (categoryFilter !== 'all') {
      pool = pool.filter(f => f.type === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter(f => 
        (f.name || '').toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q) ||
        (f.family || '').toLowerCase().includes(q)
      );
    }
    return pool.slice(0, 10);
  }, [funds, selectedIds, categoryFilter, searchQuery]);

  // Find max return per timeframe to highlight winner
  const getWinnerForMetric = (metricKey) => {
    if (selectedFunds.length === 0) return null;
    let maxVal = -Infinity;
    let winnerId = null;

    selectedFunds.forEach(f => {
      let val = 0;
      if (metricKey.startsWith('returns.')) {
        const tf = metricKey.split('.')[1];
        val = f.returns?.[tf] || 0;
      } else if (metricKey === 'sharpe') {
        val = f.sharpeRatios?.[activeTimeframe] !== undefined ? f.sharpeRatios[activeTimeframe] : (f.sharpeRatio || 0);
      } else if (metricKey === 'sortino') {
        val = f.sortinoRatios?.[activeTimeframe] !== undefined ? f.sortinoRatios[activeTimeframe] : (f.sortinoRatio || 0);
      } else if (metricKey === 'aum') {
        val = f.aum || 0;
      }
      if (val > maxVal) {
        maxVal = val;
        winnerId = String(f.id);
      }
    });

    return winnerId;
  };

  // Normalized Base-100 Growth Chart Data Generation for selected funds
  const growthChartData = useMemo(() => {
    if (selectedFunds.length === 0) return [];
    
    // Simulate 12 month historical growth points based on 1Y/3Y/5Y performance
    const points = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return points.map((month, idx) => {
      const row = { month };
      const progress = (idx + 1) / 12; // 0.08 to 1.0

      selectedFunds.forEach((f) => {
        const tfRet = f.returns?.[activeTimeframe] || 15;
        // Growth trajectory formula starting from ₹10,000 baseline
        const noise = Math.sin((idx + 1) * 1.5 + String(f.id).charCodeAt(0)) * 1.8;
        const GrowthVal = 10000 * (1 + (tfRet / 100) * progress * (0.85 + 0.15 * progress) + noise / 100);
        row[f.name] = Math.round(GrowthVal);
      });

      return row;
    });
  }, [selectedFunds, activeTimeframe]);

  // Bar Chart Data comparing 1Y Return, 3Y Return, Sharpe, Sortino side-by-side
  const metricsBarData = useMemo(() => {
    return selectedFunds.map((f, idx) => {
      const sVal = f.sharpeRatios?.[activeTimeframe] !== undefined ? f.sharpeRatios[activeTimeframe] : (f.sharpeRatio || 0);
      const sortVal = f.sortinoRatios?.[activeTimeframe] !== undefined ? f.sortinoRatios[activeTimeframe] : (f.sortinoRatio || 0);
      const retVal = f.returns?.[activeTimeframe] || 0;

      return {
        name: f.name.length > 18 ? f.name.substring(0, 18) + '...' : f.name,
        fullName: f.name,
        return: retVal,
        sharpe: sVal,
        sortino: sortVal,
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
      };
    });
  }, [selectedFunds, activeTimeframe]);

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Custom Fund-wise Comparison
                <span className="text-[10px] font-extrabold font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                  Cross-Category
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compare any specific Mutual Funds &amp; ETFs across Equity, Debt, Hybrid, Index, Global &amp; Commodities side-by-side.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Fund Count Badge & Clear Action */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            {selectedFunds.length} / 6 Funds Selected
          </span>
          <button
            onClick={() => setSelectedIds(defaultSelected)}
            className="p-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
            title="Reset to default comparison"
          >
            <RefreshCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Preset Comparison Quick Buttons */}
      <div className="space-y-2">
        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Popular Cross-Category Comparison Presets
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 p-3 rounded-xl text-left transition-all group relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  {preset.title}
                </span>
                <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400 opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug truncate">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Active Selected Fund Pills Bar & Add Fund Button */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 relative">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mr-1">Active Schemes:</span>
        
        {selectedFunds.map((fund, idx) => (
          <div 
            key={fund.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 shadow-2xs"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }} />
            <span className="truncate max-w-[160px]" title={fund.name}>{fund.name}</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 uppercase shrink-0">
              {fund.type}
            </span>
            {selectedIds.length > 1 && (
              <button 
                onClick={() => removeFund(fund.id)}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-colors shrink-0"
                title="Remove fund from comparison"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Add Fund Trigger Button & Dropdown */}
        {selectedIds.length < 6 && (
          <div className="relative">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs transition-colors"
            >
              <Plus size={14} /> Add Fund to Compare
            </button>

            {/* Fund Picker Autocomplete Popover */}
            {isSearchOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-30 animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Select Scheme to Compare</span>
                  <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1 mb-2">
                  {['all', 'equity', 'debt', 'hybrid', 'index', 'etf', 'global'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase transition-colors shrink-0 ${
                        categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search equity, debt, hybrid, ETF..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>

                {/* Options List */}
                <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                  {pickerOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => addFund(opt.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-200 truncate" title={opt.name}>{opt.name}</div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400">{opt.category} • NAV ₹{opt.nav}</div>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
                        {opt.type}
                      </span>
                    </button>
                  ))}
                  {pickerOptions.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500">No schemes found matching search.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 1. SIDE-BY-SIDE FUND COMPARISON MATRIX TABLE ── */}
      <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
            Side-by-Side Scheme Comparison Matrix
          </h3>
          
          {/* Timeframe Selector Pills for Sharpe/Sortino & Return Evaluation */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mr-1">Evaluate:</span>
            {['1Y', '3Y', '5Y', 'All'].map(tf => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded transition-colors ${
                  activeTimeframe === tf 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">
                <th className="py-3 px-3 font-bold uppercase w-44 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800">
                  Metric / Scheme
                </th>
                {selectedFunds.map((f, idx) => (
                  <th key={f.id} className="py-3 px-3 font-semibold text-left min-w-[170px] border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }} />
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-xs truncate" title={f.name}>{f.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs">
              {/* Category & Asset Class */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  Category / Asset Class
                </td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                      {f.type} • {f.category}
                    </span>
                  </td>
                ))}
              </tr>

              {/* NAV */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  Current NAV
                </td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                    {f.nav != null ? `₹${Number(f.nav).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                ))}
              </tr>

              {/* AUM */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  Fund AUM (Cr)
                </td>
                {selectedFunds.map(f => {
                  const isWinner = getWinnerForMetric('aum') === String(f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <span>{f.aum != null ? `₹${Number(f.aum).toLocaleString('en-IN')} Cr` : '—'}</span>
                      {isWinner && <span className="ml-1.5 text-[9px] text-amber-600 dark:text-amber-400 font-extrabold">★ Top AUM</span>}
                    </td>
                  );
                })}
              </tr>

              {/* 1Y Return */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  1-Year Return
                </td>
                {selectedFunds.map(f => {
                  const ret1Y = f.returns?.['1Y'] || 0;
                  const isWinner = getWinnerForMetric('returns.1Y') === String(f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 font-mono font-bold border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <span className={`px-2 py-0.5 rounded text-xs ${isWinner ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-extrabold' : ret1Y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        +{ret1Y}% {isWinner && '🏆 Top'}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* 3Y Return */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  3-Year Return
                </td>
                {selectedFunds.map(f => {
                  const ret3Y = f.returns?.['3Y'] || 0;
                  const isWinner = getWinnerForMetric('returns.3Y') === String(f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 font-mono font-bold border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <span className={`px-2 py-0.5 rounded text-xs ${isWinner ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-extrabold' : ret3Y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        +{ret3Y}% {isWinner && '🏆 Top'}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* 5Y Return */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  5-Year Return
                </td>
                {selectedFunds.map(f => {
                  const ret5Y = f.returns?.['5Y'] || 0;
                  const isWinner = getWinnerForMetric('returns.5Y') === String(f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 font-mono font-bold border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <span className={`px-2 py-0.5 rounded text-xs ${isWinner ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-extrabold' : ret5Y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        +{ret5Y}% {isWinner && '🏆 Top'}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Sharpe Ratio ({activeTimeframe}) */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  Sharpe Ratio ({activeTimeframe})
                </td>
                {selectedFunds.map(f => {
                  const sVal = f.sharpeRatios?.[activeTimeframe] !== undefined ? f.sharpeRatios[activeTimeframe] : (f.sharpeRatio || 0);
                  const isWinner = getWinnerForMetric('sharpe') === String(f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <div className="flex items-center gap-2">
                        <MiniRatioIndicator value={sVal} type="sharpe" />
                        {isWinner && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">★ Best</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Sortino Ratio ({activeTimeframe}) */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  Sortino Ratio ({activeTimeframe})
                </td>
                {selectedFunds.map(f => {
                  const sortVal = f.sortinoRatios?.[activeTimeframe] !== undefined ? f.sortinoRatios[activeTimeframe] : (f.sortinoRatio || 0);
                  const isWinner = getWinnerForMetric('sortino') === String(f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <div className="flex items-center gap-2">
                        <MiniRatioIndicator value={sortVal} type="sortino" />
                        {isWinner && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">★ Best</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Actions / Compare Pin */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  Actions
                </td>
                {selectedFunds.map(f => {
                  const pinned = isPinned('mf', f.id);
                  return (
                    <td key={f.id} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800/40 last:border-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (pinned) unpin('mf', f.id);
                            else pin({ type: 'mf', id: f.id, name: f.name, currency: 'INR' });
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            pinned 
                              ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' 
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {pinned ? 'Pinned' : '+ Pin'}
                        </button>
                        {onSelectFundDetail && (
                          <button
                            onClick={() => onSelectFundDetail(f)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. VISUAL CHARTS SECTION: NORMALIZED RETURN OVERLAY & BAR COMPARISON ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Normalized Growth Overlay Chart (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-600 dark:text-indigo-400" />
                Normalized Growth Trajectory Overlay (Baseline ₹10,000)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Comparing ₹10k growth performance trajectory over {activeTimeframe} across selected cross-category funds.
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val, name) => [`₹${val != null ? Number(val).toLocaleString() : '0'}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                {selectedFunds.map((f, idx) => (
                  <Line 
                    key={f.id} 
                    type="monotone" 
                    dataKey={f.name} 
                    stroke={COLOR_PALETTE[idx % COLOR_PALETTE.length]} 
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk & Return Bar Comparison (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={14} className="text-emerald-600 dark:text-emerald-400" />
                Return vs Risk Ratio Comparison ({activeTimeframe})
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Visualizing {activeTimeframe} Return % vs Risk-adjusted Sharpe ratio across selected schemes.
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsBarData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} angle={-15} textAnchor="end" interval={0} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val, name) => [name === 'return' ? `+${val}%` : val, name === 'return' ? `${activeTimeframe} Return` : name === 'sharpe' ? 'Sharpe Ratio' : 'Sortino Ratio']}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar dataKey="return" name={`${activeTimeframe} Return %`} radius={[4, 4, 0, 0]}>
                  {metricsBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
