import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setActiveMfScheme } from '../store/slices/marketSlice';
import { Plus, Search, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function MyMfHoldings() {
  const dispatch = useDispatch();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add Form State
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [units, setUnits] = useState('');
  const [avgBuyNav, setAvgBuyNav] = useState('');
  const [buyDate, setBuyDate] = useState('');

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/portfolio/mf`);
      setHoldings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, []);

  const [syncing, setSyncing] = useState(false);

  const handleSyncUpstox = async () => {
    try {
      setSyncing(true);
      const res = await axios.post(`${API_BASE}/portfolio/mf/sync-upstox`);
      setHoldings(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to sync with Upstox');
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length > 2) {
      try {
        const res = await axios.get(`${API_BASE}/mf/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedScheme || !units || !avgBuyNav || !buyDate) return;
    
    try {
      await axios.post(`${API_BASE}/portfolio/mf`, {
        schemeCode: selectedScheme.schemeCode || selectedScheme.id,
        schemeName: selectedScheme.schemeName || selectedScheme.name,
        units: parseFloat(units),
        avgBuyNav: parseFloat(avgBuyNav),
        buyDate
      });
      setShowForm(false);
      setSelectedScheme(null);
      setSearchQuery('');
      setUnits('');
      setAvgBuyNav('');
      setBuyDate('');
      fetchHoldings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/portfolio/mf/${id}`);
      fetchHoldings();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">My Mutual Fund Holdings</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncUpstox}
            disabled={syncing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync with Upstox'}
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Add Holding
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col gap-4">
          <div className="relative">
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Search Scheme</label>
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] px-3 py-2">
              <Search size={14} className="text-[var(--text-muted)] mr-2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name..."
                className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-full"
              />
            </div>
            {searchResults.length > 0 && !selectedScheme && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md shadow-lg z-10">
                {searchResults.map(s => (
                  <button 
                    key={s.schemeCode || s.id}
                    type="button"
                    onClick={() => {
                      setSelectedScheme(s);
                      setSearchQuery(s.schemeName || s.name);
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)]"
                  >
                    {s.schemeName || s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Units</label>
              <input 
                type="number" step="0.001" required
                value={units} onChange={e => setUnits(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Avg Buy NAV (₹)</label>
              <input 
                type="number" step="0.01" required
                value={avgBuyNav} onChange={e => setAvgBuyNav(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Buy Date</label>
              <input 
                type="date" required
                value={buyDate} onChange={e => setBuyDate(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)]">Cancel</button>
            <button type="submit" disabled={!selectedScheme} className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Save Holding</button>
          </div>
        </form>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Scheme</th>
              <th className="px-4 py-3 font-medium text-right">Units</th>
              <th className="px-4 py-3 font-medium text-right">Avg NAV</th>
              <th className="px-4 py-3 font-medium text-right">Current NAV</th>
              <th className="px-4 py-3 font-medium text-right">Current Value</th>
              <th className="px-4 py-3 font-medium text-right">Gain/Loss</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-[var(--text-muted)]">Loading holdings...</td></tr>
            ) : holdings.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-[var(--text-muted)]">No holdings found. Add one above.</td></tr>
            ) : (
              holdings.map(h => (
                <tr key={h._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => dispatch(setActiveMfScheme(h.schemeCode))} className="font-medium text-blue-400 hover:underline text-left">
                      {h.schemeName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-primary)]">{h.units.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatCurrency(h.avgBuyNav)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatCurrency(h.currentNav)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">{formatCurrency(h.currentValue)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${h.gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {h.gainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {formatCurrency(h.gainLoss)}
                      <span className="text-xs ml-1 opacity-80">({h.gainLossPct.toFixed(2)}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(h._id)} className="text-[var(--text-muted)] hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
