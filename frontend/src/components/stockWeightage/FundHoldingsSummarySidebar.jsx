import React from 'react';
import { PieChart as PieIcon, BarChart3, Lightbulb, ShieldCheck, Layers } from 'lucide-react';

export default function FundHoldingsSummarySidebar({ fund = null }) {
  if (!fund || !fund.available) {
    return null;
  }

  const summary = fund.holdingsSummary || {
    top10Weight: 50.0,
    next10Weight: 25.0,
    othersWeight: 25.0
  };

  const sectors = fund.sectorAllocationTop10 || [];
  const insights = fund.keyInsights || [];

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Fund Holdings Summary (Donut / Segment Breakdown) */}
      <div 
        className="rounded-2xl border p-4 shadow-xs"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <PieIcon size={14} className="text-blue-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Fund Holdings Summary
          </h4>
        </div>

        {/* Visual Segmented Progress Bar */}
        <div className="space-y-3">
          <div className="w-full h-3 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex">
            <div 
              style={{ width: `${Math.min(100, summary.top10Weight || 0)}%` }} 
              className="bg-blue-600 h-full transition-all"
              title={`Top 10 Stocks: ${summary.top10Weight}%`}
            />
            <div 
              style={{ width: `${Math.min(100, summary.next10Weight || 0)}%` }} 
              className="bg-indigo-500 h-full transition-all"
              title={`Next 10 Stocks: ${summary.next10Weight}%`}
            />
            <div 
              style={{ width: `${Math.min(100, summary.othersWeight || 0)}%` }} 
              className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
              title={`Others: ${summary.othersWeight}%`}
            />
          </div>

          {/* Legend Items */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span className="text-[var(--text-secondary)] font-medium">Top 10 Stocks</span>
              </div>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {summary.top10Weight}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-[var(--text-secondary)] font-medium">Next 10 Stocks</span>
              </div>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {summary.next10Weight}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                <span className="text-[var(--text-secondary)] font-medium">Others</span>
              </div>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {summary.othersWeight}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sector Allocation (Top 10 Stocks) */}
      <div 
        className="rounded-2xl border p-4 shadow-xs"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Sector Allocation
            </h4>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">Top 10</span>
        </div>

        <div className="space-y-2.5 text-xs">
          {sectors.slice(0, 5).map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-[var(--text-primary)] truncate max-w-[150px]" title={sec.sector}>
                  {sec.sector}
                </span>
                <span className="font-mono font-bold text-[var(--text-primary)] shrink-0">
                  {sec.weight}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sec.weight / (sectors[0]?.weight || 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Key Insights */}
      {insights.length > 0 && (
        <div 
          className="rounded-2xl border p-4 shadow-xs bg-amber-500/5 border-amber-500/20"
        >
          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-amber-500/20">
            <Lightbulb size={14} className="text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Key Insights
            </h4>
          </div>
          <ul className="space-y-2 text-[11.5px] text-[var(--text-secondary)]">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
