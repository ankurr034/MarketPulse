import React from 'react';

export const getSharpeIndicator = (val) => {
  const num = parseFloat(val) || 0;
  if (num >= 1.8) return { label: 'Excel', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', barColor: 'bg-emerald-400', barPct: Math.min(100, (num / 3.0) * 100) };
  if (num >= 1.0) return { label: 'Good', color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', barColor: 'bg-indigo-400', barPct: Math.min(100, (num / 3.0) * 100) };
  if (num >= 0.5) return { label: 'Fair', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', barColor: 'bg-amber-400', barPct: Math.min(100, (num / 3.0) * 100) };
  return { label: 'Low', color: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', barColor: 'bg-rose-400', barPct: Math.max(10, Math.min(100, (num / 3.0) * 100)) };
};

export const getSortinoIndicator = (val) => {
  const num = parseFloat(val) || 0;
  if (num >= 2.5) return { label: 'Excel', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', barColor: 'bg-emerald-400', barPct: Math.min(100, (num / 4.0) * 100) };
  if (num >= 1.8) return { label: 'Good', color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', barColor: 'bg-indigo-400', barPct: Math.min(100, (num / 4.0) * 100) };
  if (num >= 1.0) return { label: 'Fair', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', barColor: 'bg-amber-400', barPct: Math.min(100, (num / 4.0) * 100) };
  return { label: 'Low', color: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', barColor: 'bg-rose-400', barPct: Math.max(10, Math.min(100, (num / 4.0) * 100)) };
};

export default function MiniRatioIndicator({ value, type = 'sharpe', showLabel = true, showBar = true }) {
  if (value === undefined || value === null || isNaN(value)) {
    return <span className="text-slate-500 font-mono text-[10px] whitespace-nowrap">—</span>;
  }

  const num = parseFloat(value);
  if (num === 0) {
    return <span className="text-slate-500 font-mono text-[10px] whitespace-nowrap">—</span>;
  }

  const ind = type === 'sharpe' ? getSharpeIndicator(num) : getSortinoIndicator(num);

  const tooltipText = type === 'sharpe'
    ? `Sharpe Ratio: ${num.toFixed(2)} (${ind.label})\nExcess Return vs Risk (Total Volatility)\nRanges: <0.5 Low | 0.5-1.0 Fair | 1.0-1.8 Good | >1.8 Excellent`
    : `Sortino Ratio: ${num.toFixed(2)} (${ind.label})\nReturn vs Downside Risk Only\nRanges: <1.0 Low | 1.0-1.8 Fair | 1.8-2.5 Good | >2.5 Excellent`;

  return (
    <div className="inline-flex flex-col items-end group/ratio cursor-help whitespace-nowrap shrink-0 leading-none" title={tooltipText}>
      <div className="flex items-center gap-0.5 justify-end shrink-0">
        <span className="font-mono text-[10.5px] font-extrabold text-slate-200 shrink-0">
          {num.toFixed(2)}
        </span>
        {showLabel && (
          <span className={`text-[7px] font-extrabold px-0.5 py-0.2 rounded border leading-none uppercase shrink-0 ${ind.bg} ${ind.text} ${ind.border}`}>
            {ind.label}
          </span>
        )}
      </div>
      {showBar && (
        <div className="w-6 h-0.5 bg-slate-800/80 rounded-full overflow-hidden mt-0.5 shrink-0">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${ind.barColor}`} 
            style={{ width: `${Math.max(10, Math.min(100, ind.barPct))}%` }} 
          />
        </div>
      )}
    </div>
  );
}
