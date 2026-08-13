import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Info, BarChart2 } from 'lucide-react';

/**
 * SipDistributionChart
 * Compact low-height status & chart container
 */
export default function SipDistributionChart({ sipData = null, asOf = null }) {
  const hasVerifiedData = Array.isArray(sipData) && sipData.length > 0;
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Top SIP Funds</span>
        </div>
        <div className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" title="Per-scheme SIP contribution requires licensed AMFI scheme-level SIP disclosure feed.">
          <Info size={11} />
        </div>
      </div>

      {hasVerifiedData ? (
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="relative w-20 h-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sipData}
                  cx="50%"
                  cy="50%"
                  innerRadius={22}
                  outerRadius={34}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {sipData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded shadow-xl text-[10px] text-slate-900 dark:text-slate-200">
                          <p className="font-bold text-indigo-600 dark:text-indigo-400">{data.name}</p>
                          <p className="font-mono">₹{data.amount} Cr ({data.percentage}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-1 text-[10px]">
            {sipData.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between gap-1">
                <span className="truncate text-slate-700 dark:text-slate-300" title={item.name}>{item.name}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200 shrink-0">₹{item.amount} Cr</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-1 px-2 text-center flex flex-col justify-center items-center">
          <p className="text-[10.5px] font-semibold text-slate-800 dark:text-slate-300">Scheme-level SIP contribution data unavailable</p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            Public AMFI feeds provide aggregate monthly industry SIP (₹ 21,262 Cr). Per-scheme SIP breakdown requires licensed exchange feed.
          </p>
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-800/50 pt-1 text-[8.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
        <span>AMFI Disclosures</span>
        <span className="font-mono">{asOf ? `As of ${asOf}` : 'AMFI Feeds'}</span>
      </div>
    </div>
  );
}
