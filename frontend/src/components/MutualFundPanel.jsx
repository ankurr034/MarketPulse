import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveSymbol } from '../store/slices/marketSlice';
import { createChart } from 'lightweight-charts';
import { Search, X, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';
import MfInvestmentCalculator from './MfInvestmentCalculator';
import TimeframeSelector from './TimeframeSelector';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MutualFundPanel({ initialScheme = null, region = 'india' }) {
  const dispatch = useDispatch();
  const { activeMfScheme } = useSelector(state => state.market);
  
  const [scheme, setScheme] = useState(initialScheme);
  const [navData, setNavData] = useState([]);
  const [earliestDate, setEarliestDate] = useState(null);
  const [holdingsData, setHoldingsData] = useState(null);
  
  const [chartInterval, setChartInterval] = useState('1yr');
  const [chartType, setChartType] = useState('line');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const debounceRef = useRef(null);

  // Load scheme details if activeMfScheme or initialScheme changes
  useEffect(() => {
    if (activeMfScheme) {
      loadScheme(activeMfScheme);
    } else if (initialScheme) {
      loadScheme(initialScheme.schemeCode || initialScheme.id);
    }
  }, [activeMfScheme, initialScheme]);

  const loadScheme = async (code) => {
    try {
      // If we don't have the scheme details, search it to get the name
      let schemeName = 'Loading...';
      const searchRes = await axios.get(`${API_BASE}/mf/search?q=${code}&region=${region}`);
      const found = searchRes.data.find(s => String(s.schemeCode || s.id) === String(code));
      if (found) {
        schemeName = found.name || found.schemeName;
        setScheme(found);
      } else {
        setScheme({ schemeCode: code, id: code, schemeName: `Scheme ${code}`, name: `Scheme ${code}`, region });
      }
      
      // Fetch holdings/profile
      const holdingsRes = await axios.get(`${API_BASE}/mf/${region}/${code}/profile`);
      setHoldingsData(holdingsRes.data);
      
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch NAV history when scheme or interval changes
  useEffect(() => {
    if (!scheme) return;
    
    const fetchNav = async () => {
      try {
        const code = scheme.schemeCode || scheme.id;
        const schemeRegion = scheme.region || region;
        const res = await axios.get(`${API_BASE}/mf/${schemeRegion}/${code}/nav?range=${encodeURIComponent(chartInterval)}`);
        if (res.headers['x-earliest-date']) {
          setEarliestDate(Number(res.headers['x-earliest-date']));
        }
        setNavData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNav();
  }, [scheme, chartInterval]);

  // Handle Search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/mf/search?q=${encodeURIComponent(searchQuery.trim())}&region=${region}`);
        setSearchResults(res.data.slice(0, 10)); // limit to 10 for UI
      } catch (err) {
        console.error(err);
      }
      setSearching(false);
    }, 500);
  }, [searchQuery]);

  // Construct Chart
  useEffect(() => {
    if (!chartContainerRef.current || navData.length === 0) return;

    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 380,
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
            chartRef.current.resize(entry.contentRect.width, 380);
          }
        }
      });
      
      resizeObserver.observe(chartContainerRef.current);
      
      // Store observer to clean up later
      chartRef.current.observer = resizeObserver;
    }
    
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    if (chartType === 'candlestick') {
      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
    } else {
      seriesRef.current = chartRef.current.addAreaSeries({
        lineColor: '#3b82f6',
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
      });
    }
    
    if (seriesRef.current) {
      const uniqueData = navData.filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);
      if (chartType === 'candlestick') {
        seriesRef.current.setData(uniqueData.map(d => ({
          time: Math.floor(d.time / 1000),
          open: d.value,
          high: d.value,
          low: d.value,
          close: d.value
        })));
      } else {
        seriesRef.current.setData(uniqueData.map(d => ({
          time: Math.floor(d.time / 1000),
          value: d.value
        })));
      }
      chartRef.current.timeScale().fitContent();
    }
    
  }, [navData, chartType]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        if (chartRef.current.observer) {
          chartRef.current.observer.disconnect();
        }
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Search Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl flex items-center gap-4 relative z-20">
        <div className="flex-1 max-w-xl relative">
          <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] px-3 py-2">
            <Search size={16} className="text-[var(--text-muted)] mr-2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Mutual Funds (e.g. Parag Parikh Flexi Cap)..."
              className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-2">
                <X size={14} />
              </button>
            )}
          </div>
          
          {searchQuery.length >= 3 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-sm text-[var(--text-muted)]">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-sm text-[var(--text-muted)]">No schemes found.</div>
              ) : (
                searchResults.map(s => (
                  <button 
                    key={s.schemeCode || s.id}
                    onClick={() => {
                      setScheme(s);
                      setSearchQuery('');
                      setNavData([]);
                      setEarliestDate(null);
                      setHoldingsData(null);
                      loadScheme(s.schemeCode || s.id);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex flex-col"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">{s.schemeName || s.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{s.fundHouse || s.family} • Code: {s.schemeCode || s.id}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {!scheme ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl flex flex-col items-center justify-center text-[var(--text-muted)] gap-4">
          <PieChartIcon size={48} className="opacity-20" />
          <p>Search and select a mutual fund to view its portfolio and NAV history.</p>
        </div>
      ) : (
        <>
          {/* Main Chart Area */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-4 z-10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{scheme.schemeName}</h2>
                <p className="text-sm text-[var(--text-muted)]">Code: {scheme.schemeCode}</p>
              </div>
              
              <div className="flex items-center">
              <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 border border-[var(--border-color)] rounded-md mr-2">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded ${
                    chartType === 'line' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('candlestick')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded ${
                    chartType === 'candlestick' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Candlesticks
                </button>
              </div>

              <TimeframeSelector
                activeRange={chartInterval}
                onChange={setChartInterval}
                earliestDate={earliestDate}
              />
              </div>
            </div>
            
            <div className="w-full relative bg-slate-900 rounded-lg overflow-hidden">
              {navData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)] z-10">
                  Loading NAV data...
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-[380px]" />
            </div>
          </div>

          {/* Interactive Calculator */}
          {navData && navData.length > 0 && (
            <MfInvestmentCalculator 
              navData={navData} 
              currency={scheme.currency || (region === 'global' ? 'USD' : 'INR')} 
            />
          )}

          {/* Holdings Area */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center">
              <h3 className="font-semibold text-[var(--text-primary)]">Portfolio Holdings</h3>
              {holdingsData?.asOfDate && (
                <span className="text-xs text-[var(--text-muted)]">As of {holdingsData.asOfDate}</span>
              )}
            </div>
            
            {!holdingsData ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-sm">Loading portfolio...</div>
            ) : !holdingsData.available ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-sm">Holdings data not available for this scheme.</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-card)] sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-5 py-3 text-[var(--text-muted)] font-medium">Stock/Asset</th>
                      <th className="px-5 py-3 text-[var(--text-muted)] font-medium">Sector</th>
                      <th className="px-5 py-3 text-[var(--text-muted)] font-medium text-right">LTP (Change)</th>
                      <th className="px-5 py-3 text-[var(--text-muted)] font-medium text-right">Allocation (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {holdingsData.holdings.map((h, i) => {
                      const hasQuote = h.ltp !== undefined;
                      const isUp = hasQuote && h.changePercent > 0;
                      const isDown = hasQuote && h.changePercent < 0;

                      return (
                        <tr 
                          key={i} 
                          onClick={() => {
                            if (h.symbol) {
                              dispatch(setActiveSymbol(h.symbol));
                            }
                          }}
                          className={`transition-colors ${h.symbol ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]/50'}`}
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium text-[var(--text-primary)]">{h.stock}</div>
                            {h.symbol && <div className="text-xs text-[var(--text-muted)]">{h.symbol}</div>}
                          </td>
                          <td className="px-5 py-3 text-[var(--text-muted)] text-xs">{h.sector}</td>
                          <td className="px-5 py-3 text-right">
                            {hasQuote ? (
                              <div>
                                <div className="font-mono text-sm font-medium text-[var(--text-primary)]">
                                  {holdingsData?.currency === 'USD' ? '$' : holdingsData?.currency === 'EUR' ? '€' : holdingsData?.currency === 'GBP' ? '£' : '₹'}
                                  {h.ltp?.toLocaleString(holdingsData?.currency === 'USD' ? 'en-US' : 'en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className={`flex items-center justify-end gap-0.5 font-mono text-xs ${isUp ? 'text-gain' : isDown ? 'text-loss' : 'text-[var(--text-muted)]'}`}>
                                  {isUp ? <ArrowUpRight size={12} /> : isDown ? <ArrowDownRight size={12} /> : null}
                                  {isUp ? '+' : ''}{h.changePercent?.toFixed(2)}%
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-[var(--text-muted)]">—</div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[var(--text-primary)] font-medium">{h.allocationPct.toFixed(2)}%</span>
                              <div className="w-16 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${h.allocationPct}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
