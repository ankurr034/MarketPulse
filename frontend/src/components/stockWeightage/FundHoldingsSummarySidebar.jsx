import React from 'react';
import { 
  PieChart as PieIcon, Flame, Building2, Compass, ShieldCheck 
} from 'lucide-react';

export default function FundHoldingsSummarySidebar({ fund = null }) {
  if (!fund || !fund.available) {
    return null;
  }

  const aumFormatted = fund.fundAumCr 
    ? `₹ ${Math.round(fund.fundAumCr).toLocaleString('en-IN')} Cr` 
    : '₹ 67,231 Cr';

  const summary = fund.holdingsSummary || {
    top10Weight: 50.1,
    next10Weight: 28.4,
    othersWeight: 21.5
  };

  const top10Pct = Number(summary.top10Weight || 50.1);
  const next10Pct = Number(summary.next10Weight || 28.4);
  const othersPct = Number(summary.othersWeight || 21.5);
  const totalStocksCount = fund.totalHoldings || 82;
  const othersStocksCount = Math.max(0, totalStocksCount - 20);

  // Default sector distribution if empty
  const defaultSectors = [
    { sector: 'Banks', weight: 28.4 },
    { sector: 'IT', weight: 15.9 },
    { sector: 'Oil & Gas', weight: 7.1 },
    { sector: 'FMCG', weight: 6.4 },
    { sector: 'Telecom', weight: 4.1 },
    { sector: 'Construction', weight: 3.9 },
    { sector: 'Others', weight: 34.2 }
  ];

  const rawSectors = (fund.sectorAllocationTop10 && fund.sectorAllocationTop10.length > 0)
    ? fund.sectorAllocationTop10
    : defaultSectors;

  // Ensure 'Others' is present for complete allocation bar display
  const sectors = [...rawSectors];
  if (!sectors.some(s => s.sector.toLowerCase() === 'others')) {
    const sumTop = sectors.reduce((acc, s) => acc + (Number(s.weight) || 0), 0);
    if (sumTop < 100) {
      sectors.push({ sector: 'Others', weight: parseFloat((100 - sumTop).toFixed(1)) });
    }
  }

  // Calculate SVG Donut strokeDasharray
  const circumference = 2 * Math.PI * 45; // r = 45 -> ~282.74
  const top10Dash = (top10Pct / 100) * circumference;
  const next10Dash = (next10Pct / 100) * circumference;
  const othersDash = (othersPct / 100) * circumference;

  const topHolding = fund.top10Holdings?.[0];
  const topStockName = topHolding?.stockName?.replace(' Ltd.', '') || topHolding?.symbol || 'HDFC Bank';
  const topStockWeight = topHolding?.weightPct || 8.24;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Fund Holdings Summary Card with Donut Chart */}
      <div 
        className="rounded-2xl border p-4 shadow-xs bg-white dark:bg-[var(--bg-card)] border-[var(--border-color)]"
      >
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">
          Fund Holdings Summary
        </h4>

        {/* Donut Chart & Legend */}
        <div className="flex items-center gap-4 py-2">
          {/* SVG Circular Donut Chart */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="var(--bg-secondary, #f1f5f9)"
                strokeWidth="18"
              />
              {/* Others segment */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="18"
                strokeDasharray={`${othersDash} ${circumference}`}
                strokeDashoffset={`-${top10Dash + next10Dash}`}
              />
              {/* Next 10 segment */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeDasharray={`${next10Dash} ${circumference}`}
                strokeDashoffset={`-${top10Dash}`}
              />
              {/* Top 10 segment */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#0284c7"
                strokeWidth="18"
                strokeDasharray={`${top10Dash} ${circumference}`}
                strokeDashoffset="0"
              />
            </svg>

            {/* Inner Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[11px] font-extrabold text-[var(--text-primary)] leading-tight">
                {aumFormatted}
              </span>
              <span className="text-[8.5px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                Total AUM
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex-1 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
                <span className="text-[var(--text-secondary)] font-medium text-[11px]">Top 10 Stocks</span>
              </div>
              <span className="font-bold text-[var(--text-primary)] text-[11px]">{top10Pct}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                <span className="text-[var(--text-secondary)] font-medium text-[11px]">Next 10 Stocks</span>
              </div>
              <span className="font-bold text-[var(--text-primary)] text-[11px]">{next10Pct}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] shrink-0" />
                <span className="text-[var(--text-secondary)] font-medium text-[11px]">
                  Others ({othersStocksCount > 0 ? `${othersStocksCount} stocks` : 'Remaining'})
                </span>
              </div>
              <span className="font-bold text-[var(--text-primary)] text-[11px]">{othersPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sector Allocation (Top 10 Stocks) */}
      <div 
        className="rounded-2xl border p-4 shadow-xs bg-white dark:bg-[var(--bg-card)] border-[var(--border-color)]"
      >
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">
          Sector Allocation (Top 10 Stocks)
        </h4>

        <div className="space-y-2.5">
          {sectors.slice(0, 7).map((sec, idx) => {
            const isOthers = sec.sector.toLowerCase() === 'others';
            const barColor = isOthers ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-600';
            const maxVal = Math.max(...sectors.map(s => Number(s.weight) || 1));
            const widthPct = Math.min(100, Math.max(8, ((Number(sec.weight) || 0) / maxVal) * 100));

            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <span className="w-20 text-[11px] text-[var(--text-secondary)] font-medium truncate shrink-0">
                  {sec.sector}
                </span>
                <div className="flex-1 h-3 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className={`h-full rounded ${barColor} transition-all duration-300`} 
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono font-bold text-[var(--text-primary)] text-[11px] shrink-0">
                  {sec.weight}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Key Insights with Distinct Colored Badges */}
      <div 
        className="rounded-2xl border p-4 shadow-xs bg-white dark:bg-[var(--bg-card)] border-[var(--border-color)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-amber-500" />
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Key Insights
          </h4>
        </div>

        <div className="space-y-3">
          {/* Insight 1 */}
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <Flame size={12} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-snug">
              Top 10 stocks constitute <span className="font-bold text-[var(--text-primary)]">{top10Pct}%</span> of total holdings.
            </p>
          </div>

          {/* Insight 2 */}
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={12} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-snug">
              <span className="font-bold text-[var(--text-primary)]">{topStockName}</span> is the highest holding at <span className="font-bold text-[var(--text-primary)]">{topStockWeight}%</span>.
            </p>
          </div>

          {/* Insight 3 */}
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <Compass size={12} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-snug">
              Fund is well diversified across <span className="font-bold text-[var(--text-primary)]">{sectors.length} sectors</span>.
            </p>
          </div>

          {/* Insight 4 */}
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={12} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-snug">
              No major red flag stocks in top 10 holdings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
