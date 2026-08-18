import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { ArrowUpRight, ArrowDownRight, Newspaper, Cpu, Sparkles, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import MarketBreadthWidget from '../components/MarketBreadthWidget.jsx';
import { setActiveSector, setActiveSymbol } from '../store/slices/marketSlice.js';
import { formatPrice } from '../utils/currencyFormatter.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Sparkline Mock Points for aesthetic
const generateSparkData = (isPositive) => {
  const points = [];
  let cur = 50;
  for (let i = 0; i < 12; i++) {
    cur += (Math.random() - (isPositive ? 0.4 : 0.6)) * 8;
    points.push({ val: parseFloat(cur.toFixed(2)) });
  }
  return points;
};

export const Dashboard = ({ setActiveTab }) => {
  const dispatch = useDispatch();
  const { indices, stocks } = useSelector(state => state.market);
  
  // Dashboard states
  const [sectors, setSectors] = useState([]);
  const [topMovers, setTopMovers] = useState({ gainers: [], losers: [], active: [] });
  const [breadth, setBreadth] = useState(null);
  const [news, setNews] = useState([]);
  const [marketState, setMarketState] = useState({ status: 'Closed', countdown: 0 });
  const [activeMoverTab, setActiveMoverTab] = useState('gainers');
  const [sortConfig, setSortConfig] = useState({ key: 'changePercent', direction: 'desc' });

  // Fetch Dashboard Stats
  const fetchData = async () => {
    try {
      const [secRes, moversRes, breadthRes, newsRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/sectors`),
        axios.get(`${API_BASE}/market/top-performers`),
        axios.get(`${API_BASE}/market/breadth`),
        axios.get(`${API_BASE}/news`),
        axios.get(`${API_BASE}/market/status`)
      ]);

      setSectors(secRes.data);
      setTopMovers(moversRes.data);
      setBreadth(breadthRes.data);
      setNews(newsRes.data);
      setMarketState(statusRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSectorClick = (sectorName) => {
    dispatch(setActiveSector(sectorName));
    setActiveTab('sectors');
  };

  const handleStockClick = (symbol) => {
    dispatch(setActiveSymbol(symbol));
    setActiveTab('stock-details');
  };

  // Sector Sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSectors = [...sectors].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    if (sortConfig.direction === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner (Indices Sparkline Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['NIFTY 50', 'BANK NIFTY', 'MIDCAP', 'India VIX'].map((name) => {
          const idx = indices[name];
          if (!idx) return null;
          const isPositive = idx.changePercent >= 0;
          const sparkData = generateSparkData(isPositive);

          return (
            <div key={name} className="glass-card p-4 flex justify-between items-center relative overflow-hidden group hover:border-slate-700/80 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold block">{name}</span>
                <span className="text-2xl font-display font-extrabold text-white block">
                  {idx.price != null ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '—'}
                </span>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {isPositive ? '+' : ''}{idx.changePercent}%
                </span>
              </div>

              {/* Mini Sparkline Chart */}
              <div className="w-20 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke={isPositive ? '#10b981' : '#f43f5e'}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Market Status and Breadth Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-400 w-5 h-5" />
              <h3 className="font-display font-bold text-base text-white">Market Status</h3>
            </div>
            <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded-full ${
              marketState.status === 'Open' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-400'
            }`}>
              {marketState.status === 'Open' ? '🔴 LIVE' : '⚪ CLOSED'}
            </span>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            {marketState.status === 'Open' 
              ? `The Indian stock market (NSE/BSE) is currently trading. Time remaining to market close: ${marketState.countdown} minutes.`
              : 'The Indian stock markets are closed. Simulation continues streaming global ticks and news events for strategy testing.'}
          </p>

          <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3 flex justify-between items-center text-xs font-mono text-slate-500">
            <span>Market Hours: 09:15 AM - 03:30 PM IST</span>
            <span>Zone: Asia/Kolkata</span>
          </div>
        </div>

        <div className="lg:col-span-1">
          <MarketBreadthWidget breadth={breadth} />
        </div>
      </div>

      {/* Grid: Sector Performance vs Gainers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sectors (Left/Larger) */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-display font-bold text-lg text-white">Sector Performance</h3>
            <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Click sector for details</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 uppercase font-mono">
                  <th className="py-2.5 cursor-pointer hover:text-white" onClick={() => requestSort('name')}>Sector Name</th>
                  <th className="py-2.5 cursor-pointer text-right hover:text-white" onClick={() => requestSort('changePercent')}>Change %</th>
                  <th className="py-2.5 cursor-pointer text-right hover:text-white" onClick={() => requestSort('marketCap')}>Market Cap</th>
                  <th className="py-2.5 text-center">Advances Ratio</th>
                  <th className="py-2.5 text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {sortedSectors.map((sec) => {
                  const isPositive = sec.changePercent >= 0;
                  const totalStocks = sec.advances + sec.declines;
                  const advRatio = totalStocks > 0 ? (sec.advances / totalStocks) * 100 : 0;
                  
                  return (
                    <tr
                      key={sec.name}
                      onClick={() => handleSectorClick(sec.name)}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 font-semibold text-slate-200 group-hover:text-emerald-400">{sec.name}</td>
                      <td className={`py-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{sec.changePercent}%
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400">₹{sec.marketCap != null ? sec.marketCap.toLocaleString() : '—'} Cr</td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                            <div style={{ width: `${advRatio}%` }} className="bg-emerald-500 h-full"></div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{sec.advances}/{sec.declines}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          sec.trend === 'Bullish' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/20' : 
                          sec.trend === 'Bearish' ? 'bg-rose-950 text-rose-400 border border-rose-900/20' : 
                          'bg-slate-900 text-slate-400 border border-slate-800/40'
                        }`}>
                          {sec.trend}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gainers & Losers (Right) */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg mb-5">
              <button
                onClick={() => setActiveMoverTab('gainers')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                  activeMoverTab === 'gainers' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Gainers
              </button>
              <button
                onClick={() => setActiveMoverTab('losers')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                  activeMoverTab === 'losers' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Losers
              </button>
              <button
                onClick={() => setActiveMoverTab('active')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeMoverTab === 'active' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                Active
              </button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {(topMovers[activeMoverTab] || []).slice(0, 7).map((stock) => {
                const isPositive = stock.changePercent >= 0;
                return (
                  <div
                    key={stock.symbol}
                    onClick={() => handleStockClick(stock.symbol)}
                    className="flex justify-between items-center p-2.5 bg-slate-950/20 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg cursor-pointer transition-all"
                  >
                    <div>
                      <span className="font-bold text-sm text-white block">{stock.symbol}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">{stock.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-semibold text-white block">{formatPrice(stock.ltp, stock.symbol)}</span>
                      <span className={`text-[11px] font-bold flex items-center gap-0.5 justify-end ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isPositive ? '+' : ''}{stock.changePercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('heatmap')}
            className="w-full mt-6 bg-slate-900 hover:bg-slate-850 border border-slate-850 py-2.5 rounded-lg text-xs font-bold text-slate-300 transition-colors"
          >
            Open Market Treemap
          </button>
        </div>
      </div>

      {/* News & AI Sentiment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed (Left) */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
            <Newspaper className="text-emerald-400 w-5 h-5" />
            <h3 className="font-display font-bold text-lg text-white">Live News Feed</h3>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {news.map((item) => (
              <div key={item.id} className="p-4 bg-slate-950/30 border border-slate-900 rounded-lg space-y-2 hover:border-slate-800 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-500">{item.source} • {new Date(item.timestamp).toLocaleTimeString()}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                    item.sentiment === 'Bullish' ? 'bg-emerald-950/60 text-emerald-400' : 
                    item.sentiment === 'Bearish' ? 'bg-rose-950/60 text-rose-400' : 
                    'bg-slate-900 text-slate-400'
                  }`}>
                    {item.sentiment}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-200">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-normal">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI summary Box (Right) */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Cpu className="text-emerald-400 w-5 h-5" />
              <h3 className="font-display font-bold text-base text-white">Daily AI Summary</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-400/90 leading-relaxed">
                  <strong>Market Stance:</strong> IT sector leading buyers while PSU banks face selling distributions. Global sentiment remains moderately positive.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Key Momentum Counters</span>
                <div className="flex flex-wrap gap-2">
                  {topMovers.gainers.slice(0, 3).map(g => (
                    <span
                      key={g.symbol}
                      onClick={() => handleStockClick(g.symbol)}
                      className="bg-slate-900 hover:bg-slate-850 cursor-pointer border border-slate-800 px-2 py-1 rounded text-[10px] font-bold text-white font-mono"
                    >
                      {g.symbol} ({g.changePercent}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Breakout Watchlist</span>
                <div className="flex flex-wrap gap-2">
                  {(topMovers.breakouts || []).slice(0, 3).map(b => (
                    <span
                      key={b.symbol}
                      onClick={() => handleStockClick(b.symbol)}
                      className="bg-slate-900 hover:bg-slate-850 cursor-pointer border border-slate-800 px-2 py-1 rounded text-[10px] font-bold text-cyan-400 font-mono"
                    >
                      {b.symbol} (52W Breakout)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('ai-insights')}
            className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 glow-green"
          >
            <Sparkles className="w-4 h-4" />
            Scan Market Scan AI
          </button>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
