import React, { useState, useEffect } from 'react';
import { calculateSIP, calculateLumpsum } from '../utils/investmentMath';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MfInvestmentCalculator({ navData, currency = 'INR' }) {
  const [type, setType] = useState('SIP');
  const [amount, setAmount] = useState(5000);
  const [years, setYears] = useState(5);
  
  // Historical CAGR computation state
  const [historicalCagr, setHistoricalCagr] = useState(null);
  const [cagrPeriod, setCagrPeriod] = useState('5Y');
  const [actualPeriod, setActualPeriod] = useState('');
  
  // User override state
  const [expectedCagr, setExpectedCagr] = useState(12);

  // Calculate historical CAGR whenever navData or cagrPeriod changes
  useEffect(() => {
    if (!navData || navData.length < 2) {
      setHistoricalCagr(null);
      setActualPeriod('');
      return;
    }

    const sorted = [...navData].sort((a, b) => new Date(b.date) - new Date(a.date));
    const currentVal = sorted[0].value;
    const oldestVal = sorted[sorted.length - 1].value;
    const maxYears = (new Date(sorted[0].date) - new Date(sorted[sorted.length - 1].date)) / (1000 * 60 * 60 * 24 * 365.25);
    
    let y = 5;
    if (cagrPeriod === '1Y') y = 1;
    if (cagrPeriod === '3Y') y = 3;
    if (cagrPeriod === '5Y') y = 5;
    if (cagrPeriod === 'MAX') y = maxYears;

    let targetPeriodName = cagrPeriod;

    // If requested period is greater than max history, fallback to max
    if (y > maxYears) {
      y = maxYears;
      targetPeriodName = 'MAX';
      if (cagrPeriod !== 'MAX') setCagrPeriod('MAX');
    }
    
    const targetDate = new Date(sorted[0].date);
    targetDate.setDate(targetDate.getDate() - Math.round(y * 365.25));
    
    let pastPoint = cagrPeriod === 'MAX' || targetPeriodName === 'MAX' 
      ? sorted[sorted.length - 1] 
      : sorted.find(d => new Date(d.date) <= targetDate);
    
    if (!pastPoint) {
      pastPoint = sorted[sorted.length - 1]; // absolute fallback
    }
    
    const actualYearsUsed = (new Date(sorted[0].date) - new Date(pastPoint.date)) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (actualYearsUsed < 0.1) {
      setHistoricalCagr(null);
      setActualPeriod('');
      return;
    }

    const cagr = (Math.pow(currentVal / pastPoint.value, 1 / actualYearsUsed) - 1) * 100;
    setHistoricalCagr(cagr);
    setExpectedCagr(parseFloat(cagr.toFixed(2))); // Pre-fill
    
    if (targetPeriodName === 'MAX') {
      setActualPeriod(`(${actualYearsUsed.toFixed(1)}Y)`);
    } else {
      setActualPeriod('');
    }
  }, [navData, cagrPeriod]);

  // Calculations
  const calcResult = type === 'SIP' 
    ? calculateSIP(amount, expectedCagr, years)
    : calculateLumpsum(amount, expectedCagr, years);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  const isNegativeCagr = expectedCagr < 0;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Investment Calculator</h3>
        <div className="flex bg-[var(--bg-primary)] p-1 rounded-lg">
          <button
            onClick={() => setType('SIP')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'SIP' ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            SIP
          </button>
          <button
            onClick={() => setType('Lumpsum')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'Lumpsum' ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            Lumpsum
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Amount Input */}
          <div>
            <label className="flex justify-between text-sm font-medium text-[var(--text-secondary)] mb-2">
              <span>{type === 'SIP' ? 'Monthly Investment' : 'Total Investment'}</span>
              <span className="text-indigo-400 font-semibold">{formatCurrency(amount)}</span>
            </label>
            <input 
              type="range" 
              min="500" 
              max="100000" 
              step="500"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Expected Return Input */}
          <div>
            <label className="flex justify-between text-sm font-medium text-[var(--text-secondary)] mb-2">
              <span>Expected Return Rate (p.a)</span>
              <span className={`${isNegativeCagr ? 'text-red-400' : 'text-indigo-400'} font-semibold`}>{expectedCagr}%</span>
            </label>
            <input 
              type="range" 
              min="-20" 
              max="40" 
              step="0.1"
              value={expectedCagr}
              onChange={(e) => setExpectedCagr(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            
            {historicalCagr !== null ? (
              <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center justify-between">
                <span>Based on historical CAGR:</span>
                <div className="flex gap-2">
                  {['1Y', '3Y', '5Y', 'MAX'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setCagrPeriod(p)}
                      className={`px-2 py-0.5 rounded transition-colors ${cagrPeriod === p ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-[var(--bg-secondary)]'}`}
                    >
                      {p} {p === 'MAX' && cagrPeriod === 'MAX' ? actualPeriod : ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-orange-400">
                Not enough NAV history to compute CAGR.
              </div>
            )}
            
            {isNegativeCagr && (
              <div className="mt-3 text-xs text-red-400 flex items-start gap-1 bg-red-500/10 p-2 rounded">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>This fund lost value over the selected period. Projecting negative growth will result in wealth erosion.</span>
              </div>
            )}
          </div>

          {/* Time Period Input */}
          <div>
            <label className="flex justify-between text-sm font-medium text-[var(--text-secondary)] mb-2">
              <span>Time Period</span>
              <span className="text-indigo-400 font-semibold">{years} Years</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        {/* Results Box */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-xl flex flex-col justify-center relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -right-12 -top-12 opacity-5">
            {isNegativeCagr ? <TrendingDown size={180} /> : <TrendingUp size={180} />}
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)] text-sm">Invested Amount</span>
              <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(calcResult.investedAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)] text-sm">Est. Returns</span>
              <span className={`font-semibold ${isNegativeCagr ? 'text-red-400' : 'text-emerald-400'}`}>
                {isNegativeCagr ? '' : '+'}{formatCurrency(calcResult.expectedReturns)}
              </span>
            </div>
            
            <div className="border-t border-[var(--border-color)] my-4"></div>
            
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] font-medium">Total Value</span>
              <span className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(calcResult.totalValue)}</span>
            </div>
          </div>

          {/* Growth Chart */}
          {calcResult.timelineData && calcResult.timelineData.length > 0 && (
            <div className="h-40 mt-6 relative z-10 -mx-4 -mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calcResult.timelineData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => `Year ${label}`}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                  />
                  <Area type="monotone" dataKey="Invested" stackId="1" stroke="#6366f1" fill="url(#colorInvested)" />
                  <Area type="monotone" dataKey="Profit" stackId="1" stroke="#10b981" fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-[var(--text-muted)] text-center">
        Estimates are based on historical performance and are not guaranteed. Mutual fund investments are subject to market risks.
      </p>
    </div>
  );
}
