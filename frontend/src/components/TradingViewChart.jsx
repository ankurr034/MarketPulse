import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createChart } from 'lightweight-charts';
import axios from 'axios';
import { Pencil, Trash2, X } from 'lucide-react';
import { calculateSipPerformance } from '../utils/sipCalculator';
import { calculateTimelineSegments } from '../utils/chartDivisions';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Calculates Exponential Moving Average (EMA) for a given candle array and period
 */
const calculateEMA = (candles, period) => {
  if (!candles || candles.length < period) return [];
  const k = 2 / (period + 1);

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

/**
 * Formats a date range for the hovered period (e.g. "1 Jan - 31 Mar" or "5 Oct - 9 Oct")
 */
const formatSegmentDateRange = (startDateObj, endDateObj, timeframe) => {
  if (!startDateObj || !endDateObj) return '';
  const tf = String(timeframe || '').toLowerCase();
  
  if (tf === '1d') {
    const sTime = startDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const eTime = endDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (sTime === eTime) return sTime;
    return `${sTime} - ${eTime}`;
  }

  let sDate = startDateObj;
  let eDate = endDateObj;
  if (sDate > eDate) {
    const tmp = sDate;
    sDate = eDate;
    eDate = tmp;
  }

  // Guard against 1st of month boundary spillover:
  // If eDate is on the 1st of a month and range is multi-day (> 15 days),
  // it marks the boundary start of the next period. Roll back to the true last day of the preceding month (e.g. 31 Mar).
  if (eDate.getDate() === 1 && (eDate.getTime() - sDate.getTime()) > 15 * 86400000) {
    eDate = new Date(eDate.getFullYear(), eDate.getMonth(), 0);
  }

  const sMonth = sDate.toLocaleDateString('en-US', { month: 'short' });
  const sDay = sDate.getDate();
  const sYear = sDate.getFullYear();

  const eMonth = eDate.toLocaleDateString('en-US', { month: 'short' });
  const eDay = eDate.getDate();
  const eYear = eDate.getFullYear();

  if (sYear !== eYear) {
    if (tf === '5y' || tf === 'max') {
      return `${sDay} ${sMonth} '${String(sYear).slice(-2)} - ${eDay} ${eMonth} '${String(eYear).slice(-2)}`;
    }
    return `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`;
  }

  if (sMonth === eMonth && sDay === eDay) {
    return `${sDay} ${sMonth} ${sYear}`;
  }

  // Same month or different months within the same year: e.g. "1 Jan - 31 Mar"
  return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
};

// Formats exact date range for two selected points matching e.g. "1 Jan - 31 Mar" or "27 Oct 2025 - 23 Sep 2026"
const formatSelectionDateRange = (startPt, endPt, timeframe) => {
  if (!startPt || !endPt) return '';
  const toMs = (t) => (t > 10000000000 ? t : t * 1000);
  const sTime = toMs(startPt.time);
  const eTime = toMs(endPt.time);
  let sDate = new Date(sTime);
  let eDate = new Date(eTime);
  
  if (sDate > eDate) {
    const tmp = sDate;
    sDate = eDate;
    eDate = tmp;
  }

  if (String(timeframe || '').toLowerCase() === '1d') {
    const sStr = sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const eStr = eDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${sStr} - ${eStr}`;
  }

  // Guard against 1st of month boundary spillover:
  if (eDate.getDate() === 1 && (eDate.getTime() - sDate.getTime()) > 15 * 86400000) {
    eDate = new Date(eDate.getFullYear(), eDate.getMonth(), 0);
  }

  const sMonth = sDate.toLocaleDateString('en-US', { month: 'short' });
  const sDay = sDate.getDate();
  const sYear = sDate.getFullYear();

  const eMonth = eDate.toLocaleDateString('en-US', { month: 'short' });
  const eDay = eDate.getDate();
  const eYear = eDate.getFullYear();

  // Same year: e.g. "1 Jan - 31 Mar"
  if (sYear === eYear) {
    if (sMonth === eMonth && sDay === eDay) {
      return `${sDay} ${sMonth} ${sYear}`;
    }
    return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
  }

  return `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`;
};

// Standard Time-Range Buttons: 1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, Max, SIP
const TIME_RANGES = [
  { label: '1D', val: '1d' },
  { label: '1W', val: '1w' },
  { label: '1M', val: '1m' },
  { label: '3M', val: '3m' },
  { label: '6M', val: '6m' },
  { label: '1Y', val: '1y' },
  { label: '3Y', val: '3y' },
  { label: '5Y', val: '5y' },
  { label: 'Max', val: 'max' },
  { label: 'SIP', val: 'sip' }
];

// Mutual Funds Time-Range Buttons (1D, 1W, 3M excluded)
const MF_TIME_RANGES = [
  { label: '1M', val: '1m' },
  { label: '6M', val: '6m' },
  { label: '1Y', val: '1y' },
  { label: '3Y', val: '3y' },
  { label: '5Y', val: '5y' },
  { label: 'Max', val: 'max' },
  { label: 'SIP', val: 'sip' }
];

export const TradingViewChart = ({ 
  symbol, 
  schemeCode,
  fund,
  assetType = 'stock', // 'stock' | 'mf'
  region = 'india',
  socket = null,
  height = 460,
  initialInterval = '1y',
  className = '',
  previousClose = null,
  hideHeaderTitle = false
}) => {
  // Infer assetType if schemeCode or fund is provided
  const effectiveType = (schemeCode || fund) ? 'mf' : assetType;
  const effectiveIdentifier = effectiveType === 'mf' 
    ? (schemeCode || fund?.schemeCode || fund?.id || symbol) 
    : symbol;

  const timeRanges = useMemo(() => {
    return effectiveType === 'mf' ? MF_TIME_RANGES : TIME_RANGES;
  }, [effectiveType]);

  const [chartInterval, setChartInterval] = useState(() => {
    const init = (initialInterval || '1y').toLowerCase();
    if (effectiveType === 'mf' && (init === '1d' || init === '1w' || init === '3m')) {
      return '1y';
    }
    return init;
  });

  useEffect(() => {
    if (effectiveType === 'mf' && (chartInterval === '1d' || chartInterval === '1w' || chartInterval === '3m')) {
      setChartInterval('1y');
    }
  }, [effectiveType, chartInterval]);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [chartType, setChartType] = useState('area'); // 'area' | 'candle'

  // Dynamic Hovered Period State (Two vertical dotted lines, shaded gradient, range tooltip)
  const [hoveredPeriod, setHoveredPeriod] = useState(null);
  // SIP Feature States
  const [monthlySipAmount, setMonthlySipAmount] = useState(1000);
  const [hoveredSipPoint, setHoveredSipPoint] = useState(null); // { invested, value, date, units, x, y }

  // Indicators toggle state (available for stocks)
  const [indicators, setIndicators] = useState({
    ema20: false,
    ema50: false,
    ema200: false,
  });

  // Trendline Measurement State (Double-click / double-tap to activate)
  const [trendline, setTrendline] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [activeDragHandle, setActiveDragHandle] = useState(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [, setCoordTick] = useState(0);

  const chartContainerRef = useRef(null);
  const svgOverlayRef = useRef(null);
  const mainChartRef = useRef(null);
  const justDismissedRef = useRef(false);
  const pointerDownPosRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const sipInvestedSeriesRef = useRef(null);
  const sipValueSeriesRef = useRef(null);
  const sipNavSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const ema20SeriesRef = useRef(null);
  const ema50SeriesRef = useRef(null);
  const ema200SeriesRef = useRef(null);
  const uniqueCandlesRef = useRef([]);
  const sipResultRef = useRef(null);
  const segmentsRef = useRef([]);

  // Dynamic Theme Detection: Synchronized with Redux theme state and DOM dark mode
  const reduxTheme = useSelector(state => state.market?.theme);
  const getIsDark = () => {
    if (reduxTheme) return reduxTheme === 'dark';
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('theme-light');
    }
    return false;
  };
  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    const checkDark = () => {
      let darkActive = false;
      if (reduxTheme) {
        darkActive = reduxTheme === 'dark';
      } else if (typeof document !== 'undefined') {
        darkActive = document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('theme-light');
      }
      setIsDark(darkActive);
    };
    checkDark();

    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, [reduxTheme]);

  // Fetch candles / historical NAV data based on assetType and interval
  useEffect(() => {
    if (!effectiveIdentifier) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        let items = [];
        // In SIP mode, request 5Y (or Max) history for monthly simulation
        const rangeParam = chartInterval === 'sip' 
          ? '5y' 
          : (chartInterval === 'all' ? 'max' : chartInterval);

        if (effectiveType === 'mf') {
          // Mutual Fund NAV history API
          const cleanCode = String(effectiveIdentifier).trim();
          const res = await axios.get(`${API_BASE}/mf/${region}/${encodeURIComponent(cleanCode)}/nav?range=${encodeURIComponent(rangeParam)}`);
          const raw = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          items = raw.map(pt => {
            const t = typeof pt.time === 'number' && pt.time > 100000000000 
              ? pt.time 
              : (typeof pt.time === 'number' ? pt.time * 1000 : new Date(pt.date || pt.time).getTime());
            const v = Number(pt.value ?? pt.nav ?? pt.close);
            return {
              time: t,
              open: v,
              high: v,
              low: v,
              close: v,
              value: v
            };
          });
        } else {
          // Stock historical candles API
          const res = await axios.get(`${API_BASE}/stocks/${encodeURIComponent(effectiveIdentifier)}/chart?interval=${encodeURIComponent(rangeParam)}`);
          items = Array.isArray(res.data) ? res.data : [];
          const headerPrevClose = res.headers ? Number(res.headers['x-previous-close']) : null;
          if (headerPrevClose && items.length > 0 && !items[0].previousClose) {
            items[0].previousClose = headerPrevClose;
          }
        }

        if (isMounted) {
          setCandles(items);
          setHoveredPeriod(null);
          setHoveredSipPoint(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error fetching chart data for ${effectiveIdentifier}:`, err.message);
          setFetchError(err.message || 'Unable to load historical data');
          setCandles([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [effectiveIdentifier, effectiveType, chartInterval, region]);

  // Reset states when identifier changes
  useEffect(() => {
    setTrendline(null);
    setIsDrawing(false);
    setDrawingStart(null);
    setHoverPoint(null);
    setActiveDragHandle(null);
    setHoveredPeriod(null);
    setHoveredSipPoint(null);
  }, [effectiveIdentifier]);

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

  // Handle WebSocket updates for live stock candles
  useEffect(() => {
    if (!socket || effectiveType === 'mf' || !candleSeriesRef.current || chartInterval === 'sip') return;

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

      if (volumeSeriesRef.current && formattedCandle.volume) {
        volumeSeriesRef.current.update({
          time: formattedCandle.time,
          value: formattedCandle.volume,
          color: formattedCandle.close >= formattedCandle.open ? 'rgba(22, 184, 90, 0.35)' : 'rgba(235, 91, 60, 0.35)'
        });
      }

      if (indicators.ema20 && ema20SeriesRef.current && updatedCandle.ema) {
        ema20SeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.ema });
      }
    };

    socket.on(eventName, handleCandleUpdate);

    return () => {
      socket.off(eventName, handleCandleUpdate);
    };
  }, [socket, effectiveType, chartInterval, indicators, chartType]);

  // Deduplicate and sort candles by timestamp
  const sortedCandles = useMemo(() => {
    // Standardize Indian equities to modern electronic demat inception date (2000-01-01)
    const isIndian = region === 'india' || String(symbol || '').toUpperCase().endsWith('.NS') || String(symbol || '').toUpperCase().endsWith('.BO');
    const minTimestamp = isIndian ? 946684800000 : 0; // 2000-01-01T00:00:00Z
    return [...candles]
      .filter(c => {
        if (!c || c.time === null || c.time === undefined) return false;
        const t = typeof c.time === 'number' && c.time < 10000000000 ? c.time * 1000 : c.time;
        return t >= minTimestamp;
      })
      .sort((a, b) => a.time - b.time);
  }, [candles, region, symbol]);

  const uniqueCandles = useMemo(() => {
    return sortedCandles.filter((c, i, arr) => 
      i === 0 || Math.floor(c.time / 1000) > Math.floor(arr[i - 1].time / 1000)
    );
  }, [sortedCandles]);

  // SIP Performance Calculation
  const isSipMode = chartInterval === 'sip';
  const sipResult = useMemo(() => {
    if (!isSipMode || uniqueCandles.length === 0) return null;
    return calculateSipPerformance(uniqueCandles, monthlySipAmount);
  }, [isSipMode, uniqueCandles, monthlySipAmount]);

  sipResultRef.current = sipResult;

  // Statistics & Metrics for Time Range
  const startCandle = uniqueCandles[0];
  const latestCandle = uniqueCandles[uniqueCandles.length - 1];
  const latestPrice = latestCandle ? (latestCandle.close ?? latestCandle.value) : 0;
  const latestNav = useMemo(() => {
    if (sipResult?.sipData && sipResult.sipData.length > 0) {
      return sipResult.sipData[sipResult.sipData.length - 1].price;
    }
    if (latestCandle) {
      return latestCandle.close ?? latestCandle.value;
    }
    return null;
  }, [sipResult, latestCandle]);

  // Standard Broker Methodology (Tickertape, Zerodha Kite, Groww, Google Finance):
  // 1. For 1D: Baseline is official previous session close (previousClose).
  // 2. For multi-period (1W, 1M, 1Y, etc.): Baseline is the period starting candle's close price.
  const is1D = String(chartInterval || '').toLowerCase() === '1d';
  const baselinePreviousClose = (typeof previousClose === 'number' && previousClose > 0)
    ? previousClose
    : (startCandle?.previousClose || null);

  const startPrice = (is1D && baselinePreviousClose && baselinePreviousClose > 0)
    ? baselinePreviousClose
    : (startCandle ? (startCandle.close ?? startCandle.value ?? startCandle.open) : 0);

  const periodChange = latestPrice - startPrice;
  const periodChangePct = startPrice > 0 ? (periodChange / startPrice) * 100 : 0;
  const isPeriodGain = isSipMode ? (sipResult?.isGain ?? true) : (periodChange >= 0);

  // Dynamic Theme Colors: Green (#16B85A) for gains, Red (#eb5b3c) for losses
  const themeColor = isPeriodGain ? '#16B85A' : '#eb5b3c';
  const gradientTop = isPeriodGain ? 'rgba(22, 184, 90, 0.12)' : 'rgba(235, 91, 60, 0.12)';
  const gradientBottom = 'rgba(255, 255, 255, 0.00)';

  const periodLow = useMemo(() => {
    if (uniqueCandles.length === 0) return 0;
    return Math.min(...uniqueCandles.map(c => c.low ?? c.close ?? c.value));
  }, [uniqueCandles]);

  const periodHigh = useMemo(() => {
    if (uniqueCandles.length === 0) return 0;
    return Math.max(...uniqueCandles.map(c => c.high ?? c.close ?? c.value));
  }, [uniqueCandles]);

  // Dynamic Date-Axis Divisions and Colored Timeline Segments
  const { divisions, segments } = useMemo(() => {
    return calculateTimelineSegments(chartInterval, uniqueCandles);
  }, [chartInterval, uniqueCandles]);

  segmentsRef.current = segments;

  const formatCandleDate = (c) => {
    if (!c || !c.time) return '';
    const t = c.time;
    const d = typeof t === 'number' && t < 10000000000 ? new Date(t * 1000) : new Date(t);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(chartInterval === '1d' ? { hour: '2-digit', minute: '2-digit' } : {})
    });
  };

  // Selected range data (from trendline or live drawing)
  const selectionData = useMemo(() => {
    if (trendline) {
      const pStart = trendline.start.time <= trendline.end.time ? trendline.start : trendline.end;
      const pEnd = trendline.start.time <= trendline.end.time ? trendline.end : trendline.start;
      const diff = Number((pEnd.price - pStart.price).toFixed(2));
      const pct = pStart.price > 0 ? Number(((diff / pStart.price) * 100).toFixed(2)) : 0;
      const dateLabel = formatSelectionDateRange(pStart, pEnd, chartInterval);
      return { pStart, pEnd, diff, pct, isUp: diff >= 0, dateLabel, price: pEnd.price };
    }
    if (isDrawing && drawingStart && hoverPoint) {
      const pStart = drawingStart.time <= hoverPoint.time ? drawingStart : hoverPoint;
      const pEnd = drawingStart.time <= hoverPoint.time ? hoverPoint : drawingStart;
      const diff = Number((pEnd.price - pStart.price).toFixed(2));
      const pct = pStart.price > 0 ? Number(((diff / pStart.price) * 100).toFixed(2)) : 0;
      const dateLabel = formatSelectionDateRange(pStart, pEnd, chartInterval);
      return { pStart, pEnd, diff, pct, isUp: diff >= 0, dateLabel, price: pEnd.price };
    }
    return null;
  }, [trendline, isDrawing, drawingStart, hoverPoint, chartInterval]);

  // Header active values just above the graph: dynamically reflects selection, hovered period, or latest status
  const activePrice = isSipMode 
    ? (hoveredSipPoint ? hoveredSipPoint.value : (sipResult ? sipResult.currentValue : 0))
    : (selectionData ? selectionData.price : (hoveredPeriod ? hoveredPeriod.currentPrice : latestPrice));

  const activeChange = isSipMode
    ? (hoveredSipPoint ? (hoveredSipPoint.value - hoveredSipPoint.invested) : (sipResult ? sipResult.absoluteGain : 0))
    : (selectionData ? selectionData.diff : (hoveredPeriod ? hoveredPeriod.diff : periodChange));

  const activeChangePct = isSipMode
    ? (hoveredSipPoint 
        ? (hoveredSipPoint.invested > 0 ? ((hoveredSipPoint.value - hoveredSipPoint.invested) / hoveredSipPoint.invested) * 100 : 0)
        : (sipResult ? sipResult.returnPct : 0))
    : (selectionData ? selectionData.pct : (hoveredPeriod ? hoveredPeriod.pct : periodChangePct));

  const activeDate = isSipMode
    ? (hoveredSipPoint?.date || (sipResult?.sipData?.length ? sipResult.sipData[sipResult.sipData.length - 1].date : ''))
    : (selectionData ? selectionData.dateLabel : (hoveredPeriod ? hoveredPeriod.dateRangeLabel : formatCandleDate(latestCandle)));

  // Snapping: Find nearest actual candle point from cursor pixel X
  const getNearestPointFromX = useCallback((pixelX) => {
    const candlesList = uniqueCandlesRef.current;
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current || sipValueSeriesRef.current;
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

    const snappedPrice = bestCandle.close ?? bestCandle.value;
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

  // Reproject a data point to current screen pixels
  const projectPointToScreen = useCallback((dataPt) => {
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current || sipValueSeriesRef.current;
    if (!dataPt || !chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(dataPt.time);
    const y = series.priceToCoordinate(dataPt.price);
    if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
    return { x, y };
  }, []);

  // Compute inline curve path and shaded area fill between two points on the graph
  const getSelectionSlicePath = useCallback((t1, t2) => {
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current || sipValueSeriesRef.current;
    if (!chart || !series || uniqueCandles.length === 0) return null;

    const minT = Math.min(t1, t2);
    const maxT = Math.max(t1, t2);

    const slice = uniqueCandles.filter(c => {
      const t = Math.floor(c.time / 1000);
      return t >= minT && t <= maxT;
    });

    const pts = [];
    for (const c of slice) {
      const t = Math.floor(c.time / 1000);
      const x = chart.timeScale().timeToCoordinate(t);
      const price = Number(c.close ?? c.value);
      const y = series.priceToCoordinate(price);
      if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
        pts.push({ x, y, price, time: t });
      }
    }

    if (pts.length < 2) return null;

    let curveD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      curveD += ` L ${pts[i].x} ${pts[i].y}`;
    }

    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    let areaD = `M ${firstX} ${height}`;
    for (const pt of pts) {
      areaD += ` L ${pt.x} ${pt.y}`;
    }
    areaD += ` L ${lastX} ${height} Z`;

    return { curveD, areaD, pts };
  }, [uniqueCandles, height]);

  // Dynamic screen percentage for division ticks matching exact chart X coordinates
  const getDivisionPct = useCallback((idx) => {
    if (idx <= 0) return 0;
    if (idx >= divisions.length - 1) return 100;
    const div = divisions[idx];
    if (!div) return 0;
    const chart = mainChartRef.current;
    const containerWidth = chartContainerRef.current?.clientWidth || chartWidth || 0;
    if (chart && containerWidth > 0) {
      const tSec = Math.floor((div.time > 100000000000 ? div.time : div.time * 1000) / 1000);
      const coord = chart.timeScale().timeToCoordinate(tSec);
      if (coord !== null && coord !== undefined && !isNaN(coord)) {
        return Math.max(0, Math.min(100, (coord / containerWidth) * 100));
      }
    }
    return Math.max(0, Math.min(100, div.leftPct));
  }, [divisions, chartWidth]);

  // Real-Time Smooth Hover Response across Chart Canvas
  const handleChartPointerMove = useCallback((e) => {
    if (isDrawing || activeDragHandle) return;
    const container = chartContainerRef.current;
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current || sipValueSeriesRef.current;
    if (!container || !chart || !series) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
      setHoveredPeriod(null);
      setHoveredSipPoint(null);
      return;
    }

    const candlesList = uniqueCandlesRef.current;
    if (!candlesList || candlesList.length === 0) return;

    // --- SIP Mode Hover Tracking ---
    if (isSipMode) {
      const sipData = sipResultRef.current?.sipData || [];
      if (sipData.length === 0) return;

      let bestPt = null;
      let bestDist = Infinity;
      for (let i = 0; i < sipData.length; i++) {
        const pt = sipData[i];
        const screenX = chart.timeScale().timeToCoordinate(pt.time);
        if (screenX === null || screenX === undefined || isNaN(screenX)) continue;
        const dist = Math.abs(screenX - mouseX);
        if (dist < bestDist) {
          bestDist = dist;
          bestPt = pt;
        }
      }

      if (bestPt) {
        const ptX = chart.timeScale().timeToCoordinate(bestPt.time);
        const valY = series.priceToCoordinate(bestPt.value);
        setHoveredSipPoint({
          invested: bestPt.invested,
          value: bestPt.value,
          date: bestPt.date,
          units: bestPt.units,
          nav: bestPt.price,
          x: ptX ?? mouseX,
          y: valY ?? mouseY
        });
      }
      return;
    }

    // --- Standard Mode Period Hover Tracking ---
    let bestCandle = null;
    let bestDist = Infinity;
    let bestIndex = -1;
    let bestX = null;

    for (let i = 0; i < candlesList.length; i++) {
      const c = candlesList[i];
      const t = Math.floor(c.time / 1000);
      const screenX = chart.timeScale().timeToCoordinate(t);
      if (screenX === null || screenX === undefined || isNaN(screenX)) continue;
      const dist = Math.abs(screenX - mouseX);
      if (dist < bestDist) {
        bestDist = dist;
        bestCandle = c;
        bestIndex = i;
        bestX = screenX;
      }
    }

    if (!bestCandle || bestIndex === -1) return;

    const snappedPrice = Number(bestCandle.close ?? bestCandle.value);
    const snappedY = series.priceToCoordinate(snappedPrice);

    // Identify which division segment this candle falls into
    const segs = segmentsRef.current || [];
    let matchedSegIdx = 0;
    const toMs = (t) => (t > 100000000000 ? t : t * 1000);
    const candleMs = toMs(bestCandle.time);

    for (let s = 0; s < segs.length; s++) {
      const isLast = s === segs.length - 1;
      const nextBoundary = segs[s].nextDivisionTime || (!isLast && segs[s + 1] ? segs[s + 1].startTime : null);
      if (isLast || !nextBoundary) {
        if (candleMs >= segs[s].startTime) {
          matchedSegIdx = s;
          break;
        }
      } else {
        if (candleMs >= segs[s].startTime && candleMs < nextBoundary) {
          matchedSegIdx = s;
          break;
        }
      }
    }

    const matchedSeg = segs[matchedSegIdx] || segs[0];

    // Start candle of the active time period
    let startC = candlesList.find(c => toMs(c.time) >= matchedSeg.startTime);
    if (!startC) startC = candlesList[0];

    // End candle is the currently hovered point
    let endC = bestCandle;
    if (toMs(endC.time) < toMs(startC.time)) {
      const tmp = startC;
      startC = endC;
      endC = tmp;
    }

    const sPrice = Number(startC.open ?? startC.close ?? startC.value);
    const ePrice = Number(endC.close ?? endC.value);
    const diff = Number((ePrice - sPrice).toFixed(2));
    const pct = sPrice > 0 ? Number(((diff / sPrice) * 100).toFixed(2)) : 0;
    const isUp = diff >= 0;

    const startX = chart.timeScale().timeToCoordinate(Math.floor(startC.time / 1000));
    const startY = series.priceToCoordinate(sPrice);
    const endX = bestX ?? mouseX;
    const endY = snappedY ?? mouseY;

    const sDateObj = new Date(toMs(startC.time));
    const eDateObj = new Date(toMs(endC.time));
    const dateRangeLabel = formatSegmentDateRange(sDateObj, eDateObj, chartInterval);

    // Filter points in this range for shaded area under curve
    const sliceCandles = candlesList.filter(c => toMs(c.time) >= toMs(startC.time) && toMs(c.time) <= toMs(endC.time));

    setHoveredPeriod({
      startCandle: startC,
      endCandle: endC,
      sPrice,
      ePrice,
      diff,
      pct,
      isUp,
      startX: startX ?? endX,
      startY: startY ?? endY,
      endX,
      endY,
      dateRangeLabel,
      segmentIndex: matchedSegIdx,
      sliceCandles,
      currentPrice: ePrice,
      currentDateStr: eDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    });
  }, [isDrawing, activeDragHandle, isSipMode, chartInterval]);

  // Pointer interactions for trendline drawing & dragging
  const handleOverlayPointerMove = (e) => {
    if (!isDrawing && !activeDragHandle) {
      handleChartPointerMove(e);
      return;
    }
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
    if (activeDragHandle) return;
    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const snapped = getNearestPointFromX(mouseX);
    if (!snapped) return;

    // 1. If two points are already selected: single click / single tap anywhere on chart dismisses them immediately
    if (trendline) {
      setTrendline(null);
      setIsDrawing(false);
      setDrawingStart(null);
      setHoverPoint(null);
      justDismissedRef.current = true;
      setTimeout(() => {
        justDismissedRef.current = false;
      }, 250);
      return;
    }

    // Ignore if we just dismissed in this gesture
    if (justDismissedRef.current) return;

    // 2. If drawing is in progress and we already have start point: anchor the second point
    if (isDrawing && drawingStart) {
      if (snapped.time !== drawingStart.time) {
        setTrendline({
          start: { time: drawingStart.time, price: drawingStart.price, date: drawingStart.date },
          end: { time: snapped.time, price: snapped.price, date: snapped.date }
        });
        setIsDrawing(false);
        setDrawingStart(null);
        setHoverPoint(null);
        return;
      }
    }

    // 3. Otherwise anchor the first point (supports both two-click selection and drag-to-select)
    setDrawingStart(snapped);
    setIsDrawing(true);
    setHoverPoint(snapped);
    pointerDownPosRef.current = { x: mouseX, y: mouseY, time: snapped.time };
  };

  const handleOverlayPointerUp = (e) => {
    if (activeDragHandle) {
      handleHandlePointerUp(e);
      return;
    }

    if (justDismissedRef.current) return;

    // Support drag-to-select: if mouse/finger dragged across candles
    if (isDrawing && drawingStart && pointerDownPosRef.current) {
      const rect = svgOverlayRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const snapped = getNearestPointFromX(mouseX);
        if (snapped && Math.abs(mouseX - pointerDownPosRef.current.x) > 15 && snapped.time !== drawingStart.time) {
          setTrendline({
            start: { time: drawingStart.time, price: drawingStart.price, date: drawingStart.date },
            end: { time: snapped.time, price: snapped.price, date: snapped.date }
          });
          setIsDrawing(false);
          setDrawingStart(null);
          setHoverPoint(null);
        }
      }
    }
    pointerDownPosRef.current = null;
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

  // Double-click / touch double-tap to activate trendline measurement
  const lastTapTimeRef = useRef(0);
  const handleChartDoubleClick = (e) => {
    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const snapped = getNearestPointFromX(mouseX);
    if (!snapped) return;
    setTrendline(null);
    setIsDrawing(true);
    setDrawingStart(snapped);
    setHoverPoint(snapped);
  };

  const handleChartTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 350) {
      const touch = e.changedTouches?.[0];
      if (touch) {
        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = touch.clientX - rect.left;
          const snapped = getNearestPointFromX(mouseX);
          if (snapped) {
            setTrendline(null);
            setIsDrawing(true);
            setDrawingStart(snapped);
            setHoverPoint(snapped);
          }
        }
      }
    }
    lastTapTimeRef.current = now;
  };

  // Construct Lightweight Chart matching reference design: Clean White/Light Theme
  useEffect(() => {
    if (!chartContainerRef.current || uniqueCandles.length === 0) return;

    // Clean Dynamic Theme Palette (Pure White for Light Mode, Deep Slate for Dark Mode)
    const chartBg = isDark ? '#0f172a' : '#ffffff';
    const chartTextColor = isDark ? '#94a3b8' : '#64748b';
    const chartHorzLines = isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.8)';
    const chartCrosshairBg = isDark ? '#1e293b' : '#475569';

    const mainChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: chartBg },
        textColor: chartTextColor,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: chartHorzLines },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(148, 163, 184, 0.45)',
          width: 1,
          style: 1,
          labelBackgroundColor: chartCrosshairBg,
        },
        horzLine: {
          color: 'rgba(148, 163, 184, 0.35)',
          width: 1,
          style: 1,
          labelBackgroundColor: chartCrosshairBg,
        },
      },
      timeScale: {
        visible: false,
        borderVisible: false,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: false,
      },
    });

    mainChartRef.current = mainChart;
    uniqueCandlesRef.current = uniqueCandles;
    setChartWidth(chartContainerRef.current.clientWidth);

    // --- SIP Mode Rendering: 3 Lines (Investment Capital, Portfolio Value, Fund NAV) ---
    if (isSipMode && sipResult && sipResult.sipData.length > 0) {
      // 1. Invested Capital Line (Amber/Gold #e5a93c)
      const investedSeries = mainChart.addLineSeries({
        color: '#e5a93c',
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: isDark ? '#0f172a' : '#ffffff',
        crosshairMarkerBackgroundColor: '#e5a93c',
      });
      investedSeries.setData(sipResult.sipData.map(d => ({
        time: d.time,
        value: d.invested
      })));
      sipInvestedSeriesRef.current = investedSeries;

      // 2. Portfolio Value Line (Green #16B85A or Red #eb5b3c with gradient)
      const valueSeries = mainChart.addAreaSeries({
        lineColor: themeColor,
        topColor: gradientTop,
        bottomColor: gradientBottom,
        lineWidth: 2.5,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: isDark ? '#0f172a' : '#ffffff',
        crosshairMarkerBackgroundColor: themeColor,
      });
      valueSeries.setData(sipResult.sipData.map(d => ({
        time: d.time,
        value: d.value
      })));
      sipValueSeriesRef.current = valueSeries;

      // 3. Fund NAV / Price Line (Blue #3b82f6 assigned to left price scale for independent, smooth scaling)
      const navSeries = mainChart.addLineSeries({
        priceScaleId: 'left',
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: isDark ? '#0f172a' : '#ffffff',
        crosshairMarkerBackgroundColor: '#3b82f6',
      });
      navSeries.setData(sipResult.sipData.map(d => ({
        time: d.time,
        value: d.price
      })));
      sipNavSeriesRef.current = navSeries;
    }

    // --- Standard Mode Rendering: 1D, 1W, 1M, 1Y, 5Y, Max ---
    else {
      // Subtle Baseline Reference Line at Start Price / NAV
      if (startPrice > 0 && uniqueCandles.length > 1) {
        const baselineSeries = mainChart.addLineSeries({
          color: 'rgba(148, 163, 184, 0.35)',
          lineWidth: 1,
          lineStyle: 1, // Dotted
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        baselineSeries.setData(uniqueCandles.map(c => ({
          time: Math.floor(c.time / 1000),
          value: startPrice
        })));
      }

      // Volume Series for stocks when volume data exists
      const hasVolume = effectiveType === 'stock' && uniqueCandles.some(c => c.volume && c.volume > 0);
      if (hasVolume) {
        const volumeSeries = mainChart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '', // overlay mode
        });
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.82,
            bottom: 0,
          },
        });
        volumeSeries.setData(uniqueCandles.map(c => ({
          time: Math.floor(c.time / 1000),
          value: c.volume || 0,
          color: (c.close ?? c.value) >= (c.open ?? c.value) ? 'rgba(22, 184, 90, 0.25)' : 'rgba(235, 91, 60, 0.25)'
        })));
        volumeSeriesRef.current = volumeSeries;
      }

      // Main Chart Series: Green (#16B85A) or Red (#eb5b3c) based on period return
      let mainSeries;
      if (chartType === 'candle' && effectiveType === 'stock') {
        mainSeries = mainChart.addCandlestickSeries({
          upColor: '#16B85A',
          downColor: '#eb5b3c',
          borderDownColor: '#eb5b3c',
          borderUpColor: '#16B85A',
          wickDownColor: '#eb5b3c',
          wickUpColor: '#16B85A',
        });
        mainSeries.setData(uniqueCandles.map(c => ({
          time: Math.floor(c.time / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        })));
      } else {
        // Area Series matching reference colors: green or red line
        mainSeries = mainChart.addAreaSeries({
          lineColor: themeColor,
          topColor: gradientTop,
          bottomColor: gradientBottom,
          lineWidth: 2,
          priceLineVisible: false,
          crosshairMarkerVisible: false, // We render custom interactive period markers
        });
        mainSeries.setData(uniqueCandles.map(c => ({
          time: Math.floor(c.time / 1000),
          value: c.close ?? c.value
        })));
      }
      candleSeriesRef.current = mainSeries;

      // Indicators: EMA 20, 50, 200 (if enabled for stocks)
      if (effectiveType === 'stock') {
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
      }
    }

    // Auto-fit time scale
    mainChart.timeScale().fitContent();

    // ResizeObserver for responsive width & height across mobile, tablet, desktop
    const handleResize = () => {
      if (chartContainerRef.current && mainChart) {
        const newWidth = chartContainerRef.current.clientWidth;
        mainChart.applyOptions({
          width: newWidth,
        });
        setChartWidth(newWidth);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
      setCoordTick(t => t + 1);
    });

    resizeObserver.observe(chartContainerRef.current);
    window.addEventListener('resize', handleResize);

    const timeScale = mainChart.timeScale();
    const handleTimeScaleVisibleLogicalRangeChange = () => {
      setCoordTick(t => t + 1);
    };
    timeScale.subscribeVisibleLogicalRangeChange(handleTimeScaleVisibleLogicalRangeChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleTimeScaleVisibleLogicalRangeChange);
      mainChart.remove();
      mainChartRef.current = null;
      candleSeriesRef.current = null;
      sipInvestedSeriesRef.current = null;
      sipValueSeriesRef.current = null;
      sipNavSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
    };
  }, [uniqueCandles, chartType, chartInterval, indicators, height, effectiveType, startPrice, isSipMode, sipResult, themeColor, gradientTop, gradientBottom, isDark]);

  // Activate segment directly from timeline bar hover
  const activateSegmentByIndex = (idx) => {
    const segs = segmentsRef.current || [];
    const candlesList = uniqueCandlesRef.current || [];
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;
    if (!segs[idx] || candlesList.length === 0 || !chart || !series) return;

    const toMs = (t) => (t > 100000000000 ? t : t * 1000);
    const seg = segs[idx];
    const isLastSeg = idx === segs.length - 1;
    const nextBoundaryTime = seg.nextDivisionTime || (!isLastSeg && segs[idx + 1] ? segs[idx + 1].startTime : null);

    let startC = candlesList.find(c => toMs(c.time) >= seg.startTime);
    if (!startC) startC = candlesList[0];

    let endC = candlesList.slice().reverse().find(c => {
      const t = toMs(c.time);
      return (!isLastSeg && nextBoundaryTime) ? (t < nextBoundaryTime && t <= seg.endTime) : t <= seg.endTime;
    });
    if (!endC) endC = candlesList.find(c => toMs(c.time) >= seg.startTime) || candlesList[candlesList.length - 1];

    const sPrice = Number(startC.open ?? startC.close ?? startC.value);
    const ePrice = Number(endC.close ?? endC.value);
    const diff = Number((ePrice - sPrice).toFixed(2));
    const pct = sPrice > 0 ? Number(((diff / sPrice) * 100).toFixed(2)) : 0;
    const isUp = diff >= 0;

    const startX = chart.timeScale().timeToCoordinate(Math.floor(startC.time / 1000));
    const startY = series.priceToCoordinate(sPrice);
    const endX = chart.timeScale().timeToCoordinate(Math.floor(endC.time / 1000));
    const endY = series.priceToCoordinate(ePrice);

    const sDateObj = new Date(toMs(startC.time));
    const eDateObj = new Date(toMs(endC.time));
    const dateRangeLabel = formatSegmentDateRange(sDateObj, eDateObj, chartInterval);
    const sliceCandles = candlesList.filter(c => toMs(c.time) >= toMs(startC.time) && toMs(c.time) <= toMs(endC.time));

    setHoveredPeriod({
      startCandle: startC,
      endCandle: endC,
      sPrice,
      ePrice,
      diff,
      pct,
      isUp,
      startX: startX ?? 0,
      startY: startY ?? 0,
      endX: endX ?? 0,
      endY: endY ?? 0,
      dateRangeLabel,
      segmentIndex: idx,
      sliceCandles,
      currentPrice: ePrice,
      currentDateStr: eDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    });
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm ${hideHeaderTitle ? 'p-2 sm:p-3 md:p-3.5' : 'p-2.5 sm:p-4 md:p-5'} text-slate-900 dark:text-slate-100 select-none ${className}`}>
      {/* Chart Header Bar: Asset Info, Stock toggles, Trendline Toolbar */}
      {!hideHeaderTitle ? (
        <div className="flex flex-col gap-2 sm:gap-3 pb-2 sm:pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            {/* Asset Title / Badge */}
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm sm:text-base md:text-lg text-slate-900 dark:text-white">
                    {fund?.name || symbol}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                    {effectiveType === 'mf' ? (fund?.category || 'MUTUAL FUND') : 'STOCK'}
                  </span>
                </div>
                <p className="text-xs text-[#64748b] dark:text-slate-400 font-medium mt-0.5">
                  {isDrawing ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                      {drawingStart ? '● Click second point to anchor trendline' : '● Click first point to start trendline (magnet snap active)'}
                    </span>
                  ) : isSipMode ? (
                    'Systematic Investment Plan (SIP) Simulation'
                  ) : (
                    `${effectiveType === 'mf' ? 'Historical NAV Performance' : 'Price Action & Returns'}`
                  )}
                </p>
              </div>
            </div>

            {/* Right Toolbar: Stock Specific Toggles & Trendline Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Stock specific toggles: Candles vs Area */}
              {effectiveType === 'stock' && !isSipMode && (
                <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
                      chartType === 'area' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-[#64748b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setChartType('candle')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
                      chartType === 'candle' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-[#64748b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Candles
                  </button>
                </div>
              )}

              {/* Trendline Tool Strip */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleDrawTrendline}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isDrawing
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-600 dark:text-blue-400 ring-2 ring-blue-400/20'
                      : trendline
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title="Double click anywhere or tap here to draw trendline"
                >
                  <Pencil size={14} />
                </button>

                <button
                  onClick={handleClearTrendline}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    trendline
                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  disabled={!trendline}
                  title="Clear trendline"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Asset Statistics: Value, Percentage Change, High, Low, Returns */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pt-1.5 sm:pt-2">
            {/* Left: Value & Change Badge */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {activePrice > 0 ? activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>

              {((!isSipMode && (selectionData || hoveredPeriod || startPrice > 0)) || (isSipMode && sipResult)) && (
                <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md ${
                  activeChange >= 0
                    ? 'text-[#16B85A] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800'
                    : 'text-[#eb5b3c] bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800'
                }`}>
                  <span>{activeChange >= 0 ? '▲ +' : '▼ '}{Math.abs(activeChange).toFixed(2)}</span>
                  <span>({activeChange >= 0 ? '+' : ''}{activeChangePct.toFixed(2)}%)</span>
                </span>
              )}

              <span className="text-[11px] sm:text-xs text-[#64748b] dark:text-slate-400 font-medium ml-1">
                {activeDate}
              </span>
            </div>

            {/* Right Stats: Stats bar in SIP or Standard mode */}
            {isSipMode ? (
              /* SIP Mode Stats: Investment | Value | Returns | NAV */
              <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-mono text-[#64748b] dark:text-slate-400 flex-wrap">
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium">Investment: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {hoveredSipPoint 
                      ? hoveredSipPoint.invested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : (sipResult ? sipResult.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium">Value: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {hoveredSipPoint 
                      ? hoveredSipPoint.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : (sipResult ? sipResult.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium">Returns: </span>
                  <span className={`font-bold ${(hoveredSipPoint ? hoveredSipPoint.value >= hoveredSipPoint.invested : sipResult?.isGain) ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                    {(hoveredSipPoint ? hoveredSipPoint.value >= hoveredSipPoint.invested : sipResult?.isGain) ? '▲ +' : '▼ '}
                    {hoveredSipPoint 
                      ? (hoveredSipPoint.invested > 0 ? Math.abs(((hoveredSipPoint.value - hoveredSipPoint.invested) / hoveredSipPoint.invested) * 100).toFixed(2) : '0.00')
                      : (sipResult ? Math.abs(sipResult.returnPct).toFixed(2) : '0.00')}%
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium">{effectiveType === 'mf' ? 'NAV: ' : 'Price: '}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {hoveredSipPoint?.nav 
                      ? hoveredSipPoint.nav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : (latestNav ? latestNav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
                  </span>
                </div>
              </div>
            ) : (
              /* Standard Mode Stats: High | Low | Returns (matching uploaded screenshot) */
              <div className="flex items-center gap-2.5 sm:gap-6 text-xs font-mono text-[#64748b] dark:text-slate-400 flex-wrap">
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium block text-[9px] sm:text-[10px] uppercase font-sans">High</span>
                  <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                    {periodHigh > 0 ? periodHigh.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium block text-[9px] sm:text-[10px] uppercase font-sans">Low</span>
                  <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                    {periodLow > 0 ? periodLow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#94a3b8] dark:text-slate-500 font-medium block text-[9px] sm:text-[10px] uppercase font-sans">Returns</span>
                  <span className={`font-bold text-xs sm:text-sm ${periodChange >= 0 ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                    {periodChange >= 0 ? '▲ +' : '▼ '}{Math.abs(periodChangePct).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Compact Header when hideHeaderTitle is TRUE (integrated single row, no duplicate title) */
        <div className="flex flex-col gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          {isDrawing && (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold animate-pulse pb-1">
              {drawingStart ? '● Click second point to anchor trendline' : '● Click first point to start trendline (magnet snap active)'}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            {/* Left: Value & Change Badge */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {activePrice > 0 ? activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>

              {((!isSipMode && (selectionData || hoveredPeriod || startPrice > 0)) || (isSipMode && sipResult)) && (
                <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md ${
                  activeChange >= 0
                    ? 'text-[#16B85A] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800'
                    : 'text-[#eb5b3c] bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800'
                }`}>
                  <span>{activeChange >= 0 ? '▲ +' : '▼ '}{Math.abs(activeChange).toFixed(2)}</span>
                  <span>({activeChange >= 0 ? '+' : ''}{activeChangePct.toFixed(2)}%)</span>
                </span>
              )}

              <span className="text-[11px] sm:text-xs text-[#64748b] dark:text-slate-400 font-medium ml-1">
                {activeDate}
              </span>
            </div>

            {/* Right: Stats & Toolbars */}
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap ml-auto">
              {isSipMode ? (
                <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono text-[#64748b] dark:text-slate-400 flex-wrap">
                  <div>
                    <span className="text-[#94a3b8] dark:text-slate-500 font-medium">Inv: </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      {hoveredSipPoint 
                        ? hoveredSipPoint.invested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : (sipResult ? sipResult.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div>
                    <span className="text-[#94a3b8] dark:text-slate-500 font-medium">Val: </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      {hoveredSipPoint 
                        ? hoveredSipPoint.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : (sipResult ? sipResult.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div>
                    <span className="text-[#94a3b8] dark:text-slate-500 font-medium">Ret: </span>
                    <span className={`font-bold ${(hoveredSipPoint ? hoveredSipPoint.value >= hoveredSipPoint.invested : sipResult?.isGain) ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                      {(hoveredSipPoint ? hoveredSipPoint.value >= hoveredSipPoint.invested : sipResult?.isGain) ? '▲ +' : '▼ '}
                      {hoveredSipPoint 
                        ? (hoveredSipPoint.invested > 0 ? Math.abs(((hoveredSipPoint.value - hoveredSipPoint.invested) / hoveredSipPoint.invested) * 100).toFixed(2) : '0.00')
                        : (sipResult ? Math.abs(sipResult.returnPct).toFixed(2) : '0.00')}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 sm:gap-4 text-xs font-mono text-[#64748b] dark:text-slate-400 flex-wrap">
                  <div>
                    <span className="text-[#94a3b8] dark:text-slate-500 font-medium block text-[9px] uppercase font-sans">High</span>
                    <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                      {periodHigh > 0 ? periodHigh.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8] dark:text-slate-500 font-medium block text-[9px] uppercase font-sans">Low</span>
                    <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                      {periodLow > 0 ? periodLow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8] dark:text-slate-500 font-medium block text-[9px] uppercase font-sans">Returns</span>
                    <span className={`font-bold text-xs sm:text-sm ${periodChange >= 0 ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                      {periodChange >= 0 ? '▲ +' : '▼ '}{Math.abs(periodChangePct).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Stock specific toggles: Candles vs Area */}
              {effectiveType === 'stock' && !isSipMode && (
                <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
                      chartType === 'area' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-[#64748b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setChartType('candle')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
                      chartType === 'candle' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-[#64748b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Candles
                  </button>
                </div>
              )}

              {/* Trendline Tool Strip */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleDrawTrendline}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isDrawing
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-600 dark:text-blue-400 ring-2 ring-blue-400/20'
                      : trendline
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title="Double click anywhere or tap here to draw trendline"
                >
                  <Pencil size={14} />
                </button>

                <button
                  onClick={handleClearTrendline}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    trendline
                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  disabled={!trendline}
                  title="Clear trendline"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIP Mode Interactive Controller */}
      {isSipMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3.5 py-2 mb-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly Investment:</span>
            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-700 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
              {[500, 1000, 2500, 5000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setMonthlySipAmount(amt)}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all ${
                    monthlySipAmount === amt
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  {amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-0.5">
              <input
                type="number"
                min="100"
                step="500"
                value={monthlySipAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0) setMonthlySipAmount(val);
                }}
                className="w-16 outline-none text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 bg-transparent"
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] font-medium text-[#64748b] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e5a93c]" /> Investment Capital
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPeriodGain ? 'bg-[#16B85A]' : 'bg-[#eb5b3c]'}`} /> Portfolio Value
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> {effectiveType === 'mf' ? 'Fund NAV' : 'Stock Price'}
            </span>
          </div>
        </div>
      )}

      {/* Mobile-Only Timeframe Selector: Positioned ABOVE the Graph */}
      <div className="flex md:hidden items-center justify-center py-2 -mx-1 overflow-x-auto">
        <div className="inline-flex items-center bg-[#f8fafc] dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/90 dark:border-slate-700 divide-x divide-slate-200/80 dark:divide-slate-700 shadow-2xs max-w-full overflow-x-auto">
          {timeRanges.map(tf => {
            const isActive = chartInterval.toLowerCase() === tf.val || (tf.val === '1m' && chartInterval.toLowerCase() === '1mo');
            return (
              <button
                key={tf.val}
                onClick={() => {
                  setChartInterval(tf.val);
                  setHoveredPeriod(null);
                  setHoveredSipPoint(null);
                  setTrendline(null);
                  setIsDrawing(false);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm rounded-lg font-extrabold'
                    : 'text-[#2563eb] dark:text-blue-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-blue-800 dark:hover:text-blue-300'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Canvas & Interactive SVG Overlay */}
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden cursor-crosshair"
        onMouseMove={handleChartPointerMove}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) handleChartPointerMove(touch);
        }}
        onMouseLeave={() => {
          setHoveredPeriod(null);
          setHoveredSipPoint(null);
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#64748b] dark:text-slate-400 gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xs z-10">
            <span className="w-4 h-4 border-2 border-[#16B85A] border-t-transparent rounded-full animate-spin"></span>
            Loading chart data...
          </div>
        )}

        {fetchError && !loading && uniqueCandles.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-[#64748b] dark:text-slate-400 p-6 text-center z-10">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Historical data currently unavailable</p>
            <p className="text-[11px] text-[#94a3b8] dark:text-slate-500 mt-1">{fetchError}</p>
          </div>
        )}

        <div ref={chartContainerRef} style={{ height: `${height}px` }} className="w-full" />

        {/* Floating Tooltips */}
        {/* 1. SIP Mode Tooltip */}
        {isSipMode && hoveredSipPoint && (() => {
          const isSipNearTop = hoveredSipPoint.y < 100;
          const sipTop = isSipNearTop ? Math.min(hoveredSipPoint.y + 14, height - 120) : Math.max(hoveredSipPoint.y - 12, 12);
          const sipTransform = isSipNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
          return (
            <div 
              className="absolute pointer-events-none z-30 transition-all duration-75 ease-out"
              style={{
                left: Math.min(Math.max(hoveredSipPoint.x, 90), (chartContainerRef.current?.clientWidth || 600) - 90),
                top: sipTop,
                transform: sipTransform
              }}
            >
              <div className={`${
                isDark ? 'bg-slate-800/98 border-slate-700 text-slate-100' : 'bg-white/95 border-slate-200/90 text-slate-900'
              } dark:bg-slate-800/95 dark:border-slate-700 dark:text-slate-100 backdrop-blur-md border rounded-xl p-3 shadow-xl text-left text-xs whitespace-nowrap min-w-[150px] space-y-1`}>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-[#64748b] dark:text-slate-400">Monthly SIP:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{monthlySipAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-[#64748b] dark:text-slate-400">Investment:</span>
                  <span className="font-mono font-bold text-[#e5a93c]">{hoveredSipPoint.invested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-[#64748b] dark:text-slate-400">Value:</span>
                  <span className={`font-mono font-bold ${hoveredSipPoint.value >= hoveredSipPoint.invested ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                    {hoveredSipPoint.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {hoveredSipPoint.nav !== undefined && (
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-[#64748b] dark:text-slate-400">{effectiveType === 'mf' ? 'NAV:' : 'Price:'}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {hoveredSipPoint.nav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-[#94a3b8] dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 text-center font-medium">
                  As on {hoveredSipPoint.date}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2. Standard Period Hover Tooltip (Matching Uploaded Reference Image Exactly - Auto flips if graph is near top) */}
        {!isSipMode && hoveredPeriod && !isDrawing && (() => {
          const minY = Math.min(hoveredPeriod.startY, hoveredPeriod.endY);
          const maxY = Math.max(hoveredPeriod.startY, hoveredPeriod.endY);
          const isNearTop = minY < 65;
          const tooltipTop = isNearTop ? Math.min(maxY + 14, height - 55) : Math.max(minY - 12, 10);
          const tooltipTransform = isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
          const tooltipLeft = Math.min(Math.max((hoveredPeriod.startX + hoveredPeriod.endX) / 2, 75), (chartContainerRef.current?.clientWidth || 600) - 75);

          return (
            <div 
              className="absolute pointer-events-none z-30 transition-all duration-75 ease-out"
              style={{
                left: tooltipLeft,
                top: tooltipTop,
                transform: tooltipTransform
              }}
            >
              <div className={`${
                isDark ? 'bg-slate-800/98 border-slate-700 text-slate-100' : 'bg-white/98 border-slate-200/90 text-slate-900'
              } dark:bg-slate-800/98 dark:border-slate-700 backdrop-blur-md border rounded-xl px-3.5 py-1.5 shadow-xl text-center text-xs whitespace-nowrap min-w-[120px]`}>
                <div className={`text-xs font-mono font-extrabold ${hoveredPeriod.isUp ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                  {hoveredPeriod.isUp ? '▲ +' : '▼ '}{Math.abs(hoveredPeriod.diff).toFixed(2)} ({hoveredPeriod.isUp ? '+' : ''}{hoveredPeriod.pct.toFixed(2)}%)
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-slate-400 font-medium mt-0.5">
                  {hoveredPeriod.dateRangeLabel}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Interactive SVG Trendline & Dynamic Period Highlight Layer */}
        <svg
          ref={svgOverlayRef}
          className="absolute inset-0 w-full h-full overflow-visible z-20 pointer-events-auto cursor-crosshair"
          style={{ touchAction: isDrawing || activeDragHandle ? 'none' : 'auto' }}
          onPointerMove={handleOverlayPointerMove}
          onPointerDown={handleOverlayPointerDown}
          onPointerUp={handleOverlayPointerUp}
          onDoubleClick={handleChartDoubleClick}
          onTouchEnd={handleChartTouchEnd}
        >
          {/* Shaded Period Highlight & Boundary Dotted Lines (Matches Reference Screenshot) */}
          {!isSipMode && hoveredPeriod && !isDrawing && !trendline && (
            <g className="hover-period-visual pointer-events-none">
              {/* Shaded Area Under Curve between startX and endX */}
              {(() => {
                if (!hoveredPeriod.sliceCandles || hoveredPeriod.sliceCandles.length < 2) return null;
                const chart = mainChartRef.current;
                const series = candleSeriesRef.current;
                if (!chart || !series) return null;

                const pts = [];
                for (const c of hoveredPeriod.sliceCandles) {
                  const t = Math.floor(c.time / 1000);
                  const x = chart.timeScale().timeToCoordinate(t);
                  const p = c.close ?? c.value;
                  const y = series.priceToCoordinate(p);
                  if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
                    pts.push({ x, y });
                  }
                }
                if (pts.length < 2) return null;

                const firstX = pts[0].x;
                const lastX = pts[pts.length - 1].x;
                let areaD = `M ${firstX} ${height}`;
                for (const pt of pts) {
                  areaD += ` L ${pt.x} ${pt.y}`;
                }
                areaD += ` L ${lastX} ${height} Z`;

                let lineD = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 1; i < pts.length; i++) {
                  lineD += ` L ${pts[i].x} ${pts[i].y}`;
                }

                const strokeColor = hoveredPeriod.isUp ? '#16B85A' : '#eb5b3c';
                const fillColor = hoveredPeriod.isUp 
                  ? (isDark ? 'rgba(22, 184, 90, 0.22)' : 'rgba(22, 184, 90, 0.16)') 
                  : (isDark ? 'rgba(235, 91, 60, 0.22)' : 'rgba(235, 91, 60, 0.16)');

                return (
                  <g className="hovered-section-visual">
                    {/* Shaded Area Under Curve for this particular section */}
                    <path d={areaD} fill={fillColor} />
                    {/* Graph Line for this particular section in green (if up) or red (if down) */}
                    <path
                      d={lineD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })()}

              {/* Start Boundary Vertical Dotted Line */}
              <line
                x1={hoveredPeriod.startX}
                y1={0}
                x2={hoveredPeriod.startX}
                y2={height}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Start Boundary Circular Dot on Curve */}
              <circle
                cx={hoveredPeriod.startX}
                cy={hoveredPeriod.startY}
                r={4.5}
                fill={hoveredPeriod.isUp ? '#16B85A' : '#eb5b3c'}
                stroke="#ffffff"
                strokeWidth={2}
              />

              {/* End/Hovered Boundary Vertical Dotted Line */}
              <line
                x1={hoveredPeriod.endX}
                y1={0}
                x2={hoveredPeriod.endX}
                y2={height}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* End/Hovered Boundary Circular Dot on Curve */}
              <circle
                cx={hoveredPeriod.endX}
                cy={hoveredPeriod.endY}
                r={4.5}
                fill={hoveredPeriod.isUp ? '#16B85A' : '#eb5b3c'}
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Render Two-Point Selection INLINE WITH GRAPH (Tickertape Style) */}
          {(() => {
            if (!trendline) return null;
            const pStart = trendline.start.time <= trendline.end.time ? trendline.start : trendline.end;
            const pEnd = trendline.start.time <= trendline.end.time ? trendline.end : trendline.start;

            const startProj = projectPointToScreen(pStart);
            const endProj = projectPointToScreen(pEnd);
            if (!startProj || !endProj) return null;

            const priceDiff = pEnd.price - pStart.price;
            const isUp = priceDiff >= 0;
            const strokeColor = isUp ? '#16B85A' : '#eb5b3c';
            const areaFillColor = isUp ? 'rgba(22, 184, 90, 0.16)' : 'rgba(235, 91, 60, 0.16)';

            const sliceData = getSelectionSlicePath(pStart.time, pEnd.time);

            return (
              <g className="two-point-selection-group">
                {/* 1. Shaded Area Fill Under Curve between Point 1 and Point 2 */}
                {sliceData && (
                  <path d={sliceData.areaD} fill={areaFillColor} className="pointer-events-none" />
                )}

                {/* 2. Highlighted Line INLINE WITH GRAPH (tracing the curve) */}
                {sliceData && (
                  <path
                    d={sliceData.curveD}
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none"
                  />
                )}

                {/* 3. Start Point Vertical Crosshair Dotted Line */}
                <line
                  x1={startProj.x}
                  y1={0}
                  x2={startProj.x}
                  y2={height}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  className="pointer-events-none"
                />

                {/* 4. End Point Vertical Crosshair Dotted Line */}
                <line
                  x1={endProj.x}
                  y1={0}
                  x2={endProj.x}
                  y2={height}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  className="pointer-events-none"
                />

                {/* 5. Start Point Circular Anchor Dot on Curve with Drag Handle */}
                <circle
                  cx={startProj.x}
                  cy={startProj.y}
                  r={activeDragHandle === 'start' ? 6 : 4.5}
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: activeDragHandle ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => handleHandlePointerDown('start', e)}
                  onPointerUp={handleHandlePointerUp}
                />

                {/* 6. End Point Circular Anchor Dot on Curve with Drag Handle */}
                <circle
                  cx={endProj.x}
                  cy={endProj.y}
                  r={activeDragHandle === 'end' ? 6 : 4.5}
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: activeDragHandle ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => handleHandlePointerDown('end', e)}
                  onPointerUp={handleHandlePointerUp}
                />
              </g>
            );
          })()}

          {/* Active Drawing Preview (Live inline curve + vertical crosshairs + shaded area) */}
          {isDrawing && drawingStart && hoverPoint && (() => {
            const pStart = drawingStart.time <= hoverPoint.time ? drawingStart : hoverPoint;
            const pEnd = drawingStart.time <= hoverPoint.time ? hoverPoint : drawingStart;

            const startProj = projectPointToScreen(pStart);
            const endProj = projectPointToScreen(pEnd);
            if (!startProj || !endProj) return null;

            const priceDiff = pEnd.price - pStart.price;
            const isUp = priceDiff >= 0;
            const previewColor = isUp ? '#16B85A' : '#eb5b3c';
            const areaFillColor = isUp ? 'rgba(22, 184, 90, 0.16)' : 'rgba(235, 91, 60, 0.16)';

            const sliceData = getSelectionSlicePath(pStart.time, pEnd.time);

            return (
              <g className="drawing-preview pointer-events-none">
                {sliceData && (
                  <path d={sliceData.areaD} fill={areaFillColor} />
                )}
                {sliceData && (
                  <path
                    d={sliceData.curveD}
                    stroke={previewColor}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <line
                  x1={startProj.x}
                  y1={0}
                  x2={startProj.x}
                  y2={height}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <line
                  x1={endProj.x}
                  y1={0}
                  x2={endProj.x}
                  y2={height}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={startProj.x}
                  cy={startProj.y}
                  r={4.5}
                  fill={previewColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <circle
                  cx={endProj.x}
                  cy={endProj.y}
                  r={4.5}
                  fill={previewColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </g>
            );
          })()}

          {/* Magnet Snapping Indicator during drawing */}
          {isDrawing && hoverPoint && (
            <g>
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={6}
                fill="#16B85A"
                fillOpacity={0.25}
                stroke="#16B85A"
                strokeWidth={1.5}
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={3.5}
                fill="#16B85A"
              />
              <g transform={`translate(${hoverPoint.x}, ${hoverPoint.y < 35 ? (hoverPoint.y + 20) : Math.max(hoverPoint.y - 20, 15)})`}>
                <rect
                  x={-45}
                  y={-9}
                  width={90}
                  height={18}
                  rx={4}
                  fill={isDark ? '#1e293b' : '#ffffff'}
                  stroke={isDark ? '#334155' : '#16B85A'}
                  strokeWidth={1}
                  fillOpacity={0.95}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill={isDark ? '#38bdf8' : '#16B85A'}
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {typeof hoverPoint.price === 'number' ? hoverPoint.price.toFixed(2) : hoverPoint.price} • {hoverPoint.date}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card for Selected Points (Tickertape Style) */}
        {(trendline || (isDrawing && drawingStart && hoverPoint)) && (() => {
          const ptA = trendline 
            ? (trendline.start.time <= trendline.end.time ? trendline.start : trendline.end) 
            : (drawingStart.time <= hoverPoint.time ? drawingStart : hoverPoint);
          const ptB = trendline 
            ? (trendline.start.time <= trendline.end.time ? trendline.end : trendline.start) 
            : (drawingStart.time <= hoverPoint.time ? hoverPoint : drawingStart);

          const startProj = projectPointToScreen(ptA);
          if (!startProj) return null;

          const priceDiff = ptB.price - ptA.price;
          const pct = ptA.price > 0 ? ((priceDiff / ptA.price) * 100).toFixed(2) : '0.00';
          const isUp = priceDiff >= 0;
          const dateRangeLabel = formatSelectionDateRange(ptA, ptB, chartInterval);

          const cardX = Math.min(Math.max(startProj.x + 6, 12), (chartContainerRef.current?.clientWidth || 500) - 180);
          const isNearTop = startProj.y < 70;
          const cardY = isNearTop 
            ? Math.min(startProj.y + 16, height - 75) 
            : Math.max(10, startProj.y - 68);

          return (
            <div
              style={{
                position: 'absolute',
                left: `${cardX}px`,
                top: `${cardY}px`,
                zIndex: 35
              }}
              onClick={(e) => e.stopPropagation()}
              className={`${
                isDark ? 'bg-slate-800/98 border-slate-700 text-slate-100' : 'bg-white/98 border-slate-200 text-slate-900'
              } dark:bg-slate-800/98 dark:border-slate-700 dark:text-slate-100 backdrop-blur-md border ${
                isUp ? 'border-emerald-300 dark:border-emerald-700' : 'border-rose-300 dark:border-rose-700'
              } rounded-lg px-3 py-2 shadow-xl select-none pointer-events-auto`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs sm:text-sm font-extrabold font-mono tracking-tight ${isUp ? 'text-[#16B85A]' : 'text-[#eb5b3c]'}`}>
                  {isUp ? '▲ +' : '▼ '}{Math.abs(priceDiff).toFixed(2)} ({isUp ? '+' : ''}{pct}%)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearTrendline();
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors -mr-1 cursor-pointer"
                  title="Clear selection"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="text-[11px] text-[#64748b] dark:text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                {dateRangeLabel}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Dynamic Date-Axis Divisions & Colored Timeline Segments Bar with Ticks (Tickertape Style, Edge-to-Edge Aligned) */}
      {uniqueCandles.length > 0 && (
        <div className="w-full px-0 pt-0.5 pb-1 select-none">
          {/* Segmented Line with Vertical Ticks */}
          <div className="relative w-full h-8">
            <svg className="w-full h-3 overflow-visible">
              {/* Segments: colored lines connecting each division to the next */}
              {segments.map((seg, idx) => {
                const isHovered = hoveredPeriod?.segmentIndex === idx;
                const segX1 = getDivisionPct(idx);
                const segX2 = getDivisionPct(idx + 1);
                return (
                  <line
                    key={`seg-line-${idx}`}
                    x1={`${segX1}%`}
                    y1="6"
                    x2={`${segX2}%`}
                    y2="6"
                    stroke={seg.color}
                    strokeWidth={isHovered ? 4 : 3}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => activateSegmentByIndex(idx)}
                    onClick={() => activateSegmentByIndex(idx)}
                  />
                );
              })}

              {/* Vertical Tick Marks at each division marker */}
              {divisions.map((div, idx) => {
                const tickPct = getDivisionPct(idx);
                const tickColor = segments[idx]?.color || segments[idx - 1]?.color || '#94a3b8';
                return (
                  <line
                    key={`div-tick-${idx}`}
                    x1={`${tickPct}%`}
                    y1="0"
                    x2={`${tickPct}%`}
                    y2="8"
                    stroke={tickColor}
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>

            {/* Division Labels aligned directly beneath vertical ticks */}
            <div className="relative w-full h-5 text-[11px] font-medium text-[#64748b] dark:text-slate-400">
              {divisions.map((div, idx) => {
                const tickPct = getDivisionPct(idx);
                let alignClass = '-translate-x-1/2';
                if (idx === 0) alignClass = 'translate-x-0';
                else if (idx === divisions.length - 1 || tickPct >= 95) alignClass = '-translate-x-full';

                return (
                  <span
                    key={`div-lbl-${idx}`}
                    style={{ left: `${Math.min(Math.max(tickPct, 0), 100)}%` }}
                    className={`absolute top-0 select-none transform ${alignClass} whitespace-nowrap`}
                  >
                    {div.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls: Time-Range Buttons with Dividers + Advanced Chart link (Desktop / Laptop View) */}
      <div className="hidden md:flex flex-col items-center justify-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
        {/* Rounded Timeframe Selector Bar with subtle dividers & active white pill */}
        <div className="inline-flex items-center bg-[#f8fafc] dark:bg-slate-800 p-1 rounded-xl border border-slate-200/90 dark:border-slate-700 divide-x divide-slate-200/80 dark:divide-slate-700 shadow-2xs">
          {timeRanges.map(tf => {
            const isActive = chartInterval.toLowerCase() === tf.val || (tf.val === '1m' && chartInterval.toLowerCase() === '1mo');
            return (
              <button
                key={tf.val}
                onClick={() => {
                  setChartInterval(tf.val);
                  setHoveredPeriod(null);
                  setHoveredSipPoint(null);
                  setTrendline(null);
                  setIsDrawing(false);
                }}
                className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm rounded-lg font-extrabold'
                    : 'text-[#2563eb] dark:text-blue-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-blue-800 dark:hover:text-blue-300'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* Advanced Chart Button */}
        <button
          onClick={() => {
            if (effectiveType === 'stock') {
              setChartType(chartType === 'candle' ? 'area' : 'candle');
            }
          }}
          className="text-xs font-semibold text-[#64748b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors mt-0.5"
        >
          <span>📊</span> Advanced Chart &gt;
        </button>
      </div>

      {/* Mobile-Only Advanced Chart Link (Stock mode) */}
      {effectiveType === 'stock' && (
        <div className="flex md:hidden items-center justify-center pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
          <button
            onClick={() => setChartType(chartType === 'candle' ? 'area' : 'candle')}
            className="text-xs font-semibold text-[#64748b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>📊</span> Advanced Chart &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default TradingViewChart;
