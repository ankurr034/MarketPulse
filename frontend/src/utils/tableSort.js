export const sortComparisonTable = (data, sortField, sortDirection) => {
  return [...data].sort((a, b) => {
    // If one has no NAV available but the other does, the unavailable one always goes to the bottom
    // We only apply this to NAV and Returns columns, not Name or Sector etc.
    const isPerformanceColumn = sortField === 'currentPrice_or_nav' || sortField === 'oneYearChangePct';
    
    if (isPerformanceColumn) {
      if (a.navAvailable === false && b.navAvailable !== false) return 1;
      if (b.navAvailable === false && a.navAvailable !== false) return -1;
      if (a.navAvailable === false && b.navAvailable === false) return 0;
    }

    let valA = a[sortField];
    let valB = b[sortField];

    // Handle string comparisons
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    // Handle numeric comparisons (including nulls)
    valA = valA === null ? -Infinity : valA;
    valB = valB === null ? -Infinity : valB;

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
};
