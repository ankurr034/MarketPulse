import React from 'react';
import { Info } from 'lucide-react';

/**
 * MfOverviewCard
 * Ultra-compact single-line financial terminal stat card
 */
export default function MfOverviewCard({ title, value, secondary, asOf, source, infoTooltip, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-lg px-3 py-2 flex flex-col justify-between transition-all group ${
        onClick ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900/90' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{title}</span>
        {infoTooltip && (
          <div className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors shrink-0" title={infoTooltip}>
            <Info size={10} />
          </div>
        )}
      </div>

      <div className="my-0.5 flex items-baseline justify-between gap-1">
        <div className="text-sm md:text-base font-extrabold text-slate-100 tracking-tight font-mono whitespace-nowrap">
          {value || '—'}
        </div>
        {secondary && (
          <div className="text-[9px] font-medium text-slate-400 truncate max-w-[110px]" title={secondary}>
            {secondary}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-800/50 pt-1 text-[8.5px] text-slate-400">
        <span className="truncate max-w-[90px]" title={source || 'AMFI'}>{source || 'AMFI'}</span>
        <span className="font-mono text-slate-400 shrink-0">{asOf ? `As of ${asOf}` : 'Verified'}</span>
      </div>
    </div>
  );
}
