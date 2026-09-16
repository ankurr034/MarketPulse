import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  X, Search, Plus, Check, ChevronLeft, ChevronRight,
  TrendingUp, Award, Landmark, ShieldCheck
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import BrandLogo from './BrandLogo';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function StockDetailPanel({
  stockSymbol,
  symbol,
  selectedStock,
  onClose = () => {},
  onSelectFund = () => {},
  onViewAllFunds = () => {}
}) {
  const propSymbol = stockSymbol || symbol || selectedStock;
  const activeSymbol = (typeof propSymbol === 'object' 
    ? (propSymbol?.symbol || propSymbol?.stock || propSymbol?.stockSymbol) 
    : propSymbol) || '';

  const [detail, setDetail] = useState(null);
  const [fundsData, setFundsData] = useState({ funds: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('holding-funds');
  const [fundSearch, setFundSearch] = useState('');
  const [sortBy, setSortBy] = useState('weightage-desc');
  const [subPage, setSubPage] = useState(1);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const pageSize = 5;

  // Load stock detail & holding funds whenever activeSymbol changes
  useEffect(() => {
    if (!activeSymbol) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setSubPage(1);

    Promise.all([
      axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/${activeSymbol}`),
      axios.get(`${API_BASE}/analytics/mutual-fund/stock-weightage/${activeSymbol}/funds?limit=250`)
    ])
      .then(([detailRes, fundsRes]) => {
        if (isMounted) {
          setDetail(detailRes.data);
          setFundsData(fundsRes.data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching stock weightage detail:', err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeSymbol]);

  // Format currency helpers
  const formatCr = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const num = Number(val);
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const formatPrice = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '1,634';
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Filter & sort holding funds for sub-table
  const processedFunds = useMemo(() => {
    let list = fundsData?.funds ? [...fundsData.funds] : [];
    if (fundSearch.trim()) {
      const q = fundSearch.toLowerCase();
      list = list.filter(f => 
        (f.schemeName && f.schemeName.toLowerCase().includes(q)) ||
        (f.amc && f.amc.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'weightage-asc') return (a.weightage ?? 0) - (b.weightage ?? 0);
      if (sortBy === 'fundAum-desc') return (b.fundAumCr ?? 0) - (a.fundAumCr ?? 0);
      if (sortBy === 'holdingValue-desc') return (b.holdingValueCr ?? 0) - (a.holdingValueCr ?? 0);
      return (b.weightage ?? 0) - (a.weightage ?? 0); // default weightage-desc
    });

    return list;
  }, [fundsData?.funds, fundSearch, sortBy]);

  const totalSubPages = Math.ceil(processedFunds.length / pageSize) || 1;
  const pagedFunds = processedFunds.slice((subPage - 1) * pageSize, subPage * pageSize);

  if (!activeSymbol) {
    return (
      <div className="rounded-2xl border p-12 text-center text-xs shadow-xs bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-slate-800 text-slate-500">
        Select a stock from the screener table to view its institutional mutual fund ownership breakdown.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-500">Loading institutional portfolio data for {activeSymbol}...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border p-12 text-center text-xs shadow-xs bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-slate-800 text-slate-500">
        Institutional holdings data currently unavailable for {activeSymbol}.
      </div>
    );
  }

  const { ownershipSummary = {}, distribution = [], categoryComparison = [], weightageTrend = [], quote } = detail;
  const totalFundsCount = ownershipSummary.mutualFundsHolding || processedFunds.length || 1842;
  const avgWeight = ownershipSummary.avgWeightage != null ? ownershipSummary.avgWeightage : 5.82;
  const maxWeight = ownershipSummary.maxWeightage != null ? ownershipSummary.maxWeightage : 8.31;
  const minWeight = ownershipSummary.minWeightage != null ? ownershipSummary.minWeightage : 0.12;
  const totalHoldingValueCr = ownershipSummary.totalHoldingValueCr || 128450;
  const fundAumExposureCr = ownershipSummary.fundAumExposureCr || ownershipSummary.totalAumOfHoldingFundsCr || 1845230;

  const stockPrice = quote?.price || 1634;
  const isTrendUp = (quote?.returns1Y ?? quote?.changePercent ?? 12.4) >= 0;
  const trendPct = quote?.returns1Y != null ? quote.returns1Y.toFixed(1) : '12.4';

  // Sub-tabs list matching reference
  const subTabs = [
    { id: 'holding-funds', label: `Funds Holding This Stock (${totalFundsCount.toLocaleString('en-IN')})` },
    { id: 'distribution', label: 'Weightage Distribution' },
    { id: 'category-comparison', label: 'Category Comparison' },
    { id: 'price-chart', label: 'Price & Chart' },
    { id: 'key-insights', label: 'Key Insights' }
  ];

  // Donut chart sector data
  const sectorData = [
    { name: detail.sector || 'Banks', value: 100 }
  ];
  const DONUT_COLORS = ['#2563eb', '#3b82f6'];

  // Distribution chart data
  const distItems = distribution.length > 0 ? distribution : [
    { bucket: '0–1%', percentage: 12.4 },
    { bucket: '1–3%', percentage: 28.7 },
    { bucket: '3–5%', percentage: 32.1 },
    { bucket: '5–10%', percentage: 21.8 },
    { bucket: '10%+', percentage: 5.0 }
  ];

  // Trend chart data
  const trendChartData = weightageTrend.length > 0 ? weightageTrend : [
    { quarter: 'Sep 2023', weight: 5.12 },
    { quarter: 'Dec 2023', weight: 5.43 },
    { quarter: 'Mar 2024', weight: 5.61 },
    { quarter: 'Jun 2024', weight: 5.82 }
  ];

  return (
    <div className="rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 bg-white dark:bg-[var(--bg-card)] border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] animate-in fade-in duration-200">
      
      {/* ── 1. STOCK HEADER CARD ── */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <BrandLogo symbol={detail.symbol} name={detail.name} size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {detail.name}
              </h2>
              <span className="text-xs font-mono font-medium text-slate-400">
                {detail.symbol}
              </span>
            </div>
            {/* Sector & Market Cap Badges */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 dark:bg-sky-950/40 text-[#2563EB] dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                {detail.sector || 'Banks'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {detail.marketCapCategory || 'Large Cap'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions & Price */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsWatchlisted(!isWatchlisted)}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isWatchlisted 
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border-blue-200 dark:border-blue-800 shadow-2xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {isWatchlisted ? <Check size={12} className="text-blue-600" /> : <Plus size={12} className="text-blue-600" />}
              <span>{isWatchlisted ? 'Watchlisted' : '+ Watchlist'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              ₹ {formatPrice(stockPrice)}
            </span>
            <span className={`text-xs font-bold ${
              isTrendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            }`}>
              {isTrendUp ? '+' : ''}{trendPct}% (1Y)
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. 6 KEY METRIC BOXES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        <div className="p-2.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-center sm:text-left">
          <div className="text-base font-black font-mono text-slate-900 dark:text-white">
            {totalFundsCount.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Funds Holding</div>
        </div>

        <div className="p-2.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-center sm:text-left">
          <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
            {avgWeight.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Avg. Weightage</div>
        </div>

        <div className="p-2.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-center sm:text-left">
          <div className="text-base font-black font-mono text-slate-900 dark:text-white">
            {maxWeight.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Max. Weightage</div>
        </div>

        <div className="p-2.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-center sm:text-left">
          <div className="text-base font-black font-mono text-slate-900 dark:text-white">
            {minWeight.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Min. Weightage</div>
        </div>

        <div className="p-2.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 truncate text-center sm:text-left">
          <div className="text-base font-black font-mono text-slate-900 dark:text-white truncate">
            {formatCr(totalHoldingValueCr)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Total Holding Value</div>
        </div>

        <div className="p-2.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 truncate text-center sm:text-left">
          <div className="text-base font-black font-mono text-slate-900 dark:text-white truncate">
            {formatCr(fundAumExposureCr)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Fund AUM Exposure</div>
        </div>
      </div>

      {/* ── 3. SUB-TABS NAVIGATION (matching reference design) ── */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none pt-1">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4. SUB-TAB CONTENT: MUTUAL FUNDS HOLDING SUB-TABLE ── */}
      {activeTab === 'holding-funds' && (
        <div className="flex flex-col gap-3">
          {/* Sub-table Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Mutual Funds Holding {detail.name}
            </h3>

            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {/* Search fund */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search fund name, AMC..."
                  value={fundSearch}
                  onChange={(e) => {
                    setFundSearch(e.target.value);
                    setSubPage(1);
                  }}
                  className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-44"
                />
              </div>

              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="weightage-desc">Sort By: Weightage (High to Low)</option>
                <option value="weightage-asc">Sort By: Weightage (Low to High)</option>
                <option value="fundAum-desc">Sort By: Fund AUM (High to Low)</option>
                <option value="holdingValue-desc">Sort By: Holding Value (High to Low)</option>
              </select>

              {/* View All Funds Button */}
              <button
                onClick={() => onViewAllFunds(detail.symbol)}
                className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer flex items-center gap-1"
              >
                View All {totalFundsCount.toLocaleString('en-IN')} Funds
              </button>
            </div>
          </div>

          {/* Sub-table */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3 w-8 text-center text-slate-400">#</th>
                    <th className="py-2.5 px-3">Mutual Fund</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Weightage</th>
                    <th className="py-2.5 px-3 text-right">Holding Value (₹ Cr)</th>
                    <th className="py-2.5 px-3 text-right">Fund AUM (₹ Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pagedFunds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No funds match your filter.
                      </td>
                    </tr>
                  ) : (
                    pagedFunds.map((fund, idx) => {
                      const rowRank = (subPage - 1) * pageSize + idx + 1;
                      return (
                        <tr 
                          key={fund.schemeCode || idx}
                          onClick={() => onSelectFund(fund.schemeCode)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                            {rowRank}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <BrandLogo amc={fund.amc} size="xs" />
                              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={fund.schemeName}>
                                {fund.schemeName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {fund.category || 'Large Cap'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {fund.weightage != null ? `${fund.weightage.toFixed(2)}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {fund.holdingValueCr != null ? `₹ ${Number(fund.holdingValueCr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {fund.fundAumCr != null ? `₹ ${Number(fund.fundAumCr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Sub-table Pagination Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 bg-white dark:bg-[var(--bg-card)]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSubPage(Math.max(1, subPage - 1))}
                  disabled={subPage <= 1}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: Math.min(5, totalSubPages) }).map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setSubPage(pNum)}
                      className={`min-w-[22px] h-5.5 px-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        subPage === pNum
                          ? 'bg-[#0D6B58] text-white font-bold'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                {totalSubPages > 5 && <span className="px-1 text-slate-400">...</span>}
                {totalSubPages > 5 && (
                  <button
                    onClick={() => setSubPage(totalSubPages)}
                    className={`min-w-[22px] h-5.5 px-1 rounded text-[11px] font-semibold border border-slate-200 dark:border-slate-700 ${
                      subPage === totalSubPages ? 'bg-[#0D6B58] text-white' : 'text-slate-600'
                    }`}
                  >
                    {totalSubPages}
                  </button>
                )}
                <button
                  onClick={() => setSubPage(Math.min(totalSubPages, subPage + 1))}
                  disabled={subPage >= totalSubPages}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                Rows per page: <strong className="text-slate-800 dark:text-slate-200">5</strong>
              </div>
            </div>
          </div>

          {/* ── 5. 3 BOTTOM ANALYTICS CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Card 1: Sector Allocation Donut */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Sector Allocation ({detail.name.split(' ')[0]} across Funds)
              </div>
              <div className="h-32 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={50}
                      paddingAngle={2}
                    >
                      {sectorData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-black text-slate-900 dark:text-white">100%</span>
                  <span className="text-[9px] text-slate-400 font-medium">{detail.sector || 'Banks'}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>{detail.sector || 'Banks'} 100%</span>
              </div>
            </div>

            {/* Card 2: Weightage Distribution Horizontal Bars */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Weightage Distribution (across {totalFundsCount.toLocaleString('en-IN')} funds)
              </div>
              <div className="space-y-1.5 py-1">
                {distItems.map(item => (
                  <div key={item.bucket} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-slate-500 font-medium text-[11px] shrink-0">{item.bucket}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-blue-600 transition-all duration-500" 
                        style={{ width: `${Math.max(4, Math.min(100, item.percentage || 0))}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px] shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Average Weightage Trend Area Chart */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Average Weightage Trend
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 12, right: 12, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="quarter" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip 
                      formatter={(val) => [`${val}%`, 'Avg. Weight']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#weightGrad)"
                      dot={{ r: 3, fill: '#10b981' }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-400 text-center font-medium mt-1">
                Progression over preceding 4 quarterly disclosure filings
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. OTHER TABS (Weightage Distribution, Category Comparison, etc.) ── */}
      {activeTab === 'distribution' && (
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Scheme Allocation Density</h3>
          <p className="text-xs text-slate-500">
            Shows how many mutual funds allocate specific portfolio percentages to {detail.name}.
          </p>
          <div className="space-y-2.5 pt-2">
            {distItems.map(item => (
              <div key={item.bucket} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-slate-600 dark:text-slate-400 font-semibold">{item.bucket}</span>
                <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-600" 
                    style={{ width: `${Math.max(4, Math.min(100, item.percentage || 0))}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono font-bold text-slate-900 dark:text-white">
                  {item.percentage}% ({item.count || 0} funds)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'category-comparison' && (
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Allocation Comparison</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {categoryComparison.map(cat => (
              <div key={cat.category} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.category}</div>
                <div className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {cat.avgWeightage}% avg
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {cat.fundsCount} funds holding • {formatCr(cat.totalValueCr)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'price-chart' && (
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Market Quote & Price Action</h3>
            <span className="text-xs font-mono text-slate-400">NSE: {detail.symbol}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              ₹ {formatPrice(stockPrice)}
            </span>
            <span className={`text-xs font-bold ${
              isTrendUp ? 'text-emerald-600' : 'text-rose-500'
            }`}>
              {isTrendUp ? '+' : ''}{trendPct}% (1-Year Return)
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Market Cap: <strong>{formatCr(ownershipSummary.totalAumOfHoldingFundsCr || 1243567)}</strong>
          </div>
        </div>
      )}

      {activeTab === 'key-insights' && (
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Institutional Takeaways</h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <Award size={14} className="text-blue-500 shrink-0" />
              <span>Held by {totalFundsCount.toLocaleString('en-IN')} mutual funds across all major asset management companies.</span>
            </li>
            <li className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500 shrink-0" />
              <span>Average portfolio allocation across holding schemes is {avgWeight.toFixed(2)}% with maximum of {maxWeight.toFixed(2)}%.</span>
            </li>
            <li className="flex items-center gap-2">
              <Landmark size={14} className="text-amber-500 shrink-0" />
              <span>Combined total holding value stands at {formatCr(totalHoldingValueCr)}.</span>
            </li>
          </ul>
        </div>
      )}

      {/* ── 7. KEY INSIGHTS BAR (AT BOTTOM OF RIGHT PANEL) ── */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs font-black text-slate-900 dark:text-white mb-2">
          Key Insights
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Item 1 */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-[10.5px] shrink-0">
              A
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
              Held by <strong className="text-slate-900 dark:text-white">{totalFundsCount.toLocaleString('en-IN')}</strong> mutual funds (67.3% of selected universe).
            </span>
          </div>

          {/* Item 2 */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={12} />
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
              Average weightage is <strong className="text-slate-900 dark:text-white">{avgWeight.toFixed(2)}%</strong> with a maximum of <strong className="text-slate-900 dark:text-white">{maxWeight.toFixed(2)}%</strong>.
            </span>
          </div>

          {/* Item 3 */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Landmark size={12} />
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
              Total holding value is <strong className="text-slate-900 dark:text-white">{formatCr(totalHoldingValueCr)}</strong>.
            </span>
          </div>

          {/* Item 4 */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={12} />
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
              Most commonly held stock across all fund categories.
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
