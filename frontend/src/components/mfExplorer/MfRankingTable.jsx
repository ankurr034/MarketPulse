import React, { useState, useMemo } from 'react';
import SparklineChart from '../SparklineChart';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Info, Star, 
  Network, FileText, Banknote, LineChart, GitMerge, Globe, Coins, LayoutGrid, 
  Layers, PieChart, Sparkles, Target, Activity, TrendingUp, Award, Shield 
} from 'lucide-react';
import { getDisplayedMfRank } from '../../utils/rankMutualFunds';

// Star Hover Tooltip Component with explicit hover state & non-clipping position
function StarHoverTooltip({ fund, isStarred, categorySharpeRange, categorySortinoRange }) {
  const [isHovered, setIsHovered] = useState(false);

  const showStar = isStarred === true || fund?.isStarred === true || fund?.starred === true;

  if (!showStar) return null;

  return (
    <div 
      className="relative inline-flex items-center shrink-0 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" title="Starred Fund" />
      {isHovered && (
        <div className="absolute left-6 top-0 flex flex-col gap-2.5 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl text-xs w-[300px] z-50 pointer-events-none whitespace-normal">
          {/* Top Message with Star Icon */}
          <div className="flex items-start gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Star size={14} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-snug font-medium text-slate-700 dark:text-slate-200">
              This fund is stable &amp; has consistent growth / low downside risk compared to other stocks
            </p>
          </div>

          {/* Sharpe Ratio Section */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Sharpe Ratio
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Fund: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{fund.sharpeRatio != null ? Number(fund.sharpeRatio).toFixed(2) : '—'}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                Range: {categorySharpeRange?.min != null && categorySharpeRange?.max != null
                  ? `${categorySharpeRange.min.toFixed(2)} – ${categorySharpeRange.max.toFixed(2)}`
                  : '—'}
              </span>
            </div>
            {categorySharpeRange?.min != null && categorySharpeRange?.max != null && categorySharpeRange.max > categorySharpeRange.min && fund.sharpeRatio != null ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative mt-1">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((Number(fund.sharpeRatio) - categorySharpeRange.min) / (categorySharpeRange.max - categorySharpeRange.min)) * 100))}%`
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Sortino Ratio Section */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Sortino Ratio
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Fund: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{fund.sortinoRatio != null ? Number(fund.sortinoRatio).toFixed(2) : '—'}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                Range: {categorySortinoRange?.min != null && categorySortinoRange?.max != null
                  ? `${categorySortinoRange.min.toFixed(2)} – ${categorySortinoRange.max.toFixed(2)}`
                  : '—'}
              </span>
            </div>
            {categorySortinoRange?.min != null && categorySortinoRange?.max != null && categorySortinoRange.max > categorySortinoRange.min && fund.sortinoRatio != null ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative mt-1">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((Number(fund.sortinoRatio) - categorySortinoRange.min) / (categorySortinoRange.max - categorySortinoRange.min)) * 100))}%`
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Bottom Explanatory Text */}
          <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono border-t border-slate-100 dark:border-slate-800">
            Range is based on the funds shown in this category.
          </div>

          {/* As-Of Dates */}
          {(fund.navAsOfDate || fund.navDate || fund.aumAsOfDate) && (
            <div className="pt-1.5 text-[9.5px] text-slate-500 dark:text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
              {(fund.navAsOfDate || fund.navDate) && (
                <div>NAV As of: <span className="font-semibold text-slate-700 dark:text-slate-200">{fund.navAsOfDate || fund.navDate}</span></div>
              )}
              {fund.aumAsOfDate && (
                <div>AUM As of: <span className="font-semibold text-slate-700 dark:text-slate-200">{fund.aumAsOfDate}</span></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * MfRankingTable
 * Full-width financial screener with 2-level Category Accordions matching reference design
 */
export default function MfRankingTable({
  funds = [],
  groupedCategories = null,
  isAllFundsMode = false,
  activeTimeframe = '1Y',
  rankMode = 'aum', // 'aum' | 'performance'
  onTimeframeChange,
  onSelectFund
}) {
  // Multi-column sorting state: array of up to 2 active sort criteria [{ field, order }]
  // sortCriteria[0] = Primary Sort Factor, sortCriteria[1] = Secondary Sort Factor
  const [sortCriteria, setSortCriteria] = useState([]);

  // Accordion collapsed states (Parent & Subcategory)
  const [collapsedParentCats, setCollapsedParentCats] = useState({});
  const [collapsedSubCats, setCollapsedSubCats] = useState({});
  const [categoryViewModes, setCategoryViewModes] = useState({});

  // Pagination state for All Funds mode
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleParentCollapse = (parentKey) => {
    setCollapsedParentCats(prev => ({
      ...prev,
      [parentKey]: !prev[parentKey]
    }));
  };

  const toggleSubCollapse = (subKey) => {
    setCollapsedSubCats(prev => ({
      ...prev,
      [subKey]: !prev[subKey]
    }));
  };

  const toggleCategoryViewMode = (subKey) => {
    setCategoryViewModes(prev => ({
      ...prev,
      [subKey]: prev[subKey] === 'all' ? 'top5' : 'all'
    }));
  };

  const getCategoryIcon = (name, isParent = false) => {
    const key = name.toLowerCase();
    if (isParent) {
      if (key === 'equity') return <Network size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'elss') return <FileText size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'debt') return <Banknote size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'index') return <LineChart size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'hybrid') return <GitMerge size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'global') return <Globe size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'commodities') return <Coins size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'sectors') return <LayoutGrid size={16} className="text-blue-600 dark:text-blue-400" />;
    }

    if (key.includes('large')) return <Layers size={14} className="text-blue-500" />;
    if (key.includes('mid')) return <PieChart size={14} className="text-blue-500" />;
    if (key.includes('small')) return <Sparkles size={14} className="text-blue-500" />;
    if (key.includes('flexi')) return <Target size={14} className="text-blue-500" />;
    if (key.includes('multi')) return <Activity size={14} className="text-blue-500" />;
    if (key.includes('value')) return <TrendingUp size={14} className="text-blue-500" />;
    if (key.includes('focused')) return <Award size={14} className="text-blue-500" />;
    if (key.includes('contra')) return <Shield size={14} className="text-blue-500" />;

    return <Layers size={14} className="text-blue-500 opacity-80" />;
  };

  // Multi-Sort 3-Click Cycle Handler:
  // 1st click = DESC (or ASC for name), 2nd click = ASC, 3rd click = Remove from multi-sort
  // Supports up to 2 active columns (Primary & Secondary). Selecting a 3rd column shifts out the oldest.
  const handleSort = (field) => {
    setSortCriteria(prev => {
      const existingIndex = prev.findIndex(c => c.field === field);
      const defaultOrder = field === 'name' ? 'asc' : 'desc';

      if (existingIndex !== -1) {
        const currentOrder = prev[existingIndex].order;
        if (currentOrder === 'desc') {
          const next = [...prev];
          next[existingIndex] = { field, order: 'asc' };
          return next;
        } else if (currentOrder === 'asc') {
          // 3rd click: remove from active sort criteria
          return prev.filter((_, idx) => idx !== existingIndex);
        } else {
          const next = [...prev];
          next[existingIndex] = { field, order: defaultOrder };
          return next;
        }
      } else {
        const newEntry = { field, order: defaultOrder };
        if (prev.length < 2) {
          return [...prev, newEntry];
        } else {
          // Max 2 columns: replace oldest (first), keep 2nd as primary, new entry as secondary
          return [prev[1], newEntry];
        }
      }
    });
  };

  // Helper formatting methods
  const formatAUM = (aum) => {
    if (aum == null || isNaN(aum) || Number(aum) <= 0) return '—';
    const num = Number(aum);
    if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} Lakh Cr`;
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const formatNAV = (nav) => {
    if (nav == null || isNaN(nav) || Number(nav) <= 0) return '—';
    return `₹ ${Number(nav).toFixed(2)}`;
  };

  const formatNavDate = (dateStr) => {
    if (!dateStr || dateStr === 'Data Unavailable') return 'Date unavailable';
    if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(m, 10) - 1] || m;
      return `${d} ${monthName} ${y}`;
    }
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(m, 10) - 1] || m;
      return `${d} ${monthName} ${y}`;
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[parsed.getUTCMonth()];
      const year = parsed.getUTCFullYear();
      return `${day} ${month} ${year}`;
    }
    return dateStr;
  };

  const formatPct = (val) => {
    if (val == null || isNaN(val)) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    const color = num > 0 
      ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
      : num < 0 
      ? 'text-rose-600 dark:text-rose-400 font-semibold' 
      : 'text-slate-500 dark:text-slate-400';
    return <span className={`font-mono text-xs ${color}`}>{sign}{num.toFixed(2)}%</span>;
  };

  const formatRatio = (val) => {
    if (val == null || isNaN(val)) return '—';
    return <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">{Number(val).toFixed(2)}</span>;
  };

  // Helper to extract clean numeric or string value for sorting
  const getFieldValue = (fund, field) => {
    if (!fund) return null;

    if (field === 'aum') {
      const val = fund.aum != null ? Number(fund.aum) : null;
      return val != null && !isNaN(val) && val > 0 ? val : null;
    }

    if (field === 'nav') {
      const val = fund.nav != null ? Number(fund.nav) : null;
      return val != null && !isNaN(val) && val > 0 ? val : null;
    }

    if (field === 'return_1W') {
      const val = fund.returns?.['1W'] ?? fund.oneWeekChangePct;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_1M') {
      const val = fund.returns?.['1M'] ?? fund.oneMonthChangePct;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_3M') {
      const val = fund.returns?.['3M'] ?? fund.threeMonthChangePct;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_6M') {
      const val = fund.returns?.['6M'] ?? fund.sixMonthChangePct;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_1Y') {
      const val = fund.returns?.['1Y'] ?? fund.oneYearChangePct ?? fund.oneYrReturn;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_3Y') {
      const val = fund.returns?.['3Y'] ?? fund.threeYearCagr;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_5Y') {
      const val = fund.returns?.['5Y'] ?? fund.fiveYearCagr;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'return_All') {
      const val = fund.returns?.['All'] ?? fund.inceptionCagr ?? fund.sinceInceptionReturn;
      return val != null && !isNaN(val) ? Number(val) : null;
    }

    if (field === 'sharpeRatio') {
      const val = fund.sharpeRatio != null ? Number(fund.sharpeRatio) : null;
      return val != null && !isNaN(val) ? val : null;
    }

    if (field === 'sortinoRatio') {
      const val = fund.sortinoRatio != null ? Number(fund.sortinoRatio) : null;
      return val != null && !isNaN(val) ? val : null;
    }

    if (field === 'name') {
      const n = fund.name || fund.schemeName;
      return n ? String(n).trim() : null;
    }

    return null;
  };

  // Two-Factor Multi-Column Sort Helper:
  // Evaluates Primary sort criterion first, then breaks ties using Secondary criterion.
  // Preserves exact original order when sortCriteria is empty; places nulls last on both desc & asc.
  const sortFundsList = (list) => {
    if (!list || list.length === 0) return [];
    if (!sortCriteria || sortCriteria.length === 0) return list;

    const copy = [...list];

    copy.sort((a, b) => {
      for (let i = 0; i < sortCriteria.length; i++) {
        const { field, order } = sortCriteria[i];
        const aVal = getFieldValue(a, field);
        const bVal = getFieldValue(b, field);

        if (aVal == null && bVal == null) continue;
        if (aVal == null) return 1; // nulls last
        if (bVal == null) return -1; // nulls last

        let diff = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          diff = order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          diff = order === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (diff !== 0) {
          return diff;
        }
      }
      return 0;
    });

    return copy;
  };

  // Compute AUM rank for all eligible funds in All Funds Mode
  const allRankedFunds = useMemo(() => {
    if (!funds || funds.length === 0) return [];
    const sorted = [...funds];

    if (rankMode === 'aum') {
      sorted.sort((a, b) => {
        if (a.indiaMfRank != null && b.indiaMfRank != null) return a.indiaMfRank - b.indiaMfRank;
        if (a.indiaMfRank != null) return -1;
        if (b.indiaMfRank != null) return 1;
        const aVal = (a.aumCr ?? a.aum) != null ? Number(a.aumCr ?? a.aum) : null;
        const bVal = (b.aumCr ?? b.aum) != null ? Number(b.aumCr ?? b.aum) : null;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return bVal - aVal;
      });
    } else {
      sorted.sort((a, b) => {
        const aVal = a.compositeScore != null ? Number(a.compositeScore) : null;
        const bVal = b.compositeScore != null ? Number(b.compositeScore) : null;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return bVal - aVal;
      });
    }

    let currentRank = 1;
    return sorted.map(f => {
      const canonicalRank = f.indiaMfRank ?? f.globalMfRank ?? f.rank;
      const rankNum = canonicalRank != null
        ? canonicalRank
        : (rankMode === 'aum' ? ((f.aumCr ?? f.aum) > 0 ? currentRank++ : null) : (f.compositeScore != null ? currentRank++ : null));
      return {
        ...f,
        calculatedRank: rankNum,
        indiaMfRank: rankNum,
        isStarred: f.isStarred === true,
        starred: f.isStarred === true || f.starred === true,
        isTop3: f.isStarred === true || f.isTop3 === true,
        isTopFund: f.isStarred === true || f.isTopFund === true
      };
    });
  }, [funds, rankMode]);

  // Paginated list for All Funds mode
  const paginatedAllFunds = useMemo(() => {
    const sorted = sortFundsList(allRankedFunds);
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [allRankedFunds, sortCriteria, currentPage, pageSize]);

  const totalPages = Math.ceil(allRankedFunds.length / pageSize) || 1;

  const renderSortHeader = (label, field, alignment = 'text-right') => {
    const sortIndex = sortCriteria.findIndex(c => c.field === field);
    const isSorted = sortIndex !== -1;
    const activeCriterion = isSorted ? sortCriteria[sortIndex] : null;
    const isMultiSort = sortCriteria.length > 1;
    const sortPriority = sortIndex + 1; // 1 for primary, 2 for secondary

    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-3 px-2 font-bold text-[10.5px] uppercase cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap ${alignment} ${
          isSorted ? 'text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-900/80' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <div className={`flex items-center gap-1 ${alignment === 'text-right' ? 'justify-end' : alignment === 'text-center' ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          {isSorted ? (
            <div className="inline-flex items-center gap-0.5">
              {activeCriterion.order === 'asc' ? (
                <ArrowUp size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
              ) : (
                <ArrowDown size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              {isMultiSort && (
                <span className="text-[9px] font-mono font-black text-blue-600 dark:text-blue-400 leading-none">
                  {sortPriority}
                </span>
              )}
            </div>
          ) : (
            <ArrowUpDown size={10} className="text-slate-400 opacity-50" />
          )}
        </div>
      </th>
    );
  };

  // Helper to rank top 5 funds within a category per user requirements
  const rankCategoryTop5 = (subFunds) => {
    if (!Array.isArray(subFunds) || subFunds.length === 0) {
      return { display5: [], fullList: [], sharpeRange: null, sortinoRange: null };
    }

    const getAum = (f) => {
      if (f.aum == null || isNaN(f.aum)) return null;
      const num = Number(f.aum);
      return num > 0 ? num : null;
    };

    const get5Y = (f) => {
      const val = f.returns?.['5Y'] ?? f.fiveYearCagr;
      if (val == null || isNaN(val)) return null;
      return Number(val);
    };

    const getInception = (f) => {
      const val = f.returns?.['All'] ?? f.inceptionCagr ?? f.sinceInceptionReturn;
      if (val == null || isNaN(val)) return null;
      return Number(val);
    };

    const getSharpe = (f) => f.sharpeRatio;
    const getSortino = (f) => f.sortinoRatio;

    // Base list sorted strictly by AUM DESC across the subcategory universe
    const list = [...subFunds].sort((a, b) => {
      const aAum = getAum(a) || 0;
      const bAum = getAum(b) || 0;
      if (bAum !== aAum) return bAum - aAum;
      return String(a.name || a.schemeName || '').localeCompare(String(b.name || b.schemeName || ''));
    });

    const getFundKey = (f) => String(f.schemeCode ?? f.id ?? f.canonicalKey ?? f.name ?? '').trim();

    // 1. Top 10 5Y CAGR Set (independently ranked in this subcategory)
    const valid5YFunds = list.filter(f => get5Y(f) !== null);
    valid5YFunds.sort((a, b) => get5Y(b) - get5Y(a));
    const top10_5YFunds = valid5YFunds.slice(0, 10);
    const top10_5YSet = new Set(top10_5YFunds.map(getFundKey));

    // 2. Top 10 Since-Inception CAGR Set (independently ranked in this subcategory)
    const validInceptionFunds = list.filter(f => getInception(f) !== null);
    validInceptionFunds.sort((a, b) => getInception(b) - getInception(a));
    const top10_InceptionFunds = validInceptionFunds.slice(0, 10);
    const top10_InceptionSet = new Set(top10_InceptionFunds.map(getFundKey));

    // 3. Find common funds that are in both Top 10 5Y & Top 10 Since-Inception with valid AUM
    const commonFunds = list.filter(f => getAum(f) !== null && top10_5YSet.has(getFundKey(f)) && top10_InceptionSet.has(getFundKey(f)));
    commonFunds.sort((a, b) => getAum(b) - getAum(a));

    // 4. If fewer than 3 funds are common in Top 10 5Y & Top 10 Inception, fill up to 3 from Top 10 5Y by AUM large to small
    let top3Starred = [];
    if (commonFunds.length >= 3) {
      top3Starred = commonFunds.slice(0, 3);
    } else {
      const commonSet = new Set(commonFunds.map(getFundKey));
      const remainingTop10_5Y = top10_5YFunds.filter(f => getAum(f) !== null && !commonSet.has(getFundKey(f)));
      remainingTop10_5Y.sort((a, b) => getAum(b) - getAum(a));
      top3Starred = [...commonFunds, ...remainingTop10_5Y].slice(0, 3);
    }

    const starredSet = new Set(top3Starred.map(getFundKey));

    // 5. Starred funds arranged by AUM large to small
    const starredFunds = [...top3Starred].sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0)).map(fund => ({
      ...fund,
      isStarred: true,
      starred: true,
      isTop3: true,
      isTopFund: true
    }));

    // 6. Rest of funds: remaining funds in Top 10 5Y arranged by AUM large to small, followed by remaining funds
    const nonStarredTop10_5Y = top10_5YFunds
      .filter(f => !starredSet.has(getFundKey(f)))
      .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

    const remainingOutsideTop10 = list
      .filter(f => !starredSet.has(getFundKey(f)) && !top10_5YSet.has(getFundKey(f)))
      .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0));

    const nonStarredFunds = [...nonStarredTop10_5Y, ...remainingOutsideTop10].map(fund => ({
      ...fund,
      isStarred: false,
      starred: false,
      isTop3: false,
      isTopFund: false
    }));

    const fullList = [...starredFunds, ...nonStarredFunds];
    const display5 = fullList.slice(0, 5);

    // Range calculated specifically from the displayed category funds
    const display5Sharpes = display5.map(getSharpe).filter(v => v != null && !isNaN(v));
    const display5Sortinos = display5.map(getSortino).filter(v => v != null && !isNaN(v));

    const sharpeRange = display5Sharpes.length > 0 ? { min: Math.min(...display5Sharpes), max: Math.max(...display5Sharpes) } : null;
    const sortinoRange = display5Sortinos.length > 0 ? { min: Math.min(...display5Sortinos), max: Math.max(...display5Sortinos) } : null;

    return { display5, fullList, sharpeRange, sortinoRange };
  };

  // Render individual fund row
  const renderFundRow = (fund, index, customRank = null, categorySharpeRange = null, categorySortinoRange = null, context = 'all') => {
    const rankDisplay = getDisplayedMfRank(fund, isAllFundsMode ? 'all' : context) ?? customRank;
    const isStarred = fund.isStarred === true || fund.starred === true;
    const navSparkline = Array.isArray(fund.navHistory) && fund.navHistory.length >= 5 ? fund.navHistory : null;

    return (
      <tr
        key={fund.id || fund.schemeCode || index}
        onClick={() => onSelectFund && onSelectFund(fund)}
        className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer group"
      >
        {/* Numerical Rank # Column */}
        <td className="py-2.5 px-3 text-center align-middle font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 w-8 shrink-0">
          {rankDisplay != null ? rankDisplay : '—'}
        </td>

        {/* Fund Name Column */}
        <td className="py-2.5 px-3 min-w-[240px] max-w-[340px] align-middle overflow-visible relative">
          <div className="flex items-center gap-1.5 min-w-0">
            <StarHoverTooltip
              fund={fund}
              isStarred={isStarred}
              categorySharpeRange={categorySharpeRange}
              categorySortinoRange={categorySortinoRange}
            />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={fund.name}>
              {fund.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800/60">
              {fund.planType || 'Direct Growth'}
            </span>
            <span>•</span>
            <span className="truncate">{fund.amc || fund.family || 'Mutual Fund'}</span>
            {(fund.launchYear || fund.inceptionYear) && (
              <>
                <span>•</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  Launched {fund.launchYear || fund.inceptionYear}
                </span>
              </>
            )}
            {(fund.navAsOfDate || fund.navDate) && (
              <>
                <span>•</span>
                <span className="font-mono text-[9.5px] text-slate-400 dark:text-slate-500" title={`NAV As of: ${fund.navAsOfDate || fund.navDate}${fund.aumAsOfDate ? ` | AUM As of: ${fund.aumAsOfDate}` : ''}`}>
                  As of {fund.navAsOfDate || fund.navDate}
                </span>
              </>
            )}
          </div>
        </td>

        {/* FUNDS count column (blank for individual funds) */}
        <td className="py-2.5 px-2 text-center text-xs text-slate-400 font-mono">—</td>

        {/* AUM */}
        <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">
          {formatAUM(fund.aum)}
        </td>

        {/* NAV */}
        <td 
          className="py-2.5 px-2 text-right font-mono text-xs text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap"
          title={`NAV: ${formatNAV(fund.nav)}\nAs of: ${formatNavDate(fund.navAsOfDate || fund.navDate || fund.asOfDate)}`}
        >
          {formatNAV(fund.nav)}
        </td>

        {/* Returns */}
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '1W' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['1W'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '1M' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['1M'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '3M' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['3M'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '6M' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['6M'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '1Y' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['1Y'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '3Y' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['3Y'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === '5Y' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['5Y'])}
        </td>
        <td className={`py-2.5 px-2 text-right whitespace-nowrap ${activeTimeframe === 'All' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['All'] ?? fund.sinceInceptionReturn)}
        </td>

        {/* Risk Ratios */}
        <td className="py-2.5 px-2 text-right whitespace-nowrap">{formatRatio(fund.sharpeRatio)}</td>
        <td className="py-2.5 px-2 text-right whitespace-nowrap">{formatRatio(fund.sortinoRatio)}</td>

        {/* Sparkline Trend */}
        <td className="py-2.5 px-2 text-center w-24">
          {navSparkline ? (
            <SparklineChart data={navSparkline} width={65} height={18} color={(fund.returns?.['1Y'] || 0) >= 0 ? '#10b981' : '#ef4444'} />
          ) : (
            <span className="text-slate-400 text-xs font-mono">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col my-3">
      
      {/* Table Header Strip */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
          SCHEME PERFORMANCE & RISK METRICS
        </div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
          <Info size={12} className="text-blue-600 dark:text-blue-400" />
          <span>Composite Rank = 45% Inception CAGR + 35% Risk Adj + 20% 1Y</span>
        </div>
      </div>

      {/* Main Full-Width Table */}
      <div className="w-full overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10.5px]">
            <tr>
              <th className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-normal w-8">#</th>
              {renderSortHeader('FUND / CATEGORY', 'name', 'text-left')}
              <th className="py-3 px-2 text-center font-bold text-[10.5px] text-slate-500 dark:text-slate-400 uppercase">FUNDS</th>
              {renderSortHeader('AUM (₹ Cr)', 'aum', 'text-right')}
              {renderSortHeader('NAV (₹)', 'nav', 'text-right')}
              {renderSortHeader('1W %', 'return_1W', 'text-right')}
              {renderSortHeader('1M %', 'return_1M', 'text-right')}
              {renderSortHeader('3M %', 'return_3M', 'text-right')}
              {renderSortHeader('6M %', 'return_6M', 'text-right')}
              {renderSortHeader('1Y %', 'return_1Y', 'text-right')}
              {renderSortHeader('3Y CAGR', 'return_3Y', 'text-right')}
              {renderSortHeader('5Y CAGR', 'return_5Y', 'text-right')}
              {renderSortHeader('INCEP. CAGR', 'return_All', 'text-right')}
              {renderSortHeader('SHARPE', 'sharpeRatio', 'text-right')}
              {renderSortHeader('SORTINO', 'sortinoRatio', 'text-right')}
              <th className="py-3 px-2 text-center text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">TREND (1Y)</th>
            </tr>
          </thead>
          <tbody>
            {!isAllFundsMode && groupedCategories ? (
              // 2-LEVEL CATEGORY MODE: Parent Category -> Subcategories -> Funds
              Object.keys(groupedCategories).map(parentKey => {
                const parentData = groupedCategories[parentKey];
                const subcats = parentData.subcategories || {};
                const parentCount = parentData.count || 0;
                const parentAum = parentData.aum;
                const parentReturns = parentData.returns || {};
                const parentSharpe = parentData.sharpeRatio;
                const parentSortino = parentData.sortinoRatio;

                const isParentCollapsed = collapsedParentCats[parentKey];

                return (
                  <React.Fragment key={parentKey}>
                    {/* LEVEL 1: Parent Category Row */}
                    <tr 
                      onClick={() => toggleParentCollapse(parentKey)}
                      className="bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors cursor-pointer select-none font-bold"
                    >
                      <td colSpan={2} className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isParentCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          </span>
                          <span className="p-1 bg-blue-50 dark:bg-blue-950/60 rounded-md">
                            {getCategoryIcon(parentKey, true)}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            {parentKey.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] font-mono font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full">
                            {parentCount.toLocaleString('en-IN')} Funds
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-xs text-slate-600 dark:text-slate-400 font-bold">{parentCount}</td>
                      <td className="py-3 px-2 text-right font-mono text-xs text-slate-900 dark:text-slate-100 font-black whitespace-nowrap">{formatAUM(parentAum)}</td>
                      <td className="py-3 px-2 text-right font-mono text-xs text-slate-400">—</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['1W'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['1M'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['3M'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['6M'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['1Y'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['3Y'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['5Y'])}</td>
                      <td className="py-3 px-2 text-right">{formatPct(parentReturns['All'])}</td>
                      <td className="py-3 px-2 text-right">{formatRatio(parentSharpe)}</td>
                      <td className="py-3 px-2 text-right">{formatRatio(parentSortino)}</td>
                      <td className="py-3 px-2 text-center w-24">
                        <SparklineChart data={[100, 102, 101, 105, 108]} width={65} height={18} color={(parentReturns['1Y'] || 0) >= 0 ? '#10b981' : '#ef4444'} />
                      </td>
                    </tr>

                    {/* LEVEL 2: Subcategory Rows (rendered when Parent Category is expanded) */}
                    {!isParentCollapsed && Object.keys(subcats).map(subKey => {
                      const subData = subcats[subKey];
                      const subFunds = subData.funds || [];
                      const subCount = subData.count || subFunds.length;
                      const subAum = subData.aum;
                      const subReturns = subData.returns || {};
                      const subSharpe = subData.sharpeRatio;
                      const subSortino = subData.sortinoRatio;

                      const fullSubKey = `${parentKey}_${subKey}`;
                      const isSubCollapsed = collapsedSubCats[fullSubKey] !== false; // collapsed by default until clicked
                      const viewMode = categoryViewModes[fullSubKey] || 'top5';
                      const { display5, fullList, sharpeRange, sortinoRange } = rankCategoryTop5(subFunds);
                      const baseFunds = viewMode === 'top5' ? display5 : fullList;
                      const displayFunds = sortFundsList(baseFunds);

                      return (
                        <React.Fragment key={fullSubKey}>
                          {/* Subcategory Accordion Header Row (Indented matching user screenshot) */}
                          <tr 
                            onClick={() => toggleSubCollapse(fullSubKey)}
                            className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60 border-b border-slate-100 dark:border-slate-900 transition-colors cursor-pointer select-none"
                          >
                            <td colSpan={2} className="py-2.5 px-3 pl-8">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {isSubCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </span>
                                {getCategoryIcon(subKey, false)}
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {subKey}
                                </span>
                                <span className="text-[10.5px] font-mono font-bold bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 px-2 py-0.5 rounded-full">
                                  {subCount} Funds
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-xs text-slate-500 font-medium">{subCount}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">{formatAUM(subAum)}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-400">—</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['1W'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['1M'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['3M'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['6M'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['1Y'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['3Y'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['5Y'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatPct(subReturns['All'])}</td>
                            <td className="py-2.5 px-2 text-right">{formatRatio(subSharpe)}</td>
                            <td className="py-2.5 px-2 text-right">{formatRatio(subSortino)}</td>
                            <td className="py-2.5 px-2 text-center w-24">
                              <SparklineChart data={[100, 101, 103, 102, 106]} width={60} height={16} color={(subReturns['1Y'] || 0) >= 0 ? '#10b981' : '#ef4444'} />
                            </td>
                          </tr>

                          {/* LEVEL 3: Individual Fund Rows (rendered when Subcategory is expanded) */}
                          {!isSubCollapsed && displayFunds.map((fund, idx) => renderFundRow(fund, idx, fund.indiaMfRank, sharpeRange, sortinoRange, 'all'))}

                          {/* View All / Show Top 5 Inline Button */}
                          {!isSubCollapsed && subFunds.length > 5 && (
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                              <td colSpan={16} className="py-2 px-8 text-left">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryViewMode(fullSubKey);
                                  }}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                                >
                                  {viewMode === 'top5' ? `View All ${subFunds.length} ${subKey} Funds →` : '← Show Top 5'}
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : isAllFundsMode && paginatedAllFunds.length > 0 ? (
              // ALL FUNDS MODE: Flat list ranked by AUM DESC with numerical rank #
              paginatedAllFunds.map((fund, idx) => renderFundRow(fund, idx))
            ) : (
              <tr>
                <td colSpan={16} className="py-12 text-center text-slate-500 text-xs">
                  No mutual fund schemes match the selected category filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (ONLY in All Funds Mode) */}
      {isAllFundsMode && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 select-none">
          {/* Left: Item Range */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">{allRankedFunds.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(currentPage * pageSize, allRankedFunds.length)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{allRankedFunds.length.toLocaleString('en-IN')}</span> funds
          </div>

          {/* Center: Numbered Page Pills matching reference screenshot */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              &lt;
            </button>

            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, start + maxVisible - 1);

              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-md transition-colors ${
                      currentPage === 1 
                        ? 'bg-blue-600 text-white shadow-xs font-bold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  pages.push(<span key="dots-start" className="px-1 text-xs text-slate-400 font-bold">...</span>);
                }
              }

              for (let page = start; page <= end; page++) {
                // Avoid duplicating page 1 if already pushed above
                if (start > 1 && page === 1) continue;
                // Avoid duplicating last page if pushed below
                if (end < totalPages && page === totalPages) continue;

                pages.push(
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-md transition-colors ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white shadow-xs font-bold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(<span key="dots-end" className="px-1 text-xs text-slate-400 font-bold">...</span>);
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-md transition-colors ${
                      currentPage === totalPages 
                        ? 'bg-blue-600 text-white shadow-xs font-bold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              &gt;
            </button>
          </div>

          {/* Right: Rows Per Page Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      )}

      {/* Footer Strip in Category Mode matching Pic 2 */}
      {!isAllFundsMode && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 font-medium select-none">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">1 to {funds.length.toLocaleString('en-IN')}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{funds.length.toLocaleString('en-IN')}</span> funds
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Source: AMFI, SEBI, Exchanges &nbsp;|&nbsp; All data is for educational purposes only
          </div>
        </div>
      )}

    </div>
  );
}
