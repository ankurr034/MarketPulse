import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Compass, ShieldAlert, Filter, Globe2, Building, Pin } from 'lucide-react';
import ExpandableAssetRow from './ExpandableAssetRow';
import { useWorkbench } from '../context/WorkbenchContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function SectorExplorer() {
  const [sectors, setSectors] = useState([]);
  const [activeSector, setActiveSector] = useState(null);
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  const [assetFilter, setAssetFilter] = useState('all'); // 'all' | 'stock' | 'mf'
  const [regionFilter, setRegionFilter] = useState('all'); // 'all' | 'india' | 'global'
  
  const { isPinned, pin, unpin } = useWorkbench();

  // Fetch Sectors on Mount
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const res = await axios.get(`${API_BASE}/assets/sectors`);
        setSectors(res.data);
        if (res.data.length > 0) {
          setActiveSector(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch sector groups', err);
      }
    };
    fetchSectors();
  }, []);

  // Fetch Assets when sector, filter or region changes
  useEffect(() => {
    if (!activeSector) return;
    
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/assets/sectors/${activeSector}?types=${assetFilter === 'all' ? 'stock,mf' : assetFilter}&region=${regionFilter}`
        );
        setAssets(res.data);
      } catch (err) {
        console.error('Failed to fetch sector assets', err);
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [activeSector, assetFilter, regionFilter]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Header Panel */}
      <div className="bg-gradient-to-br from-indigo-500/[0.08] via-[var(--bg-card)] to-purple-500/[0.06] border border-[var(--border-color)] rounded-2xl p-4 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Compass className="text-indigo-500 shrink-0" size={24} /> Unified Sector Explorer
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xl">
            Deep dive into specific sectors. Browse and analyze Indian and Global stocks alongside mutual funds sector-by-sector.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          
          {/* Asset Class Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--text-muted)]" />
            <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
              {['all', 'stock', 'mf'].map(f => (
                <button
                  key={f}
                  onClick={() => setAssetFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                    assetFilter === f 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {f === 'all' ? 'All Assets' : f === 'stock' ? 'Stocks' : 'Funds'}
                </button>
              ))}
            </div>
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-2">
            <Globe2 size={14} className="text-[var(--text-muted)]" />
            <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
              {['all', 'india', 'global'].map(r => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                    regionFilter === r 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {r === 'all' ? 'All Regions' : r}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Sector Chips */}
      {sectors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-xs text-[var(--text-muted)] mr-1 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Building size={14} /> Sectors
          </span>
          <div className="w-[1px] h-6 bg-[var(--border-color)] mx-1 hidden sm:block"></div>
          {sectors.map(s => {
            const isActive = activeSector === s.id;
            return (
              <div key={s.id} className="relative flex items-center group">
                <button
                  onClick={() => setActiveSector(s.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full transition-all border flex items-center gap-1.5 sm:gap-2 ${
                    isActive
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20 scale-[1.02]'
                      : 'bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400 hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.name}</span>
                </button>
                {isActive && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const pinned = isPinned('sector', s.id);
                      if (pinned) {
                        unpin('sector', s.id);
                      } else {
                        pin({ type: 'sector', id: s.id, name: s.name });
                      }
                    }}
                    className={`absolute -right-2 -top-2 p-1 rounded-full shadow-sm border transition-colors z-10 ${
                      isPinned('sector', s.id) 
                        ? 'bg-indigo-100 text-indigo-600 border-indigo-200' 
                        : 'bg-white text-gray-400 border-gray-200 hover:text-indigo-500'
                    }`}
                    title={isPinned('sector', s.id) ? "Remove from comparison" : "Add to comparison"}
                  >
                    <Pin size={12} fill={isPinned('sector', s.id) ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assets List */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden min-h-[500px] shadow-sm relative">
        {loading ? (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-[var(--text-muted)] gap-3">
            <span className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs font-medium">Loading sector assets...</p>
          </div>
        ) : null}

        {assets.length > 0 ? (
          <div className="divide-y divide-[var(--border-color)]/50">
            {assets.map(asset => (
              <ExpandableAssetRow key={asset.id} asset={asset} region={regionFilter} />
            ))}
          </div>
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-[var(--text-muted)] gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)]">
              <ShieldAlert size={28} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-sm">No assets found matching the selected filters.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
