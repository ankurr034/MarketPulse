import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Loader2, AlertCircle, PieChart as PieChartIcon, TrendingUp, BarChart3, Filter } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa', '#f87171', '#2dd4bf', '#fb923c'];

export default function SectorAnalyticsPanel({ activeRange = '1y' }) {
  const [sectorGrowth, setSectorGrowth] = useState(null);
  const [sectorAlloc, setSectorAlloc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSector, setActiveSector] = useState('Financials');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [growthRes, allocRes] = await Promise.all([
          axios.get(`${API_BASE}/analytics/mf/sector-growth?sector=${encodeURIComponent(activeSector)}&range=${encodeURIComponent(activeRange)}`),
          axios.get(`${API_BASE}/analytics/mf/sector-allocation`)
        ]);
        
        setSectorGrowth(growthRes.data);
        
        // Only top 8 for pie chart to keep it clean, group rest into "Others"
        let rawAlloc = allocRes.data?.snapshot || [];
        if (rawAlloc.length > 8) {
          const top = rawAlloc.slice(0, 7);
          const others = rawAlloc.slice(7).reduce((acc, curr) => acc + curr.allocationPct, 0);
          top.push({ sector: 'Others', allocationPct: others });
          setSectorAlloc(top);
        } else {
          setSectorAlloc(rawAlloc);
        }
        
      } catch (err) {
        console.error('Failed to fetch analytics', err);
        setError('Failed to load sector analytics.');
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, [activeSector, activeRange]);

  if (loading && !sectorGrowth) {
    return (
      <div className="flex flex-col items-center justify-center h-80 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <span className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></span>
        <p className="text-[var(--text-muted)] text-sm font-medium tracking-wide">Crunching aggregate sector data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 shadow-sm">
        <AlertCircle size={24} />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  // Formatting for charts
  const chartData = (sectorGrowth?.topFunds || []).map(f => ({
    name: f.schemeName.split(' - ')[0], // simplify long names
    growth: parseFloat(f.growthPct.toFixed(2)),
    allocation: parseFloat(f.allocationPct.toFixed(2))
  }));

  const pieData = sectorAlloc?.map(s => ({
    name: s.sector,
    value: parseFloat(s.allocationPct.toFixed(2))
  })) || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Allocation Snapshot */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] flex items-center gap-2">
            <PieChartIcon size={20} className="text-indigo-400" /> Sector Flow Snapshot
          </h2>
          <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] uppercase tracking-wider">
            Across Tracked Funds
          </span>
        </div>
        
        <div className="h-[320px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={90}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Allocation']}
                contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                labelStyle={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={40} 
                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }} 
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Growth Analysis */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm relative overflow-hidden">
        {/* decorative background blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" /> Sector Growth Analysis
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Performance of top funds heavily exposed to <span className="font-semibold text-indigo-400">{activeSector}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 relative z-10">
            <Filter size={16} className="text-[var(--text-muted)] hidden sm:block" />
            <select
              value={activeSector}
              onChange={(e) => setActiveSector(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border font-semibold text-sm cursor-pointer shadow-sm appearance-none pr-10"
              style={{ 
                background: 'var(--bg-secondary)', 
                borderColor: 'var(--border-color)', 
                color: 'var(--text-primary)',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              {['Financials', 'Technology', 'Healthcare', 'Automobile', 'FMCG', 'Capital Goods', 'Energy', 'Services'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Aggregate Stat */}
        <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-[var(--bg-secondary)] to-transparent border border-[var(--border-color)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
            <BarChart3 size={16} className="text-indigo-400" /> 
            Weighted Avg Sector Growth
          </div>
          {loading ? (
             <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
          ) : sectorGrowth ? (
            <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${sectorGrowth.avgGrowthPct >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
              {sectorGrowth.avgGrowthPct >= 0 ? '+' : ''}{sectorGrowth.avgGrowthPct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </div>

        {/* Growth Bar Chart */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <span className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}
          
          <div className="h-[320px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10} 
                />
                <YAxis 
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `${v}%`} 
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: 'var(--bg-secondary)', opacity: 0.6 }}
                  contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                  labelStyle={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}
                  formatter={(val, name) => [val + '%', name === 'growth' ? 'Growth' : 'Sector Allocation']}
                />
                <Bar 
                  dataKey="growth" 
                  radius={[6, 6, 0, 0]} 
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? 'var(--accent)' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Funds Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-secondary)]/50">
              <tr className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 sm:px-5 border-b border-[var(--border-color)]">Top Funds in {activeSector}</th>
                <th className="py-3 px-4 sm:px-5 text-right border-b border-[var(--border-color)]">Allocation</th>
                <th className="py-3 px-4 sm:px-5 text-right border-b border-[var(--border-color)]">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/50">
              {!loading && chartData.map((f, i) => (
                <tr key={i} className="group hover:bg-[var(--bg-card-hover)] transition-colors">
                  <td className="py-3.5 px-4 sm:px-5 font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">
                    {f.name}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-right text-[var(--text-secondary)] font-mono text-xs">
                    <span className="inline-flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2 py-0.5 rounded text-xs font-semibold">
                      {f.allocation}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-right">
                    <span className={`inline-flex items-center font-bold font-mono text-xs ${f.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {f.growth >= 0 ? '+' : ''}{f.growth}%
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && chartData.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-12 text-center text-[var(--text-muted)] italic">
                    No top funds have exposure to this sector.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
