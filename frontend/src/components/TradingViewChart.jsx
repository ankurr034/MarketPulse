import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import axios from 'axios';
import { Pencil, Trash2 } from 'lucide-react';
import TimeframeSelector from './TimeframeSelector';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Calculates Exponential Moving Average (EMA) for a given candle array and period
 */
const calculateEMA = (candles, period) => {
  if (!candles || candles.length < period) return [];
  const k = 2 / (period + 1);

  // Seed with simple moving average of first `period` closes
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  const result = [{ time: Math.floor(candles[period - 1].time / 1000), value: Number(prevEma.toFixed(2)) }];

  for (let i = period; i < candles.length; i++) {
    const currentEma = candles[i].close * k + prevEma * (1 - k);
    result.push({
      time: Math.floor(candles[i].time / 1000),
      value: Number(currentEma.toFixed(2))
    });
    prevEma = currentEma;
  }
  return result;
};

export const TradingViewChart = ({ symbol, socket }) => {
  const [chartInterval, setChartInterval] = useState('1y'); // default to 1y
  const [candles, setCandles] = useState([]);
  const [earliestDate, setEarliestDate] = useState(null);
  const [chartType, setChartType] = useState('area'); // default to area chart
  
  // Indicators toggle state: EMA 20, EMA 50, EMA 200
  const [indicators, setIndicators] = useState({
    ema20: true,
    ema50: false,
    ema200: false,
  });

  // Trendline State (matches IndianMfSectorAnalysis.jsx pattern)
  const [trendline, setTrendline] = useState(null); // { start: { time, price, date }, end: { time, price, date } }
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState(null); // { time, price, date, x, y }
  const [hoverPoint, setHoverPoint] = useState(null); // { time, price, date, x, y }
  const [activeDragHandle, setActiveDragHandle] = useState(null); // 'start' | 'end' | null
  const [, setCoordTick] = useState(0);

  const chartContainerRef = useRef(null);
  const svgOverlayRef = useRef(null);
  const mainChartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const ema20SeriesRef = useRef(null);
  const ema50SeriesRef = useRef(null);
  const ema200SeriesRef = useRef(null);
  const uniqueCandlesRef = useRef([]);

  // Fetch initial candles
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const res = await axios.get(`${API_BASE}/stocks/${encodeURIComponent(symbol)}/chart?interval=${encodeURIComponent(chartInterval)}`);
        if (res.headers['x-earliest-date']) {
          setEarliestDate(Number(res.headers['x-earliest-date']));
        }
        setCandles(res.data);
      } catch (err) {
        console.error('Error fetching candles:', err);
      }
    };
    fetchCandles();
  }, [symbol, chartInterval]);

  // Reset trendline drawing state on symbol change
  useEffect(() => {
    setTrendline(null);
    setIsDrawing(false);
    setDrawingStart(null);
    setHoverPoint(null);
    setActiveDragHandle(null);
  }, [symbol]);

  // Escape key cancels active drawing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false);
        setDrawingStart(null);
        setHoverPoint(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing]);

  // Handle WebSocket updates
  useEffect(() => {
    if (!socket || !candleSeriesRef.current) return;

    const eventName = `candle_update_${chartInterval}`;
    
    const handleCandleUpdate = (updatedCandle) => {
      const formattedCandle = {
        time: Math.floor(updatedCandle.time / 1000),
        open: updatedCandle.open,
        high: updatedCandle.high,
        low: updatedCandle.low,
        close: updatedCandle.close,
        volume: updatedCandle.volume
      };

      if (chartType === 'candle') {
        candleSeriesRef.current.update(formattedCandle);
      } else {
        candleSeriesRef.current.update({ time: formattedCandle.time, value: formattedCandle.close });
      }

      if (indicators.ema20 && ema20SeriesRef.current && updatedCandle.ema) {
        ema20SeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.ema });
      }
    };

    socket.on(eventName, handleCandleUpdate);

    return () => {
      socket.off(eventName, handleCandleUpdate);
    };
  }, [socket, chartInterval, indicators, chartType]);

  // Snapping: Find nearest actual candle data point from cursor pixel X coordinate
  const getNearestPointFromX = useCallback((pixelX) => {
    const candlesList = uniqueCandlesRef.current;
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;
    if (!candlesList || candlesList.length === 0 || !chart || !series) return null;

    let bestCandle = null;
    let bestDist = Infinity;
    let bestX = null;

    for (let i = 0; i < candlesList.length; i++) {
      const c = candlesList[i];
      const t = Math.floor(c.time / 1000);
      const screenX = chart.timeScale().timeToCoordinate(t);
      if (screenX === null || screenX === undefined || isNaN(screenX)) continue;

      const dist = Math.abs(screenX - pixelX);
      if (dist < bestDist) {
        bestDist = dist;
        bestCandle = c;
        bestX = screenX;
      }
    }

    if (!bestCandle || bestX === null) return null;

    const snappedPrice = bestCandle.close;
    const snappedY = series.priceToCoordinate(snappedPrice);
    if (snappedY === null || snappedY === undefined || isNaN(snappedY)) return null;

    const dateObj = new Date(bestCandle.time);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      x: bestX,
      y: snappedY,
      time: Math.floor(bestCandle.time / 1000),
      price: snappedPrice,
      date: dateStr
    };
  }, []);

  // Reproject a data-space point { time, price } to current screen pixels
  const projectPointToScreen = useCallback((dataPt) => {
    if (!dataPt || !mainChartRef.current || !candleSeriesRef.current) return null;
    const x = mainChartRef.current.timeScale().timeToCoordinate(dataPt.time);
    const y = candleSeriesRef.current.priceToCoordinate(dataPt.price);
    if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
    return { x, y };
  }, []);

  // Pointer interactions for trendline drawing & dragging
  const handleOverlayPointerMove = (e) => {
    if (!isDrawing && !activeDragHandle) return;
    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const snapped = getNearestPointFromX(mouseX);
    if (!snapped) return;

    if (activeDragHandle) {
      setTrendline(prev => {
        if (!prev) return null;
        if (activeDragHandle === 'start') {
          return {
            ...prev,
            start: { time: snapped.time, price: snapped.price, date: snapped.date }
          };
        } else {
          return {
            ...prev,
            end: { time: snapped.time, price: snapped.price, date: snapped.date }
          };
        }
      });
    } else if (isDrawing) {
      setHoverPoint(snapped);
    }
  };

  const handleOverlayPointerDown = (e) => {
    if (!isDrawing) return;
    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const snapped = getNearestPointFromX(mouseX);
    if (!snapped) return;

    if (!drawingStart) {
      setDrawingStart(snapped);
    } else {
      setTrendline({
        start: { time: drawingStart.time, price: drawingStart.price, date: drawingStart.date },
        end: { time: snapped.time, price: snapped.price, date: snapped.date }
      });
      setIsDrawing(false);
      setDrawingStart(null);
      setHoverPoint(null);
    }
  };

  const handleHandlePointerDown = (endpoint, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (_) { /* ignored */ }
    setActiveDragHandle(endpoint);
  };

  const handleHandlePointerUp = (e) => {
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignored */ }
    setActiveDragHandle(null);
  };

  const handleToggleDrawTrendline = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setDrawingStart(null);
      setHoverPoint(null);
    } else {
      setIsDrawing(true);
      setDrawingStart(null);
      setHoverPoint(null);
    }
  };

  const handleClearTrendline = () => {
    setTrendline(null);
    setIsDrawing(false);
    setDrawingStart(null);
    setHoverPoint(null);
    setActiveDragHandle(null);
  };

  // Construct charts
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Create Main Price Chart
    const mainChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0f172a' }, // slate-900
        textColor: '#94a3b8', // slate-400
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 0,
      },
      priceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
      },
    });
    mainChartRef.current = mainChart;

    // Sort, deduplicate, and store unique candles
    const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
    const uniqueCandles = sortedCandles.filter((c, i, arr) => 
      i === 0 || Math.floor(c.time / 1000) > Math.floor(arr[i - 1].time / 1000)
    );
    uniqueCandlesRef.current = uniqueCandles;

    let mainSeries;
    if (chartType === 'candle') {
      mainSeries = mainChart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderDownColor: '#f43f5e',
        borderUpColor: '#10b981',
        wickDownColor: '#f43f5e',
        wickUpColor: '#10b981',
      });
      mainSeries.setData(uniqueCandles.map(c => ({
        time: Math.floor(c.time / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      })));
    } else {
      mainSeries = mainChart.addAreaSeries({
        lineColor: '#3b82f6',
        topColor: 'rgba(59, 130, 246, 0.35)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineWidth: 2,
      });
      mainSeries.setData(uniqueCandles.map(c => ({
        time: Math.floor(c.time / 1000),
        value: c.close
      })));
    }
    candleSeriesRef.current = mainSeries;

    // Indicators: EMA 20
    if (indicators.ema20) {
      const ema20Data = calculateEMA(uniqueCandles, 20);
      if (ema20Data.length > 0) {
        const ema20Series = mainChart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 1.5,
          title: 'EMA 20',
          priceLineVisible: false,
        });
        ema20SeriesRef.current = ema20Series;
        ema20Series.setData(ema20Data);
      }
    }

    // Indicators: EMA 50
    if (indicators.ema50) {
      const ema50Data = calculateEMA(uniqueCandles, 50);
      if (ema50Data.length > 0) {
        const ema50Series = mainChart.addLineSeries({
          color: '#f59e0b',
          lineWidth: 1.5,
          title: 'EMA 50',
          priceLineVisible: false,
        });
        ema50SeriesRef.current = ema50Series;
        ema50Series.setData(ema50Data);
      }
    }

    // Indicators: EMA 200
    if (indicators.ema200) {
      const ema200Data = calculateEMA(uniqueCandles, 200);
      if (ema200Data.length > 0) {
        const ema200Series = mainChart.addLineSeries({
          color: '#06b6d4',
          lineWidth: 1.5,
          title: 'EMA 200',
          priceLineVisible: false,
        });
        ema200SeriesRef.current = ema200Series;
        ema200Series.setData(ema200Data);
      }
    }

    // Subscribe to chart logical range changes to synchronize SVG trendline overlay
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      setCoordTick(t => t + 1);
    });

    // Resize Observer for responsive width
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        if (entry.target === chartContainerRef.current) {
          mainChart.resize(width, 400);
          setCoordTick(t => t + 1);
        }
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
    };
  }, [candles, indicators.ema20, indicators.ema50, indicators.ema200, chartType]);

  const toggleIndicator = (ind) => {
    setIndicators(prev => ({ ...prev, [ind]: !prev[ind] }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Chart Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-lg">
          {/* Left Controls: Timeframe & Chart Type Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <TimeframeSelector
              activeRange={chartInterval}
              onChange={setChartInterval}
              earliestDate={earliestDate}
              className="bg-slate-950 border-slate-800"
            />

            {/* Chart Type Toggle (Area default) */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded-md">
              <button
                onClick={() => setChartType('area')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  chartType === 'area' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('candle')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  chartType === 'candle' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Candles
              </button>
            </div>
          </div>

          {/* Right Controls: EMA Indicators & Trendline Tool Strip */}
          <div className="flex flex-wrap items-center gap-3">
            {/* EMA Indicators (20, 50, 200) */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={indicators.ema20}
                  onChange={() => toggleIndicator('ema20')}
                  className="rounded bg-slate-950 border-slate-800 text-[#8b5cf6] focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-[#8b5cf6]"
                />
                <span className="text-[#8b5cf6] font-semibold">EMA 20</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={indicators.ema50}
                  onChange={() => toggleIndicator('ema50')}
                  className="rounded bg-slate-950 border-slate-800 text-[#f59e0b] focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-[#f59e0b]"
                />
                <span className="text-[#f59e0b] font-semibold">EMA 50</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={indicators.ema200}
                  onChange={() => toggleIndicator('ema200')}
                  className="rounded bg-slate-950 border-slate-800 text-[#06b6d4] focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-[#06b6d4]"
                />
                <span className="text-[#06b6d4] font-semibold">EMA 200</span>
              </label>
            </div>

            <span className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block"></span>

            {/* Trendline Tool Strip */}
            <div className="flex items-center gap-1.5">
              {/* Draw Trendline Button with Tooltip */}
              <div className="relative group">
                <button
                  onClick={handleToggleDrawTrendline}
                  className={`p-1.5 rounded-md border transition-all ${
                    isDrawing
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 ring-2 ring-blue-500/30'
                      : trendline
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="Draw Trendline"
                >
                  <Pencil size={14} />
                </button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
                  {isDrawing ? (drawingStart ? 'Click 2nd Point' : 'Click 1st Point') : 'Draw Trendline'}
                </div>
              </div>

              {/* Clear Trendline Button */}
              <button
                onClick={handleClearTrendline}
                className={`p-1.5 rounded-md border transition-colors ${
                  trendline
                    ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-950/30 cursor-pointer'
                    : 'border-slate-800/50 bg-slate-950/50 text-slate-600 cursor-not-allowed'
                }`}
                disabled={!trendline}
                title="Delete trendline"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Active drawing status banner (matches mutual funds prompt message) */}
        {isDrawing && (
          <div className="w-full text-xs font-semibold text-blue-400 animate-pulse bg-blue-950/40 border border-blue-800/60 rounded px-3 py-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {drawingStart ? '● Click second point to anchor trendline' : '● Click first point to start trendline (magnet snap active)'}
            </span>
            <button
              onClick={() => {
                setIsDrawing(false);
                setDrawingStart(null);
                setHoverPoint(null);
              }}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Cancel (Esc)
            </button>
          </div>
        )}
      </div>

      {/* Main Chart Canvas & Interactive SVG Trendline Overlay */}
      <div className="tv-lightweight-charts-container relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
        <div ref={chartContainerRef} className="w-full h-[400px]" />

        {/* Interactive SVG Trendline Layer */}
        <svg
          ref={svgOverlayRef}
          className={`absolute inset-0 w-full h-full overflow-visible z-20 ${
            isDrawing || activeDragHandle ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{ touchAction: isDrawing || activeDragHandle ? 'none' : 'auto' }}
          onPointerMove={handleOverlayPointerMove}
          onPointerDown={handleOverlayPointerDown}
          onPointerUp={handleHandlePointerUp}
        >
          {/* Render Existing Trendline & Drag Handles */}
          {(() => {
            if (!trendline) return null;
            const startProj = projectPointToScreen(trendline.start);
            const endProj = projectPointToScreen(trendline.end);
            if (!startProj || !endProj) return null;

            const midX = (startProj.x + endProj.x) / 2;
            const midY = (startProj.y + endProj.y) / 2;
            const priceDiff = trendline.end.price - trendline.start.price;
            const pct = trendline.start.price > 0 ? ((priceDiff / trendline.start.price) * 100).toFixed(2) : '0.00';
            const isUp = priceDiff >= 0;

            return (
              <g className="trendline-group">
                {/* Blue Dashed Trendline */}
                <line
                  x1={startProj.x}
                  y1={startProj.y}
                  x2={endProj.x}
                  y2={endProj.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />

                {/* Return % Badge in center */}
                <g transform={`translate(${midX}, ${midY - 14})`}>
                  <rect
                    x={-34}
                    y={-9}
                    width={68}
                    height={18}
                    rx={5}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1}
                    filter="drop-shadow(0 1px 3px rgba(0,0,0,0.6))"
                  />
                  <text
                    x={0}
                    y={3.5}
                    textAnchor="middle"
                    fill={isUp ? '#10b981' : '#f43f5e'}
                    fontSize={10}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isUp ? '+' : ''}{pct}%
                  </text>
                </g>

                {/* Start Endpoint Circle Handle */}
                <circle
                  cx={startProj.x}
                  cy={startProj.y}
                  r={activeDragHandle === 'start' ? 6.5 : 5}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  style={{ pointerEvents: 'auto', cursor: activeDragHandle ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => handleHandlePointerDown('start', e)}
                  onPointerUp={handleHandlePointerUp}
                />

                {/* End Endpoint Circle Handle */}
                <circle
                  cx={endProj.x}
                  cy={endProj.y}
                  r={activeDragHandle === 'end' ? 6.5 : 5}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  style={{ pointerEvents: 'auto', cursor: activeDragHandle ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => handleHandlePointerDown('end', e)}
                  onPointerUp={handleHandlePointerUp}
                />
              </g>
            );
          })()}

          {/* Active Drawing Preview (Dashed line from start to pointer) */}
          {isDrawing && drawingStart && hoverPoint && (
            <g className="drawing-preview">
              <line
                x1={drawingStart.x}
                y1={drawingStart.y}
                x2={hoverPoint.x}
                y2={hoverPoint.y}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              <circle
                cx={drawingStart.x}
                cy={drawingStart.y}
                r={5}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Magnet Snapping Indicator on Chart Curve */}
          {isDrawing && hoverPoint && (
            <g>
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={6}
                fill="#3b82f6"
                fillOpacity={0.25}
                stroke="#3b82f6"
                strokeWidth={1.5}
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={3.5}
                fill="#3b82f6"
              />
              <g transform={`translate(${hoverPoint.x}, ${Math.max(hoverPoint.y - 24, 15)})`}>
                <rect
                  x={-45}
                  y={-9}
                  width={90}
                  height={18}
                  rx={4}
                  fill="#0f172a"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  fillOpacity={0.9}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ₹{typeof hoverPoint.price === 'number' ? hoverPoint.price.toFixed(2) : hoverPoint.price} • {hoverPoint.date}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default TradingViewChart;
