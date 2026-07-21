import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createChart } from 'lightweight-charts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Percent, Calculator, List, BarChart3, ChevronDown, ChevronUp, Pin, PinOff } from 'lucide-react';
import MfInvestmentCalculator from './MfInvestmentCalculator';
import TimeframeSelector from './TimeframeSelector';
import { useWorkbench } from '../context/WorkbenchContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ExpandableAssetRow({ asset, region = 'all', onToggle, showSectorChip = false, isTableRow = false }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [chartRange, setChartRange] = useState('1y');
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  const { isPinned, pin, unpin } = useWorkbench();
  const pinned = isPinned(asset.type, asset.id);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // Format currency properly
  const formatPrice = (val, currency) => {
    const symbol = currency === 'USD' ? '$' : '₹';
    const locale = currency === 'USD' ? 'en-US' : 'en-IN';
    return `${symbol}${val?.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`;
  };

  const fetchDetail = async (range) => {
    setLoading(true);
    try {
      const rangeParam = encodeURIComponent(range || chartRange);
      const res = await axios.get(`${API_BASE}/assets/${asset.type}/${asset.id}/detail?region=${region}&range=${rangeParam}`);
      setDetail(res.data);
    } catch (e) {
      console.error('Failed to fetch asset detail', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !expanded;
    setExpanded(nextState);
    if (nextState && !detail) {
      fetchDetail();
    }
    if (onToggle) onToggle(nextState);
  };

  // Re-fetch when chartRange changes (only if already expanded)
  useEffect(() => {
    if (expanded) {
      fetchDetail(chartRange);
    }
  }, [chartRange]);

  // Render chart when detail & history are available
  useEffect(() => {
    if (!expanded || !detail || !detail.history || detail.history.length === 0 || !chartContainerRef.current) return;

    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 260,
        layout: {
          background: { color: 'transparent' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        timeScale: {
          timeVisible: true,
          borderColor: '#334155',
        },
        priceScale: {
          borderColor: '#334155',
        }
      });
      chartRef.current = chart;

      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === chartContainerRef.current && chartRef.current) {
            chartRef.current.resize(entry.contentRect.width, 260);
          }
        }
      });
      resizeObserver.observe(chartContainerRef.current);
      chartRef.current.observer = resizeObserver;
    }

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    if (!chartRef.current) return; // safeguard

    const newSeries = chartRef.current.addAreaSeries({
      lineColor: '#6366f1',
      topColor: 'rgba(99, 102, 241, 0.4)',
      bottomColor: 'rgba(99, 102, 241, 0.0)',
      lineWidth: 2,
    });
    seriesRef.current = newSeries;

    const formattedData = detail.history.map(d => {
      let t = d.time || d.date;
      if (typeof t === 'string') {
        t = Math.floor(new Date(t).getTime() / 1000);
      } else if (t > 1000000000000) {
        t = Math.floor(t / 1000);
      }
      return {
        time: t,
        value: d.value || d.close || d.price || 0
      };
    }).sort((a, b) => a.time - b.time);

    // Filter duplicates
    const uniqueData = formattedData.filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);

    if (seriesRef.current) {
      seriesRef.current.setData(uniqueData);
    }
    
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    return () => {
      // We don't remove the chart instance here because we want to preserve 
      // the container if the row is still expanded but chartRange changes.
    };
  }, [expanded, detail]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        if (chartRef.current.observer) {
          chartRef.current.observer.disconnect();
        }
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  const displayChange = detail?.oneYearChangePct !== undefined && detail?.oneYearChangePct !== null 
    ? detail.oneYearChangePct 
    : asset.oneYearChangePct;
  const isUp = displayChange > 0;
  const isDown = displayChange < 0;
  const hasNav = detail 
    ? (detail.nav !== null && detail.nav !== undefined) 
    : (asset.navAvailable !== false);
  const displayPrice = detail?.nav || detail?.currentPrice_or_nav || asset.currentPrice_or_nav;

  return (
    <div className="border-b border-[var(--border-color)] border-opacity-40 last:border-0">
      {/* Summary Row */}
      <div 
        onClick={handleToggle}
        className="flex justify-between items-center py-4 px-4 hover:bg-[var(--bg-secondary)]/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
            asset.type === 'stock' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
          }`}>
            {asset.type}
          </span>
          <div>
            <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
              {asset.name}
              {showSectorChip && asset.sectorName && (
                <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] uppercase font-bold tracking-wider">
                  {asset.sectorName}
                </span>
              )}
              {asset.isClosed && (
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] uppercase font-bold tracking-wider">
                  Closed/Defunct
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-mono">(Scheme Code: {asset.id})</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            {!hasNav ? (
              <div className="font-mono text-[10px] sm:text-xs text-[var(--text-muted)] italic bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)] border-opacity-50">
                Click to load NAV
              </div>
            ) : (
              <div className="flex gap-5 items-center">
                {asset.type === 'mf' && (
                  <>
                    <div className="text-right">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">Sharpe</div>
                      <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {asset.sharpeRatio !== 0 ? asset.sharpeRatio?.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">Sortino</div>
                      <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {asset.sortinoRatio !== 0 ? asset.sortinoRatio?.toFixed(2) : '—'}
                      </div>
                    </div>
                  </>
                )}
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">1Y Return</div>
                  <div className={`font-mono text-xs font-semibold ${isUp ? 'text-gain' : isDown ? 'text-loss' : 'text-[var(--text-primary)]'}`}>
                    {isUp ? '+' : ''}{displayChange?.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">NAV</div>
                  <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                    {formatPrice(displayPrice, asset.currency)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (pinned) {
                  unpin(asset.type, asset.id);
                } else {
                  pin(asset);
                }
              }}
              className={`p-1.5 rounded-md transition-colors ${pinned ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}
              title={pinned ? "Remove from comparison" : "Add to comparison"}
            >
              {pinned ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
            </button>
            <button onClick={handleToggle} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Accordion Panel */}
      {expanded && (
        <div className="bg-[var(--bg-secondary)]/30 border-t border-[var(--border-color)] border-opacity-30 p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs text-[var(--text-muted)] gap-2">
              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              Loading details...
            </div>
          ) : detail ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left & Middle Column: Chart & Basic Stats */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 size={14} /> Price/NAV History
                    </span>
                    <TimeframeSelector
                      activeRange={chartRange}
                      onChange={setChartRange}
                      earliestDate={null}
                    />
                  </div>
                  {(!detail.history || detail.history.length === 0) ? (
                    <div className="w-full h-[260px] flex items-center justify-center text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)]/30 rounded-lg">
                      No historical data available
                    </div>
                  ) : (
                    <div ref={chartContainerRef} className="w-full h-[260px]" />
                  )}
                </div>

                {/* Key Stats Block */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col justify-center items-center text-center shadow-sm hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-1">Expense / PE</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      {asset.type === 'stock' ? (detail.pe ? detail.pe.toFixed(1) : '—') : (detail.expenseRatio ? `${detail.expenseRatio}%` : '—')}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col justify-center items-center text-center shadow-sm hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-1">Yield / PB</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      {asset.type === 'stock' ? (detail.pb ? detail.pb.toFixed(1) : '—') : (detail.yield ? `${detail.yield}%` : '—')}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col justify-center items-center text-center shadow-sm hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-1">AUM / Mkt Cap</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      {detail.marketCap || detail.aum ? Number(detail.marketCap || detail.aum).toLocaleString() + (asset.currency === 'USD' ? 'M' : ' Cr') : '—'}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col justify-center items-center text-center shadow-sm hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-1">Sharpe / Sortino</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      {asset.type === 'mf' ? (
                        <>
                          <span className={
                            (asset.sharpeRatio || Number(detail?.advancedAnalysis?.performance?.sharpeRatio)) > 1 ? 'text-gain' : 
                            (asset.sharpeRatio || Number(detail?.advancedAnalysis?.performance?.sharpeRatio)) < 0 ? 'text-loss' : ''
                          }>
                            {asset.sharpeRatio !== undefined && asset.sharpeRatio !== 0 ? 
                              asset.sharpeRatio.toFixed(2) : 
                              (detail?.advancedAnalysis?.performance?.sharpeRatio ? Number(detail.advancedAnalysis.performance.sharpeRatio).toFixed(2) : '—')}
                          </span>
                          {' / '}
                          <span className={
                            (asset.sortinoRatio || Number(detail?.advancedAnalysis?.performance?.sortinoRatio)) > 1 ? 'text-gain' : 
                            (asset.sortinoRatio || Number(detail?.advancedAnalysis?.performance?.sortinoRatio)) < 0 ? 'text-loss' : ''
                          }>
                            {asset.sortinoRatio !== undefined && asset.sortinoRatio !== 0 ? 
                              asset.sortinoRatio.toFixed(2) : 
                              (detail?.advancedAnalysis?.performance?.sortinoRatio ? Number(detail.advancedAnalysis.performance.sortinoRatio).toFixed(2) : '—')}
                          </span>
                        </>
                      ) : (
                        detail.sharpeRatio || '—'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Holdings (for MFs) or Extra stats */}
              <div className="space-y-4">
                {asset.type === 'mf' ? (
                  <>
                    {/* Mutual Fund Details */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                      <button 
                        onClick={() => setCalcOpen(!calcOpen)}
                        className="w-full flex items-center justify-between py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <span className="flex items-center gap-1.5"><Calculator size={14} /> Investment Calculator</span>
                        <span>{calcOpen ? 'Collapse' : 'Expand'}</span>
                      </button>
                      
                      {calcOpen && (
                        <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                          <MfInvestmentCalculator initialNav={asset.currentPrice_or_nav} cagr={detail.cagr5y || 12} />
                        </div>
                      )}
                    </div>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                      <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <List size={14} /> Top Holdings
                      </div>
                      {detail.holdings && detail.holdings.available === false ? (
                        <div className="text-xs text-[var(--text-muted)] italic py-2">Holdings data currently unavailable.</div>
                      ) : detail.holdings && detail.holdings.length > 0 ? (
                        <div className="space-y-2">
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {(showAllHoldings ? detail.holdings : detail.holdings.slice(0, 5)).map((h, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{h.stock}</span>
                                <span className="text-[var(--text-muted)] font-mono">{h.allocation}%</span>
                              </div>
                            ))}
                          </div>
                          {detail.holdings.length > 5 && (
                            <button
                              onClick={() => setShowAllHoldings(!showAllHoldings)}
                              className="w-full text-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 mt-2 pt-2 border-t border-[var(--border-color)] border-opacity-40"
                            >
                              {showAllHoldings ? 'Show Top 5' : `Show All (${detail.holdings.length})`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-muted)] italic py-2">
                          {asset.isClosed ? 'No holdings data available for closed funds.' : 'No holdings data found.'}
                        </div>
                      )}
                    </div>
                    {detail.peers && detail.peers.length > 0 && (
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mt-4">
                        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <List size={14} /> Peer Funds ({detail.peers[0].sector})
                        </div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                          {detail.peers.map((peer, idx) => (
                            <div key={idx} className="flex flex-col text-xs border-b border-[var(--border-color)] border-opacity-50 pb-1 last:border-0 last:pb-0">
                              <span className="text-[var(--text-primary)] font-medium truncate" title={peer.name}>{peer.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{peer.family}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Advanced AI Analysis Block */}
                    {detail.advancedAnalysis && detail.advancedAnalysis.aiAnalysis && (
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mt-4">
                        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5"><BarChart3 size={14} /> AI Engine Analysis</div>
                          {detail.advancedAnalysis.aiAnalysis.available ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              detail.advancedAnalysis.aiAnalysis.data.recommendation.label === 'Strong Buy' || detail.advancedAnalysis.aiAnalysis.data.recommendation.label === 'Buy' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              detail.advancedAnalysis.aiAnalysis.data.recommendation.label.includes('Sell') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {detail.advancedAnalysis.aiAnalysis.data.recommendation.label}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              Insufficient Data
                            </span>
                          )}
                        </div>
                        
                        {detail.advancedAnalysis.aiAnalysis.available ? (
                          <>
                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-muted)]">Fund Score</span>
                                <span className="text-[var(--text-primary)] font-mono font-semibold">{detail.advancedAnalysis.aiAnalysis.data.fundScore}/100</span>
                              </div>
                              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 mt-1">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${detail.advancedAnalysis.aiAnalysis.data.fundScore}%` }}></div>
                              </div>
                            </div>
                            <div className="space-y-1.5 mt-3">
                              {detail.advancedAnalysis.aiAnalysis.data.recommendation.reasoning.map((reason, idx) => (
                                <div key={idx} className="flex text-xs items-start gap-1.5">
                                  <span className="text-indigo-400 mt-0.5">•</span>
                                  <span className="text-[var(--text-muted)]">{reason}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)] italic py-2">
                            {detail.advancedAnalysis.aiAnalysis.reason || 'Not enough verified historical data to generate reliable analysis.'}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-4">
                    <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} /> Financial Performance
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">EPS</span>
                        <span className="text-[var(--text-primary)] font-mono">{detail.eps || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Dividend Yield</span>
                        <span className="text-[var(--text-primary)] font-mono">{detail.dividendYield ? `${(detail.dividendYield * 100).toFixed(2)}%` : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Volume</span>
                        <span className="text-[var(--text-primary)] font-mono">{detail.volume?.toLocaleString() || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-[var(--text-muted)]">Failed to load details</div>
          )}
        </div>
      )}
    </div>
  );
}
