import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, LayoutGrid, BarChart3, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { setActiveSector, setActiveSymbol } from '../store/slices/marketSlice.js';

export const Sectors = ({ setActiveTab }) => {
  const dispatch = useDispatch();
  const { activeSector } = useSelector(state => state.market);
  
  // States
  const [sectors, setSectors] = useState([]);
  const [sectorDetail, setSectorDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailMode, setShowDetailMode] = useState(false);
  const [chartData, setChartData] = useState([]);

  // Fetch all sectors
  const fetchSectors = async () => {
    try {
      const res = await axios.get('/api/sectors');
      setSectors(res.data);
    } catch (err) {
      console.error('Error fetching sectors:', err);
    }
  };

  // Fetch individual sector details
  const fetchSectorDetail = async (secName) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/sectors/${secName}`);
      setSectorDetail(res.data);
      
      // Generate some chart data for the sector
      const trendPositive = res.data.sector.changePercent >= 0;
      const data = [];
      let baseVal = 100;
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const dateStr = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        baseVal += (Math.random() - (trendPositive ? 0.45 : 0.55)) * 4;
        data.push({ date: dateStr, performance: parseFloat(baseVal.toFixed(2)) });
      }
      setChartData(data);
      setShowDetailMode(true);
    } catch (err) {
      console.error('Error fetching sector details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
    // Poll updates every 6 seconds
    const interval = setInterval(fetchSectors, 6000);
    return () => clearInterval(interval);
  }, []);

  // Sync details if Redux activeSector changes externally
  useEffect(() => {
    if (activeSector) {
      fetchSectorDetail(activeSector);
    }
  }, [activeSector]);

  const handleSelectSector = (secName) => {
    dispatch(setActiveSector(secName));
  };

  const handleSelectStock = (sym) => {
    dispatch(setActiveSymbol(sym));
    setActiveTab('stock-details');
  };

  const handleBackToGrid = () => {
    setShowDetailMode(false);
    dispatch(setActiveSector(''));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="flex items-center gap-2">
          {showDetailMode && (
            <button
              onClick={handleBackToGrid}
              className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-lg transition-colors border border-slate-850 mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="font-display font-extrabold text-2xl text-white">
              {showDetailMode ? `${activeSector} Sector Details` : 'Market Sector Performance'}
            </h2>
            <p className="text-xs text-slate-400">
              {showDetailMode 
                ? `Analyze constituent stocks, key indices, volume, and AI sentiment insights for the ${activeSector} sector.`
                : 'Monitor top-performing segments, advanced ratio distributions, and structural rotations.'}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW GRID OR VIEW DETAILS PANEL */}
      {!showDetailMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectors.map((sec) => {
            const isPositive = sec.changePercent >= 0;
            const advances = sec.advances;
            const declines = sec.declines;
            const ratio = advances + declines > 0 ? (advances / (advances + declines)) * 100 : 50;

            return (
              <div
                key={sec.name}
                onClick={() => handleSelectSector(sec.name)}
                className="glass-card p-5 cursor-pointer hover:border-slate-700/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                        {sec.name}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">CAP: ₹{sec.marketCap != null ? sec.marketCap.toLocaleString() : '—'} Cr</span>
                    </div>
                    <span className={`text-sm font-mono font-extrabold px-2 py-0.5 rounded ${
                      isPositive ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/20'
                    }`}>
                      {isPositive ? '+' : ''}{sec.changePercent}%
                    </span>
                  </div>

                  {/* Advance/Decline proportions */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                      <span>Advances: {advances}</span>
                      <span>Declines: {declines}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-900/40">
                      <div style={{ width: `${ratio}%` }} className="bg-emerald-500 h-full"></div>
                      <div style={{ width: `${100 - ratio}%` }} className="bg-rose-500 h-full"></div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900/60 pt-3 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-500">Volume: {(sec.volume / 1000).toFixed(0)}k</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sec.trend === 'Bullish' ? 'bg-emerald-950 text-emerald-400' :
                    sec.trend === 'Bearish' ? 'bg-rose-950 text-rose-400' :
                    'bg-slate-900 text-slate-400'
                  }`}>
                    {sec.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Sector Index Chart and Constituent Stocks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Index performance chart */}
            {sectorDetail?.sector && (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display font-bold text-base text-white">Sector Index Trend</h3>
                  <span className={`text-xs font-mono font-bold ${sectorDetail.sector.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sectorDetail.sector.changePercent >= 0 ? '+' : ''}{sectorDetail.sector.changePercent}% Today
                  </span>
                </div>

                <div className="h-60 w-full bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="performanceGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={sectorDetail.sector.changePercent >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={sectorDetail.sector.changePercent >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} labelClassName="text-white" />
                      <Area
                        type="monotone"
                        dataKey="performance"
                        stroke={sectorDetail.sector.changePercent >= 0 ? '#10b981' : '#f43f5e'}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#performanceGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List of stocks inside the sector */}
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-base text-white mb-4">Constituent Equities</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase font-mono">
                      <th className="py-2.5">Stock</th>
                      <th className="py-2.5">Company Name</th>
                      <th className="py-2.5 text-right">Price</th>
                      <th className="py-2.5 text-right">Change %</th>
                      <th className="py-2.5 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-mono">
                    {(sectorDetail?.stocks || []).map((s) => (
                      <tr
                        key={s.symbol}
                        onClick={() => handleSelectStock(s.symbol)}
                        className="hover:bg-slate-900/60 cursor-pointer transition-all"
                      >
                        <td className="py-3 font-bold text-white">{s.symbol}</td>
                        <td className="py-3 font-sans text-slate-400">{s.name}</td>
                        <td className="py-3 text-right text-slate-200">₹{s.ltp != null ? s.ltp.toLocaleString() : '—'}</td>
                        <td className={`py-3 text-right font-bold ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {s.changePercent >= 0 ? '+' : ''}{s.changePercent}%
                        </td>
                        <td className="py-3 text-right text-slate-500">{(s.volume / 1000).toFixed(0)}k</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: AI Analysis & Movers */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Summary Box */}
            <div className="glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <Sparkles className="text-emerald-400 w-5 h-5" />
                <h3 className="font-display font-bold text-base text-white">AI Sector Analysis</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {sectorDetail?.aiSummary}
              </p>
              <div className="mt-4 p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono">
                <span>Sector Trend:</span>
                <span className={`font-bold ${
                  sectorDetail?.sector.trend === 'Bullish' ? 'text-emerald-400' :
                  sectorDetail?.sector.trend === 'Bearish' ? 'text-rose-400' :
                  'text-slate-400'
                }`}>
                  {sectorDetail?.sector.trend}
                </span>
              </div>
            </div>

            {/* Sector gainers and losers */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2">Sector Movers</h3>
              
              <div className="space-y-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Top Gainer</span>
                {sectorDetail?.gainers?.[0] ? (
                  <div
                    onClick={() => handleSelectStock(sectorDetail.gainers[0].symbol)}
                    className="flex justify-between items-center p-3 bg-emerald-950/15 border border-emerald-900/20 hover:border-emerald-800/40 rounded-lg cursor-pointer transition-all"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{sectorDetail.gainers[0].symbol}</span>
                      <span className="text-[9px] text-slate-500 block truncate max-w-[120px]">{sectorDetail.gainers[0].name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">+{sectorDetail.gainers[0].changePercent}%</span>
                  </div>
                ) : <span className="text-xs text-slate-500 block font-mono">No data</span>}

                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold block mt-3">Top Loser</span>
                {sectorDetail?.losers?.[0] ? (
                  <div
                    onClick={() => handleSelectStock(sectorDetail.losers[0].symbol)}
                    className="flex justify-between items-center p-3 bg-rose-950/15 border border-rose-900/20 hover:border-rose-800/40 rounded-lg cursor-pointer transition-all"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{sectorDetail.losers[0].symbol}</span>
                      <span className="text-[9px] text-slate-500 block truncate max-w-[120px]">{sectorDetail.losers[0].name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400">{sectorDetail.losers[0].changePercent}%</span>
                  </div>
                ) : <span className="text-xs text-slate-500 block font-mono">No data</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Sectors;
