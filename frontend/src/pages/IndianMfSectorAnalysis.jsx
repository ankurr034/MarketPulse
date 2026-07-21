import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Info, RefreshCcw, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import ExpandableAssetRow from '../components/ExpandableAssetRow';
import MacroCorrelationSection from '../components/MacroCorrelationSection';
import AllMutualFundsDirectory from '../components/AllMutualFundsDirectory';
import ComparisonTable from '../components/ComparisonTable';
import { TableProperties, Grid2X2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const IndianMfSectorAnalysis = () => {
  const [data, setData] = useState(null);
  const [flatFunds, setFlatFunds] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'grid' | 'table'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSectors, setExpandedSectors] = useState({
    technology: true,
    financials: true,
    healthcare: true,
    infrastructure: true,
    energy: true,
    consumption: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, flatRes] = await Promise.all([
        axios.get(`${API_BASE}/indian-mf/sectors-overview`).catch(e => { console.error('404 on /sectors-overview'); throw e; }),
        axios.get(`${API_BASE}/indian-mf/sectors/flat`).catch(e => { console.error('404 on /sectors/flat'); throw e; })
      ]);
      setData(overviewRes.data);
      setFlatFunds(flatRes.data);
    } catch (err) {
      console.error('Failed to load sector overview:', err);
      setError('Failed to load Indian MFs data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSector = (sectorId) => {
    setExpandedSectors(prev => ({
      ...prev,
      [sectorId]: !prev[sectorId]
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 text-[var(--text-primary)]">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="w-8 h-8 text-[var(--text-muted)] animate-pulse" />
          <h1 className="text-3xl font-bold">Indian Mutual Funds Overview</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-[var(--bg-secondary)] rounded-xl"></div>
          <div className="h-64 bg-[var(--bg-secondary)] rounded-xl mt-8"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 text-red-500">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[var(--bg-secondary)] rounded flex items-center">
          <RefreshCcw className="w-4 h-4 mr-2" /> Retry
        </button>
      </div>
    );
  }

  if (!data || !data.macro || !data.sectors) {
    return (
      <div className="flex-1 p-8 text-[var(--text-muted)] text-center">
        No data available or malformed response.
      </div>
    );
  }

  const { macro, sectors } = data;

  // Filter sectors based on search query
  const filteredSectors = sectors.map(sector => {
    const filteredFunds = (sector.topFunds || []).filter(fund => {
      const fundName = (fund.name || '').toLowerCase();
      const fundFamily = (fund.family || '').toLowerCase();
      const q = (searchQuery || '').toLowerCase();
      return fundName.includes(q) || fundFamily.includes(q);
    });
    return { ...sector, filteredFunds };
  }).filter(sector => sector.filteredFunds.length > 0 || (sector.sectorName || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-color)] text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Indian Mutual Funds
          </h1>
          <p className="text-[var(--text-muted)] text-lg">
            Sector-Wise Single-Page Analysis & Macro Overlay
          </p>
        </div>

        {/* Macro Snapshot Strip */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-4 text-[var(--text-muted)]">
            <Info className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium uppercase tracking-wider">Macroeconomic Indicators</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="text-sm text-[var(--text-muted)]">RBI Repo Rate</div>
              <div className="text-3xl font-bold">{macro.repoRate.value}%</div>
              <div className="text-xs text-[var(--text-muted)]">
                As of {macro.repoRate.date} ({macro.repoRate.source === 'manual' ? 'Manual' : 'Live'})
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm text-[var(--text-muted)]">CPI Inflation</div>
              <div className="text-3xl font-bold">{macro.cpiInflation.value}%</div>
              <div className="text-xs text-[var(--text-muted)]">
                As of {macro.cpiInflation.date} ({macro.cpiInflation.source === 'manual' ? 'Manual' : 'Live'})
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-[var(--text-muted)]">GDP Growth</div>
              <div className="text-3xl font-bold">{macro.gdpGrowth.value}%</div>
              <div className="text-xs text-[var(--text-muted)]">
                As of {macro.gdpGrowth.date} ({macro.gdpGrowth.source === 'manual' ? 'Manual' : 'Live'})
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-[var(--text-muted)]">IIP</div>
              <div className="text-3xl font-bold">{macro.iip.value}%</div>
              <div className="text-xs text-[var(--text-muted)]">
                As of {macro.iip.date} ({macro.iip.source === 'manual' ? 'Manual' : 'Live'})
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search funds by name or family..." 
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1 rounded-xl inline-flex shadow-sm">
            <button
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-color)]'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid2X2 size={16} /> Sector Grid
            </button>
            <button
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-color)]'}`}
              onClick={() => setViewMode('table')}
            >
              <TableProperties size={16} /> Comparison Table
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'table' ? (
          <div className="animate-in fade-in duration-300">
            <ComparisonTable 
              funds={flatFunds.filter(fund => {
                const q = (searchQuery || '').toLowerCase();
                return (fund.name || '').toLowerCase().includes(q) || 
                       (fund.family || '').toLowerCase().includes(q) ||
                       (fund.sectorName || '').toLowerCase().includes(q);
              })} 
            />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {filteredSectors.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              No funds or sectors match your search.
            </div>
          ) : (
            filteredSectors.map(sector => {
              const isExpanded = expandedSectors[sector.sectorId];
              return (
                <div key={sector.sectorId} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden transition-all duration-300 hover:border-[var(--border-hover)]">
                  {/* Sector Header */}
                  <button 
                    onClick={() => toggleSector(sector.sectorId)}
                    className="w-full flex items-center justify-between p-5 focus:outline-none"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-bold">{sector.sectorName}</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{sector.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold px-3 py-1 bg-[var(--bg-color)] text-[var(--text-muted)] rounded-full border border-[var(--border-color)]">
                        Showing top {sector.topN} of {sector.totalSchemeCount} total schemes
                      </span>
                    </div>
                  </button>

                  {/* Sector Funds */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-color)] space-y-3">
                      {sector.filteredFunds.length === 0 ? (
                        <div className="text-[var(--text-muted)] text-sm py-2 px-4">
                          No funds match the search in this sector.
                        </div>
                      ) : (
                        sector.filteredFunds.map(fund => (
                          <ExpandableAssetRow 
                            key={fund.id}
                            asset={{
                              id: fund.id,
                              symbol: fund.id,
                              name: fund.name,
                              type: 'mf',
                              family: fund.family,
                              currency: fund.currency,
                              currentPrice_or_nav: fund.currentPrice_or_nav,
                              oneYearChangePct: fund.oneYearChangePct,
                              sharpeRatio: fund.sharpeRatio,
                              sortinoRatio: fund.sortinoRatio,
                              navAvailable: fund.navAvailable,
                              sector: sector.sectorName
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        )}

        {/* New Macro Correlation Section */}
        <MacroCorrelationSection />

        {/* New All Funds Directory Section */}
        <AllMutualFundsDirectory />

      </div>
    </div>
  );
};

export default IndianMfSectorAnalysis;
