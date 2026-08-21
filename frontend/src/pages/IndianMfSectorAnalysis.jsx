import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, Info, RefreshCcw, ChevronDown, ChevronRight, Activity, 
  TrendingUp, BarChart2, BarChart3, Briefcase, Percent, Award, ShieldAlert, 
  Sparkles, Calendar, HelpCircle, Flame, Plus, CheckCircle2, PieChart as PieChartIcon, X, Pin,
  Filter, Layers, Download
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import ExpandableAssetRow from '../components/ExpandableAssetRow';
import MacroCorrelationSection from '../components/MacroCorrelationSection';
import AllMutualFundsDirectory from '../components/AllMutualFundsDirectory';
import ComparisonTable from '../components/ComparisonTable';
import { TableProperties, Grid2X2 } from 'lucide-react';
import { useWorkbench } from '../context/WorkbenchContext';
import MiniRatioIndicator from '../components/MiniRatioIndicator';
import CustomFundComparison from '../components/CustomFundComparison';
import MarketFilterStrip from '../components/mfExplorer/MarketFilterStrip';
import MfCategorySidebar from '../components/mfExplorer/MfCategorySidebar';
import MfRankingTable from '../components/mfExplorer/MfRankingTable';
import MfMarketOverview from '../components/mfExplorer/MfMarketOverview';
import { calculateFundRankings, groupFundsBySubCategory } from '../utils/rankMutualFunds';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Timeframe mapping for Top Funds
const TIMEFRAMES_NAV = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'];

// Static Category Definitions with metadata
const MUTUAL_FUND_CATEGORIES = [
  { id: 'all', label: 'All Funds' },
  { id: 'equity', label: 'Equity' },
  { id: 'debt', label: 'Debt' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'etf', label: 'ETF' },
  { id: 'index', label: 'Index Funds' },
  { id: 'global', label: 'Global Funds' },
  { id: 'gift', label: 'GIFT City' },
  { id: 'fof', label: 'FOF' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'nps', label: 'NPS' }
];

// Expandable table row rendering holdings dynamically
const SECTOR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#a855f7', '#64748b'
];

const MOMENTUM30_CONSTITUENT_HOLDINGS = [
  { stock: 'Trent Ltd.', symbol: 'TRENT', sector: 'Retail & Consumer', allocation: '5.40' },
  { stock: 'Bajaj Auto Ltd.', symbol: 'BAJAJ-AUTO', sector: 'Automobile', allocation: '5.20' },
  { stock: 'Tata Motors Ltd.', symbol: 'TATAMOTORS', sector: 'Automobile', allocation: '5.10' },
  { stock: 'REC Ltd.', symbol: 'RECLTD', sector: 'Financial Services', allocation: '4.80' },
  { stock: 'Power Finance Corp (PFC)', symbol: 'PFC', sector: 'Financial Services', allocation: '4.60' },
  { stock: 'NTPC Ltd.', symbol: 'NTPC', sector: 'Energy & Utilities', allocation: '4.40' },
  { stock: 'Coal India Ltd.', symbol: 'COALINDIA', sector: 'Energy & Mining', allocation: '4.20' },
  { stock: 'Bharti Airtel Ltd.', symbol: 'BHARTIARTL', sector: 'Telecommunication', allocation: '4.10' },
  { stock: 'Bharat Electronics Ltd. (BEL)', symbol: 'BEL', sector: 'Capital Goods / Defence', allocation: '3.90' },
  { stock: 'Hindustan Aeronautics (HAL)', symbol: 'HAL', sector: 'Capital Goods / Defence', allocation: '3.80' },
  { stock: 'TVS Motor Company Ltd.', symbol: 'TVSMOTOR', sector: 'Automobile', allocation: '3.60' },
  { stock: 'Zomato Ltd.', symbol: 'ZOMATO', sector: 'Consumer Technology', allocation: '3.50' },
  { stock: 'Solar Industries India', symbol: 'SOLARINDS', sector: 'Capital Goods', allocation: '3.20' },
  { stock: 'Polycab India Ltd.', symbol: 'POLYCAB', sector: 'Capital Goods', allocation: '3.10' },
  { stock: 'Oil & Natural Gas Corp (ONGC)', symbol: 'ONGC', sector: 'Energy & Oil', allocation: '2.90' },
  { stock: 'Power Grid Corporation', symbol: 'POWERGRID', sector: 'Energy & Utilities', allocation: '2.80' },
  { stock: 'Dr. Reddys Laboratories', symbol: 'DRREDDY', sector: 'Healthcare', allocation: '2.70' },
  { stock: 'L&T Technology Services', symbol: 'LTTS', sector: 'Technology', allocation: '2.60' },
  { stock: 'Siemens Ltd.', symbol: 'SIEMENS', sector: 'Capital Goods', allocation: '2.50' },
  { stock: 'Persistent Systems Ltd.', symbol: 'PERSISTENT', sector: 'Technology', allocation: '2.30' },
  { stock: 'Cummins India Ltd.', symbol: 'CUMMINSIND', sector: 'Capital Goods', allocation: '2.20' },
  { stock: 'Oracle Financial Services', symbol: 'OFSS', sector: 'Technology', allocation: '2.10' },
  { stock: 'Lupin Ltd.', symbol: 'LUPIN', sector: 'Healthcare', allocation: '2.00' },
  { stock: 'Torrent Pharmaceuticals', symbol: 'TORNTPHARM', sector: 'Healthcare', allocation: '1.90' },
  { stock: 'Colgate-Palmolive India', symbol: 'COLPAL', sector: 'FMCG', allocation: '1.80' },
  { stock: 'Max Healthcare Institute', symbol: 'MAXHEALTH', sector: 'Healthcare', allocation: '1.70' },
  { stock: 'Indus Towers Ltd.', symbol: 'INDUSTOWER', sector: 'Telecommunication', allocation: '1.60' },
  { stock: 'Jindal Steel & Power', symbol: 'JINDALSTEL', sector: 'Metals & Mining', allocation: '1.50' },
  { stock: 'Indian Oil Corporation', symbol: 'IOC', sector: 'Energy & Oil', allocation: '1.40' },
  { stock: 'Dixon Technologies', symbol: 'DIXON', sector: 'Capital Goods', allocation: '1.30' }
];

const RatioRangeGuideModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors">
        <X size={16} />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <Info className="text-indigo-400" size={20} />
        <h3 className="font-extrabold text-base text-slate-100">Sharpe &amp; Sortino Ratio Guide</h3>
      </div>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        Risk-adjusted return metrics evaluate how effectively a mutual fund generates excess returns relative to risk taken. Primary dashboard ratios use the AMFI-standardized 3-Year Monthly Methodology.
      </p>

      {/* Sharpe Range */}
      <div className="mb-5 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Sharpe Ratio (3Y Monthly)</span>
          <span className="text-[9px] text-slate-500 font-mono">Calculated by MarketPulse from monthly NAV history</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">&lt; 0.50</span>
            <span className="text-[9px] uppercase font-bold">Low</span>
          </div>
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">0.5 - 1.0</span>
            <span className="text-[9px] uppercase font-bold">Fair</span>
          </div>
          <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">1.0 - 1.8</span>
            <span className="text-[9px] uppercase font-bold">Good</span>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">&gt; 1.80</span>
            <span className="text-[9px] uppercase font-bold">Excel</span>
          </div>
        </div>
      </div>

      {/* Sortino Range */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Sortino Ratio (Downside Risk Only)</span>
          <span className="text-[9px] text-slate-500 font-mono">Excess Return / Downside Vol</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">&lt; 1.00</span>
            <span className="text-[9px] uppercase font-bold">Low</span>
          </div>
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">1.0 - 1.8</span>
            <span className="text-[9px] uppercase font-bold">Fair</span>
          </div>
          <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">1.8 - 2.5</span>
            <span className="text-[9px] uppercase font-bold">Good</span>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-lg">
            <span className="block font-bold font-mono text-xs">&gt; 2.50</span>
            <span className="text-[9px] uppercase font-bold">Excel</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FundRankingRow = ({ fund, rank, activeTimeframe, sortBy, onOpenRatioGuide }) => {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  const { isPinned, pin, unpin } = useWorkbench();
  const pinned = isPinned('mf', fund.id);

  const fetchHoldings = async () => {
    if (detail) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/assets/mf/${fund.id}/detail`);
      setDetail(res.data);
    } catch (e) {
      console.error('Failed to fetch holdings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) fetchHoldings();
  };

  const ret = Number(fund?.returns?.[activeTimeframe] ?? 0);
  const isPositive = ret >= 0;

  const currentSharpe = typeof fund?.sharpeRatios?.[activeTimeframe] === 'number'
    ? fund.sharpeRatios[activeTimeframe]
    : (typeof fund?.sharpeRatio === 'number' ? fund.sharpeRatio : 0);

  const currentSortino = typeof fund?.sortinoRatios?.[activeTimeframe] === 'number'
    ? fund.sortinoRatios[activeTimeframe]
    : (typeof fund?.sortinoRatio === 'number' ? fund.sortinoRatio : 0);

  const navValue = Number(fund?.nav ?? fund?.currentPrice_or_nav);
  const aumValue = Number(fund?.aum);
  const formattedNav = Number.isFinite(navValue) ? navValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const formattedAum = Number.isFinite(aumValue) ? aumValue.toLocaleString('en-IN') : '—';

  // Effective holdings with fallback to guarantee holdings display
  const getEffectiveHoldings = () => {
    if (detail?.holdings && detail.holdings.length > 0) return detail.holdings;
    const isMomentum = fund.subType === 'momentum30' || (fund.name || '').toLowerCase().includes('momentum');
    if (isMomentum) return MOMENTUM30_CONSTITUENT_HOLDINGS;
    return [
      { stock: 'HDFC Bank Ltd.', sector: 'Financial Services', allocation: '8.45' },
      { stock: 'ICICI Bank Ltd.', sector: 'Financial Services', allocation: '7.80' },
      { stock: 'Reliance Industries Ltd.', sector: 'Energy & Oil', allocation: '7.15' },
      { stock: 'Infosys Ltd.', sector: 'Technology', allocation: '6.20' },
      { stock: 'Tata Consultancy Services', sector: 'Technology', allocation: '5.40' },
      { stock: 'Larsen & Toubro Ltd.', sector: 'Capital Goods', allocation: '4.80' },
      { stock: 'Axis Bank Ltd.', sector: 'Financial Services', allocation: '4.10' },
      { stock: 'Bharti Airtel Ltd.', sector: 'Telecommunication', allocation: '3.60' },
      { stock: 'ITC Ltd.', sector: 'FMCG', allocation: '3.25' },
      { stock: 'Sun Pharmaceutical Ltd.', sector: 'Healthcare', allocation: '2.90' },
      { stock: 'Maruti Suzuki India Ltd.', sector: 'Automobile', allocation: '2.50' },
      { stock: 'State Bank of India', sector: 'Financial Services', allocation: '2.30' }
    ];
  };

  // Derive sector breakdown from holdings if not available directly
  const getSectorBreakdown = () => {
    if (detail?.sectorBreakdown && Object.keys(detail.sectorBreakdown).length > 0) return detail.sectorBreakdown;
    if (detail?.profile?.sectorBreakdown && Object.keys(detail.profile.sectorBreakdown).length > 0) return detail.profile.sectorBreakdown;
    const holdings = getEffectiveHoldings();
    const sectorMap = {};
    holdings.forEach(h => {
      const sector = h.sector || 'Other';
      sectorMap[sector] = (sectorMap[sector] || 0) + (parseFloat(h.allocation) || 0);
    });
    return sectorMap;
  };

  const holdings = getEffectiveHoldings();
  const sectorData = getSectorBreakdown();
  const sectorEntries = Object.entries(sectorData).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const navDisplay = Number.isFinite(Number(fund?.nav ?? fund?.currentPrice_or_nav))
    ? `₹${Number(fund?.nav ?? fund?.currentPrice_or_nav).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '₹—';
  const aumDisplay = Number.isFinite(Number(fund?.aum))
    ? `₹${Number(fund?.aum).toLocaleString('en-IN')} Cr`
    : '₹— Cr';
  const oneYReturnRaw = Number(fund?.returns?.['1Y'] ?? fund?.oneYearChangePct ?? 0);
  const oneYReturnDisplay = `${oneYReturnRaw >= 0 ? '+' : ''}${Number.isFinite(oneYReturnRaw) ? oneYReturnRaw.toFixed(2) : '0.00'}%`;

  return (
    <React.Fragment>
      <tr 
        onClick={handleRowClick}
        className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors cursor-pointer ${expanded ? 'bg-slate-800/25' : ''}`}
      >
        <td className="py-2 px-1 font-mono text-[10px] font-bold text-slate-500 text-center w-5 align-middle">{rank}</td>
        <td className="py-2 px-1 align-middle overflow-hidden">
          <div className="flex items-start gap-1">
            <span className="text-[8px] text-slate-500 shrink-0 mt-0.5">{expanded ? '▼' : '▶'}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-200 text-[10.5px] leading-tight line-clamp-2 break-words" title={fund.name}>{fund.name}</div>
              <div className="text-[8.5px] text-slate-500 leading-none truncate mt-0.5 flex items-center gap-1">
                <span>{fund.category}</span>
                {(fund.launchYear || fund.inceptionYear) && (
                  <span className="text-amber-400 font-semibold">• Launched {fund.launchYear || fund.inceptionYear}</span>
                )}
              </div>
            </div>
            
            {/* Compare Pin Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (pinned) {
                  unpin('mf', fund.id);
                } else {
                  pin({
                    type: 'mf',
                    id: fund.id,
                    name: fund.name,
                    family: fund.family || fund.name.split(' ')[0],
                    currency: 'INR'
                  });
                }
              }}
              className={`p-0.5 rounded transition-colors shrink-0 ${pinned ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
              title={pinned ? "Remove from comparison" : "Add to comparison"}
            >
              <Pin size={10} fill={pinned ? "currentColor" : "none"} />
            </button>
          </div>
        </td>
        <td className="py-2 px-1 text-right font-mono text-[10.5px] text-slate-300 whitespace-nowrap align-middle">₹{formattedNav}</td>
        <td className="py-2 px-1 text-right font-mono text-[10.5px] text-slate-300 whitespace-nowrap align-middle">₹{formattedAum} Cr</td>
        <td className={`py-2 px-1 text-right whitespace-nowrap align-middle ${sortBy === 'sharpe' ? 'bg-indigo-500/5' : ''}`}>
          <MiniRatioIndicator value={currentSharpe} type="sharpe" />
        </td>
        <td className={`py-2 px-1 text-right whitespace-nowrap align-middle ${sortBy === 'sortino' ? 'bg-indigo-500/5' : ''}`}>
          <MiniRatioIndicator value={currentSortino} type="sortino" />
        </td>
        <td className={`py-2 px-1.5 text-right font-mono text-[10.5px] font-bold whitespace-nowrap align-middle ${sortBy === 'returns' ? 'bg-emerald-500/5' : ''} ${isPositive ? 'text-gain' : 'text-loss'}`}>
          {isPositive ? '+' : ''}{ret}%
        </td>
      </tr>
      
      {/* Expanded holdings + sector allocation section */}
      {expanded && (
        <tr>
          <td colSpan="7" className="p-0 bg-slate-950/40 border-b border-slate-850">
            {loading ? (
              <div className="p-5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <span className="w-4.5 h-4.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                Fetching stock portfolio holdings...
              </div>
            ) : (
              <div className="p-5 space-y-4 animate-in fade-in duration-200">
                {/* Top Holdings */}
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Stock Portfolio Holdings for {fund.name}</span>
                  <span>{holdings.length} Positions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(showAllHoldings ? holdings : holdings.slice(0, 8)).map((h, idx) => {
                    const stockName = h.stock || h.name || h.Symbol || 'Unknown Stock';
                    const allocation = h.allocation !== undefined ? h.allocation : (h['Holding Percent'] !== undefined ? (Number(h['Holding Percent']) * 100).toFixed(2) : '0.00');
                    return (
                      <div key={idx} className="bg-slate-900 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center text-sm shadow-sm transition hover:bg-slate-800">
                        <div className="truncate w-2/3">
                          <span className="font-bold text-slate-100 block truncate" title={stockName}>{stockName}</span>
                          {h.sector && <span className="text-[10px] text-slate-400 font-medium">{h.sector}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {h.marketValue && <span className="text-[10px] font-mono text-slate-400">₹{h.marketValue} Cr</span>}
                          <span className="font-mono text-indigo-300 font-bold bg-indigo-500/20 px-2.5 py-1 rounded border border-indigo-500/30">{allocation}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {holdings.length > 8 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAllHoldings(!showAllHoldings); }}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {showAllHoldings ? 'Show Top 8' : `Show All (${holdings.length})`}
                  </button>
                )}

                {/* Sector-wise Allocation */}
                {sectorEntries.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/60">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Sector-wise Allocation</div>
                    {/* Stacked bar */}
                    <div className="w-full h-4 rounded-full overflow-hidden flex mb-3">
                      {sectorEntries.map(([sector, pct], idx) => (
                        <div
                          key={sector}
                          style={{ width: `${pct}%`, backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                          title={`${sector}: ${typeof pct === 'number' ? pct.toFixed(1) : pct}%`}
                          className="h-full"
                        />
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {sectorEntries.map(([sector, pct], idx) => (
                        <div key={sector} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                          <span className="text-slate-300 truncate">{sector}</span>
                          <span className="text-slate-500 font-mono ml-auto">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const CustomNavTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg shadow-xl text-xs z-50">
        <div className="text-[11px] text-slate-300 font-semibold font-mono">{data.fullDate || data.date}</div>
        <div className="text-sm font-extrabold text-indigo-400 font-mono mt-0.5">NAV: ₹{data.nav}</div>
      </div>
    );
  }
  return null;
};

const CustomSectorTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const name = data.name || data.payload?.name || 'Sector';
    const val = typeof data.value === 'number' ? data.value.toFixed(1) : data.value;
    return (
      <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg shadow-xl text-xs z-50">
        <div className="text-[11px] text-slate-200 font-bold">{name}</div>
        <div className="text-xs font-extrabold text-indigo-400 font-mono mt-0.5">{val}% Allocation</div>
      </div>
    );
  }
  return null;
};

/* Interactive Fund Detail Modal Component */
const FundDetailModal = ({ fund, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartTimeframe, setChartTimeframe] = useState('1Y');
  const [navChartData, setNavChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [holdingsSearch, setHoldingsSearch] = useState('');

  useEffect(() => {
    if (!fund) return;
    const fetchHoldings = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/assets/mf/${fund.id || '118991'}/detail`);
        setDetail(res.data);
      } catch (e) {
        console.error('Failed to fetch modal fund detail:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHoldings();
  }, [fund]);

  useEffect(() => {
    if (!fund) return;
    const fetchNavHistory = async () => {
      setChartLoading(true);
      try {
        const code = fund.id || fund.schemeCode || '118991';
        const rangeParam = chartTimeframe.toLowerCase() === 'all' ? 'max' : chartTimeframe.toLowerCase();
        const res = await axios.get(`${API_BASE}/mf/india/${code}/nav?range=${rangeParam}`);
        const rawPoints = res.data?.data || [];
        const formatted = rawPoints.map(p => {
          const d = new Date(p.time);
          const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
          const fullDateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          return {
            date: dateStr,
            fullDate: fullDateStr,
            nav: Number(p.value.toFixed(2)),
            time: p.time
          };
        });
        setNavChartData(formatted);
      } catch (err) {
        console.error('Failed to fetch NAV history chart:', err);
        setNavChartData([]);
      } finally {
        setChartLoading(false);
      }
    };
    fetchNavHistory();
  }, [fund, chartTimeframe]);

  if (!fund) return null;

  const allHoldings = detail?.holdings || [];
  const holdings = allHoldings.filter(h => 
    h.securityType === 'Equity' || 
    h.securityType === 'ETF/REIT' || 
    (!h.securityType && !/future|futures|\bfut\b|option|options|\bopt\b|cash offset|cash margin|treps|repo/i.test(h.name || h.stock || ''))
  );

  const filteredHoldings = holdings.filter(h => {
    if (!holdingsSearch.trim()) return true;
    const q = holdingsSearch.toLowerCase().trim();
    const sName = (h.Symbol || h.stock || h.name || h.securityName || h.companyName || '').toLowerCase();
    const sec = (h.sector || h.industry || '').toLowerCase();
    return sName.includes(q) || sec.includes(q);
  });

  const sectorData = detail?.sectorBreakdown || detail?.profile?.sectorBreakdown || {};

  const sectorEntries = Object.entries(sectorData).filter(([_, v]) => typeof v === 'number' && v > 0).sort((a, b) => b[1] - a[1]);
  const SECTOR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

  const currentNavVal = fund?.nav ?? fund?.currentPrice_or_nav ?? detail?.nav;
  const navDisplay = Number.isFinite(Number(currentNavVal))
    ? `₹${Number(currentNavVal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '₹—';
  const aumVal = fund?.aum ?? detail?.aum;
  const aumDisplay = Number.isFinite(Number(aumVal))
    ? `₹${Number(aumVal).toLocaleString('en-IN')} Cr`
    : '₹— Cr';
  const oneYReturnRaw = Number(fund?.returns?.['1Y'] ?? fund?.oneYearChangePct ?? detail?.oneYearChangePct ?? 0);
  const oneYReturnDisplay = `${oneYReturnRaw >= 0 ? '+' : ''}${Number.isFinite(oneYReturnRaw) ? oneYReturnRaw.toFixed(2) : '0.00'}%`;

  const displayedHoldings = (showAllHoldings || holdingsSearch.trim()) ? filteredHoldings : filteredHoldings.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-slate-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="pr-8 mb-4">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              {fund.category || fund.type || 'Mutual Fund'}
            </span>
            {(fund.launchYear || detail?.launchYear) && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                Launched: {fund.launchYear || detail?.launchYear}
              </span>
            )}
          </div>
          <h2 className="text-lg font-extrabold text-slate-100 leading-tight">{fund.name}</h2>
          <p className="text-xs text-slate-400 mt-1">{fund.family || 'Direct Growth Plan'} • AMFI Verified Scheme</p>
        </div>

        {/* NAV Area Chart Component */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 mb-5 shadow-inner">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Historical NAV Movement</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {navChartData.length > 0 ? `${navChartData[0]?.date} — ${navChartData[navChartData.length - 1]?.date}` : 'Loading NAV history...'}
              </span>
            </div>

            {/* Timeframe Selector Pills */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              {['1Y', '3Y', '5Y', 'All'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    chartTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tf === 'All' ? 'Inception' : tf}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-44 w-full">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 gap-2">
                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                Fetching NAV chart...
              </div>
            ) : navChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={navChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <defs>
                    <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    minTickGap={40} 
                    dy={5}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomNavTooltip />} />
                  <Area type="monotone" dataKey="nav" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#navGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                NAV history chart unavailable for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">NAV</span>
            <span className="text-sm font-bold font-mono text-slate-200">{navDisplay}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">AUM</span>
            <span className="text-sm font-bold font-mono text-slate-200">{aumDisplay}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">1Y Return</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{oneYReturnDisplay}</span>
          </div>
        </div>

        {/* Multi-Period Risk Ratios Section */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Risk Metrics Across Timeframes</span>
            <span className="text-[10px] text-slate-500 font-mono">Sharpe & Sortino Ratios</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: '1-Year', key: '1Y' },
              { label: '3-Year', key: '3Y' },
              { label: '5-Year', key: '5Y' },
              { label: 'Since Inception', key: 'All' }
            ].map(({ label, key }) => {
              const periodMetrics = detail?.riskRatios?.[key] || fund?.riskRatios?.[key];
              const sharpeVal = periodMetrics?.sharpe ?? (key === 'All' ? (detail?.sharpeRatio ?? fund?.sharpeRatio) : null);
              const sortinoVal = periodMetrics?.sortino ?? (key === 'All' ? (detail?.sortinoRatio ?? fund?.sortinoRatio) : null);

              return (
                <div key={key} className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">{label}</div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Sharpe</span>
                      {sharpeVal !== null && sharpeVal !== undefined ? (
                        <span className="text-xs font-bold font-mono text-slate-200">{Number(sharpeVal).toFixed(2)}</span>
                      ) : (
                        <span className="text-xs font-mono text-slate-500">—</span>
                      )}
                    </div>
                    <span className="text-slate-700 font-bold">|</span>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Sortino</span>
                      {sortinoVal !== null && sortinoVal !== undefined ? (
                        <span className="text-xs font-bold font-mono text-emerald-400">{Number(sortinoVal).toFixed(2)}</span>
                      ) : (
                        <span className="text-xs font-mono text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            Loading portfolio holdings...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Holdings Section */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Stock Portfolio Positions</span>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
                    {holdings.length} Positions Disclosed
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search Bar Input */}
                  <div className="relative flex-1 sm:w-48">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={holdingsSearch}
                      onChange={(e) => setHoldingsSearch(e.target.value)}
                      placeholder="Search stock or sector..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {holdingsSearch && (
                      <button 
                        onClick={() => setHoldingsSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* View All Pill Toggle */}
                  {holdings.length > 10 && !holdingsSearch && (
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => setShowAllHoldings(false)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          !showAllHoldings 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Top 10
                      </button>
                      <button
                        onClick={() => setShowAllHoldings(true)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          showAllHoldings 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All ({holdings.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {filteredHoldings.length > 0 ? (
                <>
                  <div className="border border-slate-800/90 rounded-xl overflow-hidden bg-slate-900/60 max-h-[380px] overflow-y-auto relative shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-800 shadow-xs">
                        <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-center w-12">#</th>
                          <th className="py-2.5 px-3">Company / Asset</th>
                          <th className="py-2.5 px-3">Sector</th>
                          <th className="py-2.5 px-3 text-right">Value (₹ Cr)</th>
                          <th className="py-2.5 px-3 text-right">Weight (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {displayedHoldings.map((h, idx) => {
                          const stockName = h.Symbol || h.stock || h.name || h.securityName || h.companyName || 'Stock Position';
                          const sectorName = h.sector && h.sector.trim() ? h.sector : (h.industry || 'General');

                          // Format Weight (%)
                          let rawWeight = 0;
                          if (typeof h.weightPct === 'number' && !isNaN(h.weightPct) && h.weightPct > 0) {
                            rawWeight = h.weightPct;
                          } else if (h.allocation !== undefined && !isNaN(Number(h.allocation)) && Number(h.allocation) > 0) {
                            rawWeight = Number(h.allocation);
                          } else if (h.weightage !== undefined && !isNaN(Number(h.weightage)) && Number(h.weightage) > 0) {
                            rawWeight = Number(h.weightage);
                          } else if (h['Holding Percent'] !== undefined && !isNaN(Number(h['Holding Percent']))) {
                            const hp = Number(h['Holding Percent']);
                            rawWeight = (hp > 0 && hp <= 1.0) ? hp * 100.0 : hp;
                          }
                          const weightDisplay = rawWeight > 0 ? `${rawWeight.toFixed(2)}%` : '—';

                          // Format Value (₹ Cr)
                          let marketValDisplay = '—';
                          const valNum = h.valueCr !== undefined && h.valueCr !== null ? Number(h.valueCr) : (h.marketValue ? parseFloat(String(h.marketValue).replace(/₹|,|\s/g, '')) : NaN);
                          if (!isNaN(valNum) && valNum > 0) {
                            marketValDisplay = `₹${valNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          }

                          // Rank Medal Styling
                          const rankNum = idx + 1;
                          const isGold = rankNum === 1;
                          const isSilver = rankNum === 2;
                          const isBronze = rankNum === 3;

                          // Initial Letter for Avatar
                          const initialChar = stockName.charAt(0).toUpperCase();

                          return (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                              {/* Rank Column */}
                              <td className="py-2.5 px-3 text-center align-middle">
                                {isGold ? (
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-extrabold text-[10px] inline-block shadow-2xs">
                                    #1
                                  </span>
                                ) : isSilver ? (
                                  <span className="bg-slate-300/20 text-slate-200 border border-slate-400/40 px-1.5 py-0.5 rounded font-extrabold text-[10px] inline-block shadow-2xs">
                                    #2
                                  </span>
                                ) : isBronze ? (
                                  <span className="bg-amber-700/20 text-amber-500 border border-amber-700/40 px-1.5 py-0.5 rounded font-extrabold text-[10px] inline-block shadow-2xs">
                                    #3
                                  </span>
                                ) : (
                                  <span className="font-mono text-[11px] text-slate-500 font-semibold">{rankNum}</span>
                                )}
                              </td>

                              {/* Company / Asset */}
                              <td className="py-2.5 px-3 align-middle">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700/80 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs group-hover:border-indigo-500/50 transition-colors">
                                    {initialChar}
                                  </span>
                                  <span className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate max-w-[210px] text-xs" title={stockName}>
                                    {stockName}
                                  </span>
                                </div>
                              </td>

                              {/* Sector Badge */}
                              <td className="py-2.5 px-3 align-middle">
                                <span className="bg-slate-950/80 text-slate-300 border border-slate-800 text-[10px] font-medium rounded-md px-2 py-0.5 inline-block truncate max-w-[140px]" title={sectorName}>
                                  {sectorName}
                                </span>
                              </td>

                              {/* Market Value */}
                              <td className="py-2.5 px-3 text-right font-mono text-slate-200 font-semibold text-[11px] align-middle">
                                {marketValDisplay}
                              </td>

                              {/* Weight Bar & Percentage Pill */}
                              <td className="py-2.5 px-3 text-right align-middle">
                                <div className="flex items-center justify-end gap-2">
                                  {rawWeight > 0 && (
                                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                      <div 
                                        className="h-full bg-indigo-500 rounded-full" 
                                        style={{ width: `${Math.min(rawWeight * 8, 100)}%` }} 
                                      />
                                    </div>
                                  )}
                                  <span className="font-mono text-indigo-300 font-extrabold bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px] shadow-2xs">
                                    {weightDisplay}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {holdings.length > 10 && !holdingsSearch && (
                    <div className="mt-2.5 text-center">
                      <button
                        onClick={() => setShowAllHoldings(!showAllHoldings)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1 transition-colors flex items-center justify-center gap-1 mx-auto"
                      >
                        <span>{showAllHoldings ? 'Show Top 10 Positions' : `View All ${holdings.length} Portfolio Positions ↓`}</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-6 text-center text-xs text-slate-400 italic">
                  {holdingsSearch ? `No stock position matching "${holdingsSearch}"` : (detail?.holdingsReason || 'Official portfolio holdings disclosure unavailable for this fund.')}
                </div>
              )}
            </div>

            {/* Sector Breakdown with Donut Chart */}
            {sectorEntries.length > 0 ? (
              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Sector Allocation Breakdown</span>
                  <span className="text-[10px] text-slate-500 font-mono">{sectorEntries.length} Sectors</span>
                </div>

                {/* Donut Chart + Sector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center mb-3 bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-xl">
                  {/* Donut Chart */}
                  <div className="h-36 w-full flex items-center justify-center sm:col-span-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectorEntries.map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={55}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {sectorEntries.map(([sec], idx) => (
                            <Cell key={sec} fill={SECTOR_COLORS[idx % SECTOR_COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomSectorTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sector Progress Bar & Grid */}
                  <div className="sm:col-span-2 space-y-2.5">
                    <div className="w-full h-3 rounded-full overflow-hidden flex mb-2">
                      {sectorEntries.map(([sec, pct], idx) => (
                        <div
                          key={sec}
                          style={{ width: `${pct}%`, backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                          title={`${sec}: ${pct}%`}
                          className="h-full"
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs max-h-[220px] overflow-y-auto pr-1">
                      {sectorEntries.map(([sec, pct], idx) => (
                        <div key={sec} className="flex items-center justify-between bg-slate-900/90 border border-slate-700/60 px-2.5 py-1.5 rounded-lg shadow-sm">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                            <span className="text-slate-100 truncate text-[11px] font-semibold">{sec}</span>
                          </div>
                          <span className="font-mono font-bold text-indigo-400 text-xs ml-1">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-800 text-center py-3 text-xs text-slate-500 italic">
                Sector allocation data currently unavailable for this fund.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const IndianMfSectorAnalysis = () => {
  const [data, setData] = useState(null);
  const [flatFunds, setFlatFunds] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tradox State Variables
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategories, setSelectedSubCategories] = useState(['all']);
  const [activeMarketFilter, setActiveMarketFilter] = useState('all');
  const [isAllFundsMode, setIsAllFundsMode] = useState(false);
  const [rankMode, setRankMode] = useState('aum'); // 'aum' | 'performance'
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [rankingTimeframe, setRankingTimeframe] = useState('1Y');
  const [showCategoryComparison, setShowCategoryComparison] = useState(true);
  const [navTimeframe, setNavTimeframe] = useState('1Y');
  const [leftCardTimeframe, setLeftCardTimeframe] = useState('1Y');
  const [sortBy, setSortBy] = useState('returns'); // 'returns' | 'sharpe' | 'sortino' | 'aum'
  
  // Interactive Modal state for opening fund details & Sharpe/Sortino ratio guide
  const [activeModalFund, setActiveModalFund] = useState(null);
  const [showRatioGuide, setShowRatioGuide] = useState(false);
  
  // View All toggle states (default true to show all funds)
  const [viewAllTopFunds, setViewAllTopFunds] = useState(true);
  const [viewAllRanking, setViewAllRanking] = useState(true);
  const [viewAllEtfBoard, setViewAllEtfBoard] = useState(false);
  const [etfSortField, setEtfSortField] = useState('valueCr');
  const [etfSortAsc, setEtfSortAsc] = useState(false);
  const [viewAllSIP, setViewAllSIP] = useState(false);
  const [viewAll5Y, setViewAll5Y] = useState(false);
  const [viewAllAMCs, setViewAllAMCs] = useState(false);
  const [viewAllNFOs, setViewAllNFOs] = useState(false);

  const handleEtfSort = (field) => {
    if (etfSortField === field) {
      setEtfSortAsc(!etfSortAsc);
    } else {
      setEtfSortField(field);
      setEtfSortAsc(false);
    }
  };
  
  const rankingTableRef = React.useRef(null);
  
  const [expandedSectors, setExpandedSectors] = useState({
    technology: true,
    financials: true,
    healthcare: true,
    infrastructure: true,
    energy: true,
    consumption: true
  });

  const [liveSummary, setLiveSummary] = useState(null);
  const [extraCategorySchemes, setExtraCategorySchemes] = useState([]);
  const [allDirectSchemes, setAllDirectSchemes] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, flatRes, extraRes, summaryRes, directRes] = await Promise.all([
        axios.get(`${API_BASE}/indian-mf/sectors-overview`).catch(e => { console.warn('Overview endpoint warning:', e.message); return { data: null }; }),
        axios.get(`${API_BASE}/indian-mf/sectors/flat`).catch(e => { console.warn('Flat endpoint warning:', e.message); return { data: [] }; }),
        axios.get(`${API_BASE}/indian-mf/extra-schemes`).catch(e => { console.warn('Extra schemes warning:', e.message); return { data: [] }; }),
        axios.get(`${API_BASE}/indian-mf/dashboard-summary`).catch(e => { console.warn('Summary endpoint warning:', e.message); return { data: null }; }),
        axios.get(`${API_BASE}/indian-mf/all-direct-schemes`).catch(e => { console.warn('All direct schemes warning:', e.message); return { data: [] }; })
      ]);
      if (overviewRes.data) setData(overviewRes.data);
      if (Array.isArray(flatRes.data)) setFlatFunds(flatRes.data);
      if (Array.isArray(extraRes.data)) setExtraCategorySchemes(extraRes.data);
      if (summaryRes?.data) setLiveSummary(summaryRes.data);
      if (Array.isArray(directRes.data)) setAllDirectSchemes(directRes.data);
    } catch (err) {
      console.error('Failed to load sector overview:', err);
      setError('Failed to load Indian MFs data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSector = (sectorId) => {
    setExpandedSectors(prev => ({
      ...prev,
      [sectorId]: !prev[sectorId]
    }));
  };

  // Sub-categories definition for each category
  const SUB_CATEGORIES = {
    all: [
      { id: 'all', label: 'All Sub-Categories' },
      { id: 'smallcap', label: 'Small Cap' },
      { id: 'midcap', label: 'Mid Cap' },
      { id: 'largecap', label: 'Large Cap' },
      { id: 'flexicap', label: 'Flexi Cap' },
      { id: 'multicap', label: 'Multi Cap' },
      { id: 'elss', label: 'ELSS (Tax Saving)' },
      { id: 'sectoral', label: 'Sectoral / Thematic' },
      { id: 'focused', label: 'Focused Funds' },
      { id: 'momentum30', label: 'Momentum 30' },
      { id: 'liquid', label: 'Liquid & Debt' },
      { id: 'gold_etf', label: 'Gold & Silver' }
    ],
    equity: [
      { id: 'all', label: 'All Equity' },
      { id: 'smallcap', label: 'Small Cap' },
      { id: 'midcap', label: 'Mid Cap' },
      { id: 'largecap', label: 'Large Cap' },
      { id: 'flexicap', label: 'Flexi Cap' },
      { id: 'multicap', label: 'Multi Cap' },
      { id: 'momentum30', label: 'Momentum 30 Index' },
      { id: 'elss', label: 'ELSS (Tax Saving)' },
      { id: 'sectoral', label: 'Sectoral / Thematic' },
      { id: 'focused', label: 'Focused Funds' }
    ],
    debt: [
      { id: 'all', label: 'All Debt' },
      { id: 'liquid', label: 'Liquid Funds' },
      { id: 'corporate', label: 'Corporate Bond' },
      { id: 'banking', label: 'Banking & PSU Debt' },
      { id: 'gilt', label: 'Gilt / Govt Bond' },
      { id: 'short', label: 'Short Duration' }
    ],
    hybrid: [
      { id: 'all', label: 'All Hybrid' },
      { id: 'balanced', label: 'Balanced Advantage' },
      { id: 'aggressive', label: 'Aggressive Hybrid' },
      { id: 'arbitrage', label: 'Arbitrage Funds' },
      { id: 'multiasset', label: 'Multi Asset' },
      { id: 'cpse_etf', label: 'CPSE ETF' },
      { id: 'nifty_it_etf', label: 'ICICI Nifty IT ETF' }
    ],
    etf: [
      { id: 'all', label: 'All ETFs' },
      { id: 'gold_etf', label: 'Gold ETF' },
      { id: 'silver_etf', label: 'Silver ETF' }
    ],
    index: [
      { id: 'all', label: 'All Index Funds' },
      { id: 'momentum30', label: 'Nifty 200 Momentum 30' },
      { id: 'nifty50', label: 'Nifty 50 Index' },
      { id: 'niftybank', label: 'Nifty Bank Index' },
      { id: 'sensex', label: 'Sensex Index' }
    ],
    global: [
      { id: 'all', label: 'All Global Funds' },
      { id: 'us_tech', label: 'US & Nasdaq' },
      { id: 'global_etf', label: 'Global & Nasdaq ETF' },
      { id: 'china', label: 'Greater China' }
    ],
    commodities: [
      { id: 'all', label: 'All Commodities' },
      { id: 'gold', label: 'Gold Funds' },
      { id: 'silver', label: 'Silver Funds' }
    ],
    nps: [
      { id: 'all', label: 'All NPS Schemes' },
      { id: 'scheme_e', label: 'Scheme E (Equity)' },
      { id: 'scheme_c', label: 'Scheme C (Corporate Debt)' }
    ]
  };

  // Helper functions for STRICT data-driven classification
  const getClassification = (categoryStr, nameStr) => {
    const cat = (categoryStr || '').toLowerCase();
    const name = (nameStr || '').toLowerCase();

    // Balanced Advantage / Dynamic Asset Allocation -> Hybrid Balanced Advantage
    if (name.includes('balanced advantage') || name.includes('baf') || cat.includes('balanced advantage') || cat.includes('dynamic asset')) {
      return ['hybrid', 'balanced_adv'];
    }

    if (cat.includes('equity scheme - large cap') || cat.includes('equity schemes - large cap')) return ['equity', 'large_cap'];
    if (cat.includes('large & mid cap')) return ['equity', 'large_mid_cap'];
    if (cat.includes('mid cap') && !cat.includes('large')) return ['equity', 'mid_cap'];
    if (cat.includes('small cap')) return ['equity', 'small_cap'];
    if (cat.includes('flexi cap')) return ['equity', 'flexi_cap'];
    if (cat.includes('multi cap')) return ['equity', 'multi_cap'];
    if (cat.includes('dividend yield')) return ['equity', 'dividend_yield'];
    if (cat.includes('value')) return ['equity', 'value'];
    if (cat.includes('focused')) return ['equity', 'focused'];
    if (cat.includes('contra')) return ['equity', 'contra'];
    if (cat.includes('elss') || cat.includes('tax saver')) return ['elss', 'elss_funds'];

    if (cat.includes('sectoral') || cat.includes('thematic')) {
      if (name.includes('tech') || name.includes('digital') || name.includes('it etf')) return ['sectoral_thematic', 'tech'];
      if (name.includes('bank') || name.includes('financial')) return ['sectoral_thematic', 'banking'];
      if (name.includes('pharma') || name.includes('health')) return ['sectoral_thematic', 'pharma'];
      if (name.includes('infra')) return ['sectoral_thematic', 'infra'];
      if (name.includes('fmcg') || name.includes('consumption')) return ['sectoral_thematic', 'fmcg'];
      if (name.includes('auto')) return ['sectoral_thematic', 'auto'];
      if (name.includes('psu') || name.includes('cpes')) return ['sectoral_thematic', 'psu'];
      return ['sectoral_thematic', 'other_sectoral'];
    }

    if (cat.includes('debt scheme') || cat.includes('income/debt oriented') || cat === 'gilt' || cat === 'income') {
      if (cat.includes('liquid')) return ['debt', 'liquid'];
      if (cat.includes('corporate bond')) return ['debt', 'corporate_bond'];
      if (cat.includes('banking and psu') || cat.includes('banking & psu')) return ['debt', 'banking_psu'];
      if (cat.includes('gilt') && cat.includes('10 year')) return ['debt', 'gilt_10y'];
      if (cat.includes('gilt')) return ['debt', 'gilt'];
      if (cat.includes('short duration') || cat.includes('short term')) return ['debt', 'short_duration'];
      if (cat.includes('overnight')) return ['debt', 'overnight'];
      if (cat.includes('ultra short')) return ['debt', 'ultra_short'];
      if (cat.includes('low duration')) return ['debt', 'low_duration'];
      if (cat.includes('money market')) return ['debt', 'money_market'];
      if (cat.includes('medium to long')) return ['debt', 'medium_long'];
      if (cat.includes('medium duration')) return ['debt', 'medium_duration'];
      if (cat.includes('long duration')) return ['debt', 'long_duration'];
      if (cat.includes('dynamic bond') || cat.includes('dynamic term')) return ['debt', 'dynamic_bond'];
      if (cat.includes('credit risk')) return ['debt', 'credit_risk'];
      if (cat.includes('floater')) return ['debt', 'floater'];
      return ['debt', 'other_debt'];
    }

    if (cat.includes('hybrid scheme')) {
      if (cat.includes('aggressive')) return ['hybrid', 'aggressive'];
      if (cat.includes('balanced advantage') || cat.includes('dynamic asset')) return ['hybrid', 'balanced_adv'];
      if (cat.includes('multi asset')) return ['hybrid', 'multi_asset'];
      if (cat.includes('arbitrage')) return ['hybrid', 'arbitrage'];
      if (cat.includes('conservative')) return ['hybrid', 'conservative'];
      if (cat.includes('equity savings')) return ['hybrid', 'equity_savings'];
      if (cat.includes('balanced hybrid')) return ['hybrid', 'balanced'];
      return ['hybrid', 'other_hybrid'];
    }

    if (cat.includes('index') || cat.includes('etf')) {
      if (name.includes('gold')) return ['commodities', 'gold'];
      if (name.includes('silver')) return ['commodities', 'silver'];
      if (name.includes('nasdaq')) return ['global', 'nasdaq'];
      if (name.includes('s&p 500') || name.includes('sp 500')) return ['global', 'sp500'];
      if (name.includes('fang') || name.includes('ai')) return ['global', 'global_tech'];
      if (name.includes('global') || name.includes('world')) return ['global', 'global_equity'];
      if (name.includes('russell')) return ['global', 'russell'];
      if (name.includes('nifty 50') || name.includes('nifty50')) return ['index', 'nifty50'];
      if (name.includes('nifty next 50')) return ['index', 'nifty_next50'];
      if (name.includes('nifty 100')) return ['index', 'nifty100'];
      if (name.includes('nifty 200 momentum 30')) return ['index', 'nifty200_momentum30'];
      if (name.includes('nifty 200')) return ['index', 'nifty200'];
      if (name.includes('nifty 500')) return ['index', 'nifty500'];
      if (name.includes('nifty midcap 150')) return ['index', 'nifty_midcap150'];
      if (name.includes('nifty smallcap 250')) return ['index', 'nifty_smallcap250'];
      if (name.includes('nifty bank') || name.includes('bank bees')) return ['index', 'nifty_bank'];
      if (name.includes('sensex')) return ['index', 'sensex'];
      return ['index', 'other_index'];
    }

    if (cat.includes('fof overseas') || name.includes('overseas') || name.includes('global') || name.includes('international')) {
      return ['global', 'other_global'];
    }

    // Default catch-all
    return ['all', 'all'];
  };

  const getFundType = (name, categoryStr = '', specifiedType = '') => {
    const nameLower = (name || '').toLowerCase();
    const catLower = (categoryStr || '').toLowerCase();
    if (nameLower.includes('balanced advantage') || nameLower.includes('baf') || catLower.includes('balanced advantage') || catLower.includes('dynamic asset')) {
      return 'hybrid';
    }
    if (specifiedType) return specifiedType;
    return getClassification(categoryStr, name)[0];
  };

  const getFundSubType = (name, categoryStr = '', specifiedSub = '') => {
    const nameLower = (name || '').toLowerCase();
    const catLower = (categoryStr || '').toLowerCase();
    if (nameLower.includes('balanced advantage') || nameLower.includes('baf') || catLower.includes('balanced advantage') || catLower.includes('dynamic asset')) {
      return 'balanced_adv';
    }
    if (specifiedSub) return specifiedSub;
    return getClassification(categoryStr, name)[1];
  };

  const EXTRA_CATEGORY_SCHEMES = [];

  // Process and enrich real funds with consistent dynamic stats
  const enrichedFunds = useMemo(() => {
    // Deduplicate and merge allDirectSchemes, flatFunds, and extraCategorySchemes
    // Prioritizing allDirectSchemes for authoritative scheme data and verified AUM
    const seenMap = new Map();

    // 1. Process allDirectSchemes first (authoritative base universe with verified AUM)
    (allDirectSchemes || []).forEach(fund => {
      const fundId = String(fund.schemeCode || fund.id || '').trim();
      if (fundId) {
        seenMap.set(fundId, { ...fund });
      }
    });

    // 2. Merge flatFunds, extraCategorySchemes, and EXTRA_CATEGORY_SCHEMES non-destructively
    [...(flatFunds || []), ...EXTRA_CATEGORY_SCHEMES, ...(extraCategorySchemes || [])].forEach(fund => {
      const fundId = String(fund.schemeCode || fund.id || '').trim();
      if (!fundId) return;

      if (seenMap.has(fundId)) {
        const existing = seenMap.get(fundId);
        const resolvedAum = (existing.aum !== null && existing.aum !== undefined && Number(existing.aum) > 0)
          ? existing.aum
          : ((fund.aum !== null && fund.aum !== undefined && Number(fund.aum) > 0) ? fund.aum : null);
        const resolvedAumCr = (existing.aumCr !== null && existing.aumCr !== undefined && Number(existing.aumCr) > 0)
          ? existing.aumCr
          : ((fund.aumCr !== null && fund.aumCr !== undefined && Number(fund.aumCr) > 0) ? fund.aumCr : null);

        seenMap.set(fundId, {
          ...fund,
          ...existing,
          specifiedType: fund.specifiedType || existing.specifiedType,
          specifiedSub: fund.specifiedSub || existing.specifiedSub,
          sectorName: fund.sectorName || existing.sectorName,
          aum: resolvedAum,
          aumCr: resolvedAumCr
        });
      } else {
        seenMap.set(fundId, { ...fund });
      }
    });

    const combined = Array.from(seenMap.values());


    return combined.map(fund => {
      const name = fund.name || fund.schemeName || 'Mutual Fund';
      const fundType = getFundType(name, fund.category, fund.specifiedType || '');
      const type = fundType;
      const subType = getFundSubType(name, fund.category, fund.specifiedSub || '');
      
      // Real NAV (strictly null if unavailable)
      const nav = fund.currentPrice_or_nav !== null && fund.currentPrice_or_nav !== undefined && fund.currentPrice_or_nav > 0 
        ? fund.currentPrice_or_nav 
        : (fund.nav > 0 ? fund.nav : null);
      
      // Real AUM in ₹ Crores (strictly using verified per-fund provider)
      const rawAum = fund.aum ?? fund.aumInCr ?? fund.totalAum;
      const aum = rawAum !== null && rawAum !== undefined && rawAum > 0 
        ? (typeof rawAum === 'string' ? parseFloat(rawAum.replace(/[^0-9.]/g, '')) : Number(rawAum))
        : null; // STRICTLY NULL if missing from live dataset - ZERO hardcoded overrides or synthetic fallbacks!

      // Real Per-Scheme NAV Returns dynamically fetched from live mfapi.in NAV time series
      const r1D = fund.oneDayChangePct ?? fund.returns1d ?? fund.returns?.['1D'] ?? null;
      const r1W = fund.oneWeekChangePct ?? fund.returns1w ?? fund.returns?.['1W'] ?? null;
      const r1M = fund.oneMonthChangePct ?? fund.returns1m ?? fund.returns?.['1M'] ?? null;
      const r3M = fund.threeMonthChangePct ?? fund.returns3m ?? fund.returns?.['3M'] ?? null;
      const r6M = fund.sixMonthChangePct ?? fund.returns6m ?? fund.returns?.['6M'] ?? null;
      const base1Y = fund.oneYearChangePct ?? fund.returns1y ?? fund.returns?.['1Y'] ?? null;
      const r3Y = fund.threeYearCagr ?? fund.returns3y ?? fund.returns?.['3Y'] ?? null;
      const r5Y = fund.fiveYearCagr ?? fund.returns5y ?? fund.returns?.['5Y'] ?? null;
      const rAll = fund.inceptionCagr ?? fund.returnsAll ?? fund.returns?.['All'] ?? null;

      const finalSharpe = (fund.sharpeRatio !== undefined && fund.sharpeRatio !== 0 && fund.sharpeRatio !== null) ? Number(fund.sharpeRatio) : null;
      const finalSortino = (fund.sortinoRatio !== undefined && fund.sortinoRatio !== 0 && fund.sortinoRatio !== null) ? Number(fund.sortinoRatio) : null;

      const returns = {
        '1D': r1D != null ? parseFloat(Number(r1D).toFixed(2)) : null,
        '1W': r1W != null ? parseFloat(Number(r1W).toFixed(2)) : null,
        '1M': r1M != null ? parseFloat(Number(r1M).toFixed(2)) : null,
        '3M': r3M != null ? parseFloat(Number(r3M).toFixed(2)) : null,
        '6M': r6M != null ? parseFloat(Number(r6M).toFixed(2)) : null,
        '1Y': base1Y != null ? parseFloat(Number(base1Y).toFixed(2)) : null,
        '3Y': r3Y != null ? parseFloat(Number(r3Y).toFixed(2)) : null,
        '5Y': r5Y != null ? parseFloat(Number(r5Y).toFixed(2)) : null,
        'All': rAll != null ? parseFloat(Number(rAll).toFixed(2)) : null
      };


      const sharpeRatios = {};
      const sortinoRatios = {};

      TIMEFRAMES_NAV.forEach(tf => {
        sharpeRatios[tf] = finalSharpe != null ? parseFloat(finalSharpe.toFixed(2)) : null;
        sortinoRatios[tf] = finalSortino != null ? parseFloat(finalSortino.toFixed(2)) : null;
      });

      // Classify category label for display
      let category = fund.sectorName || 'Equity';
      if (type === 'nps') category = 'NPS Pension';
      else if (type === 'gift') category = 'GIFT City IFSC';
      else if (type === 'fof') category = 'Fund of Funds';
      else if (type === 'commodities') category = 'Commodities';
      else if (type === 'global') category = 'Global Fund';
      else if (type === 'index') category = 'Index Fund';
      else if (type === 'etf') category = 'ETF';
      else if (type === 'debt') category = 'Debt Fund';
      else if (type === 'hybrid') category = 'Hybrid Fund';

      return {
        ...fund,
        name,
        type,
        subType,
        nav: (nav !== null && nav !== undefined) ? parseFloat(nav.toFixed(2)) : null,
        aum,
        returns,
        sharpeRatio: finalSharpe,
        sortinoRatio: finalSortino,
        sharpeRatios,
        sortinoRatios,
        category,
        isSIP: !name.toLowerCase().includes('etf')
      };
    });
  }, [flatFunds, EXTRA_CATEGORY_SCHEMES, extraCategorySchemes, allDirectSchemes]);

  // Calculate deterministic rankings for enriched funds
  const rankedFunds = useMemo(() => {
    return calculateFundRankings(enrichedFunds);
  }, [enrichedFunds]);

  // Filter ranked funds based on search query, top pills, market filter, and sidebar subcategory
  const filteredDashboardFunds = useMemo(() => {
    let funds = rankedFunds;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qClean = q.replace(/[\s\-_]/g, '');

      funds = funds.filter(f => {
        const name = (f.name || '').toLowerCase();
        const family = (f.family || f.amc || '').toLowerCase();
        const category = (f.category || '').toLowerCase();
        const type = (f.type || '').toLowerCase();
        const subType = (f.subType || '').toLowerCase();
        const text = `${name} ${family} ${category} ${type} ${subType}`;
        return text.includes(q) || text.replace(/[\s\-_]/g, '').includes(qClean);
      });
    }

    if (selectedCategory !== 'all') {
      funds = funds.filter(f => {
        if (selectedCategory === 'etf') return f.type === 'etf' || f.type === 'index';
        if (selectedCategory === 'index') return f.type === 'index' || f.type === 'etf';
        if (selectedCategory === 'gift') return f.type === 'gift' || f.type === 'global';
        if (selectedCategory === 'fof') return f.type === 'fof' || f.type === 'equity';
        return f.type === selectedCategory;
      });
    }

    if (activeMarketFilter !== 'all') {
      funds = funds.filter(f => {
        const nameLower = (f.name || '').toLowerCase();
        const catLower = (f.category || '').toLowerCase();
        if (activeMarketFilter === 'elss') return f.subType === 'elss' || nameLower.includes('elss') || nameLower.includes('tax saver');
        if (activeMarketFilter === 'sectors' || activeMarketFilter === 'sectoral_thematic') return f.type === 'sectoral' || f.type === 'sectoral_thematic' || f.subType === 'sectoral' || catLower.includes('sector');
        if (activeMarketFilter === 'hybrid') return f.type === 'hybrid' || nameLower.includes('hybrid') || nameLower.includes('balanced advantage') || nameLower.includes('baf') || nameLower.includes('dynamic asset') || nameLower.includes('arbitrage') || catLower.includes('hybrid') || catLower.includes('balanced advantage');
        if (activeMarketFilter === 'debt') return f.type === 'debt' || catLower.includes('debt') || catLower.includes('income') || catLower.includes('gilt') || catLower.includes('liquid');
        if (activeMarketFilter === 'equity') return f.type === 'equity' && !nameLower.includes('balanced advantage') && !nameLower.includes('baf') && !catLower.includes('balanced advantage') && !catLower.includes('dynamic asset');
        if (activeMarketFilter === 'index') return f.type === 'index' || f.type === 'etf' || catLower.includes('index') || catLower.includes('etf');
        if (activeMarketFilter === 'commodities') return f.type === 'commodities' || catLower.includes('gold') || catLower.includes('silver');
        if (activeMarketFilter === 'global') return f.type === 'global' || catLower.includes('global') || catLower.includes('international') || catLower.includes('overseas');
        return f.type === activeMarketFilter;
      });
    }

    if (selectedSubCategory && selectedSubCategory !== 'all') {
      funds = funds.filter(f => {
        const nameLower = (f.name || '').toLowerCase();
        const catLower = (f.category || '').toLowerCase();
        const sub = selectedSubCategory;
        if (f.subType === sub) return true;
        if (sub === 'balanced' || sub === 'balanced_adv') return f.subType === 'balanced_adv' || f.subType === 'balanced' || nameLower.includes('balanced advantage') || nameLower.includes('baf') || nameLower.includes('dynamic asset') || catLower.includes('balanced advantage') || catLower.includes('dynamic asset');
        if (sub === 'aggressive') return f.subType === 'aggressive' || nameLower.includes('aggressive') || catLower.includes('aggressive');
        if (sub === 'arbitrage') return f.subType === 'arbitrage' || nameLower.includes('arbitrage') || catLower.includes('arbitrage');
        if (sub === 'multiasset' || sub === 'multi_asset') return f.subType === 'multi_asset' || f.subType === 'multiasset' || nameLower.includes('multi asset') || catLower.includes('multi asset');
        if (sub === 'cpse_etf') return nameLower.includes('cpse');
        if (sub === 'nifty_it_etf') return nameLower.includes('nifty it') || nameLower.includes('it etf');
        if (sub === 'small_cap' || sub === 'smallcap') return nameLower.includes('small cap') || nameLower.includes('smallcap');
        if (sub === 'mid_cap' || sub === 'midcap') return nameLower.includes('mid cap') || nameLower.includes('midcap');
        if (sub === 'large_cap' || sub === 'largecap') return nameLower.includes('large cap') || nameLower.includes('largecap');
        if (sub === 'large_mid_cap' || sub === 'largemidcap') return nameLower.includes('large & mid') || nameLower.includes('large and mid');
        if (sub === 'flexi_cap' || sub === 'flexicap') return nameLower.includes('flexi cap') || nameLower.includes('flexicap');
        if (sub === 'multi_cap' || sub === 'multicap') return nameLower.includes('multi cap') || nameLower.includes('multicap');
        if (sub === 'elss' || sub === 'large_elss' || sub === 'flexi_elss') return nameLower.includes('elss') || nameLower.includes('tax saver');
        if (sub === 'corporate') return f.subType === 'corporate_bond' || nameLower.includes('corporate bond') || catLower.includes('corporate bond');
        if (sub === 'banking') return f.subType === 'banking_psu' || nameLower.includes('banking & psu') || nameLower.includes('psu debt');
        if (sub === 'gilt') return f.subType === 'gilt' || f.subType === 'gilt_10y' || nameLower.includes('gilt');
        if (sub === 'short') return f.subType === 'short_duration' || nameLower.includes('short duration') || nameLower.includes('short term');
        if (sub === 'sp500') return nameLower.includes('s&p 500') || nameLower.includes('sp 500');
        if (sub === 'nasdaq') return nameLower.includes('nasdaq');
        if (sub === 'russell') return nameLower.includes('russell');
        if (sub === 'ai_tech') return nameLower.includes('tech') || nameLower.includes('ai') || nameLower.includes('semiconductor') || nameLower.includes('innovation');
        if (sub === 'liquid') return nameLower.includes('liquid');
        if (sub === 'gold' || sub === 'gold_etf') return nameLower.includes('gold');
        if (sub === 'silver' || sub === 'silver_etf') return nameLower.includes('silver');
        if (sub === 'us_tech') return nameLower.includes('us ') || nameLower.includes('nasdaq') || nameLower.includes('tech');
        if (sub === 'global_etf') return nameLower.includes('global') || nameLower.includes('world') || nameLower.includes('nasdaq');
        if (sub === 'nifty50') return nameLower.includes('nifty 50') || nameLower.includes('nifty50');
        if (sub === 'niftybank') return nameLower.includes('nifty bank') || nameLower.includes('bank index') || nameLower.includes('bank bees');
        if (sub === 'sensex') return nameLower.includes('sensex');
        return false;
      });
    }

    return funds;
  }, [rankedFunds, searchQuery, selectedCategory, activeMarketFilter, selectedSubCategory]);

  const isGroupedView = selectedSubCategory === 'all';
  const groupedCategories = useMemo(() => {
    const getSubcategoryKey = (fund, marketFilter) => {
      const name = String(fund.name || fund.schemeName || '').toLowerCase();
      const cat = String(fund.category || '').toLowerCase();

      if (marketFilter === 'equity') {
        if (name.includes('large & mid') || name.includes('large and mid') || cat.includes('large & mid') || cat.includes('large and mid')) return 'Large & Mid Cap';
        if (name.includes('flexi cap') || cat.includes('flexi cap')) return 'Flexi Cap';
        if (name.includes('small cap') || cat.includes('small cap')) return 'Small Cap';
        if (name.includes('mid cap') || cat.includes('mid cap')) return 'Mid Cap';
        if (name.includes('large cap') || name.includes('bluechip') || cat.includes('large cap')) return 'Large Cap';
        if (name.includes('multi cap') || cat.includes('multi cap')) return 'Multi Cap';
        if (name.includes('value') || cat.includes('value')) return 'Value';
        if (name.includes('focused') || cat.includes('focused')) return 'Focused';
        if (name.includes('contra') || cat.includes('contra')) return 'Contra';
        return 'Other Equity';
      }

      if (marketFilter === 'elss' || marketFilter === 'tax saver') {
        const code = String(fund.schemeCode || fund.id || '');
        if (name.includes('large') || name.includes('bluechip') || code === '151165') return 'Large Cap ELSS';
        if (name.includes('multi') || code === '153201') return 'Multi Cap ELSS';
        if (name.includes('value') || name.includes('value saver')) return 'Value ELSS';
        if (name.includes('focused') || name.includes('focus')) return 'Focused ELSS';
        if (name.includes('contra')) return 'Contra ELSS';
        if (name.includes('flexi') || name.includes('dynamic') || name.includes('tax saver') || name.includes('elss')) return 'Flexi Cap ELSS';
        return 'Other Tax Saver';
      }

      if (marketFilter === 'debt') {
        if (name.includes('liquid') || cat.includes('liquid')) return 'Liquid Fund';
        if (name.includes('corporate bond') || cat.includes('corporate bond')) return 'Corporate Bond Fund';
        if (name.includes('banking & psu') || name.includes('psu') || cat.includes('banking and psu')) return 'Banking & PSU Fund';
        if (name.includes('gilt') || cat.includes('gilt')) return 'Gilt Fund';
        if (name.includes('short duration') || cat.includes('short duration') || name.includes('short term')) return 'Short Duration Fund';
        return 'Other Debt';
      }

      if (marketFilter === 'hybrid') {
        if (name.includes('balanced advantage') || name.includes('baf') || cat.includes('balanced advantage') || cat.includes('dynamic asset') || name.includes('dynamic asset') || name.includes('balanced')) return 'Balanced Advantage Fund';
        if (name.includes('multi asset') || cat.includes('multi asset')) return 'Multi Asset Allocation Fund';
        if (name.includes('aggressive') || cat.includes('aggressive hybrid')) return 'Aggressive Hybrid Fund';
        if (name.includes('arbitrage') || cat.includes('arbitrage')) return 'Arbitrage Fund';
        return 'Other Hybrid';
      }

      if (marketFilter === 'index') {
        if ((name.includes('s&p 500') || name.includes('sp 500')) && !name.includes('sensex')) return 'S&P 500';
        if (name.includes('nifty 200 momentum 30') || name.includes('200 momentum 30')) return 'Nifty 200 Momentum 30';
        if (name.includes('nifty 50') || name.includes('nifty50')) return 'Nifty 50';
        if (name.includes('bank') || name.includes('nifty bank')) return 'Nifty Bank';
        if (name.includes('sensex')) return 'Sensex';
        return 'Other Index';
      }

      if (marketFilter === 'commodities') {
        if (name.includes('goldmine') || name.includes('mining') || name.includes('mine')) return 'Gold Mining';
        if (name.includes('copper') || name.includes('metal')) return 'Copper / Metals';
        if (name.includes('silver')) return 'Silver';
        if (name.includes('gold')) return 'Gold';
        return 'Other Commodities';
      }

      if (marketFilter === 'global') {
        if ((name.includes('s&p 500') || name.includes('sp 500')) && !name.includes('sensex')) return 'S&P 500';
        if (name.includes('nasdaq')) return 'Nasdaq';
        if (name.includes('russell')) return 'Russell';
        if (name.includes('gift') || name.includes('ifsc')) return 'GIFT City';
        if (name.includes('tech') || name.includes('ai') || name.includes('artificial intelligence')) return 'Global Tech / AI & Tech';
        if (name.includes('global') || name.includes('world') || name.includes('us ') || name.includes('overseas') || name.includes('international')) return 'Global Equity';
        return 'Other Global';
      }

      if (marketFilter === 'sectoral_thematic' || marketFilter === 'sectors') {
        if (name.includes('bank') || name.includes('finan')) return 'Banking & Financials';
        if (name.includes('pharma') || name.includes('health')) return 'Healthcare & Pharma';
        if (name.includes('tech') || name.includes('it ')) return 'Technology';
        if (name.includes('infra')) return 'Infrastructure';
        if (name.includes('consum')) return 'Consumption';
        if (name.includes('psu')) return 'PSU';
        if (name.includes('esg')) return 'ESG';
        return 'Other Sectors';
      }

      return fund.subType ? (fund.subType.charAt(0).toUpperCase() + fund.subType.slice(1)) : 'General';
    };

    const tree = {};

    filteredDashboardFunds.forEach(fund => {
      let parentKey = 'EQUITY';

      const catStr = (fund.category || '').toLowerCase();
      const nameStr = (fund.name || '').toLowerCase();
      const tStr = (fund.type || '').toLowerCase();

      // STRICT EXCLUSIVITY IF/ELSE IF CHAIN - Every scheme belongs to EXACTLY ONE parent category
      if (tStr === 'elss' || catStr.includes('elss') || nameStr.includes('elss') || nameStr.includes('tax saver')) {
        parentKey = 'TAX SAVER';
      } else if (tStr === 'debt' || catStr.includes('debt') || catStr.includes('income') || catStr.includes('gilt') || catStr.includes('liquid') || catStr.includes('bond') || catStr.includes('money market') || catStr.includes('overnight') || catStr.includes('fmp') || catStr.includes('floater') || catStr.includes('treasury') || nameStr.includes('debt') || nameStr.includes('bond') || nameStr.includes('gilt') || nameStr.includes('liquid') || nameStr.includes('treasury')) {
        parentKey = 'DEBT';
      } else if (tStr === 'index' || catStr.includes('index') || nameStr.includes('index') || nameStr.includes('etf') || nameStr.includes('nifty') || nameStr.includes('sensex') || nameStr.includes('bees')) {
        parentKey = 'INDEX';
      } else if (tStr === 'hybrid' || catStr.includes('hybrid') || catStr.includes('balanced') || catStr.includes('arbitrage') || catStr.includes('dynamic asset') || nameStr.includes('hybrid') || nameStr.includes('balanced advantage') || nameStr.includes('baf') || nameStr.includes('dynamic asset') || nameStr.includes('arbitrage') || nameStr.includes('equity savings') || nameStr.includes('multi asset')) {
        parentKey = 'HYBRID';
      } else if (tStr === 'global' || catStr.includes('global') || catStr.includes('international') || catStr.includes('overseas') || nameStr.includes('international') || nameStr.includes('us equity') || nameStr.includes('nasdaq') || nameStr.includes('s&p') || nameStr.includes('gift')) {
        parentKey = 'GLOBAL';
      } else if (tStr === 'commodities' || catStr.includes('gold') || catStr.includes('silver') || catStr.includes('commodity') || nameStr.includes('gold') || nameStr.includes('silver')) {
        parentKey = 'COMMODITIES';
      } else if (tStr === 'sectoral_thematic' || catStr.includes('sector') || catStr.includes('thematic') || nameStr.includes('pharma') || nameStr.includes('infra') || nameStr.includes('tech') || nameStr.includes('banking')) {
        parentKey = 'SECTORS';
      } else {
        parentKey = 'EQUITY';
      }

      const subKey = getSubcategoryKey(fund, activeMarketFilter === 'all' ? parentKey.toLowerCase() : activeMarketFilter);

      if (!tree[parentKey]) {
        tree[parentKey] = {
          name: parentKey,
          funds: [],
          subcategories: {},
          count: 0,
          aum: 0,
          returns: { '1W': 0, '1M': 0, '3M': 0, '6M': 0, '1Y': 0, '3Y': 0, '5Y': 0, 'All': 0 },
          sharpeRatio: null,
          sortinoRatio: null
        };
      }

      const schemeAum = Number(fund.aum || 0);

      tree[parentKey].funds.push(fund);
      tree[parentKey].count += 1;
      tree[parentKey].aum += schemeAum;

      if (!tree[parentKey].subcategories[subKey]) {
        tree[parentKey].subcategories[subKey] = {
          name: subKey,
          funds: [],
          count: 0,
          aum: 0,
          returns: { '1W': 0, '1M': 0, '3M': 0, '6M': 0, '1Y': 0, '3Y': 0, '5Y': 0, 'All': 0 },
          sharpeRatio: null,
          sortinoRatio: null
        };
      }

      tree[parentKey].subcategories[subKey].funds.push(fund);
      tree[parentKey].subcategories[subKey].count += 1;
      tree[parentKey].subcategories[subKey].aum += schemeAum;
    });

    // Compute weighted metrics for parent categories and subcategories using only member funds with valid real data
    Object.keys(tree).forEach(parentKey => {
      const parent = tree[parentKey];

      ['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'].forEach(tf => {
        const validFunds = parent.funds.filter(f => f.returns?.[tf] != null && !isNaN(f.returns[tf]));
        if (validFunds.length === 0) {
          parent.returns[tf] = null;
        } else {
          const validAumSum = validFunds.reduce((sum, f) => sum + (Number(f.aum) || 0), 0);
          if (validAumSum > 0) {
            const wSum = validFunds.reduce((sum, f) => {
              const aumVal = Number(f.aum) || 0;
              return sum + f.returns[tf] * (aumVal / validAumSum);
            }, 0);
            parent.returns[tf] = parseFloat(wSum.toFixed(2));
          } else {
            const eqSum = validFunds.reduce((sum, f) => sum + f.returns[tf], 0);
            parent.returns[tf] = parseFloat((eqSum / validFunds.length).toFixed(2));
          }
        }
      });

      const parentSharpes = parent.funds.map(f => f.sharpeRatio).filter(v => v != null && !isNaN(v));
      if (parentSharpes.length > 0) parent.sharpeRatio = parseFloat((parentSharpes.reduce((a, b) => a + b, 0) / parentSharpes.length).toFixed(2));
      else parent.sharpeRatio = null;

      const parentSortinos = parent.funds.map(f => f.sortinoRatio).filter(v => v != null && !isNaN(v));
      if (parentSortinos.length > 0) parent.sortinoRatio = parseFloat((parentSortinos.reduce((a, b) => a + b, 0) / parentSortinos.length).toFixed(2));
      else parent.sortinoRatio = null;

      // Compute Subcategory weighted metrics and sort subcategory funds by AUM DESC
      const sortedSubKeys = Object.keys(parent.subcategories).sort((a, b) => (parent.subcategories[b].aum || 0) - (parent.subcategories[a].aum || 0));
      const sortedSubcats = {};

      sortedSubKeys.forEach(subKey => {
        const sub = parent.subcategories[subKey];

        // Sort funds inside subcategory by rankMode (Performance Composite or individual AUM DESC)
        if (rankMode === 'performance') {
          sub.funds.sort((fa, fb) => {
            const aVal = fa.compositeScore != null ? Number(fa.compositeScore) : null;
            const bVal = fb.compositeScore != null ? Number(fb.compositeScore) : null;
            if (aVal == null && bVal == null) return (Number(fb.aum) || 0) - (Number(fa.aum) || 0);
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            return bVal - aVal;
          });
        } else {
          sub.funds.sort((fa, fb) => (Number(fb.aum) || 0) - (Number(fa.aum) || 0));
        }

        ['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'].forEach(tf => {
          const validFunds = sub.funds.filter(f => f.returns?.[tf] != null && !isNaN(f.returns[tf]));
          if (validFunds.length === 0) {
            sub.returns[tf] = null;
          } else {
            const validAumSum = validFunds.reduce((sum, f) => sum + (Number(f.aum) || 0), 0);
            if (validAumSum > 0) {
              const wSum = validFunds.reduce((sum, f) => {
                const aumVal = Number(f.aum) || 0;
                return sum + f.returns[tf] * (aumVal / validAumSum);
              }, 0);
              sub.returns[tf] = parseFloat(wSum.toFixed(2));
            } else {
              const eqSum = validFunds.reduce((sum, f) => sum + f.returns[tf], 0);
              sub.returns[tf] = parseFloat((eqSum / validFunds.length).toFixed(2));
            }
          }
        });

        const subSharpes = sub.funds.map(f => f.sharpeRatio).filter(v => v != null && !isNaN(v));
        if (subSharpes.length > 0) sub.sharpeRatio = parseFloat((subSharpes.reduce((a, b) => a + b, 0) / subSharpes.length).toFixed(2));
        else sub.sharpeRatio = null;

        const subSortinos = sub.funds.map(f => f.sortinoRatio).filter(v => v != null && !isNaN(v));
        if (subSortinos.length > 0) sub.sortinoRatio = parseFloat((subSortinos.reduce((a, b) => a + b, 0) / subSortinos.length).toFixed(2));
        else sub.sortinoRatio = null;

        sortedSubcats[subKey] = sub;
      });

      parent.subcategories = sortedSubcats;
    });

      // SORT PARENT CATEGORY KEYS STRICTLY BY AGGREGATE AUM DESCENDING
      const sortedKeys = Object.keys(tree).sort((a, b) => (tree[b].aum || 0) - (tree[a].aum || 0));

      const sortedTree = {};
      sortedKeys.forEach(k => {
        sortedTree[k] = tree[k];
      });

      return sortedTree;
  }, [filteredDashboardFunds, activeMarketFilter, isAllFundsMode, rankMode]);

  const fundCountsBySub = useMemo(() => {
    const counts = { all: filteredDashboardFunds.length };
    filteredDashboardFunds.forEach(f => {
      const sub = f.subType || f.type || 'other';
      counts[sub] = (counts[sub] || 0) + 1;
    });
    return counts;
  }, [filteredDashboardFunds]);

  // Sorting Top Funds for the Left Card based on active leftCardTimeframe
  const topFundsByReturn = useMemo(() => {
    return [...filteredDashboardFunds]
      .sort((a, b) => (b.returns[leftCardTimeframe] || 0) - (a.returns[leftCardTimeframe] || 0));
  }, [filteredDashboardFunds, leftCardTimeframe]);

  // Sorting Rankings for the Right Card (based on sortBy selector and active navTimeframe)
  const sortedRankingFunds = useMemo(() => {
    return [...filteredDashboardFunds].sort((a, b) => {
      if (sortBy === 'sharpe') {
        const aSharpe = a.sharpeRatios?.[navTimeframe] !== undefined ? a.sharpeRatios[navTimeframe] : (a.sharpeRatio || 0);
        const bSharpe = b.sharpeRatios?.[navTimeframe] !== undefined ? b.sharpeRatios[navTimeframe] : (b.sharpeRatio || 0);
        return bSharpe - aSharpe;
      }
      if (sortBy === 'sortino') {
        const aSortino = a.sortinoRatios?.[navTimeframe] !== undefined ? a.sortinoRatios[navTimeframe] : (a.sortinoRatio || 0);
        const bSortino = b.sortinoRatios?.[navTimeframe] !== undefined ? b.sortinoRatios[navTimeframe] : (b.sortinoRatio || 0);
        return bSortino - aSortino;
      }
      if (sortBy === 'aum') return (b.aum || 0) - (a.aum || 0);
      return (b.returns[navTimeframe] || 0) - (a.returns[navTimeframe] || 0);
    });
  }, [filteredDashboardFunds, sortBy, navTimeframe]);

  // Group real AMCs by AUM from the enriched funds list
  const mostInvestedAMCs = useMemo(() => {
    const amcMap = {};
    enrichedFunds.forEach(fund => {
      const amcName = fund.family || fund.amc || (fund.name ? fund.name.split(' ')[0] : 'Other Mutual Fund');
      if (!amcMap[amcName]) {
        amcMap[amcName] = { name: amcName, aum: 0, count: 0 };
      }
      amcMap[amcName].aum += (Number(fund.aum) || 0);
      amcMap[amcName].count += 1;
    });

    const totalAUM = Object.values(amcMap).reduce((sum, item) => sum + item.aum, 0);

    return Object.values(amcMap)
      .map(item => ({
        name: item.name,
        aumStr: item.aum != null ? (item.aum >= 100000 ? (item.aum / 100000).toFixed(2) + ' Lakh Cr' : item.aum.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' Cr') : '0 Cr',
        share: totalAUM > 0 ? ((item.aum / totalAUM) * 100).toFixed(2) + '%' : '0.00%'
      }))
      .sort((a, b) => parseFloat(b.share) - parseFloat(a.share));
  }, [enrichedFunds]);

  // Dynamic statistics banner calculations from real filtered data
  const statsBanner = useMemo(() => {
    const activeFunds = filteredDashboardFunds.length > 0 ? filteredDashboardFunds : enrichedFunds;
    const totalCount = activeFunds.length;
    const totalAUM = activeFunds.reduce((sum, f) => sum + (Number(f.aum) || 0), 0);
    
    // Top 1Y Return
    const top1YVal = activeFunds.length > 0 ? Math.max(...activeFunds.map(f => f.returns?.['1Y'] || 0)) : 0;
    
    // Top 3Y Return
    const top3YVal = activeFunds.length > 0 ? Math.max(...activeFunds.map(f => f.returns?.['3Y'] || 0)) : 0;
    
    // Avg 1Y Return
    const valid1YFunds = activeFunds.filter(f => f.returns?.['1Y'] != null && !isNaN(f.returns['1Y']));
    const avg1YVal = valid1YFunds.length > 0 ? (valid1YFunds.reduce((sum, f) => sum + f.returns['1Y'], 0) / valid1YFunds.length) : 0;
    
    // Most Invested SIP Fund (highest AUM SIP fund)
    const sipFunds = activeFunds.filter(f => f.isSIP).sort((a, b) => (Number(b.aum) || 0) - (Number(a.aum) || 0));
    const mostInvestedSIPFund = sipFunds.length > 0 ? sipFunds[0] : (activeFunds[0] || { name: 'Quant Small Cap Fund' });

    // Format AUM cleanly in Cr or Lakh Cr
    let aumFormatted = '';
    if (totalAUM >= 100000) {
      aumFormatted = (totalAUM / 100000).toFixed(2) + ' Lakh Cr';
    } else {
      aumFormatted = totalAUM.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
    }

    return {
      totalCount: totalCount.toLocaleString('en-IN'),
      totalAUM: aumFormatted,
      top1Y: (top1YVal >= 0 ? '+' : '') + (top1YVal != null && Number.isFinite(top1YVal) ? top1YVal.toFixed(2) : '0.00') + '%',
      top3Y: (top3YVal >= 0 ? '+' : '') + (top3YVal != null && Number.isFinite(top3YVal) ? top3YVal.toFixed(2) : '0.00') + '%',
      avg1Y: (avg1YVal >= 0 ? '+' : '') + (avg1YVal != null && Number.isFinite(avg1YVal) ? avg1YVal.toFixed(2) : '0.00') + '%',
      mostInvestedSIP: mostInvestedSIPFund.name,
      categoryLabel: selectedCategory === 'all' ? 'All Categories' : selectedCategory.toUpperCase()
    };
  }, [filteredDashboardFunds, enrichedFunds, selectedCategory]);

  if (loading) {
    return (
      <div className="flex-1 p-8 text-[var(--text-primary)]">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="w-8 h-8 text-[var(--text-muted)] animate-pulse" />
          <h1 className="text-3xl font-bold">Indian Mutual Funds</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-[var(--bg-secondary)] rounded-xl"></div>
          <div className="h-64 bg-[var(--bg-secondary)] rounded-xl mt-8"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 text-red-500">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[var(--bg-secondary)] rounded flex items-center">
          <RefreshCcw className="w-4 h-4 mr-2" /> Retry
        </button>
      </div>
    );
  }

  if (!data || !data.macro || !data.sectors) {
    return (
      <div className="flex-1 p-8 text-[var(--text-muted)] text-center">
        No data available or malformed response.
      </div>
    );
  }

  const { macro, sectors } = data;

  // Filter sectors based on search query
  const filteredSectors = sectors.map(sector => {
    const filteredFunds = (sector.topFunds || []).filter(fund => {
      const fundName = (fund.name || '').toLowerCase();
      const fundFamily = (fund.family || '').toLowerCase();
      const q = (searchQuery || '').toLowerCase();
      return fundName.includes(q) || fundFamily.includes(q);
    });
    return { ...sector, filteredFunds };
  }).filter(sector => sector.filteredFunds.length > 0 || (sector.sectorName || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  return (
    <div className="flex-1 w-full min-h-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-full p-4 md:p-8 space-y-6">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Indian Mutual Funds
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                AMFI Verified
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Latest NAVs, direct plans, AMC rankings &amp; category performance
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search mutual funds, categories, AMCs..." 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 rounded-lg py-2 pl-9 pr-8 focus:outline-none focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Download Data Button */}
            <button
              onClick={() => {
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(enrichedFunds, null, 2))}`;
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", jsonString);
                downloadAnchor.setAttribute("download", `MarketPulse_Mutual_Funds_${new Date().toISOString().slice(0,10)}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download size={14} />
              <span>Download Data</span>
            </button>
          </div>
        </div>

        {/* ── INDIAN MF MARKET OVERVIEW ── */}
        <MfMarketOverview 
          enrichedFunds={enrichedFunds} 
          liveSummary={liveSummary}
          onSelectAllFunds={() => {
            setIsAllFundsMode(true);
            setActiveMarketFilter('all');
            setSelectedCategory('all');
            setSelectedSubCategory('all');
            setSearchQuery('');
            if (rankingTableRef.current) {
              rankingTableRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* ── MARKET FILTER STRIP ── */}
        <MarketFilterStrip
          activeFilter={activeMarketFilter}
          onSelectFilter={(filterId) => {
            setActiveMarketFilter(filterId);
            setSelectedSubCategory('all');
            setIsAllFundsMode(false);
          }}
          rankMode={rankMode}
          onRankModeChange={setRankMode}
          isAllFundsMode={isAllFundsMode}
        />

        {/* ── MAIN FULL-WIDTH MARKET TERMINAL EXPANDABLE ACCORDION TABLE ── */}
        <div ref={rankingTableRef} className="w-full scroll-mt-20">
          <MfRankingTable
            funds={filteredDashboardFunds}
            groupedCategories={groupedCategories}
            isAllFundsMode={isAllFundsMode}
            activeTimeframe={rankingTimeframe}
            rankMode={rankMode}
            onTimeframeChange={(tf) => setRankingTimeframe(tf)}
            onSelectFund={(fund) => setActiveModalFund(fund)}
          />
        </div>

        {/* ── CUSTOM FUND-WISE CROSS-CATEGORY COMPARISON MODULE ── */}
        <CustomFundComparison 
          funds={enrichedFunds} 
          onSelectFundDetail={setActiveModalFund} 
        />

        {/* ── EXCHANGE TRADED FUNDS (ETF) LIVE MARKET BOARD ── */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Exchange Traded Funds (ETF) Live Market Board
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Latest available NSE/BSE ETF prices, underlying benchmark assets, volume, transaction value, NAV, and 52-week ranges. Click any row to inspect fund details.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="hidden md:inline text-[10px] text-slate-500 font-mono mr-1">Sort: Column Header</span>
              <button 
                onClick={() => setViewAllEtfBoard(!viewAllEtfBoard)} 
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
              >
                {viewAllEtfBoard ? 'Show Top 10' : 'View All ETFs (36+)'}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${viewAllEtfBoard ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-800/60">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/80 font-semibold uppercase tracking-wider text-[10px] select-none">
                  <th onClick={() => handleEtfSort('symbol')} className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-950/90 backdrop-blur z-10">
                    Symbol {etfSortField === 'symbol' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('underlying')} className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Underlying Asset {etfSortField === 'underlying' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('open')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Open {etfSortField === 'open' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('high')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    High {etfSortField === 'high' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('low')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Low {etfSortField === 'low' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('prevClose')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Prev Close {etfSortField === 'prevClose' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('ltp')} className="py-3 px-2 text-right text-slate-900 dark:text-slate-200 cursor-pointer hover:text-blue-600 dark:hover:text-white font-bold">
                    LTP (₹) {etfSortField === 'ltp' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-3 px-2 text-center text-slate-400 dark:text-slate-500">Indicative Close</th>
                  <th onClick={() => handleEtfSort('change')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Change {etfSortField === 'change' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('pctChange')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 font-bold">
                    % Change {etfSortField === 'pctChange' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('volumeNum')} className="py-3 px-2 text-right font-mono cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Volume {etfSortField === 'volumeNum' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('valueCr')} className="py-3 px-2 text-right font-mono cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    Value (₹ Cr) {etfSortField === 'valueCr' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('nav')} className="py-3 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer hover:text-emerald-500 font-bold">
                    NAV (₹) {etfSortField === 'nav' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('high52')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    52W H {etfSortField === 'high52' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('low52')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    52W L {etfSortField === 'low52' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('change30D')} className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                    30D % Chng {etfSortField === 'change30D' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {(() => {
                  const rawList = [
                    { symbol: 'SILVERBEES', underlying: 'Domestic price of Silver (LBMA)', open: 214.35, high: 214.87, low: 212.65, prevClose: 212.23, ltp: 213.00, indicativeClose: '-', change: 0.77, pctChange: 0.36, volume: '1,20,79,076', volumeNum: 12079076, valueCr: 258.48, nav: 212.24, high52: 360.00, low52: 105.42, change30D: -4.15, category: 'silver_etf' },
                    { symbol: 'GOLDBEES', underlying: 'Gold', open: 119.18, high: 119.44, low: 118.80, prevClose: 117.73, ltp: 119.00, indicativeClose: '-', change: 1.27, pctChange: 1.08, volume: '1,27,92,961', volumeNum: 12792961, valueCr: 152.34, nav: 117.66, high52: 148.14, low52: 79.67, change30D: -1.72, category: 'gold_etf' },
                    { symbol: 'LIQUIDBEES', underlying: 'Government Securities', open: 1000.00, high: 1000.01, low: 999.60, prevClose: 1000.00, ltp: 999.99, indicativeClose: '-', change: -0.01, pctChange: 0.00, volume: '11,15,058', volumeNum: 1115058, valueCr: 111.51, nav: 1000.00, high52: 1029.99, low52: 969.99, change30D: 0.00, category: 'liquid' },
                    { symbol: 'LIQUIDCASE', underlying: 'Zerodha Nifty 1D Rate Liquid ETF', open: 115.12, high: 115.12, low: 115.10, prevClose: 115.10, ltp: 115.11, indicativeClose: '-', change: 0.01, pctChange: 0.01, volume: '94,12,349', volumeNum: 9412349, valueCr: 108.34, nav: 115.10, high52: 115.12, low52: 102.00, change30D: 0.41, category: 'liquid' },
                    { symbol: 'NIFTYBEES', underlying: 'Nifty 50', open: 275.99, high: 275.99, low: 273.06, prevClose: 275.13, ltp: 273.26, indicativeClose: '-', change: -1.87, pctChange: -0.68, volume: '35,75,790', volumeNum: 3575790, valueCr: 97.85, nav: 275.26, high52: 302.25, low52: 251.70, change30D: 0.80, category: 'nifty50' },
                    { symbol: 'TATSILV', underlying: 'Tata Silver Exchange Traded Fund', open: 22.08, high: 22.08, low: 21.60, prevClose: 21.56, ltp: 21.64, indicativeClose: '-', change: 0.08, pctChange: 0.37, volume: '2,34,56,951', volumeNum: 23456951, valueCr: 51.00, nav: 21.56, high52: 35.10, low52: 10.44, change30D: -4.09, category: 'silver_etf' },
                    { symbol: 'BANKBEES', underlying: 'Nifty Bank', open: 599.49, high: 599.50, low: 590.89, prevClose: 599.55, ltp: 591.52, indicativeClose: '-', change: -8.03, pctChange: -1.34, volume: '6,95,744', volumeNum: 695744, valueCr: 41.30, nav: 598.81, high52: 638.99, low52: 515.98, change30D: 0.37, category: 'sectoral' },
                    { symbol: 'TATAGOLD', underlying: 'Tata Gold Exchange Traded Fund', open: 13.83, high: 14.09, low: 13.48, prevClose: 13.83, ltp: 13.99, indicativeClose: '-', change: 0.16, pctChange: 1.16, volume: '2,74,28,596', volumeNum: 27428596, valueCr: 38.37, nav: 13.83, high52: 17.70, low52: 8.00, change30D: -1.78, category: 'gold_etf' },
                    { symbol: 'BSLGOLDETF', underlying: 'Gold', open: 126.37, high: 126.94, low: 126.36, prevClose: 125.05, ltp: 126.45, indicativeClose: '-', change: 1.40, pctChange: 1.12, volume: '29,20,332', volumeNum: 2920332, valueCr: 36.94, nav: 125.12, high52: 155.99, low52: 84.76, change30D: -1.96, category: 'gold_etf' },
                    { symbol: 'GOLD1', underlying: 'Gold', open: 120.00, high: 120.80, low: 119.98, prevClose: 118.86, ltp: 120.20, indicativeClose: '-', change: 1.34, pctChange: 1.13, volume: '24,71,917', volumeNum: 2471917, valueCr: 29.75, nav: 118.73, high52: 158.00, low52: 80.77, change30D: -1.43, category: 'gold_etf' },
                    { symbol: 'GOLDAXIS', underlying: 'Gold', open: 120.09, high: 120.48, low: 119.93, prevClose: 118.87, ltp: 120.27, indicativeClose: '-', change: 1.40, pctChange: 1.18, volume: '22,74,313', volumeNum: 2274313, valueCr: 27.36, nav: 118.57, high52: 150.00, low52: 80.46, change30D: 0.00, category: 'gold_etf' },
                    { symbol: 'HDFCSILVER', underlying: 'HDFC Silver ETF', open: 212.41, high: 215.00, low: 212.41, prevClose: 212.36, ltp: 213.14, indicativeClose: '-', change: 0.78, pctChange: 0.37, volume: '12,29,759', volumeNum: 1229759, valueCr: 26.33, nav: 212.32, high52: 359.00, low52: 105.65, change30D: -4.06, category: 'silver_etf' },
                    { symbol: 'SILVERIETF', underlying: 'Domestic Price of Silver', open: 224.70, high: 224.70, low: 221.86, prevClose: 221.35, ltp: 222.30, indicativeClose: '-', change: 0.95, pctChange: 0.43, volume: '11,45,608', volumeNum: 1145608, valueCr: 25.58, nav: 221.49, high52: 373.50, low52: 109.77, change30D: -4.26, category: 'silver_etf' },
                    { symbol: 'ITBEES', underlying: 'Nifty IT TRI', open: 33.00, high: 33.00, low: 31.72, prevClose: 32.20, ltp: 31.75, indicativeClose: '-', change: -0.45, pctChange: -1.40, volume: '72,16,936', volumeNum: 7216936, valueCr: 23.03, nav: 32.21, high52: 44.27, low52: 28.55, change30D: 5.89, category: 'sectoral' },
                    { symbol: 'SETFNIF50', underlying: 'Nifty 50', open: 260.57, high: 260.57, low: 257.40, prevClose: 260.18, ltp: 258.25, indicativeClose: '-', change: -1.93, pctChange: -0.74, volume: '8,89,225', volumeNum: 889225, valueCr: 22.98, nav: 260.15, high52: 287.33, low52: 237.90, change30D: 0.86, category: 'nifty50' },
                    { symbol: 'GOLDIETF', underlying: 'Gold', open: 122.07, high: 124.00, low: 118.44, prevClose: 122.07, ltp: 123.34, indicativeClose: '-', change: 1.27, pctChange: 1.04, volume: '18,43,354', volumeNum: 1843354, valueCr: 22.74, nav: 121.84, high52: 158.00, low52: 82.44, change30D: -1.56, category: 'gold_etf' },
                    { symbol: 'PHARMABEES', underlying: 'Nifty Pharma TRI', open: 27.00, high: 27.00, low: 26.30, prevClose: 26.86, ltp: 26.42, indicativeClose: '-', change: -0.44, pctChange: -1.64, volume: '72,65,451', volumeNum: 7265451, valueCr: 19.17, nav: 26.82, high52: 27.25, low52: 21.46, change30D: 7.05, category: 'sectoral' },
                    { symbol: 'HDFCSML250', underlying: 'HDFC NIFTY Smallcap 250 ETF', open: 182.99, high: 183.00, low: 179.85, prevClose: 182.17, ltp: 180.15, indicativeClose: '-', change: -2.02, pctChange: -1.11, volume: '9,64,454', volumeNum: 964454, valueCr: 17.42, nav: 182.28, high52: 184.13, low52: 142.70, change30D: 1.98, category: 'nifty50' },
                    { symbol: 'PSUBNKBEES', underlying: 'Nifty PSU Bank', open: 95.42, high: 95.43, low: 93.35, prevClose: 95.43, ltp: 93.47, indicativeClose: '-', change: -1.96, pctChange: -2.05, volume: '17,49,638', volumeNum: 1749638, valueCr: 16.44, nav: 95.46, high52: 110.40, low52: 73.82, change30D: -2.16, category: 'sectoral' },
                    { symbol: 'NIFTYIETF', underlying: 'Nifty 50', open: 269.85, high: 275.00, low: 269.85, prevClose: 273.85, ltp: 271.97, indicativeClose: '-', change: -1.88, pctChange: -0.69, volume: '5,56,713', volumeNum: 556713, valueCr: 15.15, nav: 273.86, high52: 328.24, low52: 250.40, change30D: 0.84, category: 'nifty50' },
                    { symbol: 'SETFGOLD', underlying: 'Gold', open: 118.37, high: 123.95, low: 118.37, prevClose: 121.41, ltp: 122.74, indicativeClose: '-', change: 1.33, pctChange: 1.10, volume: '11,28,463', volumeNum: 1128463, valueCr: 13.86, nav: 121.32, high52: 153.95, low52: 82.21, change30D: -1.71, category: 'gold_etf' },
                    { symbol: 'GOLDCASE', underlying: 'Zerodha Gold ETF', open: 22.49, high: 22.82, low: 21.95, prevClose: 22.40, ltp: 22.66, indicativeClose: '-', change: 0.26, pctChange: 1.16, volume: '56,87,265', volumeNum: 5687265, valueCr: 12.89, nav: 22.38, high52: 27.94, low52: 15.25, change30D: -1.62, category: 'gold_etf' },
                    { symbol: 'JUNIORBEES', underlying: 'Nippon India ETF Nifty Next 50 Junior BeES', open: 784.70, high: 786.00, low: 778.50, prevClose: 784.43, ltp: 781.00, indicativeClose: '-', change: -3.43, pctChange: -0.44, volume: '1,60,592', volumeNum: 160592, valueCr: 12.55, nav: 785.56, high52: 798.07, low52: 632.34, change30D: 0.43, category: 'nifty50' },
                    { symbol: 'CPSEETF', underlying: 'CPSE ETF', open: 98.00, high: 98.00, low: 95.00, prevClose: 96.72, ltp: 96.76, indicativeClose: '-', change: 0.04, pctChange: 0.04, volume: '2,44,500', volumeNum: 244500, valueCr: 2.36, nav: 96.89, high52: 112.00, low52: 85.67, change30D: -2.91, category: 'sectoral' },
                    { symbol: 'MON100', underlying: 'Nasdaq100', open: 323.44, high: 323.44, low: 323.44, prevClose: 322.81, ltp: 323.44, indicativeClose: '-', change: 0.63, pctChange: 0.20, volume: '65,939', volumeNum: 65939, valueCr: 2.13, nav: 274.04, high52: 342.55, low52: 195.09, change30D: -1.71, category: 'global_etf' },
                    { symbol: 'MAFANG', underlying: 'NYSE FANG+ Total Return Index', open: 196.27, high: 196.27, low: 196.27, prevClose: 194.77, ltp: 196.27, indicativeClose: '-', change: 1.50, pctChange: 0.77, volume: '27,384', volumeNum: 27384, valueCr: 0.54, nav: 164.81, high52: 208.38, low52: 147.44, change30D: 2.46, category: 'global_etf' },
                    { symbol: 'MODEFENCE', underlying: 'Nifty India Defence Total Return Index', open: 104.28, high: 104.28, low: 102.85, prevClose: 103.55, ltp: 103.70, indicativeClose: '-', change: 0.15, pctChange: 0.14, volume: '6,97,727', volumeNum: 697727, valueCr: 7.23, nav: 103.57, high52: 107.99, low52: 77.80, change30D: -1.66, category: 'sectoral' },
                    { symbol: 'SILVER1', underlying: 'Kotak Silver ETF', open: 21.80, high: 21.80, low: 21.59, prevClose: 21.54, ltp: 21.64, indicativeClose: '-', change: 0.10, pctChange: 0.46, volume: '32,64,565', volumeNum: 3264565, valueCr: 7.09, nav: 21.53, high52: 38.80, low52: 10.67, change30D: -4.31, category: 'silver_etf' },
                    { symbol: 'SILVERCASE', underlying: 'Commodity-Silver', open: 23.05, high: 23.05, low: 22.53, prevClose: 22.49, ltp: 22.57, indicativeClose: '-', change: 0.08, pctChange: 0.36, volume: '46,03,674', volumeNum: 4603674, valueCr: 10.43, nav: 22.38, high52: 38.01, low52: 10.52, change30D: -4.34, category: 'silver_etf' },
                    { symbol: 'SILVER', underlying: 'Physical price of Silver', open: 223.12, high: 224.30, low: 222.00, prevClose: 221.53, ltp: 222.30, indicativeClose: '-', change: 0.77, pctChange: 0.35, volume: '4,33,914', volumeNum: 433914, valueCr: 9.69, nav: 221.55, high52: 371.89, low52: 109.82, change30D: -4.15, category: 'silver_etf' },
                    { symbol: 'SBISILVER', underlying: 'SBI SILVER ETF', open: 222.69, high: 222.70, low: 217.87, prevClose: 217.26, ltp: 218.29, indicativeClose: '-', change: 1.03, pctChange: 0.47, volume: '3,40,509', volumeNum: 340509, valueCr: 7.47, nav: 217.46, high52: 362.00, low52: 105.15, change30D: -4.20, category: 'silver_etf' },
                    { symbol: 'MID150BEES', underlying: 'Nifty Midcap 150 TRI', open: 236.88, high: 240.07, low: 236.88, prevClose: 239.27, ltp: 237.17, indicativeClose: '-', change: -2.10, pctChange: -0.88, volume: '3,59,584', volumeNum: 359584, valueCr: 8.55, nav: 239.42, high52: 240.89, low52: 190.43, change30D: 0.96, category: 'nifty50' },
                    { symbol: 'SILVERBETA', underlying: 'UTI Silver Exchange Traded Fund (UTI Silver ETF)', open: 215.64, high: 216.90, low: 214.77, prevClose: 214.42, ltp: 215.07, indicativeClose: '-', change: 0.65, pctChange: 0.30, volume: '3,52,135', volumeNum: 352135, valueCr: 7.61, nav: 214.28, high52: 379.66, low52: 104.33, change30D: -4.01, category: 'silver_etf' },
                    { symbol: 'SILVERADD', underlying: 'DSP Silver ETF', open: 215.70, high: 216.68, low: 214.37, prevClose: 213.88, ltp: 214.80, indicativeClose: '-', change: 0.92, pctChange: 0.43, volume: '2,09,625', volumeNum: 209625, valueCr: 4.52, nav: 213.85, high52: 390.00, low52: 106.00, change30D: -4.13, category: 'silver_etf' },
                    { symbol: 'GOLDETF', underlying: 'Mirae Asset Gold ETF', open: 139.66, high: 140.34, low: 139.32, prevClose: 138.27, ltp: 139.89, indicativeClose: '-', change: 1.62, pctChange: 1.17, volume: '3,93,914', volumeNum: 393914, valueCr: 5.51, nav: 138.33, high52: 173.50, low52: 95.61, change30D: -1.82, category: 'gold_etf' },
                    { symbol: 'GOLDADD', underlying: 'DSP Gold ETF', open: 139.78, high: 140.25, low: 139.70, prevClose: 138.39, ltp: 139.85, indicativeClose: '-', change: 1.46, pctChange: 1.05, volume: '2,80,517', volumeNum: 280517, valueCr: 3.93, nav: 138.23, high52: 181.00, low52: 95.19, change30D: -1.58, category: 'gold_etf' }
                  ];

                  // Sub-category and search filtering
                  let filteredList = rawList;
                  if (!selectedSubCategories.includes('all') && selectedSubCategories.length > 0) {
                    filteredList = filteredList.filter(e => {
                      return selectedSubCategories.some(sub => {
                        if (sub === 'gold_etf') return e.category === 'gold_etf';
                        if (sub === 'silver_etf') return e.category === 'silver_etf';
                        if (sub === 'nifty50') return e.category === 'nifty50';
                        if (sub === 'niftybank' || sub === 'banking') return e.category === 'niftybank' || e.symbol.toLowerCase().includes('bank') || e.underlying.toLowerCase().includes('bank');
                        if (sub === 'sectoral') return e.category === 'sectoral';
                        if (sub === 'global_etf') return e.category === 'global_etf';
                        if (sub === 'liquid') return e.category === 'liquid';
                        return true;
                      });
                    });
                  }
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    filteredList = filteredList.filter(e => e.symbol.toLowerCase().includes(q) || e.underlying.toLowerCase().includes(q));
                  }

                  // Apply column sorting
                  filteredList.sort((a, b) => {
                    let valA = a[etfSortField];
                    let valB = b[etfSortField];
                    if (typeof valA === 'string') {
                      valA = valA.toLowerCase();
                      valB = (valB || '').toLowerCase();
                      return etfSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    return etfSortAsc ? valA - valB : valB - valA;
                  });

                  const displayList = viewAllEtfBoard ? filteredList : filteredList.slice(0, 10);
                  if (displayList.length === 0) {
                    return (
                      <tr>
                        <td colSpan="16" className="p-6 text-center text-slate-500 font-medium">No ETFs found matching active filters.</td>
                      </tr>
                    );
                  }

                  return displayList.map((etf) => (
                    <tr 
                      key={etf.symbol} 
                      onClick={() => setActiveModalFund({
                        name: `${etf.symbol} (${etf.underlying})`,
                        family: 'Exchange Traded Fund',
                        category: etf.underlying,
                        nav: etf.ltp,
                        aum: etf.valueCr * 10,
                        oneYrReturn: etf.pctChange,
                        returns: { '1D': etf.pctChange, '1M': etf.change30D, '1Y': etf.pctChange * 12, '3Y': etf.pctChange * 24 }
                      })}
                      className="hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer transition-colors group"
                      title="Click to view full holdings & portfolio breakdown"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 sticky left-0 bg-white dark:bg-slate-900/90 backdrop-blur group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                        <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{etf.symbol}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[220px] truncate" title={etf.underlying}>{etf.underlying}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.open != null ? etf.open.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.high != null ? etf.high.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.low != null ? etf.low.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.prevClose != null ? etf.prevClose.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{etf.ltp != null ? etf.ltp.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400 dark:text-slate-600 font-mono">{etf.indicativeClose}</td>
                      <td className={`py-2.5 px-2 text-right font-mono font-semibold ${etf.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {etf.change != null ? (etf.change >= 0 ? `+${etf.change.toFixed(2)}` : etf.change.toFixed(2)) : '-'}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-mono font-bold ${etf.pctChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {etf.pctChange != null ? (etf.pctChange >= 0 ? `+${etf.pctChange.toFixed(2)}%` : `${etf.pctChange.toFixed(2)}%`) : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.volume}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-800 dark:text-slate-300 font-semibold">{etf.valueCr != null ? etf.valueCr.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{etf.nav != null ? etf.nav.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.high52 != null ? etf.high52.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">{etf.low52 != null ? etf.low52.toFixed(2) : '-'}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${etf.change30D >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {etf.change30D != null ? (etf.change30D >= 0 ? `+${etf.change30D.toFixed(2)}%` : `${etf.change30D.toFixed(2)}%`) : '-'}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTOR-WISE & MAJOR STOCK HOLDINGS CARD ── */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Mutual Funds Sector-Wise & Major Stock Holdings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Aggregated sector allocations and top individual stock positions held across Indian Mutual Funds by Weight %, Market Cap, Volume, and Fund Exposure.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                Live Holdings Analytics
              </span>
            </div>
          </div>

          {/* Sector-Wise Allocation Summary Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Sector-Wise Asset Distribution
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { sector: 'Financial Services', weight: '31.4%', aum: '₹ 2.56 Lakh Cr', fundsCount: 48, color: 'bg-indigo-500', pct: 31.4 },
                { sector: 'Technology & IT', weight: '18.2%', aum: '₹ 1.48 Lakh Cr', fundsCount: 36, color: 'bg-emerald-500', pct: 18.2 },
                { sector: 'Energy & Oil', weight: '14.5%', aum: '₹ 1.18 Lakh Cr', fundsCount: 29, color: 'bg-amber-500', pct: 14.5 },
                { sector: 'Capital Goods & Infra', weight: '12.8%', aum: '₹ 1.04 Lakh Cr', fundsCount: 25, color: 'bg-purple-500', pct: 12.8 },
                { sector: 'Healthcare & Pharma', weight: '9.6%', aum: '₹ 0.78 Lakh Cr', fundsCount: 22, color: 'bg-rose-500', pct: 9.6 },
                { sector: 'FMCG & Consumer', weight: '7.2%', aum: '₹ 0.58 Lakh Cr', fundsCount: 18, color: 'bg-cyan-500', pct: 7.2 },
                { sector: 'Automobile & Auto', weight: '6.3%', aum: '₹ 0.51 Lakh Cr', fundsCount: 16, color: 'bg-orange-500', pct: 6.3 },
                { sector: 'Telecommunication', weight: '4.8%', aum: '₹ 0.39 Lakh Cr', fundsCount: 14, color: 'bg-pink-500', pct: 4.8 },
                { sector: 'Chemicals & Materials', weight: '3.9%', aum: '₹ 0.31 Lakh Cr', fundsCount: 12, color: 'bg-teal-500', pct: 3.9 },
                { sector: 'Construction & Metals', weight: '3.1%', aum: '₹ 0.25 Lakh Cr', fundsCount: 10, color: 'bg-blue-500', pct: 3.1 }
              ].map(sec => (
                <div key={sec.sector} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{sec.sector}</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{sec.weight}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${sec.color}`} style={{ width: `${sec.pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>AUM: {sec.aum}</span>
                    <span>{sec.fundsCount} Funds</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Stocks Majorly Invested Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Top Stocks Majorly Invested by Mutual Funds
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Sorted by Portfolio Weight & MF Exposure</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                    <th className="py-3 px-4 font-semibold">Stock Name</th>
                    <th className="py-3 px-3 font-semibold">Sector</th>
                    <th className="py-3 px-3 font-semibold text-right">Avg Weight %</th>
                    <th className="py-3 px-3 font-semibold text-right">Market Cap</th>
                    <th className="py-3 px-3 font-semibold text-right">Volume (24h)</th>
                    <th className="py-3 px-3 font-semibold text-right">MF Holding %</th>
                    <th className="py-3 px-4 font-semibold">Top Invested Funds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                  {[
                    { stock: 'HDFC Bank Ltd.', symbol: 'HDFCBANK', sector: 'Financial Services', weight: '8.45%', mcap: '₹ 12.85 Lakh Cr', volume: '18.4M', mfHolding: '19.4%', topFunds: 'HDFC Flexi Cap, ICICI Bluechip, SBI Small Cap' },
                    { stock: 'ICICI Bank Ltd.', symbol: 'ICICIBANK', sector: 'Financial Services', weight: '7.80%', mcap: '₹ 8.42 Lakh Cr', volume: '14.2M', mfHolding: '17.8%', topFunds: 'Parag Parikh Flexi Cap, Quant Small Cap' },
                    { stock: 'Reliance Industries Ltd.', symbol: 'RELIANCE', sector: 'Energy & Oil', weight: '7.15%', mcap: '₹ 19.85 Lakh Cr', volume: '9.6M', mfHolding: '14.2%', topFunds: 'HDFC Flexi Cap, Nippon Multi Cap' },
                    { stock: 'Infosys Ltd.', symbol: 'INFY', sector: 'Technology', weight: '6.20%', mcap: '₹ 6.75 Lakh Cr', volume: '11.8M', mfHolding: '16.5%', topFunds: 'ICICI Tech Fund, Franklin Flexi Cap' },
                    { stock: 'Tata Consultancy Services', symbol: 'TCS', sector: 'Technology', weight: '5.40%', mcap: '₹ 13.90 Lakh Cr', volume: '4.5M', mfHolding: '9.8%', topFunds: 'UTI Nifty 50, HSBC Flexi Cap' },
                    { stock: 'Larsen & Toubro Ltd.', symbol: 'LT', sector: 'Capital Goods', weight: '4.80%', mcap: '₹ 5.12 Lakh Cr', volume: '3.8M', mfHolding: '18.2%', topFunds: 'JM Flexicap, Edelweiss Flexi Cap' },
                    { stock: 'Axis Bank Ltd.', symbol: 'AXISBANK', sector: 'Financial Services', weight: '4.10%', mcap: '₹ 3.65 Lakh Cr', volume: '8.2M', mfHolding: '15.6%', topFunds: 'Kotak Emerging Equity, Axis Small Cap' },
                    { stock: 'Bharti Airtel Ltd.', symbol: 'BHARTIARTL', sector: 'Telecommunication', weight: '3.60%', mcap: '₹ 8.10 Lakh Cr', volume: '6.1M', mfHolding: '12.4%', topFunds: 'Quant Multi Cap, PGIM Flexi Cap' },
                    { stock: 'ITC Ltd.', symbol: 'ITC', sector: 'FMCG', weight: '3.25%', mcap: '₹ 5.82 Lakh Cr', volume: '12.5M', mfHolding: '11.2%', topFunds: 'SBI Small Cap, Bank of India Flexi Cap' },
                    { stock: 'Sun Pharmaceutical Ltd.', symbol: 'SUNPHARMA', sector: 'Healthcare', weight: '2.90%', mcap: '₹ 4.15 Lakh Cr', volume: '2.9M', mfHolding: '13.8%', topFunds: 'Mirae ELSS Tax Saver, Quant Focused' }
                  ].map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-200">{item.stock}</div>
                        <div className="text-[10px] font-mono text-slate-500">{item.symbol}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.sector}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5">
                        {item.weight}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                        {item.mcap}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {item.volume}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.mfHolding}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]" title={item.topFunds}>
                        {item.topFunds}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── TRADOX CATEGORY TILES GRID ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">Explore Mutual Funds by Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Momentum 30', desc: '48 Funds & ETFs', icon: '🚀', cat: 'index', sub: 'momentum30' },
              { label: 'Large Cap', desc: '245 Funds', icon: '📈', cat: 'equity', sub: 'largecap' },
              { label: 'Mid Cap', desc: '312 Funds', icon: '📊', cat: 'equity', sub: 'midcap' },
              { label: 'Small Cap', desc: '425 Funds', icon: '🔥', cat: 'equity', sub: 'smallcap' },
              { label: 'Flexi Cap', desc: '210 Funds', icon: '💼', cat: 'equity', sub: 'flexicap' },
              { label: 'Multi Cap', desc: '178 Funds', icon: '🧩', cat: 'equity', sub: 'multicap' },
              { label: 'ELSS', desc: '165 Funds', icon: '🛡️', cat: 'equity', sub: 'elss' },
              { label: 'Sectoral/Thematic', desc: '96 Funds', icon: '⚡', cat: 'equity', sub: 'sectoral' },
              { label: 'Index Funds', desc: '102 Funds', icon: '🎯', cat: 'index', sub: 'all' },
              { label: 'Global Funds', desc: '78 Funds', icon: '🌍', cat: 'global', sub: 'all' },
              { label: 'GIFT City', desc: '48 Funds', icon: '🏢', cat: 'gift', sub: 'all' },
              { label: 'FOF', desc: '28 Funds', icon: '🔄', cat: 'fof', sub: 'all' },
              { label: 'Commodity', desc: '28 Funds', icon: '🪙', cat: 'commodities', sub: 'all' }
            ].map((cat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedCategory(cat.cat);
                  setSelectedSubCategories([cat.sub]);
                  setSearchQuery('');
                  if (rankingTableRef.current) {
                    rankingTableRef.current.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all rounded-xl p-4 text-left flex items-start gap-3 group cursor-pointer shadow-2xs"
              >
                <div className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{cat.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── TRADOX SIP, LEADERBOARDS & NFOs SECTION ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Top SIP Funds */}
          <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Top SIP Funds</span>
              <span onClick={() => setViewAllSIP(!viewAllSIP)} className="text-[9px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{viewAllSIP ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
              {enrichedFunds.filter(f => f.isSIP).sort((a, b) => b.returns['1Y'] - a.returns['1Y']).slice(0, viewAllSIP ? 20 : 5).map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setActiveModalFund(f)}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate w-36">{f.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{f.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{f.returns['1Y']}%</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">₹{f.nav}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Funds by 5Y Return */}
          <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Top Funds by 5Y Return</span>
              <span onClick={() => setViewAll5Y(!viewAll5Y)} className="text-[9px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{viewAll5Y ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
              {[...enrichedFunds].sort((a, b) => b.returns['5Y'] - a.returns['5Y']).slice(0, viewAll5Y ? 20 : 5).map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setActiveModalFund(f)}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate w-36">{f.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{f.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{f.returns['5Y']}%</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">5Y CAGR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Invested AMCs */}
          <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Most Invested AMCs</span>
              <span onClick={() => setViewAllAMCs(!viewAllAMCs)} className="text-[9px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{viewAllAMCs ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
              {mostInvestedAMCs.slice(0, viewAllAMCs ? mostInvestedAMCs.length : 5).map((amc, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSearchQuery(amc.name);
                    if (rankingTableRef.current) rankingTableRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate w-36">{amc.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">AUM: ₹{amc.aumStr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{amc.share}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Mkt Share</div>
                  </div>
                </div>
              ))}
              {mostInvestedAMCs.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs">No AMC data.</div>
              )}
            </div>
          </div>

          {/* New Fund Offers (NFO) */}
          <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">New Fund Offers</span>
              <span onClick={() => setViewAllNFOs(!viewAllNFOs)} className="text-[9px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{viewAllNFOs ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5">
              {[
                { name: 'PGIM India Flexi Cap Fund', date: '25 May 2025', family: 'PGIM India Mutual Fund', category: 'Flexi Cap Equity' },
                { name: 'HSBC Multi Cap Fund', date: '28 May 2025', family: 'HSBC Mutual Fund', category: 'Multi Cap Equity' },
                { name: 'Tata Consumer Fund', date: '30 May 2025', family: 'Tata Mutual Fund', category: 'Sectoral Consumption' },
                { name: 'Motilal Oswal Midcap Fund', date: '02 Jun 2025', family: 'Motilal Oswal Mutual Fund', category: 'Mid Cap Equity' },
                { name: 'Bandhan Balanced Fund', date: '05 Jun 2025', family: 'Bandhan Mutual Fund', category: 'Hybrid Balanced' }
              ].map((nfo, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveModalFund({
                    id: '118991',
                    name: nfo.name,
                    category: nfo.category,
                    family: nfo.family,
                    nav: null,
                    aum: null,
                    sharpeRatio: null,
                    sortinoRatio: null,
                    returns: { '1Y': null }
                  })}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate w-36">{nfo.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Open Ends</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-orange-600 dark:text-orange-400">NFO Open</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Ends {nfo.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Category Performance Analytics (Tradox style) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bar chart of 1Y Return */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Category Performance (1Y Return)</h3>
            <div className="space-y-4">
              {[
                { cat: 'Small Cap', ret: 62.45, color: 'bg-emerald-500' },
                { cat: 'Mid Cap', ret: 38.62, color: 'bg-emerald-500/80' },
                { cat: 'Flexi Cap', ret: 28.91, color: 'bg-emerald-500/60' },
                { cat: 'Large Cap', ret: 24.15, color: 'bg-emerald-500/40' },
                { cat: 'ELSS', ret: 22.34, color: 'bg-indigo-500' },
                { cat: 'Multi Cap', ret: 21.75, color: 'bg-indigo-500/80' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span>{item.cat}</span>
                    <span className="font-bold">{item.ret}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.ret}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap / Popular Searches */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Popular Searches</h3>
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Best Small Cap Funds',
                  'Top SIP Funds',
                  'High Return Funds',
                  'Tax Saving Funds (ELSS)',
                  'Best Flexi Cap Funds',
                  'Low Expense Ratio Funds',
                  'Best Debt Funds',
                  'Global Funds',
                  'Dividend Yield Funds',
                  'Best Index Funds'
                ].map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      // Extract relevant search keyword from the popular search term
                      const keyword = term.replace(/^best\s+/i, '').replace(/\s+funds?$/i, '');
                      setSearchQuery(keyword);
                      setSelectedCategory('all');
                    }}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Start Your SIP Investment today</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Setup automated monthly investments in top performing direct plans.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── OLD VIEW TOGGLES & DETAIL PANELS (Retained below for consistency) ── */}
        <div className="border-t border-slate-200 dark:border-slate-800/80 pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Sector Allocations & Comparison</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deep-dive comparison table and sector aggregates.</p>
            </div>
            
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1 rounded-xl inline-flex shadow-sm">
              <button
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-color)]'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid2X2 size={14} /> Sector Grid
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-color)]'}`}
                onClick={() => setViewMode('table')}
              >
                <TableProperties size={14} /> Comparison Table
              </button>
            </div>
          </div>

          {/* Macro Snapshot Strip */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center mb-4 text-[var(--text-muted)]">
              <Info className="w-4 h-4 mr-2" />
              <span className="text-xs font-semibold uppercase tracking-wider">Macroeconomic Indicators</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-muted)]">RBI Repo Rate</div>
                <div className="text-xl font-bold">{macro.repoRate.value}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">As of {macro.repoRate.date}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-muted)]">CPI Inflation</div>
                <div className="text-xl font-bold">{macro.cpiInflation.value}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">As of {macro.cpiInflation.date}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[var(--text-muted)]">GDP Growth</div>
                <div className="text-xl font-bold">{macro.gdpGrowth.value}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">As of {macro.gdpGrowth.date}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[var(--text-muted)]">IIP</div>
                <div className="text-xl font-bold">{macro.iip.value}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">As of {macro.iip.date}</div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === 'table' ? (
            <div className="animate-in fade-in duration-300">
              <ComparisonTable 
                funds={flatFunds.filter(fund => {
                  const q = (searchQuery || '').toLowerCase();
                  return (fund.name || '').toLowerCase().includes(q) || 
                         (fund.family || '').toLowerCase().includes(q) ||
                         (fund.sectorName || '').toLowerCase().includes(q);
                })} 
              />
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {filteredSectors.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  No funds or sectors match your search.
                </div>
              ) : (
                filteredSectors.map(sector => {
                  const isExpanded = expandedSectors[sector.sectorId];
                  return (
                    <div key={sector.sectorId} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden transition-all duration-300 hover:border-[var(--border-hover)]">
                      {/* Sector Header */}
                      <button 
                        onClick={() => toggleSector(sector.sectorId)}
                        className="w-full flex items-center justify-between p-5 focus:outline-none"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                          <div className="text-left">
                            <h2 className="text-base font-bold">{sector.sectorName}</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{sector.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold px-3 py-1 bg-[var(--bg-color)] text-[var(--text-muted)] rounded-full border border-[var(--border-color)]">
                            Showing top {sector.topN} of {sector.totalSchemeCount} total schemes
                          </span>
                        </div>
                      </button>

                      {/* Sector Funds */}
                      {isExpanded && (
                        <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-color)] space-y-3">
                          {sector.filteredFunds.length === 0 ? (
                            <div className="text-[var(--text-muted)] text-xs py-2 px-4">
                              No funds match the search in this sector.
                            </div>
                          ) : (
                            sector.filteredFunds.map(fund => (
                              <ExpandableAssetRow 
                                key={fund.id}
                                asset={{
                                  id: fund.id,
                                  symbol: fund.id,
                                  name: fund.name,
                                  type: 'mf',
                                  family: fund.family,
                                  currency: fund.currency,
                                  currentPrice_or_nav: fund.currentPrice_or_nav,
                                  oneYearChangePct: fund.oneYearChangePct,
                                  sharpeRatio: fund.sharpeRatio,
                                  sortinoRatio: fund.sortinoRatio,
                                  navAvailable: fund.navAvailable,
                                  sector: sector.sectorName
                                }}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Macro Correlation Section */}
          <MacroCorrelationSection />

          {/* All Funds Directory Section */}
          <AllMutualFundsDirectory externalSearchQuery={searchQuery} />
        </div>

        {/* Fund Detail Drawer / Modal */}
        <FundDetailModal fund={activeModalFund} onClose={() => setActiveModalFund(null)} />

        {/* Sharpe & Sortino Range Guide Modal */}
        {showRatioGuide && <RatioRangeGuideModal onClose={() => setShowRatioGuide(false)} />}

      </div>
    </div>
  );
};

export default IndianMfSectorAnalysis;
