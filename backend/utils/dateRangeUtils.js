/**
 * WARNING: DUPLICATION RISK
 * This file is duplicated in `backend/utils/dateRangeUtils.js` and `frontend/src/utils/dateRangeUtils.js`.
 * Any changes made here MUST be mirrored in the other location.
 * Both files are tested against the shared fixture `shared/dateRangeTests.json`.
 */

function getFinancialYearRange(fyLabel) {
  // fyLabel format: "FY2024-25"
  const match = fyLabel.match(/^FY(\d{4})-(\d{2})$/);
  if (!match) throw new Error(`Invalid FY label format: ${fyLabel}`);
  
  const startYear = parseInt(match[1], 10);
  const endYear = startYear + 1;
  
  // April 1 to March 31
  return {
    start: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999))
  };
}

function getCalendarYearRange(cyLabel) {
  // cyLabel format: "2024"
  const year = parseInt(cyLabel, 10);
  if (isNaN(year)) throw new Error(`Invalid CY label format: ${cyLabel}`);
  
  // Jan 1 to Dec 31
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
  };
}

function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = (year + 1).toString().slice(2);
  return `FY${year}-${nextYear}`;
}

function getCurrentCalendarYear() {
  return new Date().getFullYear().toString();
}

function listAvailableFinancialYears(earliestDateStr) {
  if (!earliestDateStr) return [getCurrentFinancialYear()];
  
  const earliestDate = new Date(earliestDateStr);
  if (isNaN(earliestDate.getTime())) return [getCurrentFinancialYear()];

  const earliestYear = earliestDate.getMonth() >= 3 ? earliestDate.getFullYear() : earliestDate.getFullYear() - 1;
  const now = new Date();
  const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const years = [];
  for (let y = currentYear; y >= earliestYear; y--) {
    const nextY = (y + 1).toString().slice(2);
    years.push(`FY${y}-${nextY}`);
  }
  return years;
}

function listAvailableCalendarYears(earliestDateStr) {
  if (!earliestDateStr) return [getCurrentCalendarYear()];
  
  const earliestDate = new Date(earliestDateStr);
  if (isNaN(earliestDate.getTime())) return [getCurrentCalendarYear()];

  const earliestYear = earliestDate.getFullYear();
  const currentYear = new Date().getFullYear();

  const years = [];
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(y.toString());
  }
  return years;
}

function resolveRangeToDates(range) {
  // Parse JSON string if needed (e.g. '{"type":"fy","label":"FY2024-25"}')
  if (typeof range === 'string' && range.startsWith('{')) {
    try { range = JSON.parse(range); } catch(e) {}
  }
  // Parse colon-delimited format (e.g. 'fy:FY2024-25', 'cy:2024')
  if (typeof range === 'string' && range.startsWith('fy:')) {
    range = { type: 'fy', label: range.slice(3) };
  }
  if (typeof range === 'string' && range.startsWith('cy:')) {
    range = { type: 'cy', label: range.slice(3) };
  }

  // range can be '1y', 'max', or { type: 'fy', label: 'FY2024-25' }, or { type: 'cy', label: '2024' }
  if (typeof range === 'object' && range !== null) {
    if (range.type === 'fy') {
      return getFinancialYearRange(range.label);
    } else if (range.type === 'cy') {
      return getCalendarYearRange(range.label);
    }
  }

  // Handle standard rolling string ranges by returning the start date 
  // (the backend services will still need to adapt based on their specific logic, 
  // but this standardizes the parsed dates)
  // Returning { start, end } where end is now.
  const end = new Date();
  let start = new Date();

  if (typeof range === 'string') {
    if (range === '1d') start.setDate(start.getDate() - 1);
    else if (range === '1w') start.setDate(start.getDate() - 7);
    else if (range === '1mo' || range === '1m') start.setMonth(start.getMonth() - 1);
    else if (range === '3m') start.setMonth(start.getMonth() - 3);
    else if (range === '6m') start.setMonth(start.getMonth() - 6);
    else if (range === '1y' || range === '1yr') start.setFullYear(start.getFullYear() - 1);
    else if (range === '3y' || range === '3yr') start.setFullYear(start.getFullYear() - 3);
    else if (range === '5y' || range === '5yr') start.setFullYear(start.getFullYear() - 5);
    else if (range === 'ytd') start = new Date(start.getFullYear(), 0, 1); // Jan 1 of current year
    else if (range === 'max' || range === 'all') start = new Date('1970-01-01T00:00:00Z');
    else if (range === 'fy') { // legacy string 'fy'
       start = getFinancialYearRange(getCurrentFinancialYear()).start;
    }
    else {
      // unknown string, default to 1y
      start.setFullYear(start.getFullYear() - 1);
    }
  }

  return { start, end };
}

function stringifyRange(range) {
  if (typeof range === 'object' && range !== null) {
    if (range.type === 'fy') return `fy:${range.label}`;
    if (range.type === 'cy') return `cy:${range.label}`;
  }
  return `rolling:${range}`;
}

export {
  getFinancialYearRange,
  getCalendarYearRange,
  getCurrentFinancialYear,
  getCurrentCalendarYear,
  listAvailableFinancialYears,
  listAvailableCalendarYears,
  resolveRangeToDates,
  stringifyRange
};
