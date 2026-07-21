import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, TrendingUp, TrendingDown, ShieldAlert, Zap, Flame, BarChart3, HelpCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setActiveSymbol } from '../store/slices/marketSlice.js';

export const AIInsights = ({ setActiveTab }) => {
  const dispatch = useDispatch();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/ai/insights');
      setInsights(res.data);
    } catch (err) {
      console.error('Error fetching AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleStockClick = (symbol) => {
    dispatch(setActiveSymbol(symbol));
    setActiveTab('stock-details');
  };

  if (!insights) return <div className="p-8 text-center text-slate-500 font-mono">Running AI scanners...</div>;

  const { sentiment, riskScore, strongestSector, weakestSector, volumeShockers, breakoutCandidates, summary } = insights;

  // Determine sentiment color details
  const isBullish = sentiment === 'Bullish';
  const isBearish = sentiment === 'Bearish';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
          <Sparkles className="text-emerald-400 w-6 h-6 animate-pulse" /> AI Market Terminal
        </h2>
        <p className="text-xs text-slate-400">Intelligent scanning for breakout candidates, unusual volume spikes, volatility indicators, and sentiment summaries.</p>
      </div>

      {/* Sentiment Gauge & Risk Indicator Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Gauge */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-3 mb-4">Overall Market Sentiment</h3>
            <p className="text-xs text-slate-400 mb-6">Calculated using advanced advance/decline participations and index volume weights.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-mono font-bold">
              <span className="text-rose-400">BEARISH</span>
              <span className="text-slate-400 text-sm">NEUTRAL</span>
              <span className="text-emerald-400">BULLISH</span>
            </div>
            
            {/* Slider track */}
            <div className="w-full h-3 bg-slate-950 rounded-full relative overflow-hidden border border-slate-900">
              <div
                style={{
                  left: isBullish ? '75%' : (isBearish ? '15%' : '47%'),
                  transition: 'left 0.5s ease-in-out'
                }}
                className={`w-6 h-6 rounded-full absolute -top-1.5 -ml-3 cursor-pointer shadow-lg border border-white ${
                  isBullish ? 'bg-emerald-500 glow-green' : (isBearish ? 'bg-rose-500 glow-red' : 'bg-slate-400')
                }`}
              />
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Active Sentiment: </span>
              <span className={`text-base font-display font-extrabold uppercase ${
                isBullish ? 'text-emerald-400' : (isBearish ? 'text-rose-400' : 'text-slate-300')
              }`}>
                {sentiment}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Score Gauge */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-3 mb-4">Volatility Risk Score</h3>
            <p className="text-xs text-slate-400 mb-6">Derived from India VIX ticks. Higher scores indicate extreme swings; low scores suggest consolidation.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Risk Level</span>
                <span className={`text-3xl font-display font-extrabold ${
                  riskScore > 65 ? 'text-rose-500' : (riskScore > 35 ? 'text-yellow-400' : 'text-emerald-400')
                }`}>
                  {riskScore} / 100
                </span>
              </div>
              
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                riskScore > 65 ? 'bg-rose-950 text-rose-400' : (riskScore > 35 ? 'bg-yellow-950 text-yellow-400' : 'bg-emerald-950 text-emerald-400')
              }`}>
                {riskScore > 65 ? 'HIGH RISK' : (riskScore > 35 ? 'MODERATE' : 'LOW RISK')}
              </span>
            </div>

            {/* Progress indicator */}
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${riskScore}%` }}
                className={`h-full transition-all duration-500 ${
                  riskScore > 65 ? 'bg-rose-500 glow-red' : (riskScore > 35 ? 'bg-yellow-500' : 'bg-emerald-500 glow-green')
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sector Rotations & AI Narrative Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Narrative Box */}
        <div className="lg:col-span-2 glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
          <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Sparkles className="text-emerald-400 w-4.5 h-4.5" /> AI Market Intelligence Report
          </h3>
          
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            {summary}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-800/60 pt-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <TrendingUp className="text-emerald-400 w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Strongest Sector</span>
                <span className="text-sm font-bold text-slate-200">{strongestSector}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                <TrendingDown className="text-rose-400 w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Weakest Sector</span>
                <span className="text-sm font-bold text-slate-200">{weakestSector}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Scanner Warnings */}
        <div className="lg:col-span-1 glass-card p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-3 flex items-center gap-1.5">
            <ShieldAlert className="text-yellow-500 w-4.5 h-4.5" /> Risk Scan Warnings
          </h3>

          <div className="space-y-3 text-xs leading-normal">
            <div className="p-3 bg-rose-950/15 border border-rose-900/20 rounded-lg text-rose-300">
              <strong>VIX Spike Warning:</strong> A minor spike in volatility indexes indicates distribution near intraday resistance levels. Proceed with tight stop losses on momentum longs.
            </div>
            
            <div className="p-3 bg-yellow-950/15 border border-yellow-900/20 rounded-lg text-yellow-300">
              <strong>Support Check:</strong> Sectors like Real Estate and Metals are approaching weekly support (S1) targets. Volume scanners indicate potential consolidation rebounds.
            </div>
          </div>
        </div>
      </div>

      {/* SCANNERS TAB-GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Breakout candidates */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Flame className="text-amber-500 w-4.5 h-4.5" /> 52-Week Breakout Candidates
          </h3>
          
          {breakoutCandidates.length > 0 ? (
            <div className="space-y-3">
              {breakoutCandidates.map(c => (
                <div
                  key={c.symbol}
                  onClick={() => handleStockClick(c.symbol)}
                  className="flex justify-between items-center p-3 bg-slate-950/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer rounded-lg transition-all"
                >
                  <div>
                    <span className="font-mono font-bold text-sm text-white block">{c.symbol}</span>
                    <span className="text-[10px] text-slate-500 block">Approaching 52W High</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-white block">Price: ₹{c.currentPrice}</span>
                    <span className="text-[10px] text-slate-500 block">52W Max: ₹{c.high52}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono block text-center py-6">Searching breakout channels...</span>
          )}
        </div>

        {/* Volume shockers */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-base text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Zap className="text-cyan-400 w-4.5 h-4.5" /> Volume Shocker Scanner
          </h3>

          {volumeShockers.length > 0 ? (
            <div className="space-y-3">
              {volumeShockers.map(s => (
                <div
                  key={s.symbol}
                  onClick={() => handleStockClick(s.symbol)}
                  className="flex justify-between items-center p-3 bg-slate-950/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer rounded-lg transition-all"
                >
                  <div>
                    <span className="font-mono font-bold text-sm text-white block">{s.symbol}</span>
                    <span className="text-[10px] text-slate-500 block">Volume Multiplier</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-cyan-400 font-bold block">{s.ratio}x Avg Vol</span>
                    <span className={`text-[10px] font-bold ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {s.changePercent >= 0 ? '+' : ''}{s.changePercent}% price move
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono block text-center py-6">Scanning volume breakouts...</span>
          )}
        </div>
      </div>
    </div>
  );
};
export default AIInsights;
