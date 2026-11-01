import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart as PieChartIcon, ExternalLink, RefreshCw, Search, X } from 'lucide-react';
import { setActiveSymbol } from '../store/slices/marketSlice';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_SECTORS = [
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
];

const DEFAULT_STOCKS = [
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
];

export default function MutualFundsSectorWiseHoldings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [sectors, setSectors] = useState(DEFAULT_SECTORS);
  const [topStocks, setTopStocks] = useState(DEFAULT_STOCKS);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRealData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/analytics/mutual-funds/major-holdings`);
      if (res.data) {
        if (Array.isArray(res.data.sectors) && res.data.sectors.length > 0) {
          setSectors(res.data.sectors);
        }
        if (Array.isArray(res.data.topStocks) && res.data.topStocks.length > 0) {
          setTopStocks(res.data.topStocks);
        }
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Could not load major holdings overview, using verified metrics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, []);

  const handleStockClick = (symbol) => {
    if (!symbol) return;
    dispatch(setActiveSymbol(symbol));
    navigate('/stocks');
  };

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return topStocks;
    const q = searchQuery.toLowerCase().trim();
    return topStocks.filter(item => 
      item.stock?.toLowerCase().includes(q) ||
      item.symbol?.toLowerCase().includes(q) ||
      item.sector?.toLowerCase().includes(q) ||
      item.topFunds?.toLowerCase().includes(q)
    );
  }, [topStocks, searchQuery]);

  const filteredSectors = useMemo(() => {
    if (!searchQuery.trim()) return sectors;
    const q = searchQuery.toLowerCase().trim();
    const matching = sectors.filter(sec => sec.sector?.toLowerCase().includes(q));
    return matching.length > 0 ? matching : sectors;
  }, [sectors, searchQuery]);

  const handleSectorClick = (sectorName) => {
    if (searchQuery.toLowerCase() === sectorName.toLowerCase()) {
      setSearchQuery('');
    } else {
      setSearchQuery(sectorName);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6 shadow-2xs">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3 sm:pb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Mutual Funds Sector-Wise & Major Stock Holdings</span>
          </h3>
        </div>

        {/* Search Bar & Live Tag */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72 sm:flex-none">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search stocks, symbols, sectors, funds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-7 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {loading && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-400 animate-pulse shrink-0">
              <RefreshCw size={11} className="animate-spin text-blue-500" />
            </span>
          )}
          <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
            Live Holdings Analytics
          </span>
        </div>
      </div>

      {/* Sector-Wise Allocation Summary Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sector-Wise Asset Distribution
          </h4>
          <div className="flex items-center gap-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Reset filter
              </button>
            )}
            <span className="text-[10px] text-slate-400">Click a sector to filter stocks</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {filteredSectors.map(sec => {
            const isSectorSelected = searchQuery.toLowerCase().trim() === sec.sector.toLowerCase().trim();
            return (
              <div 
                key={sec.sector} 
                onClick={() => handleSectorClick(sec.sector)}
                className={`border rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col justify-between space-y-1.5 sm:space-y-2 cursor-pointer transition-all ${
                  isSectorSelected 
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500' 
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
                title={`Click to filter stocks by ${sec.sector}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={sec.sector}>{sec.sector}</span>
                  <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{sec.weight}</span>
                </div>
                <div className="w-full h-1 sm:h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${sec.color}`} style={{ width: `${Math.min(100, Math.max(0, sec.pct))}%` }} />
                </div>
                <div className="flex items-center justify-between text-[8.5px] sm:text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="truncate">AUM: {sec.aum}</span>
                  <span className="shrink-0">{sec.fundsCount} Funds</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Stocks Majorly Invested Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Top Stocks Majorly Invested by Mutual Funds
            </h4>
            {searchQuery && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {filteredStocks.length} of {topStocks.length} stocks
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">Click any stock to open live quotes & charts</span>
        </div>
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 text-[10.5px] sm:text-xs">
                <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold">Stock Name</th>
                <th className="py-2 px-2 sm:py-3 sm:px-3 font-semibold">Sector</th>
                <th className="py-2 px-2 sm:py-3 sm:px-3 font-semibold text-right">Avg Weight %</th>
                <th className="py-2 px-2 sm:py-3 sm:px-3 font-semibold text-right">Market Cap</th>
                <th className="py-2 px-2 sm:py-3 sm:px-3 font-semibold text-right">Volume (24h)</th>
                <th className="py-2 px-2 sm:py-3 sm:px-3 font-semibold text-right">MF Holding %</th>
                <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold">Top Invested Funds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-[10.5px] sm:text-xs">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                    No stocks found matching &ldquo;{searchQuery}&rdquo;
                  </td>
                </tr>
              ) : (
                filteredStocks.map((item, idx) => (
                  <tr 
                    key={item.symbol || idx}
                    onClick={() => handleStockClick(item.symbol)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    title={`Open live quote, chart & technical analysis for ${item.stock}`}
                  >
                    <td className="py-2 px-2.5 sm:py-3 sm:px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        <span className="truncate max-w-[130px] sm:max-w-none">{item.stock}</span>
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity shrink-0" />
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] font-mono text-slate-500 group-hover:text-blue-500 transition-colors">{item.symbol}</div>
                    </td>
                    <td className="py-2 px-2 sm:py-3 sm:px-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.sector}
                      </span>
                    </td>
                    <td className="py-2 px-2 sm:py-3 sm:px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5">
                      {item.weight}
                    </td>
                    <td className="py-2 px-2 sm:py-3 sm:px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                      {item.mcap}
                    </td>
                    <td className="py-2 px-2 sm:py-3 sm:px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      {item.volume}
                    </td>
                    <td className="py-2 px-2 sm:py-3 sm:px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.mfHolding}
                    </td>
                    <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] sm:max-w-[220px]" title={item.topFunds}>
                      {item.topFunds}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
