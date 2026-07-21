// backend/config/macroSnapshot.js

/**
 * Manual snapshot of macroeconomic indicators for India.
 * Repo Rate and GDP Growth are typically updated via manual entries since RBI does not have an open REST API.
 * CPI Inflation and IIP can be fetched from data.gov.in (if DATA_GOV_IN_ENABLED is true),
 * but these values serve as fallbacks.
 */
export default {
  repoRate: { 
    value: 5.25, 
    date: '2026-06-08', 
    note: 'RBI MPC June 2026' 
  },
  gdpGrowth: { 
    value: 7.7, 
    date: '2026-06-30', 
    note: 'FY 2025-26 Estimate' 
  },
  cpiInflation: { 
    value: 4.38, 
    date: '2026-06-30', 
    note: 'Provisional June 2026' 
  },
  iip: { 
    value: 5.1, 
    date: '2026-05-31', 
    note: 'May 2026' 
  }
};
