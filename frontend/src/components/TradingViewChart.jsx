import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import axios from 'axios';
import { Eye, EyeOff, BarChart2 } from 'lucide-react';
import TimeframeSelector from './TimeframeSelector';

export const TradingViewChart = ({ symbol, socket }) => {
  const [chartInterval, setChartInterval] = useState('1yr'); // default to 1yr for consistency
  const [candles, setCandles] = useState([]);
  const [earliestDate, setEarliestDate] = useState(null);
  const [chartType, setChartType] = useState('candle'); // 'candle' | 'area'
  
  // Indicators toggle state
  const [indicators, setIndicators] = useState({
    sma: false,
    ema: true,
    vwap: false,
    bb: false,
    subChart: 'rsi' // 'rsi' | 'macd' | 'none'
  });

  const chartContainerRef = useRef(null);
  const subChartContainerRef = useRef(null);

  const mainChartRef = useRef(null);
  const subChartRef = useRef(null);
  
  // Series refs
  const candleSeriesRef = useRef(null);
  const smaSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const vwapSeriesRef = useRef(null);
  const bbUpperSeriesRef = useRef(null);
  const bbLowerSeriesRef = useRef(null);

  // Sub-series refs
  const rsiSeriesRef = useRef(null);
  const macdSeriesRef = useRef(null);
  const macdSignalSeriesRef = useRef(null);
  const macdHistSeriesRef = useRef(null);

  // Fetch initial candles
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const res = await axios.get(`/api/stocks/${encodeURIComponent(symbol)}/chart?interval=${encodeURIComponent(chartInterval)}`);
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

  // Handle WebSocket updates
  useEffect(() => {
    if (!socket || !candleSeriesRef.current) return;

    const eventName = `candle_update_${chartInterval}`;
    
    const handleCandleUpdate = (updatedCandle) => {
      // Format time correctly
      const formattedCandle = {
        time: updatedCandle.time / 1000,
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

      // Dynamically update lines if indicators are turned on
      if (indicators.sma && smaSeriesRef.current && updatedCandle.sma) {
        smaSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.sma });
      }
      if (indicators.ema && emaSeriesRef.current && updatedCandle.ema) {
        emaSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.ema });
      }
      if (indicators.vwap && vwapSeriesRef.current && updatedCandle.vwap) {
        vwapSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.vwap });
      }
      if (indicators.bb && bbUpperSeriesRef.current && updatedCandle.bbUpper) {
        bbUpperSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.bbUpper });
        bbLowerSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.bbLower });
      }

      // Sub-chart updates
      if (indicators.subChart === 'rsi' && rsiSeriesRef.current && updatedCandle.rsi) {
        rsiSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.rsi });
      } else if (indicators.subChart === 'macd' && macdSeriesRef.current) {
        if (updatedCandle.macd) macdSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.macd });
        if (updatedCandle.macdSignal) macdSignalSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.macdSignal });
        if (updatedCandle.macdHist) macdHistSeriesRef.current.update({ time: formattedCandle.time, value: updatedCandle.macdHist });
      }
    };

    socket.on(eventName, handleCandleUpdate);

    return () => {
      socket.off(eventName, handleCandleUpdate);
    };
  }, [socket, chartInterval, indicators, chartType]);

  // Construct charts
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // 1. Create Main Price Chart
    const mainChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
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

    let mainSeries;
    
    // Sort, deduplicate, and round times
    const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
    const uniqueCandles = sortedCandles.filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);
    
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
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
      });
      mainSeries.setData(uniqueCandles.map(c => ({
        time: Math.floor(c.time / 1000),
        value: c.close
      })));
    }
    candleSeriesRef.current = mainSeries;

    // 2. Indicators: SMA
    if (indicators.sma) {
      const smaSeries = mainChart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'SMA 20' });
      smaSeriesRef.current = smaSeries;
      smaSeries.setData(uniqueCandles.filter(c => c.sma !== undefined).map(c => ({ time: Math.floor(c.time / 1000), value: c.sma })));
    }

    // Indicators: EMA
    if (indicators.ema) {
      const emaSeries = mainChart.addLineSeries({ color: '#8b5cf6', lineWidth: 1.5, title: 'EMA 20' });
      emaSeriesRef.current = emaSeries;
      emaSeries.setData(uniqueCandles.filter(c => c.ema !== undefined).map(c => ({ time: Math.floor(c.time / 1000), value: c.ema })));
    }

    // Indicators: VWAP
    if (indicators.vwap) {
      const vwapSeries = mainChart.addLineSeries({ color: '#06b6d4', lineWidth: 1.5, title: 'VWAP' });
      vwapSeriesRef.current = vwapSeries;
      vwapSeries.setData(uniqueCandles.filter(c => c.vwap !== undefined).map(c => ({ time: Math.floor(c.time / 1000), value: c.vwap })));
    }

    // Indicators: Bollinger Bands
    if (indicators.bb) {
      const upper = mainChart.addLineSeries({ color: '#3b82f6', lineWidth: 1, lineStyle: 1, title: 'BB Upper' });
      const lower = mainChart.addLineSeries({ color: '#3b82f6', lineWidth: 1, lineStyle: 1, title: 'BB Lower' });
      bbUpperSeriesRef.current = upper;
      bbLowerSeriesRef.current = lower;
      
      upper.setData(uniqueCandles.filter(c => c.bbUpper !== undefined).map(c => ({ time: Math.floor(c.time / 1000), value: c.bbUpper })));
      lower.setData(uniqueCandles.filter(c => c.bbLower !== undefined).map(c => ({ time: Math.floor(c.time / 1000), value: c.bbLower })));
    }

    // 3. Create Sub-Chart (RSI/MACD)
    let subChart;
    if (indicators.subChart !== 'none' && subChartContainerRef.current) {
      subChart = createChart(subChartContainerRef.current, {
        width: subChartContainerRef.current.clientWidth,
        height: 140,
        layout: {
          background: { color: '#0f172a' },
          textColor: '#94a3b8',
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
          visible: false, // Hide sub-chart timescale, synchronize with main instead
        },
      });
      subChartRef.current = subChart;

      if (indicators.subChart === 'rsi') {
        const rsiSeries = subChart.addLineSeries({ color: '#ec4899', lineWidth: 1.5, title: 'RSI 14' });
        rsiSeriesRef.current = rsiSeries;
        rsiSeries.setData(uniqueCandles.map(c => ({ time: Math.floor(c.time / 1000), value: c.rsi || 50 })));
        
        // Add RSI 30/70 boundary lines
        const line30 = subChart.addLineSeries({ color: '#475569', lineWidth: 1, lineStyle: 2 });
        const line70 = subChart.addLineSeries({ color: '#475569', lineWidth: 1, lineStyle: 2 });
        line30.setData(uniqueCandles.map(c => ({ time: Math.floor(c.time / 1000), value: 30 })));
        line70.setData(uniqueCandles.map(c => ({ time: Math.floor(c.time / 1000), value: 70 })));
      } else if (indicators.subChart === 'macd') {
        const macdLine = subChart.addLineSeries({ color: '#3b82f6', lineWidth: 1.5, title: 'MACD' });
        const signalLine = subChart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'Signal' });
        const histLine = subChart.addHistogramSeries({
          color: '#10b981',
          base: 0
        });

        macdSeriesRef.current = macdLine;
        macdSignalSeriesRef.current = signalLine;
        macdHistSeriesRef.current = histLine;

        macdLine.setData(uniqueCandles.map(c => ({ time: Math.floor(c.time / 1000), value: c.macd || 0 })));
        signalLine.setData(uniqueCandles.map(c => ({ time: Math.floor(c.time / 1000), value: c.macdSignal || 0 })));
        histLine.setData(uniqueCandles.map(c => ({
          time: Math.floor(c.time / 1000),
          value: c.macdHist || 0,
          color: (c.macdHist || 0) >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(244, 63, 94, 0.5)'
        })));
      }

      // Synchronize visible ranges
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        subChart.timeScale().setVisibleLogicalRange(range);
      });
      subChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        mainChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    // Resize Handler using ResizeObserver for better responsiveness
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        if (entry.target === chartContainerRef.current) {
          mainChart.resize(width, 380);
        } else if (entry.target === subChartContainerRef.current && subChart) {
          subChart.resize(width, 140);
        }
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    if (subChartContainerRef.current) {
      resizeObserver.observe(subChartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
      if (subChart) subChart.remove();
    };
  }, [candles, indicators.sma, indicators.ema, indicators.vwap, indicators.bb, indicators.subChart, chartType]);

  const toggleIndicator = (ind) => {
    setIndicators(prev => ({ ...prev, [ind]: !prev[ind] }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-lg">
        <TimeframeSelector
          activeRange={chartInterval}
          onChange={setChartInterval}
          earliestDate={earliestDate}
          className="bg-slate-950 border-slate-800"
        />

        {/* Chart Type Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded-md">
          <button
            onClick={() => setChartType('candle')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
              chartType === 'candle' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Candles
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
              chartType === 'area' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Area
          </button>
        </div>

        {/* Indicators checklist */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={indicators.ema}
              onChange={() => toggleIndicator('ema')}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[#8b5cf6]">EMA(20)</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={indicators.sma}
              onChange={() => toggleIndicator('sma')}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[#f59e0b]">SMA(20)</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={indicators.vwap}
              onChange={() => toggleIndicator('vwap')}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[#06b6d4]">VWAP</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={indicators.bb}
              onChange={() => toggleIndicator('bb')}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[#3b82f6]">Bands</span>
          </label>

          <span className="h-4 w-[1px] bg-slate-800 mx-1"></span>

          {/* Subchart select */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-0.5 rounded-md">
            <button
              onClick={() => setIndicators(p => ({ ...p, subChart: 'rsi' }))}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                indicators.subChart === 'rsi' ? 'bg-slate-800 text-pink-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              RSI
            </button>
            <button
              onClick={() => setIndicators(p => ({ ...p, subChart: 'macd' }))}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                indicators.subChart === 'macd' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              MACD
            </button>
            <button
              onClick={() => setIndicators(p => ({ ...p, subChart: 'none' }))}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                indicators.subChart === 'none' ? 'bg-slate-800 text-slate-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Off
            </button>
          </div>
        </div>
      </div>

      {/* Main Candlestick Chart Canvas */}
      <div className="tv-lightweight-charts-container relative bg-slate-900 p-2.5">
        <div ref={chartContainerRef} className="w-full h-[380px]" />
      </div>

      {/* Synchronized Indicator Sub-Chart */}
      {indicators.subChart !== 'none' && (
        <div className="tv-lightweight-charts-container relative bg-slate-900 p-2.5">
          <div className="absolute top-2 left-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 z-10 flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-pink-400" />
            {indicators.subChart} panel
          </div>
          <div ref={subChartContainerRef} className="w-full h-[140px]" />
        </div>
      )}
    </div>
  );
};
export default TradingViewChart;
