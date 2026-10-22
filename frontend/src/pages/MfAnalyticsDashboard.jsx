import React, { useState } from 'react';
import { PieChart, SlidersHorizontal } from 'lucide-react';
import SectorAnalyticsPanel from '../components/SectorAnalyticsPanel';
import MutualFundStockWeightageScreener from '../components/stockWeightage/MutualFundStockWeightageScreener';

export default function MfAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('stock-weightage');

  const tabs = [
    { id: 'stock-weightage', label: 'Stock Weightage Screener', icon: SlidersHorizontal },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Mutual Fund Analytics</h1>
        <p className="text-[var(--text-muted)] mt-1 max-w-2xl">
          Analyze aggregate performance trends across popular mutual funds, sector allocations, and stock weightage.
        </p>
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
        {/* {activeTab === 'sector-growth' && <SectorAnalyticsPanel />} */}
        {activeTab === 'stock-weightage' && <MutualFundStockWeightageScreener />}
      </div>

    </div>
  );
}
