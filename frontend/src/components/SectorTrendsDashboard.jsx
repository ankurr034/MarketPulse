// frontend/src/components/SectorTrendsDashboard.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { createChart } from 'lightweight-charts';
import { TrendingUp, Compass, Layers, Sparkles, Plus, X, BarChart2, LineChart, ArrowUpRight, ArrowDownRight, Pin } from 'lucide-react';
import ExpandableAssetRow from './ExpandableAssetRow';
import TimeframeSelector from './TimeframeSelector';
import { useWorkbench } from '../context/WorkbenchContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const SECTORS_LIST = [
  { name: 'Technology', icon: '💻' },
  { name: 'Financials', icon: '🏦' },
  { name: 'Healthcare', icon: '🩺' },
  { name: 'Infrastructure', icon: '🏗️' },
  { name: 'Energy', icon: '⚡' },
  { name: 'Consumption', icon: '🛒' },
];

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa'];

export default function SectorTrendsDashboard() {
  const [selectedSectors, setSelectedSectors] = useState(['Technology', 'Financials']);
  const [timeframe, setTimeframe] = useState('1y');
  const [chartType, setChartType] = useState('line');
  const [chartData, setChartData] = useState([]);
  const [sectorDetails, setSectorDetails] = useState({});
  const [loadingSectors, setLoadingSectors] = useState({});
  const [chartLoading, setChartLoading] = useState(false);
  const [activeSectorTab, setActiveSectorTab] = useState(null);

  const { isPinned, pin, unpin } = useWorkbench();

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesMapRef = useRef(new Map());

  // Set first selected sector as active tab
  useEffect(() => {
    if (selectedSectors.length > 0 && !selectedSectors.includes(activeSectorTab)) {
      setActiveSectorTab(selectedSectors[0]);
    }
  }, [selectedSectors]);

  // 1. Fetch comparison chart data
  useEffect(() => {
    if (selectedSectors.length === 0) { setChartData([]); return; }
    const controller = new AbortController();

    const fetchComparisonData = async () => {
      setChartLoading(true);
      try {
        const sectorsParam = selectedSectors.join(',');
        const res = await axios.get(`${API_BASE}/sector-trends/compare?sectors=${sectorsParam}&range=${encodeURIComponent(timeframe)}`, { signal: controller.signal });
        setChartData(res.data);
      } catch (err) {
        if (!axios.isCancel(err)) console.error('Failed to fetch sector comparison data', err);
      } finally {
        setChartLoading(false);
      }
    };
    fetchComparisonData();
    return () => controller.abort();
  }, [selectedSectors, timeframe]);

  // 2. Fetch details per selected sector
  useEffect(() => {
    selectedSectors.forEach(sector => {
      if (sectorDetails[sector] && sectorDetails[sector].range === timeframe) return;
      const fetchSectorDetail = async () => {
        setLoadingSectors(prev => ({ ...prev, [sector]: true }));
        try {
          const res = await axios.get(`${API_BASE}/sector-trends/${sector}?range=${encodeURIComponent(timeframe)}`);
          setSectorDetails(prev => ({ ...prev, [sector]: { ...res.data, range: timeframe } }));
        } catch (err) {
          console.error(`Failed to fetch sector trends detail for ${sector}`, err);
        } finally {
          setLoadingSectors(prev => ({ ...prev, [sector]: false }));
        }
      };
      fetchSectorDetail();
    });
  }, [selectedSectors, timeframe]);

  // 3. Render Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; seriesMapRef.current.clear(); }
    if (chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8', fontFamily: "'Inter', system-ui, sans-serif" },
      grid: { vertLines: { color: 'rgba(148, 163, 184, 0.06)' }, horzLines: { color: 'rgba(148, 163, 184, 0.06)' } },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.1)', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.1)', timeVisible: false },
      crosshair: { mode: 0, vertLine: { color: 'rgba(148, 163, 184, 0.2)', style: 3 }, horzLine: { color: 'rgba(148, 163, 184, 0.2)', style: 3 } },
    });
    chartRef.current = chart;

    chartData.forEach((item, index) => {
      if (!item.indexHistory || item.indexHistory.length === 0) return;
      const firstClose = item.indexHistory[0].close || item.indexHistory[0].value;
      if (!firstClose) return;

      if (chartType === 'candlestick') {
        const s = chart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350', title: item.sector });
        s.setData(item.indexHistory.map(pt => ({ time: pt.date, open: ((pt.open||pt.value)/firstClose)*100, high: ((pt.high||pt.value)/firstClose)*100, low: ((pt.low||pt.value)/firstClose)*100, close: ((pt.close||pt.value)/firstClose)*100 })));
        seriesMapRef.current.set(item.sector, s);
      } else {
        const color = COLORS[index % COLORS.length];
        const s = chart.addLineSeries({ color, lineWidth: 2, title: item.sector, crosshairMarkerRadius: 4, crosshairMarkerBackgroundColor: color });
        s.setData(item.indexHistory.map(pt => ({ time: pt.date, value: ((pt.close||pt.value)/firstClose)*100 })));
        seriesMapRef.current.set(item.sector, s);
      }
    });
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (chartRef.current) chartRef.current.resize(entry.contentRect.width, 380);
      }
    });
    ro.observe(chartContainerRef.current);

    return () => { ro.disconnect(); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
  }, [chartData, chartType]);

  const toggleSector = useCallback((sectorName) => {
    setSelectedSectors(prev => {
      if (prev.includes(sectorName)) return prev.filter(s => s !== sectorName);
      if (prev.length >= 5) return prev;
      return [...prev, sectorName];
    });
  }, []);

  // Compute quick stats from chartData for sector chips
  const getSectorReturn = (sectorName) => {
    const item = chartData.find(d => d.sector === sectorName);
    if (!item || !item.indexHistory || item.indexHistory.length < 2) return null;
    const first = item.indexHistory[0].close || item.indexHistory[0].value;
    const last = item.indexHistory[item.indexHistory.length - 1].close || item.indexHistory[item.indexHistory.length - 1].value;
    if (!first) return null;
    return ((last - first) / first * 100).toFixed(1);
  };

  const activeDetail = sectorDetails[activeSectorTab];
  const activeLoading = loadingSectors[activeSectorTab];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-500/[0.08] via-[var(--bg-card)] to-purple-500/[0.06] border border-[var(--border-color)] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Compass size={20} className="text-indigo-400 shrink-0" /> Sector Trends
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
              Compare sector index performance, constituents and mutual funds
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
            {/* Chart type toggle */}
            <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
              <button onClick={() => setChartType('line')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Line chart">
                <LineChart size={14} />
              </button>
              <button onClick={() => setChartType('candlestick')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'candlestick' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Candlestick">
                <BarChart2 size={14} />
              </button>
            </div>

            <TimeframeSelector activeRange={timeframe} onChange={setTimeframe} earliestDate={null} />
          </div>
        </div>

        {/* Sector Chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {SECTORS_LIST.map(({ name, icon }, index) => {
            const isSelected = selectedSectors.includes(name);
            const color = COLORS[index % COLORS.length];
            const ret = isSelected ? getSectorReturn(name) : null;
            return (
              <button key={name} onClick={() => toggleSector(name)}
                className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  isSelected
                    ? 'text-white border-transparent shadow-md shadow-black/10 scale-[1.02]'
                    : 'bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400/50 hover:bg-[var(--bg-secondary)]'
                }`}
                style={isSelected ? { backgroundColor: color } : {}}
              >
                <span className="text-sm">{icon}</span>
                <span>{name}</span>
                {isSelected && <X size={11} className="opacity-60 group-hover:opacity-100" />}
                {ret !== null && (
                  <span className={`ml-0.5 text-[10px] font-mono opacity-80 ${Number(ret) >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {Number(ret) >= 0 ? '+' : ''}{ret}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <TrendingUp size={13} className="text-indigo-400" /> Normalized Growth (Base 100)
          </h3>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3">
            {selectedSectors.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="relative px-2 sm:px-3 pb-3">
          {chartLoading && (
            <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <span className="w-7 h-7 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Loading chart...</span>
              </div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full" style={{ minHeight: '380px' }} />
        </div>
      </div>

      {/* Sector Detail Tabs + Content */}
      {selectedSectors.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-[var(--border-color)] overflow-x-auto no-scrollbar">
            {selectedSectors.map((sector, index) => {
              const color = COLORS[index % COLORS.length];
              const isActive = activeSectorTab === sector;
              return (
                <button key={sector} onClick={() => setActiveSectorTab(sector)}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {sector}
                  {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ backgroundColor: color }} />}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-5">
            {activeLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] gap-2">
                <span className="w-6 h-6 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Loading {activeSectorTab} sector...</p>
              </div>
            ) : activeDetail ? (
              <div className="flex flex-col gap-5">
                {/* Index Info */}
                {activeDetail.ticker && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-secondary)]/50 rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-color)] font-mono">
                        {activeDetail.ticker}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">Nifty Sector Index</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const pinned = isPinned('sector', activeSectorTab);
                        if (pinned) {
                          unpin('sector', activeSectorTab);
                        } else {
                          pin({ type: 'sector', id: activeSectorTab, name: activeSectorTab });
                        }
                      }}
                      className={`p-1.5 rounded-md transition-colors ${isPinned('sector', activeSectorTab) ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}
                      title={isPinned('sector', activeSectorTab) ? "Remove from comparison" : "Add to comparison"}
                    >
                      <Pin size={16} fill={isPinned('sector', activeSectorTab) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                )}

                {/* Two-Column: Stocks + Funds */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Stocks */}
                  <div>
                    <h4 className="text-[11px] uppercase font-bold text-[var(--text-muted)] mb-3 flex items-center gap-1.5 px-1">
                      <Layers size={12} className="text-indigo-400" /> Constituent Stocks
                      {activeDetail.topStocks?.length > 0 && (
                        <span className="ml-auto text-[10px] font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                          {activeDetail.topStocks.length}
                        </span>
                      )}
                    </h4>
                    {activeDetail.topStocks?.length > 0 ? (
                      <div className="divide-y divide-[var(--border-color)]/40 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]/20">
                        {activeDetail.topStocks.map(stock => (
                          <ExpandableAssetRow key={stock.id} asset={stock} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--text-muted)] italic p-4 bg-[var(--bg-secondary)]/30 rounded-xl text-center border border-dashed border-[var(--border-color)]">
                        No constituent stocks available
                      </div>
                    )}
                  </div>

                  {/* Funds */}
                  <div>
                    <h4 className="text-[11px] uppercase font-bold text-[var(--text-muted)] mb-3 flex items-center gap-1.5 px-1">
                      <Sparkles size={12} className="text-emerald-400" /> Sector Funds & ETFs
                      {activeDetail.funds?.length > 0 && (
                        <span className="ml-auto text-[10px] font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                          {activeDetail.funds.length}
                        </span>
                      )}
                    </h4>
                    {activeDetail.funds?.length > 0 ? (
                      <div className="divide-y divide-[var(--border-color)]/40 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]/20">
                        {activeDetail.funds.map(fund => (
                          <ExpandableAssetRow key={fund.id} asset={fund} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--text-muted)] italic p-4 bg-[var(--bg-secondary)]/30 rounded-xl text-center border border-dashed border-[var(--border-color)]">
                        No sector mutual funds configured
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--text-muted)]">
                Select a sector to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
