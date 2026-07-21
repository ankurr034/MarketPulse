import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createChart } from 'lightweight-charts';
import { X, ChevronUp, ChevronDown, ListPlus, Activity, BarChart2 } from 'lucide-react';
import { useWorkbench } from '../context/WorkbenchContext';
import TimeframeSelector from './TimeframeSelector';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ComparisonWorkbench() {
  const { items, unpin, clear, isOpen, setIsOpen } = useWorkbench();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState('1yr');
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRefs = useRef({});

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const payload = { items, range };
        const res = await axios.post(`${API_BASE}/comparison`, payload);
        if (isMounted) setData(res.data);
      } catch (err) {
        console.error('Failed to fetch comparison data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [items, range, isOpen]);

  // Chart Rendering
  useEffect(() => {
    if (!isOpen || !chartContainerRef.current || !data || data.items.length === 0) return;

    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 350,
        layout: {
          background: { color: 'transparent' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: 'rgba(30, 41, 59, 0.5)', style: 1 },
          horzLines: { color: 'rgba(30, 41, 59, 0.5)', style: 1 },
        },
        timeScale: {
          timeVisible: true,
          borderColor: '#334155',
          rightOffset: 12,
        },
        rightPriceScale: {
          borderColor: '#334155',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        crosshair: {
          mode: 1, // Magnet
          vertLine: { color: '#64748b', width: 1, style: 3, labelBackgroundColor: '#1e293b' },
          horzLine: { color: '#64748b', width: 1, style: 3, labelBackgroundColor: '#1e293b' },
        }
      });
      chartRef.current = chart;

      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === chartContainerRef.current && chartRef.current) {
            chartRef.current.resize(entry.contentRect.width, 350);
          }
        }
      });
      resizeObserver.observe(chartContainerRef.current);
      chartRef.current.observer = resizeObserver;
    }

    const chart = chartRef.current;

    // Clear old series
    Object.values(seriesRefs.current).forEach(series => {
      chart.removeSeries(series);
    });
    seriesRefs.current = {};

    // Auto base-100 logic when comparing multiple distinct assets
    const forceBase100 = data.items.length > 1;

    data.items.forEach((item, idx) => {
      if (!item.series || item.series.length === 0) return;

      const series = chart.addAreaSeries({
        lineColor: COLORS[idx % COLORS.length],
        topColor: COLORS[idx % COLORS.length] + '40', // 40 hex opacity
        bottomColor: COLORS[idx % COLORS.length] + '00',
        lineWidth: 2,
        priceFormat: {
          type: forceBase100 ? 'percent' : 'price',
          precision: 2,
          minMove: 0.01,
        }
      });

      // Compute base value if base-100
      let baseValue = 1;
      if (forceBase100) {
        const firstValid = item.series.find(d => d.value !== null && d.value !== undefined && !isNaN(d.value));
        baseValue = firstValid ? firstValid.value : 1;
        if (baseValue === 0) baseValue = 1; // Prevent div zero
      }

      const formattedData = item.series.map(d => {
        let t = d.time || d.date;
        if (typeof t === 'string') {
          t = Math.floor(new Date(t).getTime() / 1000);
        } else if (t > 1000000000000) {
          t = Math.floor(t / 1000);
        }
        return {
          time: t,
          value: forceBase100 ? ((d.value / baseValue) * 100) - 100 : d.value
        };
      }).filter(d => !isNaN(d.value) && d.time !== undefined && d.time !== null);

      // Remove duplicates by time
      const uniqueData = [];
      const seen = new Set();
      for (const pt of formattedData) {
        if (!seen.has(pt.time)) {
          seen.add(pt.time);
          uniqueData.push(pt);
        }
      }

      uniqueData.sort((a, b) => a.time - b.time);

      if (uniqueData.length > 0) {
        series.setData(uniqueData);
        seriesRefs.current[item.id] = series;
      }
    });

    chart.timeScale().fitContent();

  }, [data, isOpen]);


  if (items.length === 0) {
    if (isOpen) setIsOpen(false);
    return null;
  }

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-auto">
        <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-t-2xl shadow-2xl transition-all duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
          
          {/* Header / Grab Handle */}
          <div 
            onClick={toggleOpen}
            className="h-12 flex items-center justify-between px-4 sm:px-6 cursor-pointer border-b border-[var(--border-color)] bg-gradient-to-r from-[var(--bg-secondary)]/50 to-transparent hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <BarChart2 size={14} />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Comparison Workbench
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); clear(); }}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
              {isOpen ? <ChevronDown size={18} className="text-[var(--text-muted)]" /> : <ChevronUp size={18} className="text-[var(--text-muted)]" />}
            </div>
          </div>

          {/* Workbench Body */}
          <div className="p-4 sm:p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* Controls & Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {items.map((item, idx) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="truncate max-w-[120px]">{item.name || item.id}</span>
                    <button onClick={() => unpin(item.type, item.id)} className="text-[var(--text-muted)] hover:text-red-400 ml-1">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="shrink-0">
                <TimeframeSelector selected={range} onChange={setRange} />
              </div>
            </div>

            {/* Chart Area */}
            <div className="relative border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)]/30 pt-4">
              {loading && (
                <div className="absolute inset-0 z-10 bg-[var(--bg-card)]/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full" />
            </div>

            {/* Metrics Table */}
            {data && data.items && (
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Asset</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Price / NAV</th>
                      <th className="px-4 py-3 font-semibold">Return</th>
                      <th className="px-4 py-3 font-semibold">Category / Industry</th>
                      <th className="px-4 py-3 font-semibold">Exp. Ratio</th>
                      <th className="px-4 py-3 font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {data.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="truncate max-w-[150px] sm:max-w-[200px]">{item.name}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] capitalize">{item.type}</td>
                        <td className="px-4 py-3 font-mono">
                          {item.metrics.currentPrice ? (
                            <>{item.metrics.currency === 'USD' ? '$' : '₹'}{item.metrics.currentPrice.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</>
                          ) : '—'}
                        </td>
                        <td className={`px-4 py-3 font-mono ${item.metrics.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.metrics.changePercent !== null && item.metrics.changePercent !== undefined 
                            ? `${item.metrics.changePercent > 0 ? '+' : ''}${item.metrics.changePercent.toFixed(2)}%` 
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{item.metrics.category || item.metrics.industry || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)] font-mono">{item.metrics.expenseRatio ? `${item.metrics.expenseRatio}%` : '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)] capitalize">{item.metrics.riskLevel || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
