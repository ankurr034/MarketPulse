import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon, Info } from 'lucide-react';

/**
 * AmcMarketShareChart
 * Compact low-height status & chart container
 */
export default function AmcMarketShareChart({ amcData = [], asOf = null }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(amcData) || amcData.length === 0) return null;

    const validAmcs = amcData
      .filter(a => a && typeof a.aum === 'number' && a.aum > 0)
      .sort((a, b) => b.aum - a.aum);

    if (validAmcs.length === 0) return null;

    const totalAum = validAmcs.reduce((sum, a) => sum + a.aum, 0);
    if (totalAum <= 0) return null;

    const top5 = validAmcs.slice(0, 5);
    const others = validAmcs.slice(5);
    const othersAum = others.reduce((sum, a) => sum + a.aum, 0);

    const formattedData = top5.map(a => ({
      name: a.name || a.amc || 'AMC',
      aumCr: a.aum,
      aumLakhCr: (a.aum / 100000).toFixed(2),
      percentage: Number(((a.aum / totalAum) * 100).toFixed(1))
    }));

    if (othersAum > 0) {
      formattedData.push({
        name: 'Others',
        aumCr: othersAum,
        aumLakhCr: (othersAum / 100000).toFixed(2),
        percentage: Number(((othersAum / totalAum) * 100).toFixed(1))
      });
    }

    return {
      items: formattedData,
      largestAmc: formattedData[0]
    };
  }, [amcData]);

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#475569'];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <PieIcon size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">AMC Market Share</span>
        </div>
        <div className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" title="Computed dynamically from verified AMC Average AUM disclosures.">
          <Info size={11} />
        </div>
      </div>

      {chartData ? (
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="relative w-20 h-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.items}
                  cx="50%"
                  cy="50%"
                  innerRadius={22}
                  outerRadius={34}
                  paddingAngle={2}
                  dataKey="aumCr"
                >
                  {chartData.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded shadow-xl text-[10px] text-slate-900 dark:text-slate-200">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{data.name}</p>
                          <p className="font-mono">₹{data.aumLakhCr}L Cr ({data.percentage}%)</p>
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
            {chartData.items.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between gap-1">
                <span className="truncate text-slate-700 dark:text-slate-300" title={item.name}>{item.name}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200 shrink-0">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-1 px-2 text-center flex flex-col justify-center items-center">
          <p className="text-[10.5px] font-semibold text-slate-800 dark:text-slate-300">AMC market share data unavailable</p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            Sufficient verified same-period AMC AAUM disclosure data is currently unavailable to compute market share.
          </p>
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-800/50 pt-1 text-[8.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
        <span>AMFI AAUM Disclosures</span>
        <span className="font-mono">{asOf ? `As of ${asOf}` : 'AMFI Feeds'}</span>
      </div>
    </div>
  );
}
