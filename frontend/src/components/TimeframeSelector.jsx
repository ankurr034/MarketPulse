import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { listAvailableFinancialYears, listAvailableCalendarYears } from '../utils/dateRangeUtils';

export default function TimeframeSelector({ 
  activeRange, 
  onChange, 
  earliestDate = null, 
  className = '' 
}) {
  const [showFyDropdown, setShowFyDropdown] = useState(false);
  const [showCyDropdown, setShowCyDropdown] = useState(false);
  
  const fyRef = useRef(null);
  const cyRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (fyRef.current && !fyRef.current.contains(event.target)) setShowFyDropdown(false);
      if (cyRef.current && !cyRef.current.contains(event.target)) setShowCyDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fyRanges = listAvailableFinancialYears(earliestDate).map(label => ({ type: 'fy', label }));
  const cyRanges = listAvailableCalendarYears(earliestDate).map(label => ({ type: 'cy', label }));

  const rollingOptions = [
    { label: '1D', val: '1d' },
    { label: '1W', val: '1w' },
    { label: '1M', val: '1mo' },
    { label: '1Y', val: '1y' },
    { label: '5Y', val: '5y' },
    { label: 'ALL', val: 'max' }
  ];

  // Helper to determine if a range is active
  const isActive = (val) => {
    if (typeof activeRange === 'string' && typeof val === 'string') return activeRange === val;
    if (typeof activeRange === 'object' && typeof val === 'object') {
      return activeRange.type === val.type && activeRange.label === val.label;
    }
    return false;
  };

  const getActiveObjectLabel = (type) => {
    if (typeof activeRange === 'object' && activeRange.type === type) {
      return activeRange.label;
    }
    return type === 'fy' ? 'FY' : 'CY';
  };

  const handleSelect = (val) => {
    // Pass JSON-stringified object for FY/CY so the backend's resolveRangeToDates can parse it.
    // For rolling strings like '1y', pass as-is.
    onChange(typeof val === 'object' ? JSON.stringify(val) : val);
    setShowFyDropdown(false);
    setShowCyDropdown(false);
  };
  
  // Parse activeRange for local comparison.
  // It may be a plain string ('1y'), a JSON string ('{"type":"fy","label":"FY2024-25"}'),
  // or (legacy) a cache-key string ('fy:FY2024-25').
  let parsedActiveRange = activeRange;
  if (typeof activeRange === 'string') {
    if (activeRange.startsWith('{')) {
      try { parsedActiveRange = JSON.parse(activeRange); } catch(e) {}
    } else if (activeRange.startsWith('fy:')) {
      parsedActiveRange = { type: 'fy', label: activeRange.slice(3) };
    } else if (activeRange.startsWith('cy:')) {
      parsedActiveRange = { type: 'cy', label: activeRange.slice(3) };
    }
  }

  const isFyActive = typeof parsedActiveRange === 'object' && parsedActiveRange !== null && parsedActiveRange.type === 'fy';
  const isCyActive = typeof parsedActiveRange === 'object' && parsedActiveRange !== null && parsedActiveRange.type === 'cy';

  return (
    <div className={`flex items-center gap-1 bg-[var(--bg-secondary)] p-1 border border-[var(--border-color)] rounded-md ${className}`}>
      {/* Rolling Windows */}
      {rollingOptions.map(tf => (
        <button
          key={tf.val}
          onClick={() => handleSelect(tf.val)}
          className={`px-3 py-1 text-xs font-mono font-bold rounded ${
            parsedActiveRange === tf.val ? 'bg-blue-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {tf.label}
        </button>
      ))}

      {/* FY Dropdown */}
      <div className="relative" ref={fyRef}>
        <button
          onClick={() => { setShowFyDropdown(!showFyDropdown); setShowCyDropdown(false); }}
          className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
            isFyActive ? 'bg-blue-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isFyActive ? parsedActiveRange.label : 'FY'} <ChevronDown size={14} />
        </button>
        
        {showFyDropdown && (
          <div className="absolute right-0 mt-1 w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
            {fyRanges.length > 0 ? fyRanges.map(fy => (
              <button
                key={fy.label}
                onClick={() => handleSelect(fy)}
                className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-[var(--bg-secondary)] ${
                  isFyActive && parsedActiveRange.label === fy.label ? 'text-blue-500 font-bold bg-[var(--bg-secondary)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {fy.label}
              </button>
            )) : (
              <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No data</div>
            )}
          </div>
        )}
      </div>

      {/* CY Dropdown */}
      <div className="relative" ref={cyRef}>
        <button
          onClick={() => { setShowCyDropdown(!showCyDropdown); setShowFyDropdown(false); }}
          className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
            isCyActive ? 'bg-blue-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isCyActive ? parsedActiveRange.label : 'CY'} <ChevronDown size={14} />
        </button>
        
        {showCyDropdown && (
          <div className="absolute right-0 mt-1 w-24 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
            {cyRanges.length > 0 ? cyRanges.map(cy => (
              <button
                key={cy.label}
                onClick={() => handleSelect(cy)}
                className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-[var(--bg-secondary)] ${
                  isCyActive && parsedActiveRange.label === cy.label ? 'text-blue-500 font-bold bg-[var(--bg-secondary)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {cy.label}
              </button>
            )) : (
               <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No data</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
