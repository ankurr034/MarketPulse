import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, AlertCircle, Building2, TrendingUp } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function FundHouseLeaderboard({ activeRange = '1y' }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/analytics/mf/fund-houses?range=${encodeURIComponent(activeRange)}`);
        setLeaderboard(res.data);
      } catch (err) {
        console.error('Failed to fetch fund house leaderboard', err);
        setError('Failed to load fund house leaderboard.');
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [activeRange]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
        <p className="text-[var(--text-muted)] text-sm">Aggregating AMC performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500">
        <AlertCircle size={24} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="mb-6">
        <h2 className="font-display font-semibold text-lg text-[var(--text-primary)]">AMC / Fund House Leaderboard</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Average performance across tracked schemes</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-medium">
              <th className="pb-3 pr-4 font-medium">AMC / Fund House</th>
              <th className="pb-3 px-4 font-medium text-center">Tracked Funds</th>
              <th className="pb-3 px-4 font-medium">Top Sectors (by Weight)</th>
              <th className="pb-3 pl-4 font-medium text-right">Avg Return</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((house, i) => (
              <tr key={i} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]">
                      <Building2 size={16} />
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">{house.houseName}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center text-[var(--text-secondary)]">
                  {house.fundsCount}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1">
                    {house.primarySectors.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 pl-4 text-right">
                  <div className={`inline-flex items-center gap-1 font-semibold ${house.avgReturn >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                    {house.avgReturn >= 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                    {house.avgReturn >= 0 ? '+' : ''}{house.avgReturn.toFixed(2)}%
                  </div>
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan="4" className="py-8 text-center text-[var(--text-muted)]">No data available for the selected range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
