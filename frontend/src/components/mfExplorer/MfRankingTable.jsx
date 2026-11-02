import React, { useState, useMemo, useRef, useEffect } from 'react';
import SparklineChart from '../SparklineChart';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Info, Star, 
  Network, FileText, Banknote, LineChart, GitMerge, Globe, Coins, LayoutGrid, 
  Layers, PieChart, Sparkles, Target, Activity, TrendingUp, Award, Shield, Pin 
} from 'lucide-react';
import { getDisplayedMfRank } from '../../utils/rankMutualFunds';
import { getSharpe as extractSharpe, getSortino as extractSortino } from '../../utils/financialCalculations';

// Star Hover Tooltip Component with explicit hover state & non-clipping position
function StarHoverTooltip({ fund, isStarred, categorySharpeRange, categorySortinoRange }) {
  const [isHovered, setIsHovered] = useState(false);

  const showStar = isStarred === true || fund?.isStarred === true || fund?.starred === true;

  if (!showStar) return null;

  const fSharpe = extractSharpe(fund);
  const fSortino = extractSortino(fund);

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
                Fund: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{fSharpe != null ? Number(fSharpe).toFixed(2) : '—'}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                Range: {categorySharpeRange?.min != null && categorySharpeRange?.max != null
                  ? `${categorySharpeRange.min.toFixed(2)} – ${categorySharpeRange.max.toFixed(2)}`
                  : '—'}
              </span>
            </div>
            {categorySharpeRange?.min != null && categorySharpeRange?.max != null && categorySharpeRange.max > categorySharpeRange.min && fSharpe != null ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative mt-1">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((Number(fSharpe) - categorySharpeRange.min) / (categorySharpeRange.max - categorySharpeRange.min)) * 100))}%`
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
                Fund: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{fSortino != null ? Number(fSortino).toFixed(2) : '—'}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                Range: {categorySortinoRange?.min != null && categorySortinoRange?.max != null
                  ? `${categorySortinoRange.min.toFixed(2)} – ${categorySortinoRange.max.toFixed(2)}`
                  : '—'}
              </span>
            </div>
            {categorySortinoRange?.min != null && categorySortinoRange?.max != null && categorySortinoRange.max > categorySortinoRange.min && fSortino != null ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative mt-1">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((Number(fSortino) - categorySortinoRange.min) / (categorySortinoRange.max - categorySortinoRange.min)) * 100))}%`
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
  activeMarketFilter = 'all',
  isAllFundsMode = true,
  activeTimeframe = '1Y',
  rankMode = 'aum', // 'aum' | 'performance'
  onTimeframeChange,
  onSelectFund,
  pinnedIds = [],
  onTogglePin = null
}) {
  const pinnedSet = useMemo(() => new Set(pinnedIds || []), [pinnedIds]);

  // Multi-column sorting state: array of up to 2 active sort criteria [{ field, order }]
  // sortCriteria[0] = Primary Sort Factor, sortCriteria[1] = Secondary Sort Factor
  const [sortCriteria, setSortCriteria] = useState([]);

  // Canonical ratio extractors scoped to MfRankingTable and bound to activeTimeframe
  const getSharpe = (f) => extractSharpe(f, activeTimeframe);
  const getSortino = (f) => extractSortino(f, activeTimeframe);

  // Accordion collapsed states (Parent & Subcategory)
  // By default, parent categories are collapsed so only category rows are visible on initial mount
  const [collapsedParentCats, setCollapsedParentCats] = useState({});
  const [collapsedSubCats, setCollapsedSubCats] = useState({});
  const [categoryViewModes, setCategoryViewModes] = useState({});

  // Hover timer refs for 1000ms delay (1 sec)
  const parentHoverTimerRef = useRef(null);
  const subHoverTimerRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (parentHoverTimerRef.current) clearTimeout(parentHoverTimerRef.current);
      if (subHoverTimerRef.current) clearTimeout(subHoverTimerRef.current);
    };
  }, []);

  // Reset collapsed states and pagination when active market filter or mode changes
  useEffect(() => {
    if (parentHoverTimerRef.current) clearTimeout(parentHoverTimerRef.current);
    if (subHoverTimerRef.current) clearTimeout(subHoverTimerRef.current);
    setCollapsedParentCats({});
    setCollapsedSubCats({});
    setCurrentPage(1);
  }, [activeMarketFilter, isAllFundsMode]);

  // Pagination state for All Funds mode
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleParentCollapse = (parentKey) => {
    setCollapsedParentCats(prev => {
      const isCurrentlyCollapsed = prev[parentKey] !== false; // true by default (collapsed)
      const willBeExpanded = isCurrentlyCollapsed;
      if (willBeExpanded && groupedCategories && groupedCategories[parentKey]) {
        // Expand the subcategories of this parent so funds immediately appear!
        setCollapsedSubCats(subPrev => {
          const next = { ...subPrev };
          Object.keys(groupedCategories[parentKey]).forEach(subKey => {
            next[`${parentKey}_${subKey}`] = false;
          });
          return next;
        });
      }
      return {
        ...prev,
        [parentKey]: !isCurrentlyCollapsed
      };
    });
  };

  const handleParentMouseEnter = (parentKey) => {
    if (parentHoverTimerRef.current) {
      clearTimeout(parentHoverTimerRef.current);
      parentHoverTimerRef.current = null;
    }

    // If already open, do not re-trigger
    if (collapsedParentCats[parentKey] === false) {
      return;
    }

    // Start 1000ms timer (1 sec)
    parentHoverTimerRef.current = setTimeout(() => {
      // Open the hovered category and keep others collapsed so it opens cleanly where cursor is
      setCollapsedParentCats({
        [parentKey]: false
      });
      parentHoverTimerRef.current = null;
    }, 1000);
  };

  const handleParentMouseLeave = () => {
    if (parentHoverTimerRef.current) {
      clearTimeout(parentHoverTimerRef.current);
      parentHoverTimerRef.current = null;
    }
  };

  const handleParentClick = (parentKey) => {
    if (parentHoverTimerRef.current) {
      clearTimeout(parentHoverTimerRef.current);
      parentHoverTimerRef.current = null;
    }
    toggleParentCollapse(parentKey);
  };

  const toggleSubCollapse = (subKey) => {
    setCollapsedSubCats(prev => ({
      ...prev,
      [subKey]: prev[subKey] === false ? true : false
    }));
  };

  const handleSubMouseEnter = (fullSubKey) => {
    if (subHoverTimerRef.current) {
      clearTimeout(subHoverTimerRef.current);
      subHoverTimerRef.current = null;
    }

    if (collapsedSubCats[fullSubKey] === false) {
      return;
    }

    subHoverTimerRef.current = setTimeout(() => {
      setCollapsedSubCats(prev => ({
        ...prev,
        [fullSubKey]: false
      }));
      subHoverTimerRef.current = null;
    }, 1000);
  };

  const handleSubMouseLeave = () => {
    if (subHoverTimerRef.current) {
      clearTimeout(subHoverTimerRef.current);
      subHoverTimerRef.current = null;
    }
  };

  const handleSubClick = (fullSubKey) => {
    if (subHoverTimerRef.current) {
      clearTimeout(subHoverTimerRef.current);
      subHoverTimerRef.current = null;
    }
    toggleSubCollapse(fullSubKey);
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
      if (key === 'elss' || key === 'tax saver') return <FileText size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'debt') return <Banknote size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'index') return <LineChart size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'hybrid') return <GitMerge size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'global') return <Globe size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'commodities') return <Coins size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'fof' || key === 'fund of funds') return <Layers size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key.includes('sector') || key.includes('thematic')) return <LayoutGrid size={16} className="text-blue-600 dark:text-blue-400" />;
      if (key === 'other' || key === 'solution oriented') return <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />;
    }

    if (key.includes('fof') || key.includes('fund of fund')) return <Layers size={14} className="text-blue-500" />;

    if (key.includes('large')) return <Layers size={14} className="text-blue-500" />;
    if (key.includes('mid')) return <PieChart size={14} className="text-blue-500" />;
    if (key.includes('small')) return <Sparkles size={14} className="text-blue-500" />;
    if (key.includes('flexi')) return <Target size={14} className="text-blue-500" />;
    if (key.includes('multi')) return <Activity size={14} className="text-blue-500" />;
    if (key.includes('value')) return <TrendingUp size={14} className="text-blue-500" />;
    if (key.includes('focused')) return <Award size={14} className="text-blue-500" />;
    if (key.includes('contra')) return <Shield size={14} className="text-blue-500" />;
    if (key.includes('defence') || key.includes('defense')) return <Shield size={14} className="text-blue-500" />;
    if (key.includes('energy') || key.includes('power')) return <Activity size={14} className="text-blue-500" />;
    if (key.includes('innovation')) return <Sparkles size={14} className="text-blue-500" />;
    if (key.includes('manufacturing')) return <Target size={14} className="text-blue-500" />;
    if (key.includes('quant')) return <LineChart size={14} className="text-blue-500" />;
    if (key.includes('business cycle')) return <TrendingUp size={14} className="text-blue-500" />;
    if (key.includes('mnc')) return <Globe size={14} className="text-blue-500" />;
    if (key.includes('esg')) return <Target size={14} className="text-blue-500" />;
    if (key.includes('bluechip')) return <Award size={14} className="text-blue-500" />;
    if (key.includes('bank') || key.includes('finan')) return <Banknote size={14} className="text-blue-500" />;
    if (key.includes('tech')) return <Network size={14} className="text-blue-500" />;
    if (key.includes('pharma') || key.includes('health')) return <Activity size={14} className="text-blue-500" />;
    if (key.includes('infra')) return <LayoutGrid size={14} className="text-blue-500" />;
    if (key.includes('fmcg') || key.includes('consum')) return <Coins size={14} className="text-blue-500" />;
    if (key.includes('momentum')) return <TrendingUp size={14} className="text-blue-500" />;
    if (key.includes('dynamic')) return <Activity size={14} className="text-blue-500" />;
    if (key.includes('balanced')) return <GitMerge size={14} className="text-blue-500" />;
    if (key.includes('arbitrage')) return <Coins size={14} className="text-blue-500" />;

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
    return `${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`;
  };

  const formatNAV = (nav) => {
    if (nav == null || isNaN(nav) || Number(nav) <= 0) return '—';
    return Number(nav).toFixed(2);
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
    return <span className={`font-mono text-[9px] sm:text-[10px] md:text-xs ${color}`}>{sign}{num.toFixed(2)}%</span>;
  };

  const formatRatio = (val) => {
    if (val == null || isNaN(val)) return '—';
    return <span className="font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-700 dark:text-slate-300 font-medium">{Number(val).toFixed(2)}</span>;
  };

  const cleanFundName = (rawName) => {
    if (!rawName) return '';
    let name = String(rawName);
    name = name.replace(/\s*-\s*open[- ]ended(\s+scheme)?/gi, '');
    name = name.replace(/\bopen[- ]ended(\s+scheme)?\b/gi, '');
    name = name.replace(/\(open[- ]ended\)/gi, '');
    name = name.replace(/\bscheme\s*name\b/gi, '');
    name = name.replace(/\s*-\s*direct\s+plan\s*-\s*growth(\s+option)?/gi, '');
    name = name.replace(/\s*-\s*direct\s+plan\s*-\s*growth\s+plan/gi, '');
    name = name.replace(/\s*-\s*direct\s*-\s*growth/gi, '');
    name = name.replace(/\s*-\s*direct\s+growth/gi, '');
    name = name.replace(/\s*-\s*direct\s+plan\s*-\s*$/gi, '');
    name = name.replace(/\s*-\s*direct\s+plan$/gi, '');
    name = name.replace(/\s*-\s*growth\s+option$/gi, '');
    name = name.replace(/\s*-\s*growth\s+plan$/gi, '');
    name = name.replace(/\s*-\s*growth$/gi, '');
    name = name.replace(/\s*-\s*direct$/gi, '');
    name = name.replace(/\s*-\s*$/, '').trim();
    return name || rawName;
  };

  const getLaunchInfo = (fund) => {
    let yr = fund.launchYear || fund.inceptionYear;
    if (!yr && fund.launchDate) {
      const match = String(fund.launchDate).match(/\b(19\d\d|20\d\d)\b/);
      if (match) yr = parseInt(match[1], 10);
    }
    if (!yr || isNaN(yr)) return null;
    const numYr = Number(yr);
    const currentYr = new Date().getFullYear();
    const diff = currentYr - numYr;
    const yrsText = diff <= 0 ? '<1 yr' : `${diff} ${diff === 1 ? 'yr' : 'yrs'}`;
    return `Launched ${numYr} (${yrsText})`;
  };

  // Helper to extract clean numeric or string value for sorting
  const getFieldValue = (fund, field) => {
    if (!fund) return null;

    if (field === 'aum') {
      if (fund.aumMetric === 'AAUM') return null;
      const val = (fund.aumCr ?? fund.aum) != null ? Number(fund.aumCr ?? fund.aum) : null;
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
      return getSharpe(fund);
    }

    if (field === 'sortinoRatio') {
      return getSortino(fund);
    }

    if (field === 'name') {
      const n = cleanFundName(fund.name || fund.schemeName);
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

  // Compute Sharpe/Sortino ranges for the current page in All Funds Mode (for star tooltips)
  const allFundsSharpeRange = useMemo(() => {
    const vals = paginatedAllFunds.map(getSharpe).filter(v => v != null && !isNaN(v));
    return vals.length > 0 ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  }, [paginatedAllFunds, activeTimeframe]);

  const allFundsSortinoRange = useMemo(() => {
    const vals = paginatedAllFunds.map(getSortino).filter(v => v != null && !isNaN(v));
    return vals.length > 0 ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  }, [paginatedAllFunds, activeTimeframe]);

  const totalPages = Math.ceil(allRankedFunds.length / pageSize) || 1;

  const renderSortHeader = (label, field, alignment = 'text-right', extraClass = '') => {
    const sortIndex = sortCriteria.findIndex(c => c.field === field);
    const isSorted = sortIndex !== -1;
    const activeCriterion = isSorted ? sortCriteria[sortIndex] : null;
    const isMultiSort = sortCriteria.length > 1;
    const sortPriority = sortIndex + 1; // 1 for primary, 2 for secondary

    return (
      <th
        onClick={() => handleSort(field)}
        className={`sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2 md:py-3 px-1.5 md:px-2 font-bold text-[9px] md:text-[10.5px] uppercase cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap ${alignment} ${
          isSorted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
        } ${extraClass ? extraClass : (isSorted ? 'bg-slate-50 dark:bg-slate-900/80' : '')}`}
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

  // Helper to display top 5 funds within a category using pre-computed star flags
  // Stars are computed once by calculateFundRankings() in the page layer — NOT re-calculated here.
  // This prevents search/filter from falsely starring funds in filtered subsets.
  const rankCategoryTop5 = (subFunds) => {
    if (!Array.isArray(subFunds) || subFunds.length === 0) {
      return { display5: [], fullList: [], sharpeRange: null, sortinoRange: null };
    }

    const getAum = (f) => {
      if (f.aumMetric === 'AAUM') return null;
      const aumVal = f.aumCr ?? f.aum;
      if (aumVal == null || isNaN(aumVal)) return null;
      const num = Number(aumVal);
      return num > 0 ? num : null;
    };

    // Separate starred funds (pre-computed by calculateFundRankings) from non-starred
    // Strictly enforce at most 3 starred funds per subcategory
    const starredFunds = subFunds
      .filter(f => f.isStarred === true || f.starred === true)
      .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0))
      .slice(0, 3)
      .map(fund => ({
        ...fund,
        isStarred: true,
        starred: true,
        isTop3: true,
        isTopFund: true
      }));

    const starredKeys = new Set(starredFunds.map(f => String(f.schemeCode ?? f.id ?? f.canonicalKey ?? f.name ?? '').trim()));

    // Non-starred funds sorted by AUM DESC
    const nonStarredFunds = subFunds
      .filter(f => !starredKeys.has(String(f.schemeCode ?? f.id ?? f.canonicalKey ?? f.name ?? '').trim()))
      .sort((a, b) => (getAum(b) || 0) - (getAum(a) || 0))
      .map(fund => ({
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
        className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group"
      >
        {/* Numerical Rank # Column */}
        <td className="py-1.5 md:py-2.5 px-1 md:px-2 text-center align-middle font-mono text-[9px] sm:text-[10px] md:text-[11px] font-medium text-slate-500 dark:text-slate-400 w-[20px] min-w-[20px] max-w-[20px] md:w-[32px] md:min-w-[32px] md:max-w-[32px] shrink-0 sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60">
          {rankDisplay != null ? rankDisplay : '—'}
        </td>

        {/* Fund Name Column */}
        <td className="py-1.5 md:py-2.5 px-1.5 md:px-3 min-w-[117px] sm:min-w-[135px] md:min-w-[216px] max-w-[165px] sm:max-w-[190px] md:max-w-[305px] align-middle overflow-visible relative sticky left-[20px] md:left-[32px] z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 border-b border-slate-100 dark:border-slate-800/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
          <div className="flex items-start gap-1 min-w-0">
            <StarHoverTooltip
              fund={fund}
              isStarred={isStarred}
              categorySharpeRange={categorySharpeRange}
              categorySortinoRange={categorySortinoRange}
            />
            <span className="text-[9px] sm:text-[11px] md:text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug break-words" title={fund.name}>
              {cleanFundName(fund.name || fund.schemeName)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[8px] sm:text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="hidden sm:inline-block font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-1 md:px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800/60 text-[8.5px] md:text-[10px]">
              {fund.planType || 'Direct Growth'}
            </span>
            {getLaunchInfo(fund) && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="font-bold text-slate-600 dark:text-slate-400 bg-slate-500/10 px-1 md:px-1.5 py-0 sm:py-0.2 rounded border border-slate-500/20 text-[7px] sm:text-[8.5px] md:text-[10px]">
                  {getLaunchInfo(fund)}
                </span>
              </>
            )}
          </div>
        </td>

        {/* AUM */}
        <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">
          {formatAUM(fund.aumMetric === 'AAUM' ? null : (fund.aumCr ?? fund.aum))}
        </td>

        {/* NAV */}
        <td 
          className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap"
          title={`NAV: ${formatNAV(fund.nav)}\nAs of: ${formatNavDate(fund.navAsOfDate || fund.navDate || fund.asOfDate)}`}
        >
          {formatNAV(fund.nav)}
        </td>

        {/* Returns */}
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '1W' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['1W'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '1M' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['1M'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '3M' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['3M'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '6M' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
          {formatPct(fund.returns?.['6M'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '1Y' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['1Y'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '3Y' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['3Y'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === '5Y' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['5Y'])}
        </td>
        <td className={`py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap ${activeTimeframe === 'All' ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold' : ''}`}>
          {formatPct(fund.returns?.['All'] ?? fund.sinceInceptionReturn)}
        </td>

        {/* Risk Ratios */}
        <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap">{formatRatio(getSharpe(fund))}</td>
        <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right whitespace-nowrap">{formatRatio(getSortino(fund))}</td>

        {/* Sparkline Trend */}
        <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-center w-20 md:w-24">
          {navSparkline ? (
            <SparklineChart data={navSparkline} width={60} height={16} color={(fund.returns?.['1Y'] || 0) >= 0 ? '#10b981' : '#ef4444'} />
          ) : (
            <span className="text-slate-400 text-[10px] md:text-xs font-mono">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col my-1.5 md:my-3">
      {/* Main Full-Width Table */}
      <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-160px)] scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[8.5px] sm:text-[9px] md:text-[10.5px] shadow-2xs">
            <tr>
              <th className="py-2 md:py-3 px-1 md:px-2 text-center text-slate-500 dark:text-slate-400 font-normal w-[20px] min-w-[20px] max-w-[20px] md:w-[32px] md:min-w-[32px] md:max-w-[32px] sticky top-0 left-0 z-40 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">#</th>
              {renderSortHeader(
                'FUND / CATEGORY',
                'name',
                'text-left',
                'sticky top-0 left-[20px] md:left-[32px] z-40 bg-slate-100 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 min-w-[117px] sm:min-w-[135px] md:min-w-[216px] max-w-[165px] sm:max-w-[190px] md:max-w-[305px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]'
              )}
              {renderSortHeader('AUM (Cr)', 'aum', 'text-right')}
              {renderSortHeader('NAV', 'nav', 'text-right')}
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
              <th className="sticky top-0 z-20 py-2 md:py-3 px-1.5 md:px-2 text-center text-[9px] md:text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">TREND (1Y)</th>
            </tr>
          </thead>
          <tbody>
            {!isAllFundsMode && groupedCategories ? (
              activeMarketFilter !== 'all' ? (
                // 1-LEVEL SUBCATEGORY MODE: When a specific market filter is active (e.g. Equity, Sectoral, Debt, etc.)
                // Directly render only the subcategories of that filter, without the parent category header row
                Object.keys(groupedCategories).map(parentKey => {
                  const parentData = groupedCategories[parentKey];
                  const subcats = parentData.subcategories || {};

                  return Object.keys(subcats).map(subKey => {
                    const subData = subcats[subKey];
                    const subFunds = subData.funds || [];
                    const subCount = subData.count || subFunds.length;
                    const subAum = subData.aum;
                    const subReturns = subData.returns || {};
                    const subSharpe = subData.sharpeRatio ?? (subFunds.map(getSharpe).filter(v => v != null && !isNaN(v)).length > 0 ? parseFloat((subFunds.map(getSharpe).filter(v => v != null && !isNaN(v)).reduce((a, b) => a + b, 0) / subFunds.map(getSharpe).filter(v => v != null && !isNaN(v)).length).toFixed(2)) : null);
                    const subSortino = subData.sortinoRatio ?? (subFunds.map(getSortino).filter(v => v != null && !isNaN(v)).length > 0 ? parseFloat((subFunds.map(getSortino).filter(v => v != null && !isNaN(v)).reduce((a, b) => a + b, 0) / subFunds.map(getSortino).filter(v => v != null && !isNaN(v)).length).toFixed(2)) : null);

                    const fullSubKey = `${parentKey}_${subKey}`;
                    const isSubCollapsed = collapsedSubCats[fullSubKey] !== false; // collapsed by default until clicked
                    const viewMode = categoryViewModes[fullSubKey] || 'top5';
                    const { display5, fullList, sharpeRange, sortinoRange } = rankCategoryTop5(subFunds);
                    const baseFunds = viewMode === 'top5' ? display5 : fullList;
                    const displayFunds = sortFundsList(baseFunds);

                    return (
                      <React.Fragment key={fullSubKey}>
                        {/* Subcategory Accordion Header Row (Direct top-level row when parent filter selected) */}
                        <tr 
                          onClick={() => handleSubClick(fullSubKey)}
                          onMouseEnter={() => handleSubMouseEnter(fullSubKey)}
                          onMouseLeave={handleSubMouseLeave}
                          className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-900 transition-colors cursor-pointer select-none group"
                        >
                          <td colSpan={2} className="py-1.5 md:py-2.5 px-2 md:px-3 pl-2 md:pl-3 sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 border-b border-slate-100 dark:border-slate-900 min-w-[137px] sm:min-w-[155px] md:min-w-[248px] max-w-[185px] sm:max-w-[210px] md:max-w-none shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                              <span className="text-slate-400 shrink-0">
                                {isSubCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </span>
                              <span className="hidden md:inline-flex shrink-0">{getCategoryIcon(subKey, false)}</span>
                              <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {subKey}
                              </span>
                              <span className="hidden md:inline-flex text-[9px] md:text-[10.5px] font-mono font-bold bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 px-1.5 md:px-2 py-0.5 rounded-full shrink-0">
                                {subCount} Funds
                              </span>
                              {onTogglePin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePin({
                                      id: fullSubKey,
                                      label: subKey,
                                      parentKey: parentKey,
                                      parentLabel: parentKey.toUpperCase(),
                                      isSubcategory: true,
                                      count: subCount
                                    });
                                  }}
                                  className={`p-0.5 rounded transition-all cursor-pointer ${
                                    pinnedSet.has(fullSubKey)
                                      ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 opacity-100'
                                      : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                                  }`}
                                  title={pinnedSet.has(fullSubKey) ? 'Unpin subcategory' : 'Pin subcategory to quick access'}
                                >
                                  <Pin size={11} className={pinnedSet.has(fullSubKey) ? 'fill-amber-400 text-amber-500' : ''} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">{formatAUM(subAum)}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-400">—</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['1W'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['1M'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['3M'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['6M'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['1Y'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['3Y'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['5Y'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['All'])}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatRatio(subSharpe)}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatRatio(subSortino)}</td>
                          <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-center w-20 md:w-24">
                            <SparklineChart data={[100, 101, 103, 102, 106]} width={60} height={16} color={(subReturns['1Y'] || 0) >= 0 ? '#10b981' : '#ef4444'} />
                          </td>
                        </tr>

                        {/* Individual Fund Rows (rendered when Subcategory is expanded) */}
                        {!isSubCollapsed && displayFunds.map((fund, idx) => renderFundRow(fund, idx, fund.indiaMfSubcategoryRank ?? fund.indiaMfRank ?? (idx + 1), sharpeRange, sortinoRange, 'subcategory'))}

                        {/* View All / Show Top 5 Inline Button */}
                        {!isSubCollapsed && subFunds.length > 5 && (
                          <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                            <td colSpan={15} className="py-2 px-0 text-left">
                              <div className="sticky left-0 inline-block px-4 md:px-8">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryViewMode(fullSubKey);
                                  }}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                                >
                                  {viewMode === 'top5' ? `View All ${subFunds.length} ${subKey} Funds →` : '←   Show Top 5'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  });
                })
              ) : (
                // 2-LEVEL CATEGORY MODE: Parent Category -> Subcategories -> Funds (for 'all' / multi-category view)
                Object.keys(groupedCategories).map(parentKey => {
                  const parentData = groupedCategories[parentKey];
                  const subcats = parentData.subcategories || {};
                  const parentCount = parentData.count || 0;
                  const parentAum = parentData.aum;
                  const parentReturns = parentData.returns || {};
                  const parentSharpe = parentData.sharpeRatio ?? (parentData.funds?.map(getSharpe).filter(v => v != null && !isNaN(v)).length > 0 ? parseFloat((parentData.funds.map(getSharpe).filter(v => v != null && !isNaN(v)).reduce((a, b) => a + b, 0) / parentData.funds.map(getSharpe).filter(v => v != null && !isNaN(v)).length).toFixed(2)) : null);
                  const parentSortino = parentData.sortinoRatio ?? (parentData.funds?.map(getSortino).filter(v => v != null && !isNaN(v)).length > 0 ? parseFloat((parentData.funds.map(getSortino).filter(v => v != null && !isNaN(v)).reduce((a, b) => a + b, 0) / parentData.funds.map(getSortino).filter(v => v != null && !isNaN(v)).length).toFixed(2)) : null);

                  const isParentCollapsed = collapsedParentCats[parentKey] !== false;

                  return (
                    <React.Fragment key={parentKey}>
                      {/* LEVEL 1: Parent Category Row */}
                      <tr 
                        onClick={() => handleParentClick(parentKey)}
                        onMouseEnter={() => handleParentMouseEnter(parentKey)}
                        onMouseLeave={handleParentMouseLeave}
                        className="bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border-y border-slate-200 dark:border-slate-800 transition-colors cursor-pointer select-none font-bold group"
                      >
                        <td colSpan={2} className="py-2 md:py-3 px-2 md:px-3 sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800 border-y border-slate-200 dark:border-slate-800 min-w-[137px] sm:min-w-[155px] md:min-w-[248px] max-w-[185px] sm:max-w-[210px] md:max-w-none shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">
                              {isParentCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </span>
                            <span className="hidden md:inline-flex p-1 bg-blue-50 dark:bg-blue-950/60 rounded-md shrink-0">
                              {getCategoryIcon(parentKey, true)}
                            </span>
                            <span className="text-[10px] sm:text-[11px] md:text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider truncate">
                              {parentKey.replace(/_/g, ' ')}
                            </span>
                            <span className="hidden md:inline-flex text-[9.5px] md:text-[11px] font-mono font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 px-2 md:px-2.5 py-0.5 rounded-full shrink-0">
                              {parentCount.toLocaleString('en-IN')} Funds
                            </span>
                            {onTogglePin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePin({
                                    id: parentKey,
                                    label: parentKey.replace(/_/g, ' '),
                                    isCategory: true,
                                    count: parentCount
                                  });
                                }}
                                className={`p-0.5 rounded transition-all cursor-pointer ${
                                  pinnedSet.has(parentKey)
                                    ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 opacity-100'
                                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                                }`}
                                title={pinnedSet.has(parentKey) ? 'Unpin category' : 'Pin category to quick access'}
                              >
                                <Pin size={12} className={pinnedSet.has(parentKey) ? 'fill-amber-400 text-amber-500' : ''} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-900 dark:text-slate-100 font-black whitespace-nowrap">{formatAUM(parentAum)}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-400">—</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['1W'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['1M'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['3M'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['6M'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['1Y'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['3Y'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['5Y'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatPct(parentReturns['All'])}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatRatio(parentSharpe)}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-right">{formatRatio(parentSortino)}</td>
                        <td className="py-2 md:py-3 px-1.5 md:px-2 text-center w-20 md:w-24">
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
                        const subSharpe = subData.sharpeRatio ?? (subFunds.map(getSharpe).filter(v => v != null && !isNaN(v)).length > 0 ? parseFloat((subFunds.map(getSharpe).filter(v => v != null && !isNaN(v)).reduce((a, b) => a + b, 0) / subFunds.map(getSharpe).filter(v => v != null && !isNaN(v)).length).toFixed(2)) : null);
                        const subSortino = subData.sortinoRatio ?? (subFunds.map(getSortino).filter(v => v != null && !isNaN(v)).length > 0 ? parseFloat((subFunds.map(getSortino).filter(v => v != null && !isNaN(v)).reduce((a, b) => a + b, 0) / subFunds.map(getSortino).filter(v => v != null && !isNaN(v)).length).toFixed(2)) : null);

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
                              onClick={() => handleSubClick(fullSubKey)}
                              onMouseEnter={() => handleSubMouseEnter(fullSubKey)}
                              onMouseLeave={handleSubMouseLeave}
                              className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-900 transition-colors cursor-pointer select-none group"
                            >
                              <td colSpan={2} className="py-1.5 md:py-2.5 px-2 md:px-3 pl-3 md:pl-8 sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 border-b border-slate-100 dark:border-slate-900 min-w-[137px] sm:min-w-[155px] md:min-w-[248px] max-w-[185px] sm:max-w-[210px] md:max-w-none shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                                  <span className="text-slate-400 shrink-0">
                                    {isSubCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                  </span>
                                  <span className="hidden md:inline-flex shrink-0">{getCategoryIcon(subKey, false)}</span>
                                  <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {subKey}
                                  </span>
                                  <span className="hidden md:inline-flex text-[9px] md:text-[10.5px] font-mono font-bold bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 px-1.5 md:px-2 py-0.5 rounded-full shrink-0">
                                    {subCount} Funds
                                  </span>
                                  {onTogglePin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePin({
                                          id: fullSubKey,
                                          label: subKey,
                                          parentKey: parentKey,
                                          parentLabel: parentKey.toUpperCase(),
                                          isSubcategory: true,
                                          count: subCount
                                        });
                                      }}
                                      className={`p-0.5 rounded transition-all cursor-pointer ${
                                        pinnedSet.has(fullSubKey)
                                          ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 opacity-100'
                                          : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                                      }`}
                                      title={pinnedSet.has(fullSubKey) ? 'Unpin subcategory' : 'Pin subcategory to quick access'}
                                    >
                                      <Pin size={11} className={pinnedSet.has(fullSubKey) ? 'fill-amber-400 text-amber-500' : ''} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">{formatAUM(subAum)}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right font-mono text-[9px] sm:text-[10px] md:text-xs text-slate-400">—</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['1W'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['1M'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['3M'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['6M'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['1Y'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['3Y'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['5Y'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatPct(subReturns['All'])}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatRatio(subSharpe)}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-right">{formatRatio(subSortino)}</td>
                              <td className="py-1.5 md:py-2.5 px-1.5 md:px-2 text-center w-20 md:w-24">
                                <SparklineChart data={[100, 101, 103, 102, 106]} width={60} height={16} color={(subReturns['1Y'] || 0) >= 0 ? '#10b981' : '#ef4444'} />
                              </td>
                            </tr>

                            {/* LEVEL 3: Individual Fund Rows (rendered when Subcategory is expanded) */}
                            {!isSubCollapsed && displayFunds.map((fund, idx) => renderFundRow(fund, idx, fund.indiaMfSubcategoryRank ?? fund.indiaMfRank ?? (idx + 1), sharpeRange, sortinoRange, 'subcategory'))}

                            {/* View All / Show Top 5 Inline Button */}
                            {!isSubCollapsed && subFunds.length > 5 && (
                              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                                <td colSpan={15} className="py-2 px-0 text-left">
                                  <div className="sticky left-0 inline-block px-4 md:px-8">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCategoryViewMode(fullSubKey);
                                      }}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                                    >
                                      {viewMode === 'top5' ? `View All ${subFunds.length} ${subKey} Funds →` : '←   Show Top 5'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )
            ) : isAllFundsMode && paginatedAllFunds.length > 0 ? (
              // ALL FUNDS MODE: Flat list ranked by AUM DESC with numerical rank #
              paginatedAllFunds.map((fund, idx) => renderFundRow(fund, idx, null, allFundsSharpeRange, allFundsSortinoRange, 'all'))
            ) : (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-500 text-xs">
                  <div className="sticky left-0 w-full text-center">
                    No mutual fund schemes match the selected category filters.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (ONLY in All Funds Mode) */}
      {isAllFundsMode && (
        <div className="px-2.5 md:px-4 py-2 md:py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 bg-white dark:bg-slate-900 select-none text-[10.5px] md:text-xs">
          {/* Left: Item Range */}
          <div className="text-[10.5px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">
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
        <div className="px-2.5 md:px-4 py-2 md:py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 md:gap-2 bg-slate-50/50 dark:bg-slate-900/50 text-[10.5px] md:text-xs text-slate-500 font-medium select-none">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">1 to {funds.length.toLocaleString('en-IN')}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{funds.length.toLocaleString('en-IN')}</span> funds
          </div>
          <div className="text-[9.5px] md:text-[11px] text-slate-400 font-mono">
            Source: AMFI, SEBI, Exchanges &nbsp;|&nbsp; All data is for educational purposes only
          </div>
        </div>
      )}

    </div>
  );
}
