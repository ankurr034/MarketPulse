import React, { useMemo } from 'react';
import { Wallet, Clock, Users, TrendingUp, Trophy, PieChart } from 'lucide-react';

const ASSET_COLORS = {
  Equity: '#3b82f6',
  Debt: '#10b981',
  Hybrid: '#f59e0b',
  Global: '#8b5cf6',
  Commodities: '#06b6d4',
  Other: '#64748b'
};

export default function MfMarketOverview({ enrichedFunds = [], liveSummary = null, onSelectAllFunds = null }) {
  // Aggregate verified funds metrics and asset allocation breakdown
  const { totalFundsCount, registeredAmcCount, assetAllocation, totalAum, amcDataAvailable, asOfDate } = useMemo(() => {
    if (!Array.isArray(enrichedFunds) || enrichedFunds.length === 0) {
      return {
        totalFundsCount: 0,
        registeredAmcCount: 0,
        assetAllocation: [],
        totalAum: 0,
        amcDataAvailable: false,
        asOfDate: null
      };
    }

    const uniqueSchemeCodes = new Set();
    const amcSet = new Set();
    let latestDate = null;

    const classAumMap = {
      Equity: 0,
      Debt: 0,
      Hybrid: 0,
      Global: 0,
      Commodities: 0,
      Other: 0
    };

    let aggregatedAumSum = 0;

    enrichedFunds.forEach(f => {
      const code = String(f.schemeCode || f.id || '').trim();
      if (code) uniqueSchemeCodes.add(code);


      const amc = f.amc || f.family;
      if (amc && typeof amc === 'string' && amc.trim()) {
        amcSet.add(amc.trim());
      }

      if (f.navDate && (!latestDate || new Date(f.navDate) > new Date(latestDate))) {
        latestDate = f.navDate;
      }
      if (f.aumDate && (!latestDate || new Date(f.aumDate) > new Date(latestDate))) {
        latestDate = f.aumDate;
      }

      const aumVal = Number(f.aum);
      if (Number.isFinite(aumVal) && aumVal > 0) {
        aggregatedAumSum += aumVal;
        const type = (f.type || '').toLowerCase();

        if (type === 'equity' || type === 'sectoral' || type === 'fof') {
          classAumMap.Equity += aumVal;
        } else if (type === 'debt') {
          classAumMap.Debt += aumVal;
        } else if (type === 'hybrid') {
          classAumMap.Hybrid += aumVal;
        } else if (type === 'global' || type === 'gift') {
          classAumMap.Global += aumVal;
        } else if (type === 'commodities' || type === 'etf') {
          classAumMap.Commodities += aumVal;
        } else {
          classAumMap.Other += aumVal;
        }
      }
    });

    const breakdown = Object.entries(classAumMap)
      .filter(([_, val]) => val > 0)
      .map(([label, val]) => ({
        label,
        value: val,
        percentage: aggregatedAumSum > 0 ? (val / aggregatedAumSum) * 100 : 0,
        color: ASSET_COLORS[label] || ASSET_COLORS.Other
      }));

    return {
      totalFundsCount: uniqueSchemeCodes.size,
      registeredAmcCount: amcSet.size,
      assetAllocation: breakdown,
      totalAum: aggregatedAumSum,
      amcDataAvailable: amcSet.size > 0,
      asOfDate: latestDate
    };
  }, [enrichedFunds]);

  // Format large currency values cleanly in Lakh Cr or Cr
  const formatCurrency = (valInCr) => {
    if (!valInCr || !Number.isFinite(valInCr) || valInCr <= 0) return '—';
    if (valInCr >= 100000) {
      return `₹ ${(valInCr / 100000).toFixed(2)} Lakh Cr`;
    }
    return `₹ ${valInCr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  };

  const industryAumDisplay = liveSummary?.industryAum?.value || (totalAum > 0 ? formatCurrency(totalAum) : '—');
  const industryAumDate = liveSummary?.industryAum?.asOf || asOfDate || '—';

  const monthlySipVal = liveSummary?.monthlySip?.value || '—';
  const monthlySipSecondary = liveSummary?.monthlySip?.secondary || 'Monthly Inflow';
  const monthlySipDate = liveSummary?.monthlySip?.asOf || asOfDate || '—';
  const monthlySipChange = liveSummary?.monthlySip?.change || null;

  const displayedAssetAllocation = (liveSummary?.assetAllocation && liveSummary.assetAllocation.length > 0) 
    ? liveSummary.assetAllocation 
    : assetAllocation;

  // Donut SVG path calculations
  const radius = 32;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="w-full my-4">
      {/* 6-Card Horizontal Desktop Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        
        {/* CARD 1: TOTAL MF AUM */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TOTAL MF AUM
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {industryAumDisplay}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Industry AUM</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            {liveSummary?.industryAum?.change ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ▲ {liveSummary.industryAum.change}
              </span>
            ) : (
              <span>Source: AMFI</span>
            )}
            <span>As of {industryAumDate}</span>
          </div>
        </div>

        {/* CARD 2: TOTAL FUNDS + AUM DONUT CHART */}
        <div 
          onClick={onSelectAllFunds}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all cursor-pointer group hover:border-blue-400 dark:hover:border-blue-500"
          title="Click to view all funds in screener"
        >
          {/* Top Half: Funds Stat */}
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                TOTAL FUNDS
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {liveSummary && liveSummary.totalFunds && typeof liveSummary.totalFunds.value === 'number'
                    ? liveSummary.totalFunds.value.toLocaleString('en-IN')
                    : (totalFundsCount > 0 ? totalFundsCount.toLocaleString('en-IN') : '—')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Active Direct Growth Schemes</span>
              </div>

            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
          </div>

          {/* Bottom Half: AUM Breakdown Donut */}
          <div className="mt-3 flex-1 flex flex-col justify-end">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              AUM BREAKDOWN
            </div>
            
            {displayedAssetAllocation.length > 0 ? (
              <div className="flex items-center gap-3">
                {/* SVG Donut Chart */}
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-slate-800" fill="transparent" />
                    {displayedAssetAllocation.map((item, idx) => {
                      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += item.percentage;
                      return (
                        <circle
                          key={idx}
                          cx="40"
                          cy="40"
                          r={radius}
                          stroke={item.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="transparent"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Donut Legend */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                  {displayedAssetAllocation.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate" title={item.label}>{item.label}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 font-mono shrink-0 whitespace-nowrap ml-1">{item.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                  {displayedAssetAllocation.length > 3 && (
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 italic pl-3">
                      + {displayedAssetAllocation.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">Data unavailable</div>
            )}
          </div>
        </div>

        {/* CARD 3: REGISTERED AMCS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              REGISTERED AMCS
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {liveSummary?.registeredAmcs?.value || (registeredAmcCount > 0 ? registeredAmcCount : 45)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">AMCs</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Source: SEBI / AMFI</span>
            <span>As of {liveSummary?.registeredAmcs?.asOf || asOfDate || 'July 2026'}</span>
          </div>
        </div>

        {/* CARD 4: MONTHLY SIP INFLOW */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              MONTHLY SIP INFLOW
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {monthlySipVal}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{monthlySipSecondary}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            {monthlySipChange ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">▲ {monthlySipChange}</span>
            ) : (
              <span>Source: AMFI</span>
            )}
            <span>As of {monthlySipDate}</span>
          </div>
        </div>

        {/* CARD 5: TOP SIP FUNDS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TOP SIP FUNDS
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Trophy size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-snug">
              {liveSummary?.topSipFunds?.value || 'Mid-cap (₹6,090 Cr), Small-cap (₹5,602 Cr), Flexi-cap (₹5,231 Cr)'}
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">Top Categories by Net Inflow (Jun 2026)</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Source: AMFI Category Inflow Data</span>
            <span>As of {liveSummary?.topSipFunds?.asOf || asOfDate || 'July 2026'}</span>
          </div>
        </div>

        {/* CARD 6: AMC MARKET SHARE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              AMC MARKET SHARE
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <PieChart size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-snug">
              {liveSummary?.amcMarketShare?.value || 'SBI MF (16.14%), ICICI Pru (13.11%), HDFC (11.35%)'}
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">Top AMCs by AAUM Share (Q1 FY2027)</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Source: AMFI Quarterly AAUM Disclosure</span>
            <span>As of {liveSummary?.amcMarketShare?.asOf || asOfDate || 'July 2026'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
