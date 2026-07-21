import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MfAnalytics() {
  const { sectors, indices } = useSelector(state => state.market);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE}/portfolio/mf/analytics`);
        setAnalytics(response.data);
      } catch (err) {
        console.log(err);
        console.log(err.message);
        console.log(err.response);
        console.log(err.request);
        
        let errorMessage = 'Failed to load mutual fund analytics. Please try again.';
        if (err.response) {
          errorMessage = `Server Error (${err.response.status}): ${err.response.data?.error || 'Unknown error occurred'}`;
        } else if (err.request) {
          errorMessage = 'Network Error: Could not reach the server. Please check your connection or try again later.';
        }
        
        setError(errorMessage);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Map MF sectors to market sectors for growth comparison
  // 'Financial' -> 'Financials', etc.
  const mapSectorToMarket = (mfSectorName) => {
    const normalized = mfSectorName.toLowerCase();
    return sectors.find(s => 
      s.name.toLowerCase().includes(normalized) || 
      normalized.includes(s.name.toLowerCase()) ||
      (normalized === 'financial' && s.name.toLowerCase() === 'financials') ||
      (normalized === 'energy' && s.name.toLowerCase() === 'energy') ||
      (normalized === 'technology' && s.name.toLowerCase() === 'information technology')
    );
  };

  const mainIndices = Object.values(indices).filter(idx => 
    ['NIFTY 50', 'SENSEX', 'NIFTY BANK', 'NIFTY MIDCAP 50'].includes(idx.name) ||
    (idx.symbol && (idx.symbol.includes('NSEI') || idx.symbol.includes('BSESN')))
  ).slice(0, 4);

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Sector Exposure vs Growth */}
      <div className="flex-[2] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-2">
          <PieChartIcon size={18} className="text-blue-500" />
          <h3 className="font-semibold text-[var(--text-primary)]">Sector Exposure & Growth</h3>
        </div>
        
        <div className="p-5 flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-48 text-[var(--text-muted)] text-sm">
              Analyzing portfolio...
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-48 text-rose-500 text-sm gap-2">
              <Activity size={24} className="opacity-50" />
              <p>{error}</p>
            </div>
          ) : !analytics || !analytics.sectorAllocation || analytics.sectorAllocation.length === 0 ? (
            <div className="flex justify-center items-center h-48 text-[var(--text-muted)] text-sm">
              No mutual fund holdings found to analyze.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-[var(--text-muted)] mb-4">
                Your mutual funds are exposed to the following sectors. The right column shows how that sector is performing in the market today.
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {analytics.sectorAllocation.map((s, i) => {
                  const marketSector = mapSectorToMarket(s.sector);
                  const isGrowing = marketSector && marketSector.change >= 0;
                  
                  return (
                    <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-[var(--text-primary)] text-sm">{s.sector}</div>
                        
                        <div className="flex items-center gap-3">
                          {/* User's Exposure */}
                          <div className="text-right">
                            <div className="text-xs text-[var(--text-muted)]">Exposure</div>
                            <div className="text-sm font-bold text-blue-400">{s.allocationPct.toFixed(1)}%</div>
                          </div>
                          
                          {/* Live Market Growth */}
                          <div className="w-px h-8 bg-[var(--border-color)]"></div>
                          <div className="text-right w-20">
                            <div className="text-xs text-[var(--text-muted)]">Today's Growth</div>
                            {marketSector ? (
                              <div className={`text-sm font-bold flex items-center justify-end gap-1 ${isGrowing ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isGrowing ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                                {marketSector.changePercent > 0 ? '+' : ''}{marketSector.changePercent.toFixed(2)}%
                              </div>
                            ) : (
                              <div className="text-sm text-[var(--text-muted)]">N/A</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Visual Bar */}
                      <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mt-1 border border-[var(--border-color)]">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.allocationPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Benchmarks */}
      <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-2">
          <Activity size={18} className="text-purple-500" />
          <h3 className="font-semibold text-[var(--text-primary)]">Market Benchmarks</h3>
        </div>
        
        <div className="p-5 flex-1 flex flex-col gap-3">
          <p className="text-sm text-[var(--text-muted)] mb-2">Compare your portfolio's performance against major indices.</p>
          
          {mainIndices.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] flex-1 flex items-center justify-center">Loading indices...</div>
          ) : (
            mainIndices.map((idx, i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">{idx.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{idx.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-medium text-[var(--text-primary)]">
                    ₹{idx.price?.toLocaleString('en-IN') || idx.ltp?.toLocaleString('en-IN')}
                  </div>
                  <div className={`text-sm flex items-center justify-end gap-1 ${idx.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {idx.changePercent >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                    {idx.changePercent > 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
