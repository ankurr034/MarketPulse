import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveSector, setSectors, setLoading, setActiveSymbol, setTimeframe } from '../store/slices/marketSlice';
import { ArrowUpRight, ArrowDownRight, Minus, LayoutGrid, Grid3X3, List, TrendingUp, TrendingDown, BarChart2, Activity } from 'lucide-react';
import { Treemap, ResponsiveContainer } from 'recharts';
import SparklineChart from '../components/SparklineChart';
import axios from 'axios';
import { formatPrice } from '../utils/currencyFormatter.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Custom treemap node renderer
const CustomTreemapNode = ({ x, y, width, height, name, changePercent, region }) => {
  if (width < 4 || height < 4) return null;

  const absChange = Math.abs(changePercent || 0);
  const isPositive = (changePercent || 0) >= 0;
  const isNeutral = absChange < 0.1;

  let bgColor;
  if (isNeutral) {
    bgColor = 'rgba(100, 116, 139, 0.3)';
  } else if (isPositive) {
    const intensity = Math.min(absChange / 3, 1);
    bgColor = `rgba(34, 197, 94, ${0.15 + intensity * 0.45})`;
  } else {
    const intensity = Math.min(absChange / 3, 1);
    bgColor = `rgba(239, 68, 68, ${0.15 + intensity * 0.45})`;
  }

  const showText = width > 60 && height > 35;
  const showPercent = width > 40 && height > 25;

  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        rx={4}
        fill={bgColor}
        stroke="var(--bg-primary)"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
      />
      {showText && (
        <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="var(--text-primary)" fontSize={width > 100 ? 11 : 9} fontWeight={600} fontFamily="Inter">
          {name}
        </text>
      )}
      {showPercent && (
        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill={isNeutral ? 'var(--text-muted)' : isPositive ? 'var(--gain)' : 'var(--loss)'} fontSize={width > 100 ? 12 : 10} fontWeight={700} fontFamily="Inter">
          {isPositive && !isNeutral ? '+' : ''}{(changePercent || 0).toFixed(2)}%
        </text>
      )}
    </g>
  );
};

// Skeleton card
const SkeletonCard = () => (
  <div className="glass-card p-5 space-y-3">
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-8 w-1/2" />
    <div className="skeleton h-3 w-full" />
    <div className="flex justify-between">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-3 w-1/4" />
    </div>
  </div>
);

// Inline Sector Detail for Accordion
const InlineSectorDetail = ({ sectorId, timeframe }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/sectors/${sectorId}?timeframe=${timeframe}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [sectorId, timeframe]);

  if (loading) return <div className="p-6 text-center text-sm text-[var(--text-muted)] animate-pulse">Loading constituents for {sectorId}...</div>;
  if (!data || !data.stocks) return <div className="p-6 text-center text-sm text-[var(--text-muted)]">No data available</div>;

  return (
    <div className="p-4 bg-slate-900/50 shadow-inner overflow-hidden border-b border-[var(--border-color)] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
          <Activity size={14} className="text-indigo-400" />
          {data.name} Constituents
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('View Full Details clicked, sectorId:', sectorId);
            dispatch(setActiveSector(sectorId));
          }}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          View Full Details <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
              <th className="pb-2 font-medium uppercase tracking-wider">Company</th>
              <th className="pb-2 text-right font-medium uppercase tracking-wider">Price</th>
              <th className="pb-2 text-right font-medium uppercase tracking-wider">Change ({timeframe})</th>
              <th className="pb-2 text-right font-medium uppercase tracking-wider hidden sm:table-cell">PE</th>
              <th className="pb-2 text-right font-medium uppercase tracking-wider hidden sm:table-cell">PB</th>
              <th className="pb-2 text-right font-medium uppercase tracking-wider hidden md:table-cell">52W Range</th>
              <th className="pb-2 text-right font-medium uppercase tracking-wider hidden lg:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.stocks.map(stock => {
              const isUp = stock.changePercent > 0;
              const isDown = stock.changePercent < 0;
              return (
                <tr 
                  key={stock.symbol} 
                  className="border-b border-[var(--border-color)] border-opacity-30 last:border-0 hover:brightness-110 transition-colors"
                  style={isUp ? { background: 'var(--gain-bg)' } : isDown ? { background: 'var(--loss-bg)' } : {}}
                >
                  <td className="py-2.5 px-2 font-medium text-[var(--text-primary)]">
                    <div className="flex flex-col">
                      <span>{stock.name || stock.symbol}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{stock.symbol}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[var(--text-primary)]">{formatPrice(stock.ltp, stock.symbol)}</td>
                  <td className={`py-2.5 px-2 text-right font-mono ${isUp ? 'text-gain' : isDown ? 'text-loss' : 'text-[var(--text-primary)]'}`}>
                    {isUp ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[var(--text-secondary)] hidden sm:table-cell">
                    {stock.pe ? stock.pe.toFixed(1) : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[var(--text-secondary)] hidden sm:table-cell">
                    {stock.pb ? stock.pb.toFixed(1) : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[var(--text-muted)] hidden md:table-cell">
                    {stock.low52 && stock.high52 ? `${stock.low52?.toFixed(1)} - ${stock.high52?.toFixed(1)}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[var(--text-muted)] hidden lg:table-cell">
                    {stock.volume ? (stock.volume > 1000000 ? (stock.volume/1000000).toFixed(2) + 'M' : (stock.volume/1000).toFixed(1) + 'K') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function SectorHeatmap() {
  const dispatch = useDispatch();
  const { sectors, region, timeframe, assetClass, loading, stocks: allStocks, indices: allIndices } = useSelector(state => state.market);
  const [viewMode, setViewMode] = useState('table'); // 'grid' | 'treemap' | 'table'
  const [expandedSectorId, setExpandedSectorId] = useState(null);
  const [stockTimeframe, setStockTimeframe] = useState('1D');
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Fetch sectors data
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        dispatch(setLoading(true));
        const res = await axios.get(`${API_BASE}/sectors?region=${region}&timeframe=${timeframe}&assetClass=${assetClass}`);
        dispatch(setSectors(res.data));
      } catch (err) {
        console.error('Failed to fetch sectors:', err.message);
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchSectors();
    const interval = setInterval(fetchSectors, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [dispatch, region, timeframe, assetClass]);

  // Summary stats
  const summary = useMemo(() => {
    const gaining = sectors.filter(s => (s.changePercent || 0) > 0).length;
    const declining = sectors.filter(s => (s.changePercent || 0) < 0).length;
    const flat = sectors.length - gaining - declining;
    return { gaining, declining, flat, total: sectors.length };
  }, [sectors]);

  // Treemap data
  const treemapData = useMemo(() => {
    return sectors.map(s => ({
      name: s.name,
      size: s.stockCount || s.stocks?.length || 8,
      changePercent: s.changePercent || 0,
      region: s.region,
      id: s.id
    }));
  }, [sectors]);

  const handleSectorClick = (sectorId) => {
    if (viewMode === 'table') {
      setExpandedSectorId(prev => prev === sectorId ? null : sectorId);
    } else {
      dispatch(setActiveSector(sectorId));
    }
  };

  const getChangeIcon = (pct) => {
    if (pct > 0.1) return <ArrowUpRight size={16} />;
    if (pct < -0.1) return <ArrowDownRight size={16} />;
    return <Minus size={14} />;
  };

  const getCardGlowClass = (pct) => {
    if (pct > 0.1) return 'sector-card-gain';
    if (pct < -0.1) return 'sector-card-loss';
    return 'sector-card-neutral';
  };

  return (
    <div className="view-transition space-y-5">
      {/* Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            Sector Performance
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {summary.total} sectors • <span className="text-gain">{summary.gaining} gaining</span> • <span className="text-loss">{summary.declining} declining</span> • {summary.flat} flat
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/60 border border-slate-800">
            {['1D', '1W', '1M', '1Y', '5Y', 'ALL'].map(tf => (
              <button
                key={tf}
                onClick={() => dispatch(setTimeframe(tf))}
                className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all ${
                  timeframe === tf 
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`toggle-pill flex items-center gap-1.5 text-xs ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <LayoutGrid size={13} /> Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`toggle-pill flex items-center gap-1.5 text-xs ${viewMode === 'table' ? 'active' : ''}`}
            >
              <List size={13} /> Table
            </button>
            <button
              onClick={() => setViewMode('treemap')}
              className={`toggle-pill flex items-center gap-1.5 text-xs ${viewMode === 'treemap' ? 'active' : ''}`}
            >
              <Grid3X3 size={13} /> Treemap
            </button>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && sectors.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && sectors.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Sector</th>
                  <th className="text-center">Advance/Decline</th>
                  <th className="text-right">Index Price</th>
                  <th className="text-right">52W H/L (% Change)</th>
                  <th className="text-right">Change ({timeframe})</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((sector) => {
                  const pct = sector.changePercent || 0;
                  const isPositive = pct > 0;
                  const isNegative = pct < 0;
                  
                  let statusIcon = '⚪';
                  let statusText = sector.trend || 'Neutral';
                  if (statusText === 'Bullish') statusIcon = '🟢';
                  if (statusText === 'Bearish') statusIcon = '🔴';

                  return (
                    <React.Fragment key={sector.id}>
                      <tr
                        onClick={() => handleSectorClick(sector.id)}
                        className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${expandedSectorId === sector.id ? 'bg-slate-800/30' : ''}`}
                      >
                        <td>
                          <div className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <span className="text-[var(--text-muted)] text-[10px] w-3 flex justify-center">
                              {expandedSectorId === sector.id ? '▼' : '▶'}
                            </span>
                            {sector.name}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="text-gain font-semibold">{sector.advances || sector.advanceCount || 0} ↑</span>
                            <span className="mx-2">/</span>
                            <span className="text-loss font-semibold">{sector.declines || sector.declineCount || 0} ↓</span>
                          </div>
                        </td>
                        <td className="text-right font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                          {sector.indexPrice ? sector.indexPrice.toFixed(2) : '—'}
                        </td>
                        <td className="text-right font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {sector.fiftyTwoWeekHigh && sector.fiftyTwoWeekLow && sector.indexPrice ? (
                            <div className="flex flex-col">
                              <span className="text-gain">
                                H: {sector.fiftyTwoWeekHigh?.toFixed(2)}
                                <span className="text-loss ml-1 font-semibold">
                                  ({(((sector.indexPrice - sector.fiftyTwoWeekHigh) / sector.fiftyTwoWeekHigh) * 100).toFixed(1)}%)
                                </span>
                              </span>
                              <span className="text-loss">
                                L: {sector.fiftyTwoWeekLow?.toFixed(2)}
                                <span className="text-gain ml-1 font-semibold">
                                  (+{(((sector.indexPrice - sector.fiftyTwoWeekLow) / sector.fiftyTwoWeekLow) * 100).toFixed(1)}%)
                                </span>
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="text-right">
                          <div className={`font-mono font-semibold ${isPositive ? 'text-gain' : isNegative ? 'text-loss' : ''}`}>
                            {isPositive ? '+' : ''}{pct.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                      {expandedSectorId === sector.id && (
                        <tr>
                          <td colSpan="5" className="p-0 border-0">
                            <InlineSectorDetail sectorId={sector.id} timeframe={timeframe} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && sectors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sectors.map((sector) => {
            const pct = sector.changePercent || 0;
            const isPositive = pct > 0.1;
            const isNegative = pct < -0.1;

            return (
              <button
                key={sector.id}
                onClick={() => handleSectorClick(sector.id)}
                className={`glass-card p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${getCardGlowClass(pct)}`}
                style={{ cursor: 'pointer' }}
              >
                {/* Sector header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs">{sector.region === 'india' ? '🇮🇳' : '🌍'}</span>
                      <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {sector.name}
                      </h3>
                    </div>
                  </div>
                  <div className={`flex items-center gap-0.5 text-sm font-bold ${isPositive ? 'text-gain' : isNegative ? 'text-loss' : ''}`} style={!isPositive && !isNegative ? { color: 'var(--text-muted)' } : {}}>
                    {getChangeIcon(pct)}
                    {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                  </div>
                </div>

                {/* Advance/Decline bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-gain">{sector.advances || sector.advanceCount || 0} ↑</span>
                    <span className="text-loss">{sector.declines || sector.declineCount || 0} ↓</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-secondary)' }}>
                    {(() => {
                      const total = (sector.advances || sector.advanceCount || 0) + (sector.declines || sector.declineCount || 0);
                      const advPct = total > 0 ? ((sector.advances || sector.advanceCount || 0) / total) * 100 : 50;
                      return (
                        <>
                          <div className="h-full rounded-l-full" style={{ width: `${advPct}%`, background: 'var(--gain)' }} />
                          <div className="h-full rounded-r-full" style={{ width: `${100 - advPct}%`, background: 'var(--loss)' }} />
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 52W High / Low & Price */}
                {sector.indexPrice > 0 && (
                  <div className="mb-3 flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <div>
                      <span className="block opacity-75">Index/ETF</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sector.indexPrice.toFixed(2)}</span>
                    </div>
                    {(sector.fiftyTwoWeekHigh > 0 && sector.fiftyTwoWeekLow > 0) && (
                      <div className="text-right">
                        <span className="block opacity-75">52W Range</span>
                        <span className="font-semibold">{sector.fiftyTwoWeekLow.toFixed(2)} - {sector.fiftyTwoWeekHigh.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sparkline + stats */}
                <div className="flex items-end justify-between">
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {sector.stockCount || sector.stocks?.length || '—'} stocks
                  </div>
                  {sector.sparkline && sector.sparkline.length > 1 && (
                    <SparklineChart data={sector.sparkline} positive={pct >= 0} width={50} height={20} />
                  )}
                  <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {sector.trend || '—'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Treemap View */}
      {viewMode === 'treemap' && sectors.length > 0 && (
        <div className="glass-card p-4" style={{ height: '520px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="none"
              content={<CustomTreemapNode />}
              onClick={(node) => {
                if (node && node.id) handleSectorClick(node.id);
              }}
            />
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34, 197, 94, 0.5)' }} />
              <span>Strong Gain</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34, 197, 94, 0.2)' }} />
              <span>Mild Gain</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(100, 116, 139, 0.3)' }} />
              <span>Flat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(239, 68, 68, 0.2)' }} />
              <span>Mild Loss</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(239, 68, 68, 0.5)' }} />
              <span>Strong Loss</span>
            </div>
          </div>
        </div>
      )}



      {/* Empty state */}
      {!loading && sectors.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Activity size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-display font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No sector data available</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Data is loading or the API is temporarily unavailable. Please wait...</p>
        </div>
      )}
    </div>
  );
}
