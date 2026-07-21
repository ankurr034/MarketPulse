import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Globe, MapPin, SearchX, Compass, Filter, Sparkles, Building2, ShieldAlert } from 'lucide-react';
import MutualFundPanel from './MutualFundPanel';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MfExplorer() {
  const [region, setRegion] = useState('india'); // 'india' | 'global' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  
  const [sectors, setSectors] = useState([]);
  const [activeSector, setActiveSector] = useState(null);

  // Taxonomy states
  const [amcs, setAmcs] = useState([]);
  const [categories, setCategories] = useState({});
  const [selectedAmc, setSelectedAmc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  
  const debounceRef = useRef(null);

  // Fetch Sectors and Taxonomy on Mount
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const res = await axios.get(`${API_BASE}/mf/sectors`);
        setSectors(res.data);
      } catch (err) {
        console.error('Failed to fetch sectors', err);
      }
    };
    const fetchTaxonomy = async () => {
      try {
        const amcsRes = await axios.get(`${API_BASE}/mf/amcs`);
        const catsRes = await axios.get(`${API_BASE}/mf/categories`);
        setAmcs(amcsRes.data);
        setCategories(catsRes.data);
      } catch (err) {
        console.error('Failed to fetch taxonomy', err);
      }
    };
    fetchSectors();
    fetchTaxonomy();
  }, []);

  // Search/Filter effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // If any filter is selected, query the filter endpoint
    if (selectedAmc || selectedCategory || selectedRisk || selectedDuration) {
      const fetchFiltered = async () => {
        setSearching(true);
        try {
          const res = await axios.get(
            `${API_BASE}/mf/filter?amc=${encodeURIComponent(selectedAmc)}&category=${encodeURIComponent(selectedCategory)}&risk=${selectedRisk}&duration=${selectedDuration}&region=${region}`
          );
          setResults(res.data);
        } catch (err) {
          console.error('Failed to fetch filtered funds', err);
          setResults([]);
        } finally {
          setSearching(false);
        }
      };
      
      debounceRef.current = setTimeout(fetchFiltered, 400); // 400ms debounce for filters too
      return;
    }

    if (activeSector) {
      // If a sector is selected, fetch sector funds
      const fetchSectorFunds = async () => {
        setSearching(true);
        try {
          const res = await axios.get(`${API_BASE}/mf/sectors/${activeSector}?region=${region}`);
          setResults(res.data);
        } catch (err) {
          console.error('Failed to fetch sector funds', err);
          setResults([]);
        } finally {
          setSearching(false);
        }
      };
      fetchSectorFunds();
      return;
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      // Fetch popular funds instead of showing empty results
      const fetchPopular = async () => {
        setSearching(true);
        try {
          const res = await axios.get(`${API_BASE}/mf/popular?region=${region}`);
          setResults(res.data);
        } catch (err) {
          console.error('Failed to fetch popular funds', err);
          setResults([]);
        } finally {
          setSearching(false);
        }
      };
      fetchPopular();
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/mf/search?q=${encodeURIComponent(searchQuery.trim())}&region=${region}`);
        setResults(res.data);
      } catch (err) {
        console.error('Failed to search mutual funds', err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400); // 400ms debounce
  }, [searchQuery, region, activeSector, selectedAmc, selectedCategory, selectedRisk, selectedDuration]);

  if (selectedScheme) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedScheme(null)}
          className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] transition-colors"
        >
          &larr; Back to Explore
        </button>
        <MutualFundPanel initialScheme={selectedScheme} region={selectedScheme.region || 'india'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Header Panel */}
      <div className="bg-gradient-to-br from-indigo-500/[0.08] via-[var(--bg-card)] to-purple-500/[0.06] border border-[var(--border-color)] rounded-2xl p-4 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 shadow-sm">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Compass className="text-indigo-500 shrink-0" size={24} /> Explore Funds
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xl">
            Discover and analyze mutual funds from India and around the world with advanced filtering.
          </p>
        </div>
        
        {/* Region Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)] shadow-sm">
            <button
              onClick={() => setRegion('india')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                region === 'india' 
                  ? 'bg-indigo-500 text-white shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <MapPin size={16} className={region === 'india' ? 'opacity-100' : 'opacity-70'} /> 
              <span className="hidden sm:inline">India</span>
              <span className="sm:hidden">IND</span>
            </button>
            
            <button
              onClick={() => setRegion('global')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                region === 'global' 
                  ? 'bg-indigo-500 text-white shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Globe size={16} className={region === 'global' ? 'opacity-100' : 'opacity-70'} /> 
              <span className="hidden sm:inline">Global</span>
              <span className="sm:hidden">GLB</span>
            </button>
            
            <button
              onClick={() => setRegion('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                region === 'all' 
                  ? 'bg-indigo-500 text-white shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Main Search & Filters Workspace */}
      <div className="flex flex-col gap-4">
        
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-[var(--text-muted)] group-focus-within:text-indigo-400 transition-colors" size={20} />
          </div>
          <input
            type="text"
            placeholder="Search for a mutual fund by name or code..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value) setActiveSector(null); // Clear sector if user starts typing
            }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl py-3.5 sm:py-4 pl-12 pr-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm font-medium"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 sm:p-5 rounded-2xl shadow-sm">
          
          {/* AMC Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Building2 size={12} /> AMC / Fund House
            </label>
            <div className="relative">
              <select
                value={selectedAmc}
                onChange={(e) => setSelectedAmc(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer shadow-sm hover:border-[var(--text-muted)] transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                <option value="">All AMCs</option>
                {amcs.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Filter size={12} /> Category
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer shadow-sm hover:border-[var(--text-muted)] transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                <option value="">All Categories</option>
                {Object.keys(categories).map(group => (
                  <optgroup key={group} label={group}>
                    {categories[group].map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Risk Level Chips */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={12} /> Risk Level
            </label>
            <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
              {['', 'Low', 'Moderate', 'High'].map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRisk(r)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    selectedRisk === r 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Chips (Hidden if Equity) */}
          <div className="flex flex-col gap-2">
            <label className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-opacity ${selectedCategory === 'Equity' ? 'text-[var(--text-muted)]/40' : 'text-[var(--text-muted)]'}`}>
              <Sparkles size={12} /> Duration
            </label>
            <div className={`flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)] transition-opacity ${selectedCategory === 'Equity' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              {['', 'Low', 'Medium', 'Long'].map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    selectedDuration === d 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {d || 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedAmc || selectedCategory || selectedRisk || selectedDuration) && (
          <div className="flex items-center gap-2 flex-wrap text-xs bg-[var(--bg-card)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl shadow-sm">
            <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">Active Filters:</span>
            {selectedAmc && (
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold">
                AMC: {selectedAmc}
                <button onClick={() => setSelectedAmc('')} className="hover:text-white font-bold ml-1">&times;</button>
              </span>
            )}
            {selectedCategory && (
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold">
                Cat: {selectedCategory}
                <button onClick={() => setSelectedCategory('')} className="hover:text-white font-bold ml-1">&times;</button>
              </span>
            )}
            {selectedRisk && (
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold">
                Risk: {selectedRisk}
                <button onClick={() => setSelectedRisk('')} className="hover:text-white font-bold ml-1">&times;</button>
              </span>
            )}
            {selectedDuration && (
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold">
                Dur: {selectedDuration}
                <button onClick={() => setSelectedDuration('')} className="hover:text-white font-bold ml-1">&times;</button>
              </span>
            )}
            <button 
              onClick={() => {
                setSelectedAmc('');
                setSelectedCategory('');
                setSelectedRisk('');
                setSelectedDuration('');
              }}
              className="text-[var(--text-muted)] hover:text-indigo-400 font-semibold underline ml-2 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Sector Chips */}
        {sectors.length > 0 && !searchQuery && (
          <div className="flex items-center gap-2 flex-wrap bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 sm:p-4 shadow-sm">
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)] mr-1 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              Browse by Sector
            </span>
            <div className="w-[1px] h-6 bg-[var(--border-color)] mx-1 hidden sm:block"></div>
            
            <button
              onClick={() => setActiveSector(null)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                activeSector === null 
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20 scale-[1.02]' 
                  : 'bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400 hover:bg-[var(--bg-secondary)]'
              }`}
            >
              🔥 Popular (All)
            </button>
            {sectors.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSector(s.id)}
                title={s.description}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                  activeSector === s.id 
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20 scale-[1.02]' 
                    : 'bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400 hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden min-h-[400px] shadow-sm relative">
        {searching && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-[var(--text-muted)] gap-3">
            <span className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs font-medium">Fetching funds...</p>
          </div>
        )}
        
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-secondary)]/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Fund Name</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Fund Family</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Country / Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/50">
                {results.map((r, i) => (
                  <tr 
                    key={i} 
                    onClick={() => setSelectedScheme(r)}
                    className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">
                        {r.name || r.schemeName}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">{r.id || r.schemeCode}</div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] font-medium text-xs">
                      {r.family || r.fundHouse || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        r.region === 'india' || region === 'india' 
                          ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>
                        {r.region === 'india' || region === 'india' ? '🇮🇳 India' : '🌐 Global'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !searching ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-[var(--text-muted)] gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)]">
              {searchQuery.length >= 2 || selectedAmc || selectedCategory || selectedRisk || selectedDuration ? (
                <SearchX size={28} className="text-[var(--text-muted)]" />
              ) : (
                <Globe size={28} className="text-[var(--text-muted)]" />
              )}
            </div>
            <p className="text-sm font-medium">
              {searchQuery.length >= 2 || selectedAmc || selectedCategory || selectedRisk || selectedDuration 
                ? 'No funds found matching your filters.' 
                : 'Search or filter to explore mutual funds.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
