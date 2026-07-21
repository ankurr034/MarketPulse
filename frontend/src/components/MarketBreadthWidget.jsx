import React from 'react';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, Flame, IceCream } from 'lucide-react';

export const MarketBreadthWidget = ({ breadth }) => {
  if (!breadth) return null;

  const { advances, declines, unchanged, advanceDeclineRatio, newHighs, newLows } = breadth;
  const total = advances + declines + unchanged;

  const advPct = total > 0 ? (advances / total) * 100 : 0;
  const decPct = total > 0 ? (declines / total) * 100 : 0;
  const uncPct = total > 0 ? (unchanged / total) * 100 : 0;

  return (
    <div className="glass-card p-6">
      <div className="border-b border-slate-800 pb-3 mb-5">
        <h3 className="font-display font-bold text-lg text-white">Market Breadth</h3>
        <p className="text-xs text-slate-400">Advances, declines, and overall market participation ratio.</p>
      </div>

      {/* Segmented Progress Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center text-xs text-slate-400 font-mono font-semibold">
          <span className="text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight className="w-3.5 h-3.5" /> Advances: {advances} ({advPct.toFixed(0)}%)
          </span>
          <span className="text-slate-400">Unchanged: {unchanged}</span>
          <span className="text-rose-400 flex items-center gap-0.5">
            Declines: {declines} ({decPct.toFixed(0)}%) <ArrowDownRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Bar */}
        <div className="w-full h-3.5 bg-slate-900 rounded-full flex overflow-hidden border border-slate-950">
          <div
            style={{ width: `${advPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-300 glow-green"
          />
          <div
            style={{ width: `${uncPct}%` }}
            className="bg-slate-700 h-full transition-all duration-300"
          />
          <div
            style={{ width: `${decPct}%` }}
            className="bg-rose-500 h-full transition-all duration-300 glow-red"
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {/* A/D Ratio */}
        <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">A/D Ratio</span>
          <span className={`text-xl font-display font-bold ${advanceDeclineRatio >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {advanceDeclineRatio}
          </span>
          <span className="text-[9px] text-slate-600 font-mono mt-0.5">
            {advanceDeclineRatio >= 1 ? 'Healthy Breadth' : 'Weak Breadth'}
          </span>
        </div>

        {/* 52W Highs */}
        <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5 block flex items-center gap-0.5">
            <Flame className="w-3 h-3 text-amber-500" /> 52W Highs
          </span>
          <span className="text-xl font-display font-bold text-white mt-0.5">
            {newHighs}
          </span>
          <span className="text-[9px] text-slate-600 font-mono mt-0.5">Stocks Breakout</span>
        </div>

        {/* 52W Lows */}
        <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5 block flex items-center gap-0.5">
            <ShieldCheck className="w-3 h-3 text-cyan-400" /> 52W Lows
          </span>
          <span className="text-xl font-display font-bold text-white mt-0.5">
            {newLows}
          </span>
          <span className="text-[9px] text-slate-600 font-mono mt-0.5">Near Support</span>
        </div>
      </div>
    </div>
  );
};
export default MarketBreadthWidget;
