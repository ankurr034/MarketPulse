import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import TimeframeSelector from './TimeframeSelector';

const INDICATORS = [
  { id: 'repoRate', label: 'RBI Repo Rate' },
  { id: 'cpiInflation', label: 'CPI Inflation' },
  { id: 'gdpGrowth', label: 'GDP Growth' },
  { id: 'iip', label: 'IIP' }
];

const SECTORS = ['Technology', 'Financials', 'Healthcare', 'Infrastructure', 'Energy', 'Consumption'];

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MacroCorrelationSection = () => {
  const [indicator, setIndicator] = useState('repoRate');
  const [sector, setSector] = useState('Technology');
  const [range, setRange] = useState('3y');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [indicator, sector, range]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/indian-mf/macro/correlation/${sector}?indicator=${indicator}&range=${encodeURIComponent(range)}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load correlation data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Merge series for Recharts
  // sectorSeries: [{date, value}]
  // macroSeries: [{date, value}]
  const getChartData = () => {
    if (!data || !data.sectorSeries || !data.macroSeries) return [];

    const dateMap = {};
    data.sectorSeries.forEach(s => {
      dateMap[s.date] = { date: s.date, sectorValue: s.value };
    });
    
    data.macroSeries.forEach(m => {
      if (!dateMap[m.date]) {
        dateMap[m.date] = { date: m.date };
      }
      dateMap[m.date].macroValue = m.value;
    });

    const merged = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Fill forward macro values for visualization
    let lastMacro = null;
    merged.forEach(item => {
      if (item.macroValue !== undefined) {
        lastMacro = item.macroValue;
      } else if (lastMacro !== null) {
        item.macroValue = lastMacro;
      }
    });

    return merged;
  };

  const chartData = getChartData();

  return (
    <div className="mt-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Macro Trend Analysis</h2>
          <p className="text-[var(--text-muted)] text-sm">
            Historical correlation between macroeconomic indicators and sector index growth.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-4">
          <div className="flex bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] p-1">
          {INDICATORS.map(ind => (
            <button
              key={ind.id}
              onClick={() => setIndicator(ind.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${indicator === ind.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {ind.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] p-1">
          {SECTORS.map(sec => (
            <button
              key={sec}
              onClick={() => setSector(sec)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sector === sec ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {sec}
            </button>
          ))}
        </div>
        </div>
        
        <TimeframeSelector
          activeRange={range}
          onChange={setRange}
          earliestDate={null}
        />
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <Activity className="w-8 h-8 text-[var(--text-muted)] animate-pulse" />
        </div>
      ) : (
        <div className="h-80 w-full mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={str => str.substring(0, 7)} />
              <YAxis yAxisId="left" stroke="#818cf8" fontSize={12} domain={['auto', 'auto']} />
              <YAxis yAxisId="right" orientation="right" stroke="#34d399" fontSize={12} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend />
              <Line yAxisId="left" type="stepAfter" dataKey="macroValue" name={INDICATORS.find(i => i.id === indicator)?.label} stroke="#818cf8" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="sectorValue" name={`${sector} (Base 100)`} stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <h3 className="text-emerald-400 font-semibold mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
              Historical Alignment
            </h3>
            {data.periodsOfAlignment.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No distinct periods of mechanical alignment detected.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.periodsOfAlignment.map((p, i) => (
                  <li key={i} className="text-[var(--text-primary)]">
                    <span className="font-semibold text-[var(--text-muted)]">{p.period}:</span> {p.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <h3 className="text-orange-400 font-semibold mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>
              Historical Divergence
            </h3>
            {data.periodsOfDivergence.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No distinct periods of mechanical divergence detected.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.periodsOfDivergence.map((p, i) => (
                  <li key={i} className="text-[var(--text-primary)]">
                    <span className="font-semibold text-[var(--text-muted)]">{p.period}:</span> {p.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-start p-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[var(--text-muted)]">
          <strong>Important framing constraint applied:</strong> This section shows historical patterns only and is strictly not a prediction of future market direction. Past correlation does not imply causation or future performance. Macroeconomic cycles are complex and mechanical relationships shown here should not be construed as investment recommendations (e.g. "expect a rally if rates are cut").
        </p>
      </div>

    </div>
  );
};

export default MacroCorrelationSection;
