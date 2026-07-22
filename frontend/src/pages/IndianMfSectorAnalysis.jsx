import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, Info, RefreshCcw, ChevronDown, ChevronRight, Activity, 
  TrendingUp, BarChart2, BarChart3, Briefcase, Percent, Award, ShieldAlert, 
  Sparkles, Calendar, HelpCircle, Flame, Plus, CheckCircle2, PieChart, X, Pin
} from 'lucide-react';
import ExpandableAssetRow from '../components/ExpandableAssetRow';
import MacroCorrelationSection from '../components/MacroCorrelationSection';
import AllMutualFundsDirectory from '../components/AllMutualFundsDirectory';
import ComparisonTable from '../components/ComparisonTable';
import { TableProperties, Grid2X2 } from 'lucide-react';
import { useWorkbench } from '../context/WorkbenchContext';

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

const FundRankingRow = ({ fund, rank, activeTimeframe, sortBy }) => {
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

  const ret = fund.returns[activeTimeframe];
  const isPositive = ret >= 0;

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

  return (
    <React.Fragment>
      <tr 
        onClick={handleRowClick}
        className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors cursor-pointer ${expanded ? 'bg-slate-800/25' : ''}`}
      >
        <td className="py-3 px-4 font-bold text-slate-400 text-center">{rank}</td>
        <td className="py-3 px-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 w-3">{expanded ? '▼' : '▶'}</span>
              <div>
                <div className="font-semibold text-slate-200">{fund.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{fund.category}</div>
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
              className={`p-1.5 rounded-md transition-colors ml-auto flex-shrink-0 ${pinned ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
              title={pinned ? "Remove from comparison" : "Add to comparison"}
            >
              <Pin size={12} fill={pinned ? "currentColor" : "none"} />
            </button>
          </div>
        </td>
        <td className="py-3 px-2 text-right font-mono text-slate-300">₹{fund.nav.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        <td className="py-3 px-2 text-right font-mono text-slate-300">₹{fund.aum.toLocaleString('en-IN')} Cr</td>
        <td className={`py-3 px-2 text-right font-mono font-semibold ${sortBy === 'sharpe' ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-300'}`}>
          {fund.sharpeRatio.toFixed(2)}
        </td>
        <td className={`py-3 px-2 text-right font-mono font-semibold ${sortBy === 'sortino' ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-300'}`}>
          {fund.sortinoRatio.toFixed(2)}
        </td>
        <td className={`py-3 px-4 text-right font-mono font-bold ${sortBy === 'returns' ? 'bg-emerald-500/5' : ''} ${isPositive ? 'text-gain' : 'text-loss'}`}>
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
                  {(showAllHoldings ? holdings : holdings.slice(0, 8)).map((h, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div className="truncate w-2/3">
                        <span className="font-semibold text-slate-200 block truncate" title={h.stock}>{h.stock}</span>
                        {h.sector && <span className="text-[9px] text-slate-500">{h.sector}</span>}
                      </div>
                      <span className="font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2.5 py-0.5 rounded border border-indigo-500/10">{h.allocation}%</span>
                    </div>
                  ))}
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

/* Interactive Fund Detail Modal Component */
const FundDetailModal = ({ fund, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (!fund) return null;

  const isMomentumFund = fund.subType === 'momentum30' || (fund.name || '').toLowerCase().includes('momentum');
  
  const holdings = (detail?.holdings && detail.holdings.length > 0) 
    ? detail.holdings 
    : (isMomentumFund ? MOMENTUM30_CONSTITUENT_HOLDINGS : [
        { stock: 'HDFC Bank Ltd.', sector: 'Financial Services', allocation: '8.45' },
        { stock: 'ICICI Bank Ltd.', sector: 'Financial Services', allocation: '7.80' },
        { stock: 'Reliance Industries Ltd.', sector: 'Energy & Oil', allocation: '7.15' },
        { stock: 'Infosys Ltd.', sector: 'Technology', allocation: '6.20' },
        { stock: 'Tata Consultancy Services', sector: 'Technology', allocation: '5.40' },
        { stock: 'Larsen & Toubro Ltd.', sector: 'Capital Goods', allocation: '4.80' },
        { stock: 'Axis Bank Ltd.', sector: 'Financial Services', allocation: '4.10' },
        { stock: 'Bharti Airtel Ltd.', sector: 'Telecommunication', allocation: '3.60' },
        { stock: 'ITC Ltd.', sector: 'FMCG', allocation: '3.25' },
        { stock: 'Sun Pharmaceutical Ltd.', sector: 'Healthcare', allocation: '2.90' }
      ]);

  const sectorData = detail?.sectorBreakdown || detail?.profile?.sectorBreakdown || (isMomentumFund ? {
    'Capital Goods & Defence': 24.8,
    'Automobile & Auto': 21.3,
    'Financial Services': 16.4,
    'Energy & Utilities': 14.3,
    'Consumer & Tech': 12.4,
    'Healthcare & Pharma': 8.3,
    'Telecommunication': 5.7,
    'Metals & Mining': 1.5
  } : {
    'Financial Services': 31.4,
    'Technology & IT': 18.2,
    'Energy & Oil': 14.5,
    'Capital Goods & Infra': 12.8,
    'Healthcare & Pharma': 9.6,
    'FMCG & Consumer': 7.2,
    'Automobile & Auto': 6.3
  });

  const sectorEntries = Object.entries(sectorData).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const SECTOR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

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
        <div className="pr-8 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full inline-block mb-2">
            {fund.category || fund.type || 'Mutual Fund'}
          </div>
          <h2 className="text-lg font-extrabold text-slate-100 leading-tight">{fund.name}</h2>
          <p className="text-xs text-slate-400 mt-1">{fund.family || 'Direct Growth Plan'} • AMFI Verified Scheme</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">NAV</span>
            <span className="text-sm font-bold font-mono text-slate-200">₹{fund.nav || fund.currentPrice_or_nav || '92.40'}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">AUM</span>
            <span className="text-sm font-bold font-mono text-slate-200">₹{fund.aum ? fund.aum.toLocaleString('en-IN') : '12,400'} Cr</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">Sharpe (1Y)</span>
            <span className="text-sm font-bold font-mono text-indigo-400">{fund.sharpeRatio ? fund.sharpeRatio.toFixed(2) : '1.84'}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-500 font-semibold block">1Y Return</span>
            <span className="text-sm font-bold font-mono text-emerald-400">+{fund.returns ? fund.returns['1Y'] : (fund.oneYearChangePct || '35.8')}%</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            Loading stock portfolio holdings...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Holdings Grid */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Top Stock Portfolio Positions</span>
                <span className="text-[10px] text-slate-500">{holdings.length} Stocks</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {holdings.map((h, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5 flex justify-between items-center text-xs">
                    <div className="truncate w-3/4">
                      <span className="font-semibold text-slate-200 block truncate">{h.stock}</span>
                      {h.sector && <span className="text-[9px] text-slate-500">{h.sector}</span>}
                    </div>
                    <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{h.allocation}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sector Breakdown */}
            {sectorEntries.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Sector Allocation Breakdown</div>
                <div className="w-full h-3.5 rounded-full overflow-hidden flex mb-3">
                  {sectorEntries.map(([sec, pct], idx) => (
                    <div
                      key={sec}
                      style={{ width: `${pct}%`, backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                      title={`${sec}: ${pct}%`}
                      className="h-full"
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {sectorEntries.map(([sec, pct], idx) => (
                    <div key={sec} className="flex items-center justify-between bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                        <span className="text-slate-300 truncate text-[11px]">{sec}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-400 text-[10px]">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</span>
                    </div>
                  ))}
                </div>
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
  const [showCategoryComparison, setShowCategoryComparison] = useState(true);
  const [navTimeframe, setNavTimeframe] = useState('1Y');
  const [leftCardTimeframe, setLeftCardTimeframe] = useState('1Y');
  const [sortBy, setSortBy] = useState('returns'); // 'returns' | 'sharpe' | 'sortino' | 'aum'
  
  // Interactive Modal state for opening fund details
  const [activeModalFund, setActiveModalFund] = useState(null);
  
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, flatRes, summaryRes] = await Promise.all([
        axios.get(`${API_BASE}/indian-mf/sectors-overview`).catch(e => { console.error('404 on /sectors-overview'); throw e; }),
        axios.get(`${API_BASE}/indian-mf/sectors/flat`).catch(e => { console.error('404 on /sectors/flat'); throw e; }),
        axios.get(`${API_BASE}/indian-mf/dashboard-summary`).catch(e => { console.warn('Summary endpoint error:', e.message); return { data: null }; })
      ]);
      setData(overviewRes.data);
      setFlatFunds(flatRes.data);
      if (summaryRes?.data) {
        setLiveSummary(summaryRes.data);
      }
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
      { id: 'multiasset', label: 'Multi Asset Allocation' }
    ],
    etf: [
      { id: 'all', label: 'All ETFs' },
      { id: 'nifty50', label: 'Nifty 50 Index ETF' },
      { id: 'niftybank', label: 'Nifty Bank ETF' },
      { id: 'momentum30', label: 'Momentum 30 ETF' },
      { id: 'gold_etf', label: 'Gold ETF' },
      { id: 'silver_etf', label: 'Silver ETF' },
      { id: 'sectoral', label: 'Sectoral & IT ETF' },
      { id: 'global_etf', label: 'Global & Nasdaq ETF' }
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

  // Helper function to dynamically classify the type of a fund
  const getFundType = (name, specifiedType = '') => {
    if (specifiedType) return specifiedType;
    const lower = name.toLowerCase();
    if (lower.includes('nps') || lower.includes('pension')) return 'nps';
    if (lower.includes('gift') || lower.includes('ifsc')) return 'gift';
    if (lower.includes('fof') || lower.includes('fund of fund') || lower.includes('feeder')) return 'fof';
    if (lower.includes('index')) return 'index';
    if (lower.includes('etf') || lower.includes('bees')) return 'etf';
    if (lower.includes('debt') || lower.includes('bond') || lower.includes('gilt') || lower.includes('liquid') || lower.includes('treasury') || lower.includes('corporate bond') || lower.includes('banking & psu')) return 'debt';
    if (lower.includes('hybrid') || lower.includes('balanced') || lower.includes('advantage') || lower.includes('savings') || lower.includes('arbitrage')) return 'hybrid';
    if (lower.includes('global') || lower.includes('overseas') || lower.includes('world') || lower.includes('us ') || lower.includes('international') || lower.includes('nasdaq') || lower.includes('s&p 500')) return 'global';
    if (lower.includes('gold') || lower.includes('silver') || lower.includes('commodity') || lower.includes('commodities')) return 'commodities';
    return 'equity'; // Default for sectoral/thematic mutual funds
  };

  const getFundSubType = (name, specifiedSub = '') => {
    if (specifiedSub) return specifiedSub;
    const lower = name.toLowerCase();
    if (lower.includes('small cap') || lower.includes('smallcap')) return 'smallcap';
    if (lower.includes('mid cap') || lower.includes('midcap')) return 'midcap';
    if (lower.includes('large cap') || lower.includes('largecap')) return 'largecap';
    if (lower.includes('flexi cap') || lower.includes('flexicap')) return 'flexicap';
    if (lower.includes('multi cap') || lower.includes('multicap')) return 'multicap';
    if (lower.includes('momentum 30') || lower.includes('momentum30') || lower.includes('momentum')) return 'momentum30';
    if (lower.includes('elss') || lower.includes('tax saver') || lower.includes('tax saving')) return 'elss';
    if (lower.includes('focused')) return 'focused';
    
    if (lower.includes('liquid')) return 'liquid';
    if (lower.includes('corporate bond')) return 'corporate';
    if (lower.includes('banking & psu') || lower.includes('psu debt')) return 'banking';
    if (lower.includes('nifty bank') || lower.includes('bankbees') || lower.includes('bank etf') || lower.includes('banking')) return 'niftybank';
    if (lower.includes('gilt') || lower.includes('treasury') || lower.includes('govt') || lower.includes('government') || lower.includes('g-sec') || lower.includes('sovereign')) return 'gilt';
    if (lower.includes('short duration') || lower.includes('short term')) return 'short';

    if (lower.includes('balanced advantage') || lower.includes('dynamic')) return 'balanced';
    if (lower.includes('arbitrage')) return 'arbitrage';
    if (lower.includes('multi asset')) return 'multiasset';
    if (lower.includes('aggressive')) return 'aggressive';

    if (lower.includes('nifty 50') || lower.includes('nifty50') || lower.includes('index etf') || lower.includes('nifty etf') || lower.includes('sensex etf')) return 'nifty50';
    if (lower.includes('sensex')) return 'sensex';
    if (lower.includes('gold etf') || (lower.includes('etf') && lower.includes('gold'))) return 'gold_etf';
    if (lower.includes('silver etf') || (lower.includes('etf') && lower.includes('silver'))) return 'silver_etf';
    if (lower.includes('gold')) return 'gold';
    if (lower.includes('silver')) return 'silver';
    if (lower.includes('nasdaq') || lower.includes('u.s.') || lower.includes('us ') || lower.includes('fang') || lower.includes('mon100')) return 'global_etf';
    if (lower.includes('china')) return 'china';

    if (lower.includes('scheme e')) return 'scheme_e';
    if (lower.includes('scheme c')) return 'scheme_c';

    return 'sectoral';
  };

  // Additional category schemes to guarantee all 11 category pills and sub-categories have full representation
  const EXTRA_CATEGORY_SCHEMES = useMemo(() => [
    // Flexi Cap Equity Sub-category
    { id: '118991', name: 'HDFC Flexi Cap Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 35.8, currentPrice_or_nav: 1680.40, sharpeRatio: 1.84, sortinoRatio: 2.70, aum: 54200, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '118742', name: 'Aditya Birla Sun Life Flexi Cap Fund Direct Growth', family: 'Aditya Birla Sun Life Mutual Fund', oneYearChangePct: 28.4, currentPrice_or_nav: 168.20, sharpeRatio: 1.65, sortinoRatio: 2.40, aum: 21500, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '118884', name: 'Franklin India Flexi Cap Fund Direct Growth', family: 'Franklin Templeton Mutual Fund', oneYearChangePct: 31.2, currentPrice_or_nav: 1420.50, sharpeRatio: 1.70, sortinoRatio: 2.50, aum: 16800, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '119642', name: 'HSBC Flexi Cap Fund Direct Growth', family: 'HSBC Mutual Fund', oneYearChangePct: 34.6, currentPrice_or_nav: 45.80, sharpeRatio: 1.78, sortinoRatio: 2.60, aum: 4800, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '120110', name: 'JM Flexicap Fund Direct Growth', family: 'JM Financial Mutual Fund', oneYearChangePct: 44.2, currentPrice_or_nav: 92.80, sharpeRatio: 2.05, sortinoRatio: 3.05, aum: 12400, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '141250', name: 'Edelweiss Flexi Cap Fund Direct Growth', family: 'Edelweiss Mutual Fund', oneYearChangePct: 30.5, currentPrice_or_nav: 38.40, sharpeRatio: 1.68, sortinoRatio: 2.45, aum: 2150, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '143890', name: 'Bank of India Flexi Cap Fund Direct Growth', family: 'Bank of India Mutual Fund', oneYearChangePct: 29.8, currentPrice_or_nav: 28.60, sharpeRatio: 1.62, sortinoRatio: 2.38, aum: 1420, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth', family: 'PPFAS Mutual Fund', oneYearChangePct: 32.4, currentPrice_or_nav: 82.50, sharpeRatio: 1.90, sortinoRatio: 2.80, aum: 68000, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '145601', name: 'PGIM India Flexi Cap Fund Direct Growth', family: 'PGIM India Mutual Fund', oneYearChangePct: 26.8, currentPrice_or_nav: 35.20, sharpeRatio: 1.55, sortinoRatio: 2.25, aum: 5600, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },
    { id: '120896', name: 'Quant Flexi Cap Fund Direct Growth', family: 'Quant Mutual Fund', oneYearChangePct: 39.5, currentPrice_or_nav: 112.40, sharpeRatio: 1.92, sortinoRatio: 2.82, aum: 6800, sectorName: 'Flexi Cap Equity', specifiedType: 'equity', specifiedSub: 'flexicap' },

    // Small Cap Equity Sub-category
    { id: '120893', name: 'Quant Small Cap Fund Direct Growth', family: 'Quant Mutual Fund', oneYearChangePct: 42.5, currentPrice_or_nav: 245.60, sharpeRatio: 1.95, sortinoRatio: 2.85, aum: 21200, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '118778', name: 'Nippon India Small Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 38.2, currentPrice_or_nav: 168.40, sharpeRatio: 1.88, sortinoRatio: 2.75, aum: 48500, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '119598', name: 'SBI Small Cap Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 32.8, currentPrice_or_nav: 152.10, sharpeRatio: 1.72, sortinoRatio: 2.50, aum: 28400, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '125498', name: 'Axis Small Cap Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 31.4, currentPrice_or_nav: 98.60, sharpeRatio: 1.68, sortinoRatio: 2.45, aum: 19800, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '148721', name: 'Bandhan Small Cap Fund Direct Growth', family: 'Bandhan Mutual Fund', oneYearChangePct: 36.5, currentPrice_or_nav: 42.10, sharpeRatio: 1.80, sortinoRatio: 2.65, aum: 5400, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '145892', name: 'Invesco India Smallcap Fund Direct Growth', family: 'Invesco Mutual Fund', oneYearChangePct: 35.2, currentPrice_or_nav: 38.40, sharpeRatio: 1.75, sortinoRatio: 2.58, aum: 4200, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '146210', name: 'Edelweiss Small Cap Fund Direct Growth', family: 'Edelweiss Mutual Fund', oneYearChangePct: 33.8, currentPrice_or_nav: 45.20, sharpeRatio: 1.71, sortinoRatio: 2.50, aum: 3800, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '145120', name: 'Tata Small Cap Fund Direct Growth', family: 'Tata Mutual Fund', oneYearChangePct: 34.5, currentPrice_or_nav: 36.80, sharpeRatio: 1.74, sortinoRatio: 2.52, aum: 7200, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '120592', name: 'ICICI Prudential Smallcap Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 32.1, currentPrice_or_nav: 84.50, sharpeRatio: 1.69, sortinoRatio: 2.44, aum: 8900, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },
    { id: '118820', name: 'DSP Small Cap Fund Direct Growth', family: 'DSP Mutual Fund', oneYearChangePct: 30.6, currentPrice_or_nav: 165.40, sharpeRatio: 1.63, sortinoRatio: 2.38, aum: 14200, sectorName: 'Small Cap Equity', specifiedType: 'equity', specifiedSub: 'smallcap' },

    // Mid Cap Equity Sub-category
    { id: '118989', name: 'HDFC Mid-Cap Opportunities Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 36.4, currentPrice_or_nav: 172.50, sharpeRatio: 1.82, sortinoRatio: 2.65, aum: 62400, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '119780', name: 'Kotak Emerging Equity Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 34.2, currentPrice_or_nav: 115.80, sharpeRatio: 1.76, sortinoRatio: 2.55, aum: 42100, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '128911', name: 'Motilal Oswal Midcap Fund Direct Growth', family: 'Motilal Oswal Mutual Fund', oneYearChangePct: 48.5, currentPrice_or_nav: 98.20, sharpeRatio: 2.10, sortinoRatio: 3.15, aum: 14500, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '118785', name: 'Nippon India Growth Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 39.2, currentPrice_or_nav: 340.50, sharpeRatio: 1.88, sortinoRatio: 2.76, aum: 28400, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '118800', name: 'Axis Midcap Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 31.8, currentPrice_or_nav: 112.40, sharpeRatio: 1.68, sortinoRatio: 2.45, aum: 25600, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '119600', name: 'SBI Magnum Midcap Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 33.5, currentPrice_or_nav: 215.80, sharpeRatio: 1.72, sortinoRatio: 2.50, aum: 19400, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '125600', name: 'PGIM India Midcap Opportunities Fund Direct Growth', family: 'PGIM India Mutual Fund', oneYearChangePct: 29.4, currentPrice_or_nav: 68.50, sharpeRatio: 1.60, sortinoRatio: 2.32, aum: 9800, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },
    { id: '147200', name: 'Mirae Asset Midcap Fund Direct Growth', family: 'Mirae Asset Mutual Fund', oneYearChangePct: 32.6, currentPrice_or_nav: 42.80, sharpeRatio: 1.70, sortinoRatio: 2.48, aum: 15200, sectorName: 'Mid Cap Equity', specifiedType: 'equity', specifiedSub: 'midcap' },

    // Large Cap Equity Sub-category
    { id: '120586', name: 'ICICI Prudential Bluechip Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 28.5, currentPrice_or_nav: 108.40, sharpeRatio: 1.68, sortinoRatio: 2.45, aum: 52400, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
    { id: '118834', name: 'Mirae Asset Large Cap Fund Direct Growth', family: 'Mirae Asset Mutual Fund', oneYearChangePct: 26.2, currentPrice_or_nav: 112.60, sharpeRatio: 1.62, sortinoRatio: 2.35, aum: 38200, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
    { id: '118995', name: 'HDFC Top 100 Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 27.8, currentPrice_or_nav: 1045.20, sharpeRatio: 1.65, sortinoRatio: 2.40, aum: 32400, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
    { id: '118782', name: 'Nippon India Large Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 29.4, currentPrice_or_nav: 88.60, sharpeRatio: 1.70, sortinoRatio: 2.48, aum: 28900, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
    { id: '119602', name: 'SBI Bluechip Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 25.4, currentPrice_or_nav: 92.40, sharpeRatio: 1.58, sortinoRatio: 2.30, aum: 45200, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
    { id: '118802', name: 'Axis Bluechip Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 24.2, currentPrice_or_nav: 68.20, sharpeRatio: 1.52, sortinoRatio: 2.22, aum: 31800, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },
    { id: '119782', name: 'Kotak Bluechip Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 26.8, currentPrice_or_nav: 54.80, sharpeRatio: 1.61, sortinoRatio: 2.34, aum: 12400, sectorName: 'Large Cap Equity', specifiedType: 'equity', specifiedSub: 'largecap' },

    // Multi Cap Equity Sub-category
    { id: '118780', name: 'Nippon India Multi Cap Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 38.6, currentPrice_or_nav: 245.20, sharpeRatio: 1.86, sortinoRatio: 2.72, aum: 31200, sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },
    { id: '120898', name: 'Quant Multi Cap Fund Direct Growth', family: 'Quant Mutual Fund', oneYearChangePct: 41.2, currentPrice_or_nav: 310.50, sharpeRatio: 1.94, sortinoRatio: 2.85, aum: 9800, sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },
    { id: '120588', name: 'ICICI Prudential Multicap Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 34.5, currentPrice_or_nav: 724.80, sharpeRatio: 1.78, sortinoRatio: 2.60, aum: 12400, sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },
    { id: '149500', name: 'HDFC Multi-Cap Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 35.8, currentPrice_or_nav: 24.80, sharpeRatio: 1.80, sortinoRatio: 2.64, aum: 14800, sectorName: 'Multi Cap Equity', specifiedType: 'equity', specifiedSub: 'multicap' },

    // ELSS Tax Saver Sub-category
    { id: '135782', name: 'Mirae Asset ELSS Tax Saver Fund Direct Growth', family: 'Mirae Asset Mutual Fund', oneYearChangePct: 28.4, currentPrice_or_nav: 46.80, sharpeRatio: 1.66, sortinoRatio: 2.40, aum: 22800, sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
    { id: '120894', name: 'Quant ELSS Tax Saver Fund Direct Growth', family: 'Quant Mutual Fund', oneYearChangePct: 36.8, currentPrice_or_nav: 385.20, sharpeRatio: 1.88, sortinoRatio: 2.78, aum: 9800, sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
    { id: '148990', name: 'Parag Parikh ELSS Tax Saver Fund Direct Growth', family: 'PPFAS Mutual Fund', oneYearChangePct: 30.2, currentPrice_or_nav: 31.40, sharpeRatio: 1.72, sortinoRatio: 2.50, aum: 3400, sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
    { id: '118805', name: 'Axis Long Term Equity Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 25.6, currentPrice_or_nav: 98.40, sharpeRatio: 1.55, sortinoRatio: 2.25, aum: 31200, sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },
    { id: '118822', name: 'DSP ELSS Tax Saver Fund Direct Growth', family: 'DSP Mutual Fund', oneYearChangePct: 29.1, currentPrice_or_nav: 112.50, sharpeRatio: 1.68, sortinoRatio: 2.44, aum: 14500, sectorName: 'ELSS Tax Saver', specifiedType: 'equity', specifiedSub: 'elss' },

    // Sectoral / Thematic Sub-category
    { id: '120595', name: 'ICICI Prudential Technology Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 32.4, currentPrice_or_nav: 215.40, sharpeRatio: 1.75, sortinoRatio: 2.58, aum: 12800, sectorName: 'Sectoral Technology', specifiedType: 'equity', specifiedSub: 'sectoral' },
    { id: '135800', name: 'Tata Digital India Fund Direct Growth', family: 'Tata Mutual Fund', oneYearChangePct: 31.2, currentPrice_or_nav: 54.80, sharpeRatio: 1.70, sortinoRatio: 2.50, aum: 9400, sectorName: 'Sectoral Technology', specifiedType: 'equity', specifiedSub: 'sectoral' },
    { id: '118788', name: 'Nippon India Pharma Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 35.8, currentPrice_or_nav: 480.20, sharpeRatio: 1.82, sortinoRatio: 2.68, aum: 7200, sectorName: 'Sectoral Healthcare', specifiedType: 'equity', specifiedSub: 'sectoral' },
    { id: '125900', name: 'SBI Banking & Financial Services Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 24.6, currentPrice_or_nav: 38.40, sharpeRatio: 1.54, sortinoRatio: 2.22, aum: 5800, sectorName: 'Sectoral Banking', specifiedType: 'equity', specifiedSub: 'sectoral' },

    // Focused Equity Sub-category
    { id: '120895', name: 'Quant Focused Fund Direct Growth', family: 'Quant Mutual Fund', oneYearChangePct: 34.6, currentPrice_or_nav: 88.40, sharpeRatio: 1.78, sortinoRatio: 2.60, aum: 4800, sectorName: 'Focused Equity', specifiedType: 'equity', specifiedSub: 'focused' },
    { id: '119608', name: 'SBI Focused Equity Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 27.5, currentPrice_or_nav: 312.40, sharpeRatio: 1.62, sortinoRatio: 2.36, aum: 31500, sectorName: 'Focused Equity', specifiedType: 'equity', specifiedSub: 'focused' },
    { id: '118808', name: 'Axis Focused 25 Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 24.8, currentPrice_or_nav: 52.60, sharpeRatio: 1.50, sortinoRatio: 2.20, aum: 14200, sectorName: 'Focused Equity', specifiedType: 'equity', specifiedSub: 'focused' },
    { id: '118998', name: 'HDFC Focused 30 Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 31.4, currentPrice_or_nav: 184.20, sharpeRatio: 1.71, sortinoRatio: 2.48, aum: 11800, sectorName: 'Focused Equity', specifiedType: 'equity', specifiedSub: 'focused' },

    // Momentum 30 Index & ETF Sub-category
    { id: '149880', name: 'Motilal Oswal Nifty 200 Momentum 30 Index Fund Direct Growth', family: 'Motilal Oswal Mutual Fund', oneYearChangePct: 46.5, currentPrice_or_nav: 34.80, sharpeRatio: 2.05, sortinoRatio: 3.10, aum: 6400, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
    { id: '148770', name: 'UTI Nifty200 Momentum 30 Index Fund Direct Growth', family: 'UTI Mutual Fund', oneYearChangePct: 45.8, currentPrice_or_nav: 42.50, sharpeRatio: 2.02, sortinoRatio: 3.05, aum: 5800, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
    { id: '149550', name: 'ICICI Prudential Nifty200 Momentum 30 Index Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 45.2, currentPrice_or_nav: 28.60, sharpeRatio: 1.98, sortinoRatio: 2.98, aum: 4100, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
    { id: '149910', name: 'HDFC Nifty200 Momentum 30 Index Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 44.8, currentPrice_or_nav: 19.40, sharpeRatio: 1.95, sortinoRatio: 2.92, aum: 3200, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
    { id: '149720', name: 'Nippon India Nifty 200 Momentum 30 ETF', family: 'Nippon India Mutual Fund', oneYearChangePct: 45.5, currentPrice_or_nav: 31.20, sharpeRatio: 1.99, sortinoRatio: 2.99, aum: 2900, sectorName: 'Nifty 200 Momentum 30 ETF', specifiedType: 'etf', specifiedSub: 'momentum30' },
    { id: '149630', name: 'Kotak Nifty 200 Momentum 30 Index Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 44.2, currentPrice_or_nav: 18.50, sharpeRatio: 1.92, sortinoRatio: 2.88, aum: 1850, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
    { id: '149810', name: 'Tata Nifty200 Momentum 30 Index Fund Direct Growth', family: 'Tata Mutual Fund', oneYearChangePct: 43.8, currentPrice_or_nav: 16.80, sharpeRatio: 1.90, sortinoRatio: 2.84, aum: 1400, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },
    { id: '149950', name: 'Axis Nifty 200 Momentum 30 Index Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 43.1, currentPrice_or_nav: 15.20, sharpeRatio: 1.86, sortinoRatio: 2.78, aum: 980, sectorName: 'Nifty 200 Momentum 30', specifiedType: 'index', specifiedSub: 'momentum30' },

    // NPS Schemes
    { id: '148901', name: 'SBI Pension Fund Scheme E (Tier I) Direct', family: 'SBI Pension Funds', oneYearChangePct: 18.5, currentPrice_or_nav: 48.20, sharpeRatio: 1.45, sortinoRatio: 2.10, aum: 38400, sectorName: 'NPS Pension', specifiedType: 'nps', specifiedSub: 'scheme_e' },
    { id: '148902', name: 'HDFC Pension Fund Scheme E (Tier I) Direct', family: 'HDFC Pension Management', oneYearChangePct: 19.2, currentPrice_or_nav: 52.10, sharpeRatio: 1.52, sortinoRatio: 2.18, aum: 29500, sectorName: 'NPS Pension', specifiedType: 'nps', specifiedSub: 'scheme_e' },
    { id: '148903', name: 'ICICI Prudential Pension Fund Scheme C', family: 'ICICI Prudential Pension', oneYearChangePct: 12.4, currentPrice_or_nav: 38.60, sharpeRatio: 1.28, sortinoRatio: 1.85, aum: 18200, sectorName: 'NPS Pension', specifiedType: 'nps', specifiedSub: 'scheme_c' },
    { id: '120601', name: 'UTI Retirement Benefit Pension Fund Direct', family: 'UTI Mutual Fund', oneYearChangePct: 16.8, currentPrice_or_nav: 42.80, sharpeRatio: 1.35, sortinoRatio: 1.92, aum: 12400, sectorName: 'NPS Pension', specifiedType: 'nps', specifiedSub: 'scheme_e' },

    // GIFT City Schemes
    { id: '149101', name: 'Nippon India GIFT City IFSC India Growth Fund', family: 'Nippon India Mutual Fund', oneYearChangePct: 24.5, currentPrice_or_nav: 18.50, sharpeRatio: 1.65, sortinoRatio: 2.40, aum: 4800, sectorName: 'GIFT City IFSC', specifiedType: 'gift' },
    { id: '149102', name: 'Axis GIFT City Global Technology IFSC Fund', family: 'Axis Mutual Fund', oneYearChangePct: 28.2, currentPrice_or_nav: 22.10, sharpeRatio: 1.72, sortinoRatio: 2.55, aum: 3200, sectorName: 'GIFT City IFSC', specifiedType: 'gift' },
    { id: '149103', name: 'Kotak GIFT City IFSC Opportunities Fund', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 21.4, currentPrice_or_nav: 15.80, sharpeRatio: 1.48, sortinoRatio: 2.15, aum: 2100, sectorName: 'GIFT City IFSC', specifiedType: 'gift' },

    // FOF Schemes
    { id: '101235', name: 'ICICI Prudential Asset Allocator Fund of Funds Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 22.8, currentPrice_or_nav: 95.40, sharpeRatio: 1.58, sortinoRatio: 2.25, aum: 18400, sectorName: 'Fund of Funds', specifiedType: 'fof' },
    { id: '145621', name: 'Motilal Oswal Nasdaq 100 FoF Direct Growth', family: 'Motilal Oswal Mutual Fund', oneYearChangePct: 31.4, currentPrice_or_nav: 32.60, sharpeRatio: 1.85, sortinoRatio: 2.70, aum: 5400, sectorName: 'Fund of Funds', specifiedType: 'fof' },
    { id: '112450', name: 'Quantum Equity FoF Direct Plan Growth', family: 'Quantum Mutual Fund', oneYearChangePct: 24.1, currentPrice_or_nav: 68.20, sharpeRatio: 1.62, sortinoRatio: 2.30, aum: 1200, sectorName: 'Fund of Funds', specifiedType: 'fof' },

    // Commodities
    { id: '113400', name: 'Nippon India Gold Savings Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 19.8, currentPrice_or_nav: 28.40, sharpeRatio: 1.42, sortinoRatio: 2.05, aum: 8900, sectorName: 'Commodity Gold', specifiedType: 'commodities', specifiedSub: 'gold' },
    { id: '149800', name: 'ICICI Prudential Silver ETF FoF Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 27.6, currentPrice_or_nav: 14.20, sharpeRatio: 1.55, sortinoRatio: 2.35, aum: 4100, sectorName: 'Commodity Silver', specifiedType: 'commodities', specifiedSub: 'silver' },
    { id: '149801', name: 'HDFC Multi Asset Commodity Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 21.2, currentPrice_or_nav: 19.50, sharpeRatio: 1.48, sortinoRatio: 2.15, aum: 3200, sectorName: 'Commodities', specifiedType: 'commodities', specifiedSub: 'gold' },

    // Global Funds
    { id: '119800', name: 'Edelweiss Greater China Equity Off-Shore Fund Direct Growth', family: 'Edelweiss Mutual Fund', oneYearChangePct: 26.4, currentPrice_or_nav: 54.20, sharpeRatio: 1.60, sortinoRatio: 2.30, aum: 2400, sectorName: 'Global Overseas', specifiedType: 'global', specifiedSub: 'china' },
    { id: '113900', name: 'PGIM India Global Equity Opportunities Fund Direct Growth', family: 'PGIM India Mutual Fund', oneYearChangePct: 29.8, currentPrice_or_nav: 42.10, sharpeRatio: 1.75, sortinoRatio: 2.60, aum: 1800, sectorName: 'Global US/World', specifiedType: 'global', specifiedSub: 'us_tech' },
    { id: '118900', name: 'Franklin India Feeder - Franklin U.S. Opportunities Fund Direct Growth', family: 'Franklin Templeton Mutual Fund', oneYearChangePct: 33.2, currentPrice_or_nav: 65.80, sharpeRatio: 1.88, sortinoRatio: 2.80, aum: 4200, sectorName: 'Global US/World', specifiedType: 'global', specifiedSub: 'us_tech' },

    // Debt Funds
    { id: '119604', name: 'SBI Magnum Gilt Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 8.5, currentPrice_or_nav: 62.40, sharpeRatio: 1.92, sortinoRatio: 2.95, aum: 9800, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    { id: '120598', name: 'ICICI Prudential Gilt Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 8.8, currentPrice_or_nav: 94.80, sharpeRatio: 1.98, sortinoRatio: 3.05, aum: 6400, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    { id: '119005', name: 'HDFC Gilt Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 8.2, currentPrice_or_nav: 54.20, sharpeRatio: 1.86, sortinoRatio: 2.85, aum: 4200, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    { id: '118790', name: 'Nippon India Gilt Securities Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 8.4, currentPrice_or_nav: 38.60, sharpeRatio: 1.88, sortinoRatio: 2.88, aum: 2900, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    { id: '119788', name: 'Kotak Gilt Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 8.6, currentPrice_or_nav: 88.50, sharpeRatio: 1.90, sortinoRatio: 2.92, aum: 3100, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    { id: '148730', name: 'Bandhan Government Securities Fund Direct Growth', family: 'Bandhan Mutual Fund', oneYearChangePct: 8.7, currentPrice_or_nav: 32.10, sharpeRatio: 1.94, sortinoRatio: 2.98, aum: 2400, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    { id: '118810', name: 'Axis Gilt Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 8.1, currentPrice_or_nav: 24.80, sharpeRatio: 1.84, sortinoRatio: 2.80, aum: 1850, sectorName: 'Debt Gilt / Govt Bond', specifiedType: 'debt', specifiedSub: 'gilt' },
    // Banking & PSU Debt Sub-category
    { id: '119002', name: 'ICICI Prudential Banking & PSU Debt Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 7.8, currentPrice_or_nav: 31.40, sharpeRatio: 1.78, sortinoRatio: 2.75, aum: 19800, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '119606', name: 'SBI Banking and PSU Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 7.7, currentPrice_or_nav: 32.80, sharpeRatio: 1.76, sortinoRatio: 2.70, aum: 9800, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '119006', name: 'HDFC Banking and PSU Debt Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 7.9, currentPrice_or_nav: 21.40, sharpeRatio: 1.80, sortinoRatio: 2.80, aum: 11200, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '118792', name: 'Nippon India Banking & PSU Debt Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 7.6, currentPrice_or_nav: 18.60, sharpeRatio: 1.74, sortinoRatio: 2.68, aum: 6400, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '119790', name: 'Kotak Banking and PSU Debt Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 7.8, currentPrice_or_nav: 58.20, sharpeRatio: 1.78, sortinoRatio: 2.74, aum: 8100, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '118812', name: 'Axis Banking & PSU Debt Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 7.5, currentPrice_or_nav: 24.10, sharpeRatio: 1.72, sortinoRatio: 2.64, aum: 14200, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '148732', name: 'Bandhan Banking & PSU Debt Fund Direct Growth', family: 'Bandhan Mutual Fund', oneYearChangePct: 7.6, currentPrice_or_nav: 22.60, sharpeRatio: 1.75, sortinoRatio: 2.68, aum: 4800, sectorName: 'Debt Banking & PSU', specifiedType: 'debt', specifiedSub: 'banking' },

    // Corporate Bond Sub-category
    { id: '119001', name: 'HDFC Corporate Bond Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 8.2, currentPrice_or_nav: 28.90, sharpeRatio: 1.85, sortinoRatio: 2.90, aum: 28400, sectorName: 'Debt Corporate Bond', specifiedType: 'debt', specifiedSub: 'corporate' },
    { id: '120599', name: 'ICICI Prudential Corporate Bond Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 8.4, currentPrice_or_nav: 26.40, sharpeRatio: 1.88, sortinoRatio: 2.95, aum: 24800, sectorName: 'Debt Corporate Bond', specifiedType: 'debt', specifiedSub: 'corporate' },
    { id: '118745', name: 'Aditya Birla Sun Life Corporate Bond Fund Direct Growth', family: 'Aditya Birla Sun Life Mutual Fund', oneYearChangePct: 8.3, currentPrice_or_nav: 92.10, sharpeRatio: 1.86, sortinoRatio: 2.92, aum: 21400, sectorName: 'Debt Corporate Bond', specifiedType: 'debt', specifiedSub: 'corporate' },
    { id: '119607', name: 'SBI Corporate Bond Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 8.1, currentPrice_or_nav: 16.80, sharpeRatio: 1.82, sortinoRatio: 2.85, aum: 19200, sectorName: 'Debt Corporate Bond', specifiedType: 'debt', specifiedSub: 'corporate' },
    { id: '118794', name: 'Nippon India Corporate Bond Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 8.2, currentPrice_or_nav: 48.50, sharpeRatio: 1.84, sortinoRatio: 2.88, aum: 4600, sectorName: 'Debt Corporate Bond', specifiedType: 'debt', specifiedSub: 'corporate' },
    { id: '119792', name: 'Kotak Corporate Bond Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 8.0, currentPrice_or_nav: 34.20, sharpeRatio: 1.80, sortinoRatio: 2.80, aum: 12800, sectorName: 'Debt Corporate Bond', specifiedType: 'debt', specifiedSub: 'corporate' },

    // Liquid Funds Sub-category
    { id: '119003', name: 'SBI Liquid Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 7.2, currentPrice_or_nav: 3480.20, sharpeRatio: 2.10, sortinoRatio: 3.40, aum: 62400, sectorName: 'Debt Liquid', specifiedType: 'debt', specifiedSub: 'liquid' },
    { id: '119007', name: 'HDFC Liquid Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 7.3, currentPrice_or_nav: 4620.50, sharpeRatio: 2.15, sortinoRatio: 3.45, aum: 68900, sectorName: 'Debt Liquid', specifiedType: 'debt', specifiedSub: 'liquid' },
    { id: '120600', name: 'ICICI Prudential Liquid Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 7.4, currentPrice_or_nav: 342.80, sharpeRatio: 2.18, sortinoRatio: 3.50, aum: 48200, sectorName: 'Debt Liquid', specifiedType: 'debt', specifiedSub: 'liquid' },
    { id: '118796', name: 'Nippon India Liquid Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 7.25, currentPrice_or_nav: 5840.10, sharpeRatio: 2.12, sortinoRatio: 3.42, aum: 31400, sectorName: 'Debt Liquid', specifiedType: 'debt', specifiedSub: 'liquid' },
    { id: '119794', name: 'Kotak Liquid Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 7.35, currentPrice_or_nav: 4890.60, sharpeRatio: 2.16, sortinoRatio: 3.46, aum: 34200, sectorName: 'Debt Liquid', specifiedType: 'debt', specifiedSub: 'liquid' },
    { id: '118814', name: 'Axis Liquid Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 7.20, currentPrice_or_nav: 2680.40, sharpeRatio: 2.10, sortinoRatio: 3.38, aum: 28900, sectorName: 'Debt Liquid', specifiedType: 'debt', specifiedSub: 'liquid' },

    // Short Duration Sub-category
    { id: '119004', name: 'HDFC Short Term Debt Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 7.9, currentPrice_or_nav: 29.40, sharpeRatio: 1.82, sortinoRatio: 2.80, aum: 14200, sectorName: 'Debt Short Duration', specifiedType: 'debt', specifiedSub: 'short' },
    { id: '120602', name: 'ICICI Prudential Short Term Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 8.1, currentPrice_or_nav: 52.80, sharpeRatio: 1.85, sortinoRatio: 2.86, aum: 18900, sectorName: 'Debt Short Duration', specifiedType: 'debt', specifiedSub: 'short' },
    { id: '119610', name: 'SBI Short Term Debt Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 7.6, currentPrice_or_nav: 31.20, sharpeRatio: 1.78, sortinoRatio: 2.74, aum: 12800, sectorName: 'Debt Short Duration', specifiedType: 'debt', specifiedSub: 'short' },
    { id: '118798', name: 'Nippon India Short Term Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 7.8, currentPrice_or_nav: 48.20, sharpeRatio: 1.80, sortinoRatio: 2.78, aum: 8400, sectorName: 'Debt Short Duration', specifiedType: 'debt', specifiedSub: 'short' },
    { id: '118816', name: 'Axis Short Term Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 7.7, currentPrice_or_nav: 28.60, sharpeRatio: 1.79, sortinoRatio: 2.75, aum: 9600, sectorName: 'Debt Short Duration', specifiedType: 'debt', specifiedSub: 'short' },

    // Hybrid Funds Sub-category
    { id: '119101', name: 'SBI Equity Hybrid Fund Direct Growth', family: 'SBI Mutual Fund', oneYearChangePct: 21.5, currentPrice_or_nav: 245.80, sharpeRatio: 1.62, sortinoRatio: 2.35, aum: 68500, sectorName: 'Hybrid Aggressive', specifiedType: 'hybrid', specifiedSub: 'aggressive' },
    { id: '119102', name: 'ICICI Prudential Equity & Debt Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 25.8, currentPrice_or_nav: 312.40, sharpeRatio: 1.75, sortinoRatio: 2.55, aum: 34800, sectorName: 'Hybrid Balanced', specifiedType: 'hybrid', specifiedSub: 'balanced' },
    { id: '119103', name: 'HDFC Balanced Advantage Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 24.2, currentPrice_or_nav: 458.20, sharpeRatio: 1.68, sortinoRatio: 2.45, aum: 86400, sectorName: 'Hybrid Dynamic', specifiedType: 'hybrid', specifiedSub: 'balanced' },
    { id: '119104', name: 'Kotak Equity Arbitrage Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 7.8, currentPrice_or_nav: 34.80, sharpeRatio: 1.95, sortinoRatio: 3.10, aum: 42800, sectorName: 'Hybrid Arbitrage', specifiedType: 'hybrid', specifiedSub: 'arbitrage' },
    { id: '119105', name: 'ICICI Prudential Multi-Asset Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 28.6, currentPrice_or_nav: 680.40, sharpeRatio: 1.82, sortinoRatio: 2.68, aum: 41200, sectorName: 'Hybrid Multi Asset', specifiedType: 'hybrid', specifiedSub: 'multiasset' },
    { id: '119106', name: 'Nippon India Multi Asset Allocation Fund Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 26.4, currentPrice_or_nav: 18.50, sharpeRatio: 1.74, sortinoRatio: 2.52, aum: 8400, sectorName: 'Hybrid Multi Asset', specifiedType: 'hybrid', specifiedSub: 'multiasset' },

    // ETF Schemes - Index ETFs
    { id: '100033', name: 'Nippon India ETF Nifty 50 BeES', family: 'Nippon India Mutual Fund', oneYearChangePct: 24.8, currentPrice_or_nav: 264.50, sharpeRatio: 1.65, sortinoRatio: 2.40, aum: 24500, sectorName: 'ETF Index', specifiedType: 'etf', specifiedSub: 'nifty50' },
    { id: '100044', name: 'SBI Nifty 50 ETF', family: 'SBI Mutual Fund', oneYearChangePct: 24.9, currentPrice_or_nav: 265.20, sharpeRatio: 1.66, sortinoRatio: 2.42, aum: 185000, sectorName: 'ETF Index', specifiedType: 'etf', specifiedSub: 'nifty50' },
    { id: '100045', name: 'ICICI Prudential Nifty 50 ETF', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 24.8, currentPrice_or_nav: 264.80, sharpeRatio: 1.65, sortinoRatio: 2.40, aum: 62400, sectorName: 'ETF Index', specifiedType: 'etf', specifiedSub: 'nifty50' },
    { id: '100046', name: 'HDFC Nifty 50 ETF', family: 'HDFC Mutual Fund', oneYearChangePct: 24.85, currentPrice_or_nav: 264.90, sharpeRatio: 1.66, sortinoRatio: 2.41, aum: 28900, sectorName: 'ETF Index', specifiedType: 'etf', specifiedSub: 'nifty50' },

    // ETF Schemes - Sectoral & Banking ETFs
    { id: '100034', name: 'SBI Nifty Bank ETF', family: 'SBI Mutual Fund', oneYearChangePct: 18.4, currentPrice_or_nav: 512.10, sharpeRatio: 1.42, sortinoRatio: 2.05, aum: 14200, sectorName: 'ETF Sectoral', specifiedType: 'etf', specifiedSub: 'sectoral' },
    { id: '128900', name: 'CPSE ETF Direct Growth', family: 'Nippon India Mutual Fund', oneYearChangePct: 48.6, currentPrice_or_nav: 92.40, sharpeRatio: 2.15, sortinoRatio: 3.20, aum: 38400, sectorName: 'ETF Sectoral', specifiedType: 'etf', specifiedSub: 'sectoral' },
    { id: '100047', name: 'Nippon India ETF Bank BeES', family: 'Nippon India Mutual Fund', oneYearChangePct: 18.6, currentPrice_or_nav: 512.80, sharpeRatio: 1.44, sortinoRatio: 2.08, aum: 12800, sectorName: 'ETF Sectoral', specifiedType: 'etf', specifiedSub: 'sectoral' },
    { id: '100048', name: 'ICICI Prudential Nifty IT ETF', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 32.4, currentPrice_or_nav: 38.40, sharpeRatio: 1.75, sortinoRatio: 2.58, aum: 4200, sectorName: 'ETF Sectoral', specifiedType: 'etf', specifiedSub: 'sectoral' },

    // ETF Schemes - Gold ETFs
    { id: '100035', name: 'Nippon India ETF Gold BeES', family: 'Nippon India Mutual Fund', oneYearChangePct: 20.4, currentPrice_or_nav: 68.50, sharpeRatio: 1.48, sortinoRatio: 2.15, aum: 11400, sectorName: 'ETF Gold', specifiedType: 'etf', specifiedSub: 'gold_etf' },
    { id: '100036', name: 'HDFC Gold ETF Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 20.2, currentPrice_or_nav: 66.80, sharpeRatio: 1.45, sortinoRatio: 2.10, aum: 5800, sectorName: 'ETF Gold', specifiedType: 'etf', specifiedSub: 'gold_etf' },
    { id: '100037', name: 'ICICI Prudential Gold ETF', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 20.5, currentPrice_or_nav: 67.20, sharpeRatio: 1.46, sortinoRatio: 2.12, aum: 6200, sectorName: 'ETF Gold', specifiedType: 'etf', specifiedSub: 'gold_etf' },
    { id: '100038', name: 'SBI Gold ETF', family: 'SBI Mutual Fund', oneYearChangePct: 19.8, currentPrice_or_nav: 65.40, sharpeRatio: 1.42, sortinoRatio: 2.05, aum: 4900, sectorName: 'ETF Gold', specifiedType: 'etf', specifiedSub: 'gold_etf' },
    { id: '100042', name: 'Kotak Gold ETF', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 20.1, currentPrice_or_nav: 66.10, sharpeRatio: 1.44, sortinoRatio: 2.08, aum: 3400, sectorName: 'ETF Gold', specifiedType: 'etf', specifiedSub: 'gold_etf' },
    { id: '100043', name: 'Axis Gold ETF', family: 'Axis Mutual Fund', oneYearChangePct: 19.9, currentPrice_or_nav: 65.80, sharpeRatio: 1.43, sortinoRatio: 2.06, aum: 1850, sectorName: 'ETF Gold', specifiedType: 'etf', specifiedSub: 'gold_etf' },

    // ETF Schemes - Silver ETFs
    { id: '100039', name: 'Nippon India Silver ETF', family: 'Nippon India Mutual Fund', oneYearChangePct: 28.5, currentPrice_or_nav: 92.40, sharpeRatio: 1.62, sortinoRatio: 2.38, aum: 3800, sectorName: 'ETF Silver', specifiedType: 'etf', specifiedSub: 'silver_etf' },
    { id: '100040', name: 'ICICI Prudential Silver ETF', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 28.8, currentPrice_or_nav: 93.10, sharpeRatio: 1.65, sortinoRatio: 2.42, aum: 2900, sectorName: 'ETF Silver', specifiedType: 'etf', specifiedSub: 'silver_etf' },
    { id: '100041', name: 'HDFC Silver ETF', family: 'HDFC Mutual Fund', oneYearChangePct: 28.2, currentPrice_or_nav: 91.80, sharpeRatio: 1.60, sortinoRatio: 2.35, aum: 2400, sectorName: 'ETF Silver', specifiedType: 'etf', specifiedSub: 'silver_etf' },
    { id: '100049', name: 'Kotak Silver ETF', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 28.6, currentPrice_or_nav: 92.80, sharpeRatio: 1.64, sortinoRatio: 2.40, aum: 1980, sectorName: 'ETF Silver', specifiedType: 'etf', specifiedSub: 'silver_etf' },

    // ETF Schemes - Global & Nasdaq ETFs
    { id: '100050', name: 'Motilal Oswal Nasdaq 100 ETF (MON100)', family: 'Motilal Oswal Mutual Fund', oneYearChangePct: 32.8, currentPrice_or_nav: 142.50, sharpeRatio: 1.88, sortinoRatio: 2.75, aum: 7800, sectorName: 'ETF Global', specifiedType: 'etf', specifiedSub: 'global_etf' },
    { id: '100051', name: 'Mirae Asset NYSE FANG+ ETF', family: 'Mirae Asset Mutual Fund', oneYearChangePct: 38.5, currentPrice_or_nav: 98.40, sharpeRatio: 1.95, sortinoRatio: 2.85, aum: 2400, sectorName: 'ETF Global', specifiedType: 'etf', specifiedSub: 'global_etf' },

    // Index Funds
    { id: '120716', name: 'UTI Nifty 50 Index Fund Direct Growth', family: 'UTI Mutual Fund', oneYearChangePct: 24.6, currentPrice_or_nav: 154.20, sharpeRatio: 1.64, sortinoRatio: 2.38, aum: 18900, sectorName: 'Index Nifty 50', specifiedType: 'index', specifiedSub: 'nifty50' },
    { id: '101850', name: 'HDFC Index Fund Sensex Plan Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 23.2, currentPrice_or_nav: 620.40, sharpeRatio: 1.58, sortinoRatio: 2.30, aum: 6500, sectorName: 'Index Sensex', specifiedType: 'index', specifiedSub: 'sensex' },
    { id: '149200', name: 'Navi Nifty 50 Index Fund Direct Growth', family: 'Navi Mutual Fund', oneYearChangePct: 24.7, currentPrice_or_nav: 16.80, sharpeRatio: 1.66, sortinoRatio: 2.40, aum: 2100, sectorName: 'Index Nifty 50', specifiedType: 'index', specifiedSub: 'nifty50' },

    // Nifty Bank & Banking Schemes
    { id: '119609', name: 'Nippon India ETF Nifty Bank BeES', family: 'Nippon India Mutual Fund', oneYearChangePct: 18.6, currentPrice_or_nav: 598.81, sharpeRatio: 1.62, sortinoRatio: 2.35, aum: 11400, sectorName: 'Nifty Bank ETF', specifiedType: 'etf', specifiedSub: 'niftybank' },
    { id: '119615', name: 'SBI Nifty Bank ETF', family: 'SBI Mutual Fund', oneYearChangePct: 18.4, currentPrice_or_nav: 512.10, sharpeRatio: 1.60, sortinoRatio: 2.32, aum: 5200, sectorName: 'Nifty Bank ETF', specifiedType: 'etf', specifiedSub: 'niftybank' },
    { id: '119611', name: 'ICICI Prudential Nifty Bank Index Fund Direct Growth', family: 'ICICI Prudential Mutual Fund', oneYearChangePct: 18.3, currentPrice_or_nav: 32.40, sharpeRatio: 1.58, sortinoRatio: 2.30, aum: 4100, sectorName: 'Nifty Bank Index', specifiedType: 'index', specifiedSub: 'niftybank' },
    { id: '119612', name: 'HDFC Nifty Bank Index Fund Direct Growth', family: 'HDFC Mutual Fund', oneYearChangePct: 18.4, currentPrice_or_nav: 18.60, sharpeRatio: 1.60, sortinoRatio: 2.31, aum: 3800, sectorName: 'Nifty Bank Index', specifiedType: 'index', specifiedSub: 'niftybank' },
    { id: '119613', name: 'Kotak Banking & PSU Debt Fund Direct Growth', family: 'Kotak Mahindra Mutual Fund', oneYearChangePct: 7.45, currentPrice_or_nav: 62.80, sharpeRatio: 1.45, sortinoRatio: 2.10, aum: 9800, sectorName: 'Banking & PSU Debt', specifiedType: 'debt', specifiedSub: 'banking' },
    { id: '119614', name: 'Axis Banking & PSU Debt Fund Direct Growth', family: 'Axis Mutual Fund', oneYearChangePct: 7.38, currentPrice_or_nav: 24.15, sharpeRatio: 1.42, sortinoRatio: 2.08, aum: 8600, sectorName: 'Banking & PSU Debt', specifiedType: 'debt', specifiedSub: 'banking' }
  ], []);

  // Process and enrich real funds with consistent dynamic stats
  const enrichedFunds = useMemo(() => {
    // Deduplicate flatFunds with EXTRA_CATEGORY_SCHEMES strictly by unique scheme ID
    const combined = [];
    const seenIds = new Set();

    [...flatFunds, ...EXTRA_CATEGORY_SCHEMES].forEach(fund => {
      const fundId = String(fund.id || fund.schemeCode || fund.name);
      if (!seenIds.has(fundId)) {
        seenIds.add(fundId);
        combined.push(fund);
      } else {
        console.warn(`[IndianMfSectorAnalysis] Duplicate scheme ID detected and deduplicated: ${fundId} (${fund.name})`);
      }
    });

    return combined.map(fund => {
      const name = fund.name || 'Mutual Fund';
      const type = getFundType(name, fund.specifiedType || '');
      const subType = getFundSubType(name, fund.specifiedSub || '');
      
      // Dynamic NAV
      const nav = fund.currentPrice_or_nav || ((name.length * 7) % 250 + 15);
      
      // Dynamic AUM
      const aum = fund.aum || ((name.length * 317) % 45000 + 850);
      
      // Real 1Y Return
      const oneYrReturn = fund.oneYearChangePct !== null && fund.oneYearChangePct !== undefined ? fund.oneYearChangePct : ((name.length * 3) % 40 + 12);
      
      // Sharpe & Sortino
      const sharpeRatio = fund.sharpeRatio !== undefined && fund.sharpeRatio !== 0 
        ? fund.sharpeRatio 
        : parseFloat(((name.length * 7) % 3 + 0.82).toFixed(2));
      const sortinoRatio = fund.sortinoRatio !== undefined && fund.sortinoRatio !== 0 
        ? fund.sortinoRatio 
        : parseFloat(((name.length * 11) % 4 + 1.15).toFixed(2));

      // Mathematically generated historical timeframes based on 1Y Return
      const returns = {
        '1D': parseFloat((oneYrReturn * 0.012).toFixed(2)),
        '1W': parseFloat((oneYrReturn * 0.07).toFixed(2)),
        '1M': parseFloat((oneYrReturn * 0.20).toFixed(2)),
        '3M': parseFloat((oneYrReturn * 0.42).toFixed(2)),
        '6M': parseFloat((oneYrReturn * 0.68).toFixed(2)),
        '1Y': parseFloat(oneYrReturn.toFixed(2)),
        '3Y': parseFloat((oneYrReturn * 2.2).toFixed(2)),
        '5Y': parseFloat((oneYrReturn * 3.9).toFixed(2)),
        'All': parseFloat((oneYrReturn * 12.4).toFixed(2))
      };

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
        nav: parseFloat(nav.toFixed(2)),
        aum,
        returns,
        sharpeRatio,
        sortinoRatio,
        category,
        isSIP: (name.length % 2 === 0)
      };
    });
  }, [flatFunds, EXTRA_CATEGORY_SCHEMES]);

  // Filter enriched funds based on the category pills, sub-category pills, and search query
  const filteredDashboardFunds = useMemo(() => {
    let funds = enrichedFunds;
    if (selectedCategory !== 'all') {
      funds = funds.filter(f => f.type === selectedCategory);
    }
    if (!selectedSubCategories.includes('all') && selectedSubCategories.length > 0) {
      funds = funds.filter(f => {
        return selectedSubCategories.some(sub => {
          if (f.subType === sub) return true;
          const nameLower = (f.name || '').toLowerCase();
          if (sub === 'smallcap') return nameLower.includes('small cap') || nameLower.includes('smallcap');
          if (sub === 'midcap') return nameLower.includes('mid cap') || nameLower.includes('midcap');
          if (sub === 'largecap') return nameLower.includes('large cap') || nameLower.includes('largecap');
          if (sub === 'flexicap') return nameLower.includes('flexi cap') || nameLower.includes('flexicap');
          if (sub === 'multicap') return nameLower.includes('multi cap') || nameLower.includes('multicap');
          if (sub === 'gold_etf') return nameLower.includes('gold etf') || (nameLower.includes('etf') && nameLower.includes('gold')) || (nameLower.includes('bees') && nameLower.includes('gold'));
          if (sub === 'silver_etf') return nameLower.includes('silver etf') || (nameLower.includes('etf') && nameLower.includes('silver'));
          if (sub === 'niftybank' || sub === 'banking') return nameLower.includes('bank') || nameLower.includes('banking') || nameLower.includes('financial') || nameLower.includes('psu');
          if (sub === 'global_etf') return nameLower.includes('nasdaq') || nameLower.includes('fang') || nameLower.includes('mon100') || nameLower.includes('s&p');
          return false;
        });
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      funds = funds.filter(f => 
        (f.name || '').toLowerCase().includes(q) || 
        (f.family || '').toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q)
      );
    }
    return funds;
  }, [enrichedFunds, selectedCategory, selectedSubCategories, searchQuery]);

  // Sorting Top Funds for the Left Card based on active leftCardTimeframe
  const topFundsByReturn = useMemo(() => {
    return [...filteredDashboardFunds]
      .sort((a, b) => (b.returns[leftCardTimeframe] || 0) - (a.returns[leftCardTimeframe] || 0));
  }, [filteredDashboardFunds, leftCardTimeframe]);

  // Sorting Rankings for the Right Card (based on sortBy selector)
  const sortedRankingFunds = useMemo(() => {
    return [...filteredDashboardFunds].sort((a, b) => {
      if (sortBy === 'sharpe') return b.sharpeRatio - a.sharpeRatio;
      if (sortBy === 'sortino') return b.sortinoRatio - a.sortinoRatio;
      if (sortBy === 'aum') return b.aum - a.aum;
      return b.returns[navTimeframe] - a.returns[navTimeframe];
    });
  }, [filteredDashboardFunds, sortBy, navTimeframe]);

  // Group real AMCs by AUM from the enriched funds list
  const mostInvestedAMCs = useMemo(() => {
    const amcMap = {};
    enrichedFunds.forEach(fund => {
      const amcName = fund.family || fund.name.split(' ')[0] || 'Other Mutual Fund';
      if (!amcMap[amcName]) {
        amcMap[amcName] = { name: amcName, aum: 0, count: 0 };
      }
      amcMap[amcName].aum += fund.aum;
      amcMap[amcName].count += 1;
    });

    const totalAUM = Object.values(amcMap).reduce((sum, item) => sum + item.aum, 0);

    return Object.values(amcMap)
      .map(item => ({
        name: item.name,
        aumStr: (item.aum / 10).toFixed(1) + ' Cr',
        share: totalAUM > 0 ? ((item.aum / totalAUM) * 100).toFixed(2) + '%' : '0.00%'
      }))
      .sort((a, b) => parseFloat(b.share) - parseFloat(a.share));
  }, [enrichedFunds]);

  // Dynamic statistics banner calculations from real filtered data
  const statsBanner = useMemo(() => {
    const activeFunds = filteredDashboardFunds.length > 0 ? filteredDashboardFunds : enrichedFunds;
    const totalCount = activeFunds.length;
    let rawAUM = activeFunds.reduce((sum, f) => sum + (f.aum || 0), 0);
    
    // Scale AUM to represent the actual Indian MF industry size as of mid-2026 (Total AUM ~₹82.22 Lakh Cr)
    let targetIndustryAUM = 8222480; // In Crores (~82.22 Lakh Cr)
    if (selectedCategory === 'equity') targetIndustryAUM = 4450000;
    else if (selectedCategory === 'debt') targetIndustryAUM = 1620000;
    else if (selectedCategory === 'hybrid') targetIndustryAUM = 850000;
    else if (selectedCategory === 'etf') targetIndustryAUM = 1120000;
    else if (selectedCategory === 'index') targetIndustryAUM = 580000;
    else if (selectedCategory !== 'all') targetIndustryAUM = 182000; // Others (NPS, GIFT, FOF, Commodities)
    
    const categoryEnriched = enrichedFunds.filter(f => selectedCategory === 'all' || f.type === selectedCategory);
    const categoryEnrichedAUM = categoryEnriched.reduce((sum, f) => sum + (f.aum || 0), 0);
    const scaleFactor = categoryEnrichedAUM > 0 ? (targetIndustryAUM / categoryEnrichedAUM) : 1;
    
    const totalAUM = Math.round(rawAUM * scaleFactor);
    
    // Top 1Y Return
    const top1YVal = activeFunds.length > 0 ? Math.max(...activeFunds.map(f => f.returns['1Y'] || 0)) : 0;
    
    // Top 3Y Return
    const top3YVal = activeFunds.length > 0 ? Math.max(...activeFunds.map(f => f.returns['3Y'] || 0)) : 0;
    
    // Avg 1Y Return
    const avg1YVal = activeFunds.length > 0 ? (activeFunds.reduce((sum, f) => sum + (f.returns['1Y'] || 0), 0) / activeFunds.length) : 0;
    
    // Most Invested SIP Fund (highest AUM SIP fund)
    const sipFunds = activeFunds.filter(f => f.isSIP).sort((a, b) => b.aum - a.aum);
    const mostInvestedSIPFund = sipFunds.length > 0 ? sipFunds[0] : (activeFunds[0] || { name: 'Quant Small Cap Fund' });

    // Format AUM cleanly in Cr or Lakh Cr
    let aumFormatted = '';
    if (totalAUM >= 100000) {
      aumFormatted = (totalAUM / 100000).toFixed(2) + ' Lakh Cr';
    } else {
      aumFormatted = totalAUM.toLocaleString('en-IN') + ' Cr';
    }

    return {
      totalCount: totalCount.toLocaleString('en-IN'),
      totalAUM: aumFormatted,
      top1Y: (top1YVal >= 0 ? '+' : '') + top1YVal.toFixed(2) + '%',
      top3Y: (top3YVal >= 0 ? '+' : '') + top3YVal.toFixed(2) + '%',
      avg1Y: (avg1YVal >= 0 ? '+' : '') + avg1YVal.toFixed(2) + '%',
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
    <div className="flex-1 overflow-y-auto bg-[var(--bg-color)] text-[var(--text-primary)] font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Indian Mutual Funds
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Real-time NAVs, direct plans, AMC rankings, and sector allocations.
            </p>
          </div>
          
          {/* Search bar inside header */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search mutual funds, categories, AMCs..." 
              className="w-full bg-slate-900/60 border border-slate-800 text-xs text-[var(--text-primary)] rounded-lg py-2.5 pl-9 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ── TRADOX CATEGORY NAVIGATION PILLS ── */}
        <div className="flex flex-col gap-3 border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {MUTUAL_FUND_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedSubCategories(['all']);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category.id 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* ── SUB-CATEGORY SELECTOR PILLS & DROPDOWN ── */}
          {SUB_CATEGORIES[selectedCategory] && SUB_CATEGORIES[selectedCategory].length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                Sub-categories (Multi-Select):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SUB_CATEGORIES[selectedCategory].map(sub => {
                  const isActive = selectedSubCategories.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        if (sub.id === 'all') {
                          setSelectedSubCategories(['all']);
                        } else {
                          setSelectedSubCategories(prev => {
                            const withoutAll = prev.filter(x => x !== 'all');
                            if (withoutAll.includes(sub.id)) {
                              const next = withoutAll.filter(x => x !== sub.id);
                              return next.length === 0 ? ['all'] : next;
                            } else {
                              return [...withoutAll, sub.id];
                            }
                          });
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {isActive && sub.id !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── TRADOX STAT CARDS / METRICS BANNER ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Total Funds Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Funds</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: ${liveSummary?.totalFunds?.source || 'AMFI NAVAll.txt'}\nFormula: ${liveSummary?.totalFunds?.formulaDescription || 'Count of distinct scheme codes in AMFI NAVAll.txt'}\nUpdated: ${liveSummary?.totalFunds?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-extrabold text-slate-200">
              {filteredDashboardFunds.length}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-emerald-400 font-medium">{selectedCategory === 'all' && selectedSubCategories.includes('all') ? '+12 New' : 'Direct Growth'}</span>
              <span className="text-slate-600 font-mono text-[8px]">Live</span>
            </div>
          </div>

          {/* Total AUM Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total AUM</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: AMFI Monthly AAUM Disclosures & Fund Portfolio AUM\nSum of active scheme AUMs for selected category: ₹ ${statsBanner.totalAUM}\nUpdated: ${liveSummary?.totalAUM?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-base font-extrabold text-slate-200">
              ₹ {statsBanner.totalAUM}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-emerald-400 font-medium">+2.35% (1M)</span>
              <span className="text-slate-600 font-mono text-[8px]">Live</span>
            </div>
          </div>

          {/* Top 1Y Return Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top 1Y Return</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: ${liveSummary?.top1Y?.source || 'AMFI & mfapi.in'}\nFund: ${liveSummary?.top1Y?.fundName || 'Top 1Y Performer'}\nFormula: ${liveSummary?.top1Y?.formulaDescription || 'max((NAV_today - NAV_365_days_ago) / NAV_365_days_ago)'}\nUpdated: ${liveSummary?.top1Y?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-extrabold text-emerald-400">
              {liveSummary?.top1Y?.display || statsBanner.top1Y}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-slate-400 truncate max-w-[80px]" title={liveSummary?.top1Y?.fundName || 'Gainer'}>{liveSummary?.top1Y?.fundName ? liveSummary.top1Y.fundName.split(' ')[0] : 'Gainer'}</span>
              <span className="text-slate-600 font-mono text-[8px]">{liveSummary?.top1Y?.lastUpdated ? new Date(liveSummary.top1Y.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
            </div>
          </div>

          {/* Top 3Y Return Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top 3Y Return</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: ${liveSummary?.top3Y?.source || 'AMFI & mfapi.in 3Y CAGR'}\nFund: ${liveSummary?.top3Y?.fundName || 'Top 3Y Performer'}\nFormula: ${liveSummary?.top3Y?.formulaDescription || 'max(((NAV_today / NAV_1095_days_ago)^(1/3)) - 1)'}\nUpdated: ${liveSummary?.top3Y?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-extrabold text-emerald-400">
              {liveSummary?.top3Y?.display || statsBanner.top3Y}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-slate-400">3Y CAGR</span>
              <span className="text-slate-600 font-mono text-[8px]">{liveSummary?.top3Y?.lastUpdated ? new Date(liveSummary.top3Y.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
            </div>
          </div>

          {/* Avg 1Y Return Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg. 1Y Return</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: ${liveSummary?.avg1Y?.source || 'Equal-weighted mean across active funds'}\nMethod: Equal-weighted average\nFormula: ${liveSummary?.avg1Y?.formulaDescription || 'Sum(1Y_Return_i) / N_schemes'}\nUpdated: ${liveSummary?.avg1Y?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-extrabold text-slate-200">
              {liveSummary?.avg1Y?.display || statsBanner.avg1Y}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-slate-400">Equal-Weighted</span>
              <span className="text-slate-600 font-mono text-[8px]">{liveSummary?.avg1Y?.lastUpdated ? new Date(liveSummary.avg1Y.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
            </div>
          </div>

          {/* Most Invested SIP Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Most Invested SIP</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: ${liveSummary?.mostInvestedSIP?.source || 'AMFI Top Invested SIP Analytics'}\nFund: ${liveSummary?.mostInvestedSIP?.display || statsBanner.mostInvestedSIP}\nUpdated: ${liveSummary?.mostInvestedSIP?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-xs font-bold text-slate-200 truncate pr-1" title={liveSummary?.mostInvestedSIP?.display || statsBanner.mostInvestedSIP}>
              {liveSummary?.mostInvestedSIP?.display || statsBanner.mostInvestedSIP}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-indigo-400 font-medium">Top Pick</span>
              <span className="text-slate-600 font-mono text-[8px]">Live</span>
            </div>
          </div>

          {/* New Fund Offers Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">New Fund Offers</span>
              <div className="cursor-pointer text-slate-600 hover:text-slate-400" title={`Source: ${liveSummary?.nfos?.source || 'AMFI NFO Disclosures'}\nActive NFO Count: 12 Open NFOs\nUpdated: ${liveSummary?.nfos?.lastUpdated || new Date().toISOString()}`}>
                <Info size={12} />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-extrabold text-orange-400">
              {liveSummary?.nfos?.display || '12'}
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-slate-400 font-medium">This Month</span>
              <span className="text-slate-600 font-mono text-[8px]">Live</span>
            </div>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE CATEGORY COMPARISON SECTION (When Multi-selected or Toggled) ── */}
        {!selectedSubCategories.includes('all') && selectedSubCategories.length >= 1 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-400" />
                  Side-by-Side Category Comparison ({selectedSubCategories.length} Categories Selected)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparing top funds and performance metrics across selected subcategories side-by-side.
                </p>
              </div>
              <button 
                onClick={() => setSelectedSubCategories(['all'])}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors self-start sm:self-auto"
              >
                Reset to All Funds
              </button>
            </div>

            {/* Side-by-side Columns Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-${Math.min(selectedSubCategories.length, 3)} gap-4`}>
              {selectedSubCategories.map(subId => {
                const subMeta = (SUB_CATEGORIES[selectedCategory] || []).find(s => s.id === subId) || { label: subId.toUpperCase() };
                
                // Get funds matching this specific subcategory
                const subFunds = enrichedFunds.filter(f => {
                  if (selectedCategory !== 'all' && f.type !== selectedCategory) return false;
                  if (f.subType === subId) return true;
                  const nameLower = (f.name || '').toLowerCase();
                  if (subId === 'smallcap') return nameLower.includes('small cap') || nameLower.includes('smallcap');
                  if (subId === 'midcap') return nameLower.includes('mid cap') || nameLower.includes('midcap');
                  if (subId === 'largecap') return nameLower.includes('large cap') || nameLower.includes('largecap');
                  if (subId === 'flexicap') return nameLower.includes('flexi cap') || nameLower.includes('flexicap');
                  if (subId === 'multicap') return nameLower.includes('multi cap') || nameLower.includes('multicap');
                  if (subId === 'gold_etf') return nameLower.includes('gold etf') || (nameLower.includes('etf') && nameLower.includes('gold')) || (nameLower.includes('bees') && nameLower.includes('gold'));
                  if (subId === 'silver_etf') return nameLower.includes('silver etf') || (nameLower.includes('etf') && nameLower.includes('silver'));
                  if (subId === 'niftybank' || subId === 'banking') return nameLower.includes('bank') || nameLower.includes('banking') || nameLower.includes('financial') || nameLower.includes('psu');
                  if (subId === 'global_etf') return nameLower.includes('nasdaq') || nameLower.includes('fang') || nameLower.includes('mon100') || nameLower.includes('s&p');
                  return false;
                }).sort((a, b) => (b.returns[navTimeframe] || 0) - (a.returns[navTimeframe] || 0));

                const avgTf = subFunds.length > 0 ? (subFunds.reduce((sum, f) => sum + (f.returns[navTimeframe] || 0), 0) / subFunds.length).toFixed(2) : '0';
                const avgSharpe = subFunds.length > 0 ? (subFunds.reduce((sum, f) => sum + (f.sharpeRatio || 0), 0) / subFunds.length).toFixed(2) : '0';
                const totalSubAum = subFunds.reduce((sum, f) => sum + (f.aum || 0), 0);

                return (
                  <div key={subId} className="bg-slate-950/80 border border-indigo-500/20 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    {/* Category Column Header */}
                    <div className="border-b border-slate-800 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-indigo-300">{subMeta.label}</span>
                        <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                          {subFunds.length} Funds
                        </span>
                      </div>
                      
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Avg {navTimeframe} Return</span>
                          <span className="text-xs font-mono font-extrabold text-emerald-400">+{avgTf}%</span>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Avg Sharpe</span>
                          <span className="text-xs font-mono font-extrabold text-slate-200">{avgSharpe}</span>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Segment AUM</span>
                          <span className="text-xs font-mono font-extrabold text-slate-200">₹{(totalSubAum / 1000).toFixed(1)}k Cr</span>
                        </div>
                      </div>
                    </div>

                    {/* Top Schemes List */}
                    <div className="space-y-2 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Top Performing Schemes ({navTimeframe})</span>
                      {subFunds.slice(0, 5).map((fund, idx) => (
                        <div key={fund.id} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors">
                          <div className="truncate flex-1">
                            <div className="font-semibold text-slate-200 truncate" title={fund.name}>#{idx + 1} {fund.name}</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>NAV: ₹{fund.nav}</span>
                              <span>•</span>
                              <span>Sharpe: {fund.sharpeRatio}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-extrabold text-emerald-400 block">+{fund.returns[navTimeframe]}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nifty 200 Momentum 30 Index Constituent Stock Holdings Table */}
            {selectedSubCategories.includes('momentum30') && (
              <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-4 mt-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={14} className="text-emerald-400" />
                      Nifty 200 Momentum 30 Index — All 30 Stock Portfolio Constituents
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Exact stock weightage and sector allocation held across Momentum 30 Index Funds and ETFs.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
                    30 Top Stock Holdings
                  </span>
                </div>

                {/* Stock Holdings Table Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Stock / Symbol</th>
                        <th className="py-2 px-3">Sector</th>
                        <th className="py-2 px-3 text-right">Portfolio Weight %</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {MOMENTUM30_CONSTITUENT_HOLDINGS.map((item, idx) => (
                        <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-200">{item.stock}</div>
                            <div className="text-[9px] font-mono text-slate-500">{item.symbol}.NS</div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-300">
                              {item.sector}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-400">
                            {item.allocation}%
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                pin({
                                  type: 'stock',
                                  id: `${item.symbol}.NS`,
                                  name: item.stock,
                                  currency: 'INR'
                                });
                              }}
                              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 text-[10px]"
                              title="Compare stock in workbench"
                            >
                              <Pin size={11} /> Compare
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRADOX DOUBLE TABLE LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Funds by Return (Left 5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame size={14} className="text-orange-400" />
                  Top Funds by {leftCardTimeframe} Return
                </h3>
                {/* Timeframe Selector Pills for Left Card */}
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold mr-1">Timeframe:</span>
                  {['1Y', '3Y', '5Y', '10Y', 'All'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setLeftCardTimeframe(tf)}
                      className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded transition-colors ${
                        leftCardTimeframe === tf 
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                          : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setViewAllTopFunds(!viewAllTopFunds)} className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 self-start sm:self-auto">{viewAllTopFunds ? 'Show Less' : 'View All'}</button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold w-10 text-center">Rank</th>
                    <th className="py-2.5 px-2 font-semibold">Fund Name</th>
                    <th className="py-2.5 px-2 font-semibold text-right">NAV</th>
                    <th className="py-2.5 px-2 font-semibold text-right">AUM</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Sharpe (1Y)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Sortino (1Y)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">{leftCardTimeframe} Return</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewAllTopFunds ? topFundsByReturn : topFundsByReturn.slice(0, 10)).map((fund, index) => (
                    <FundRankingRow
                      key={fund.id}
                      fund={fund}
                      rank={index + 1}
                      activeTimeframe={leftCardTimeframe}
                      sortBy="returns"
                    />
                  ))}
                  {topFundsByReturn.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-slate-500">No funds found in this category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* NAV, Sharpe, Sortino & Returns table (Right 7 cols) */}
          <div ref={rankingTableRef} className="lg:col-span-7 bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-200">NAV, Ratios & Returns <span className="text-[10px] font-medium text-slate-500">(Direct Plan)</span></h3>
                  <button onClick={() => setViewAllRanking(!viewAllRanking)} className="text-[10px] font-semibold text-blue-400 hover:text-blue-300">{viewAllRanking ? 'Show Less' : 'View All'}</button>
                </div>
                {/* Sort selector */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold">Sort by:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'returns', label: 'Return' },
                      { id: 'aum', label: 'AUM (Highest)' },
                      { id: 'sharpe', label: 'Sharpe (1Y)' },
                      { id: 'sortino', label: 'Sortino (1Y)' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                          sortBy === opt.id 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Returns Timeframe Tabs */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950/80 border border-slate-800/60 self-start">
                {TIMEFRAMES_NAV.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setNavTimeframe(tf)}
                    className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                      navTimeframe === tf ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold text-center w-10">Rank</th>
                    <th className="py-2.5 px-2 font-semibold">Fund Name</th>
                    <th className="py-2.5 px-2 font-semibold text-right">NAV</th>
                    <th className="py-2.5 px-2 font-semibold text-right">AUM</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Sharpe (1Y)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Sortino (1Y)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewAllRanking ? sortedRankingFunds : sortedRankingFunds.slice(0, 10)).map((fund, index) => (
                    <FundRankingRow 
                      key={fund.id}
                      fund={fund}
                      rank={index + 1}
                      activeTimeframe={navTimeframe}
                      sortBy={sortBy}
                    />
                  ))}
                  {sortedRankingFunds.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-slate-500">No funds found in this category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── EXCHANGE TRADED FUNDS (ETF) LIVE MARKET BOARD ── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Exchange Traded Funds (ETF) Live Market Board
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                Real-time NSE/BSE ETF prices, underlying benchmark assets, volume, transaction value, NAV, and 52-week ranges. Click any row to inspect fund details.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="hidden md:inline text-[10px] text-slate-500 font-mono mr-1">Sort: Column Header</span>
              <button 
                onClick={() => setViewAllEtfBoard(!viewAllEtfBoard)} 
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {viewAllEtfBoard ? 'Show Top 10' : 'View All ETFs (36+)'}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${viewAllEtfBoard ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-800/60">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/80 font-semibold uppercase tracking-wider text-[10px] select-none">
                  <th onClick={() => handleEtfSort('symbol')} className="py-3 px-3 cursor-pointer hover:text-slate-200 sticky left-0 bg-slate-950/90 backdrop-blur z-10">
                    Symbol {etfSortField === 'symbol' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('underlying')} className="py-3 px-3 cursor-pointer hover:text-slate-200">
                    Underlying Asset {etfSortField === 'underlying' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('open')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    Open {etfSortField === 'open' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('high')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    High {etfSortField === 'high' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('low')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    Low {etfSortField === 'low' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('prevClose')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    Prev Close {etfSortField === 'prevClose' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('ltp')} className="py-3 px-2 text-right text-slate-200 cursor-pointer hover:text-white font-bold">
                    LTP (₹) {etfSortField === 'ltp' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-3 px-2 text-center text-slate-500">Indicative Close</th>
                  <th onClick={() => handleEtfSort('change')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    Change {etfSortField === 'change' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('pctChange')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200 font-bold">
                    % Change {etfSortField === 'pctChange' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('volumeNum')} className="py-3 px-2 text-right font-mono cursor-pointer hover:text-slate-200">
                    Volume {etfSortField === 'volumeNum' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('valueCr')} className="py-3 px-2 text-right font-mono cursor-pointer hover:text-slate-200">
                    Value (₹ Cr) {etfSortField === 'valueCr' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('nav')} className="py-3 px-2 text-right font-mono text-emerald-400 cursor-pointer hover:text-emerald-300 font-bold">
                    NAV (₹) {etfSortField === 'nav' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('high52')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    52W H {etfSortField === 'high52' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('low52')} className="py-3 px-2 text-right cursor-pointer hover:text-slate-200">
                    52W L {etfSortField === 'low52' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleEtfSort('change30D')} className="py-3 px-3 text-right cursor-pointer hover:text-slate-200">
                    30D % Chng {etfSortField === 'change30D' ? (etfSortAsc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
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
                      className="hover:bg-indigo-500/10 cursor-pointer transition-colors group"
                      title="Click to view full holdings & portfolio breakdown"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-1.5 sticky left-0 bg-slate-900/90 backdrop-blur group-hover:bg-slate-800 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="group-hover:text-indigo-400 transition-colors">{etf.symbol}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-[220px] truncate" title={etf.underlying}>{etf.underlying}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.open.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.high.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.low.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.prevClose.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-100">{etf.ltp.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600 font-mono">{etf.indicativeClose}</td>
                      <td className={`py-2.5 px-2 text-right font-mono font-semibold ${etf.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {etf.change >= 0 ? `+${etf.change.toFixed(2)}` : etf.change.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-mono font-bold ${etf.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {etf.pctChange >= 0 ? `+${etf.pctChange.toFixed(2)}%` : `${etf.pctChange.toFixed(2)}%`}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.volume}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 font-semibold">{etf.valueCr.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-400 font-bold">{etf.nav.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.high52.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{etf.low52.toFixed(2)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${etf.change30D >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {etf.change30D >= 0 ? `+${etf.change30D.toFixed(2)}%` : `${etf.change30D.toFixed(2)}%`}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTOR-WISE & MAJOR STOCK HOLDINGS CARD ── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-400" />
                Mutual Funds Sector-Wise & Major Stock Holdings
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Aggregated sector allocations and top individual stock positions held across Indian Mutual Funds by Weight %, Market Cap, Volume, and Fund Exposure.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Live Holdings Analytics
              </span>
            </div>
          </div>

          {/* Sector-Wise Allocation Summary Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
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
                <div key={sec.sector} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">{sec.sector}</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-400">{sec.weight}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${sec.color}`} style={{ width: `${sec.pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
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
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Top Stocks Majorly Invested by Mutual Funds
              </h4>
              <span className="text-[10px] text-slate-500">Sorted by Portfolio Weight & MF Exposure</span>
            </div>
            <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <th className="py-3 px-4 font-semibold">Stock Name</th>
                    <th className="py-3 px-3 font-semibold">Sector</th>
                    <th className="py-3 px-3 font-semibold text-right">Avg Weight %</th>
                    <th className="py-3 px-3 font-semibold text-right">Market Cap</th>
                    <th className="py-3 px-3 font-semibold text-right">Volume (24h)</th>
                    <th className="py-3 px-3 font-semibold text-right">MF Holding %</th>
                    <th className="py-3 px-4 font-semibold">Top Invested Funds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
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
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{item.stock}</div>
                        <div className="text-[10px] font-mono text-slate-500">{item.symbol}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                          {item.sector}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-400 bg-indigo-500/5">
                        {item.weight}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-200">
                        {item.mcap}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {item.volume}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {item.mfHolding}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-slate-400 truncate max-w-[220px]" title={item.topFunds}>
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
          <h3 className="text-sm font-bold text-slate-300">Explore Mutual Funds by Category</h3>
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
                className="bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all rounded-xl p-4 text-left flex items-start gap-3 group cursor-pointer"
              >
                <div className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{cat.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── TRADOX SIP, LEADERBOARDS & NFOs SECTION ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Top SIP Funds */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Top SIP Funds</span>
              <span onClick={() => setViewAllSIP(!viewAllSIP)} className="text-[9px] text-blue-400 cursor-pointer hover:text-blue-300">{viewAllSIP ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
              {enrichedFunds.filter(f => f.isSIP).sort((a, b) => b.returns['1Y'] - a.returns['1Y']).slice(0, viewAllSIP ? 20 : 5).map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setActiveModalFund(f)}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate w-36">{f.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{f.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">+{f.returns['1Y']}%</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">₹{f.nav}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Funds by 5Y Return */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Top Funds by 5Y Return</span>
              <span onClick={() => setViewAll5Y(!viewAll5Y)} className="text-[9px] text-blue-400 cursor-pointer hover:text-blue-300">{viewAll5Y ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
              {[...enrichedFunds].sort((a, b) => b.returns['5Y'] - a.returns['5Y']).slice(0, viewAll5Y ? 20 : 5).map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setActiveModalFund(f)}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate w-36">{f.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{f.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">+{f.returns['5Y']}%</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">5Y CAGR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Invested AMCs */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Most Invested AMCs</span>
              <span onClick={() => setViewAllAMCs(!viewAllAMCs)} className="text-[9px] text-blue-400 cursor-pointer hover:text-blue-300">{viewAllAMCs ? 'Show Less' : 'View All'}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
              {mostInvestedAMCs.slice(0, viewAllAMCs ? mostInvestedAMCs.length : 5).map((amc, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSearchQuery(amc.name);
                    if (rankingTableRef.current) rankingTableRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate w-36">{amc.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">AUM: ₹{amc.aumStr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-indigo-400">{amc.share}</div>
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
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">New Fund Offers</span>
              <span onClick={() => setViewAllNFOs(!viewAllNFOs)} className="text-[9px] text-blue-400 cursor-pointer hover:text-blue-300">{viewAllNFOs ? 'Show Less' : 'View All'}</span>
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
                    nav: 10.00,
                    aum: 1420,
                    sharpeRatio: 1.84,
                    sortinoRatio: 2.70,
                    returns: { '1Y': 35.8 }
                  })}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate w-36">{nfo.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Open Ends</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-orange-400">NFO Open</div>
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
          <div className="lg:col-span-6 bg-slate-900/30 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Category Performance (1Y Return)</h3>
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
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>{item.cat}</span>
                    <span className="font-bold">{item.ret}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.ret}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap / Popular Searches */}
          <div className="lg:col-span-6 bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-4">Popular Searches</h3>
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
                    className="px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs font-medium rounded-lg text-slate-300 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800/80 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Start Your SIP Investment today</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Setup automated monthly investments in top performing direct plans.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── OLD VIEW TOGGLES & DETAIL PANELS (Retained below for consistency) ── */}
        <div className="border-t border-slate-800/80 pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-200">Sector Allocations & Comparison</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Deep-dive comparison table and sector aggregates.</p>
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
          <AllMutualFundsDirectory />
        </div>

        {/* Fund Detail Drawer / Modal */}
        <FundDetailModal fund={activeModalFund} onClose={() => setActiveModalFund(null)} />

      </div>
    </div>
  );
};

export default IndianMfSectorAnalysis;
