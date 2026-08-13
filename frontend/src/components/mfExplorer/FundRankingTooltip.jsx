import React, { useState } from 'react';
import { Star, Award, ShieldCheck, TrendingUp, X, Info } from 'lucide-react';
import { RISK_FREE_RATE_CONFIG } from '../../config/riskFreeRate';

export default function FundRankingTooltip({ fund, rank }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!rank || rank > 3) return null;

  const sharpe = fund.sharpeRatio;
  const sortino = fund.sortinoRatio;
  const cagr = fund.returns?.['All'] ?? fund.sinceInceptionReturn;

  const hasHighSharpe = sharpe != null && sharpe >= 1.5;
  const hasHighSortino = sortino != null && sortino >= 2.0;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center gap-1 text-amber-400 font-extrabold hover:text-amber-300 transition-colors cursor-pointer"
        title="Click or hover to view Top 3 data breakdown"
      >
        <Star size={12} className="fill-amber-400 text-amber-400 animate-pulse" />
        <span>#{rank}</span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-6 z-50 w-80 bg-slate-900 border border-amber-500/40 rounded-xl p-3.5 shadow-2xl backdrop-blur bg-slate-900/95 text-slate-100 text-xs animate-in fade-in duration-150"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Award size={14} />
              <span>★ Top 3 Peer Rank (#{rank})</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
              <X size={12} />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
            Ranked <strong className="text-amber-400 font-semibold">#{rank}</strong> among {fund.subType || fund.type || 'category'} peers based on long-term CAGR, risk-adjusted performance (Sharpe & Sortino), and 1Y return.
          </p>

          <div className="space-y-1.5 text-[10px]">
            {cagr != null && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <TrendingUp size={11} className="text-emerald-400" />
                <span>Since Inception CAGR: <strong className="text-emerald-400 font-mono">{cagr > 0 ? `+${cagr}%` : `${cagr}%`}</strong></span>
              </div>
            )}

            {hasHighSharpe && (
              <div className="flex items-start gap-1.5 text-slate-300">
                <ShieldCheck size={11} className="text-indigo-400 shrink-0 mt-0.5" />
                <span>Sharpe Ratio (<strong className="font-mono text-indigo-300">{sharpe}</strong>): Consistent risk-adjusted return over Rf benchmark.</span>
              </div>
            )}

            {hasHighSortino && (
              <div className="flex items-start gap-1.5 text-slate-300">
                <ShieldCheck size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Sortino Ratio (<strong className="font-mono text-emerald-300">{sortino}</strong>): Lower downside volatility relative to MAR.</span>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[9px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Info size={10} className="text-indigo-400" />
              Rf Benchmark / MAR: <strong className="text-slate-300">{RISK_FREE_RATE_CONFIG.annualRatePct}% p.a.</strong>
            </span>
            <span className="text-slate-500 font-mono">As-of {RISK_FREE_RATE_CONFIG.asOfDate}</span>
          </div>
        </div>
      )}
    </div>
  );
}
