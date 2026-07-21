import React, { useState, useRef, useMemo, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import ExpandableAssetRow from './ExpandableAssetRow';
import { sortComparisonTable } from '../utils/tableSort';

const Row = React.memo(({ index, style, data }) => {
  const { sortedFunds, handleToggleRow } = data;
  const fund = sortedFunds[index];
  return (
    <div style={style}>
      <ExpandableAssetRow 
        asset={fund}
        onToggle={(isExpanded) => handleToggleRow(index, isExpanded)}
        showSectorChip={true}
      />
    </div>
  );
});

const ComparisonTable = ({ funds }) => {
  const [sortField, setSortField] = useState('oneYearChangePct');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedRows, setExpandedRows] = useState({});
  const listRef = useRef(null);

  const sortedFunds = useMemo(() => {
    return sortComparisonTable(funds, sortField, sortDirection);
  }, [funds, sortField, sortDirection]);

  // When sorting changes, collapse all rows so heights reset cleanly
  useEffect(() => {
    setExpandedRows({});
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [isMobile]);

  const getItemSize = (index) => {
    if (expandedRows[index]) {
      return isMobile ? 950 : 500;
    }
    return 76;
  };

  const handleToggleRow = (index, isExpanded) => {
    setExpandedRows(prev => ({ ...prev, [index]: isExpanded }));
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-40" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-400" /> : <ArrowDown size={14} className="text-indigo-400" />;
  };

  const itemData = {
    sortedFunds,
    handleToggleRow
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm flex flex-col w-full">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-[var(--border-color)]/50 bg-[var(--bg-secondary)]/30 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] sticky top-0 z-10">
        <div 
          className="col-span-12 sm:col-span-5 flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          onClick={() => handleSort('name')}
        >
          Fund Details <SortIcon field="name" />
        </div>
        <div 
          className="hidden sm:flex sm:col-span-2 items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          onClick={() => handleSort('sectorName')}
        >
          Sector <SortIcon field="sectorName" />
        </div>
        <div 
          className="hidden sm:flex sm:col-span-2 items-center justify-end gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          onClick={() => handleSort('currentPrice_or_nav')}
        >
          NAV <SortIcon field="currentPrice_or_nav" />
        </div>
        <div 
          className="hidden sm:flex sm:col-span-2 items-center justify-end gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          onClick={() => handleSort('oneYearChangePct')}
        >
          1Y Return <SortIcon field="oneYearChangePct" />
        </div>
        <div className="hidden sm:flex sm:col-span-1 items-center justify-end">
          Action
        </div>
      </div>
      
      {/* Table Body */}
      <div className="min-h-[500px]">
        {sortedFunds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-[var(--text-muted)] gap-4">
            <p className="text-sm font-medium">No funds found.</p>
          </div>
        ) : (
          <List
            className="List custom-scrollbar"
            height={600}
            itemCount={sortedFunds.length}
            itemSize={getItemSize}
            ref={listRef}
            width="100%"
            itemData={itemData}
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
};

export default ComparisonTable;
