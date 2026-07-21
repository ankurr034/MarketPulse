import React, { useState } from 'react';
import { LineChart, PieChart, Building2 } from 'lucide-react';
import SectorAnalyticsPanel from '../components/SectorAnalyticsPanel';
import FundHouseLeaderboard from '../components/FundHouseLeaderboard';
import TimeframeSelector from '../components/TimeframeSelector';

export default function MfAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('sector-growth');
  const [activeRange, setActiveRange] = useState('1y');

  const tabs = [
    { id: 'sector-growth', label: 'Sector Growth & Flow', icon: PieChart },
    { id: 'fund-houses', label: 'AMC Leaderboard', icon: Building2 },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Mutual Fund Analytics</h1>
          <p className="text-[var(--text-muted)] mt-1 max-w-2xl">
            Analyze aggregate performance trends across popular mutual funds, sector allocations, and AMC leaderboards.
          </p>
        </div>

        <TimeframeSelector
          activeRange={activeRange}
          onChange={setActiveRange}
          earliestDate={null}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === tab.id 
                  ? 'border-[var(--accent)] text-[var(--text-primary)]' 
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={16} className={activeTab === tab.id ? 'text-[var(--accent)]' : ''} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="pt-2">
        {activeTab === 'sector-growth' && <SectorAnalyticsPanel activeRange={activeRange} />}
        {activeTab === 'fund-houses' && <FundHouseLeaderboard activeRange={activeRange} />}
      </div>

    </div>
  );
}
