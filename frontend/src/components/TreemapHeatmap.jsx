import React, { useState, useEffect } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { Eye, ShieldAlert } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setActiveSymbol } from '../store/slices/marketSlice.js';

const CustomTreemapNode = ({ x, y, width, height, index, name, changePercent, price, sector, onNodeClick }) => {
  if (width < 30 || height < 20) return null;

  // Determine color matching % change
  const isPositive = changePercent >= 0;
  const absChange = Math.min(Math.abs(changePercent) / 3, 1); // Cap opacity scaling at 3% move
  
  let fill = 'rgba(74, 85, 104, 0.4)'; // Gray for neutral
  let stroke = 'rgba(74, 85, 104, 0.8)';
  if (changePercent > 0.05) {
    fill = `rgba(16, 185, 129, ${0.15 + absChange * 0.55})`; // Emerald
    stroke = 'rgba(16, 185, 129, 0.8)';
  } else if (changePercent < -0.05) {
    fill = `rgba(244, 63, 94, ${0.15 + absChange * 0.55})`; // Rose
    stroke = 'rgba(244, 63, 94, 0.8)';
  }

  return (
    <g
      onClick={() => onNodeClick(name)}
      className="cursor-pointer group"
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#020617" // Very dark slate to separate blocks
        strokeWidth={1.5}
        className="transition-all duration-200 hover:brightness-125"
      />
      {width > 45 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 2}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={width > 60 ? 12 : 10}
            fontWeight="bold"
            className="pointer-events-none select-none font-mono"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill={isPositive ? '#a7f3d0' : '#fecdd3'}
            fontSize={width > 60 ? 10 : 8}
            className="pointer-events-none select-none font-mono font-medium"
          >
            {isPositive ? '+' : ''}{changePercent}%
          </text>
        </>
      )}
    </g>
  );
};

export const TreemapHeatmap = ({ setActiveTab }) => {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [filterSector, setFilterSector] = useState('All');
  const [sectors, setSectors] = useState([]);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/market/heatmap');
      setData(res.data);
      
      // Extract sectors
      const uniques = ['All', ...new Set(res.data.map(item => item.sector))];
      setSectors(uniques);
    } catch (err) {
      console.error('Error fetching heatmap:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll updates every 6 seconds
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = (symbol) => {
    dispatch(setActiveSymbol(symbol));
    setActiveTab('stock-details');
  };

  const filteredData = filterSector === 'All'
    ? data
    : data.filter(item => item.sector === filterSector);

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Market Heatmap</h3>
          <p className="text-xs text-slate-400">TreeMap of stocks sized by Market Cap and colored by Intraday P&L.</p>
        </div>

        {/* Sector Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Filter Sector:</span>
          <select
            className="bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-700"
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
          >
            {sectors.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredData.length > 0 ? (
        <div className="w-full h-[450px] bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden p-2">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={filteredData}
              dataKey="value"
              aspectRatio={4 / 3}
              stroke="#0f172a"
              content={<CustomTreemapNode onNodeClick={handleNodeClick} />}
            />
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-80 text-slate-500 gap-2 border border-dashed border-slate-800 rounded-xl">
          <ShieldAlert className="w-8 h-8 text-slate-600" />
          <span className="text-sm">Loading map data...</span>
        </div>
      )}

      {/* Heatmap Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold bg-slate-950/50 py-2.5 px-4 border border-slate-900 rounded-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-rose-600 rounded"></span>
          <span>-3% or lower</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-rose-900/60 rounded"></span>
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-slate-800 rounded"></span>
          <span>Flat / Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-emerald-950 rounded"></span>
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-emerald-600 rounded"></span>
          <span>+3% or higher</span>
        </div>
      </div>
    </div>
  );
};
export default TreemapHeatmap;
