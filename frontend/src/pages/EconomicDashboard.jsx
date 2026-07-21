import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, HelpCircle, TrendingUp, Globe, Sparkles } from 'lucide-react';

export const EconomicDashboard = ({ socket }) => {
  const [metrics, setMetrics] = useState({});
  const [selectedKey, setSelectedKey] = useState('gdp');
  const [loading, setLoading] = useState(false);

  const fetchEconomics = async () => {
    try {
      const res = await axios.get('/api/market/economic');
      setMetrics(res.data);
    } catch (err) {
      console.error('Error fetching economics:', err);
    }
  };

  useEffect(() => {
    fetchEconomics();
    
    // Poll updates every 15 seconds
    const interval = setInterval(fetchEconomics, 15000);
    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket economic shifts
  useEffect(() => {
    if (!socket) return;
    
    const handleEcoUpdate = ({ key, data }) => {
      setMetrics(prev => ({
        ...prev,
        [key]: data
      }));
    };

    socket.on('economics_update', handleEcoUpdate);
    return () => {
      socket.off('economics_update', handleEcoUpdate);
    };
  }, [socket]);

  if (Object.keys(metrics).length === 0) {
    return <div className="p-8 text-center text-slate-500 font-mono">Querying central bank APIs...</div>;
  }

  const selectedMetric = metrics[selectedKey];
  const chartData = selectedMetric ? selectedMetric.history : [];

  const metricTitles = {
    gdp: { label: 'GDP Growth Rate', desc: 'Real quarterly GDP expansion matching World Bank feeds.', color: '#10b981' },
    inflation: { label: 'CPI Inflation', desc: 'Year-over-year Consumer Price index inflation rate.', color: '#f43f5e' },
    interestRate: { label: 'RBI Repo Rate', desc: 'Benchmark lending rate set by the monetary policy committee.', color: '#f59e0b' },
    usdInr: { label: 'USD / INR Rate', desc: 'Exchange rate of US Dollar to Indian Rupee.', color: '#06b6d4' },
    crudeOil: { label: 'Brent Crude Oil', desc: 'Global oil benchmark price per barrel in USD.', color: '#8b5cf6' },
    gold: { label: 'Gold Price (10g)', desc: 'Domestic market spot price for pure 24K Gold.', color: '#eab308' },
    bondYield: { label: '10Y Bond Yield', desc: 'Yield on benchmark government sovereign debt.', color: '#3b82f6' }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
          <Globe className="text-emerald-400 w-6 h-6" /> Economic Dashboard
        </h2>
        <p className="text-xs text-slate-400">Track inflation indices, central bank interest rates, sovereign bond yields, commodity values, and foreign exchange rates.</p>
      </div>

      {/* Main Chart Card */}
      {selectedMetric && (
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                {metricTitles[selectedKey].label} Historical Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{metricTitles[selectedKey].desc}</p>
            </div>

            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Latest Value</span>
              <span className="text-2xl font-extrabold text-white">
                {selectedKey === 'gold' || selectedKey === 'usdInr' ? '₹' : ''}
                {selectedMetric.value.toLocaleString()}
                {selectedMetric.unit}
              </span>
            </div>
          </div>

          {/* Recharts area chart */}
          <div className="h-64 w-full bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ecoColorGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricTitles[selectedKey].color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={metricTitles[selectedKey].color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} labelClassName="text-white font-mono" />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metricTitles[selectedKey].color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ecoColorGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* METRICS CARD GRID SELECTOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.keys(metrics).map((key) => {
          const item = metrics[key];
          const isSelected = selectedKey === key;
          const meta = metricTitles[key];
          const isPos = item.change >= 0;

          return (
            <div
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`glass-card p-5 cursor-pointer hover:border-slate-700 transition-all flex flex-col justify-between ${
                isSelected ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-[0_0_15px_rgba(16,185,129,0.04)]' : ''
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-2">
                  {meta.label}
                </span>
                <span className="text-2xl font-display font-extrabold text-white block">
                  {key === 'gold' || key === 'usdInr' ? '₹' : ''}
                  {item.value.toLocaleString()}
                  {item.unit}
                </span>
              </div>

              <div className="border-t border-slate-900/60 pt-3 mt-4 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500">Intraday Shift:</span>
                <span className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? '+' : ''}{item.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default EconomicDashboard;
