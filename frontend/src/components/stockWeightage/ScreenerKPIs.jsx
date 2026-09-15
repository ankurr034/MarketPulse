import React from 'react';
import { BarChart3, PieChart, ShieldCheck, TrendingUp, Award, Layers } from 'lucide-react';

export default function ScreenerKPIs({ kpis = {}, loading = false }) {
  const cards = [
    {
      id: 'stocks-covered',
      label: 'Stocks Covered',
      value: kpis.stocksCovered != null ? kpis.stocksCovered.toLocaleString('en-IN') : '—',
      subtitle: 'Across official portfolios',
      icon: BarChart3,
      accent: 'text-blue-400',
      bgGlow: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      id: 'funds-tracked',
      label: 'Mutual Funds Tracked',
      value: kpis.mutualFundsTracked != null ? kpis.mutualFundsTracked.toLocaleString('en-IN') : '—',
      subtitle: 'Active equity schemes',
      icon: PieChart,
      accent: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 'aum-analysed',
      label: 'Total AUM Analysed',
      value: kpis.totalAumAnalysedCr != null 
        ? (kpis.totalAumAnalysedCr >= 100000 
            ? `₹ ${(kpis.totalAumAnalysedCr / 100000).toFixed(1)}L Cr` 
            : `₹ ${kpis.totalAumAnalysedCr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`)
        : '—',
      subtitle: 'Combined equity assets',
      icon: ShieldCheck,
      accent: 'text-indigo-400',
      bgGlow: 'bg-indigo-500/10 border-indigo-500/20'
    },
    {
      id: 'highest-weightage',
      label: 'Highest Single Weight',
      value: kpis.highestCombinedWeightage != null ? `${kpis.highestCombinedWeightage}%` : '—',
      subtitle: 'Peak fund conviction',
      icon: TrendingUp,
      accent: 'text-amber-400',
      bgGlow: 'bg-amber-500/10 border-amber-500/20'
    },
    {
      id: 'most-held-stock',
      label: 'Most Held Stock',
      value: kpis.mostHeldStock || '—',
      subtitle: 'Highest scheme count',
      icon: Award,
      accent: 'text-rose-400',
      bgGlow: 'bg-rose-500/10 border-rose-500/20'
    },
    {
      id: 'sectors-count',
      label: 'Sectors Represented',
      value: kpis.sectorsCount != null ? kpis.sectorsCount : '—',
      subtitle: 'Diversified coverage',
      icon: Layers,
      accent: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/10 border-cyan-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}
          >
            {/* Top row: Label & Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium tracking-tight truncate text-[var(--text-muted)]">
                {c.label}
              </span>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${c.bgGlow}`}>
                <Icon size={14} className={c.accent} />
              </div>
            </div>

            {/* Middle: Prominent Value */}
            <div className="mt-2 min-w-0">
              {loading ? (
                <div className="h-6 w-20 bg-slate-700/20 rounded animate-pulse" />
              ) : (
                <div className="text-base sm:text-lg font-bold font-display tracking-tight truncate text-[var(--text-primary)]">
                  {c.value}
                </div>
              )}
            </div>

            {/* Bottom: Subtitle / Micro Metric */}
            <div className="mt-1 text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
              <span>{c.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
