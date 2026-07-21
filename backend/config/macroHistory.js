// backend/config/macroHistory.js

/**
 * Historical time-series of macroeconomic indicators for India.
 * 
 * UPDATE CADENCE:
 * - Repo Rate: Manually after each RBI MPC meeting (~6 times a year)
 * - CPI Inflation: Manually after MOSPI monthly release (usually 12th of every month)
 * - IIP: Manually after MOSPI monthly release (usually 12th of every month)
 * - GDP Growth: Manually after MOSPI quarterly release (usually end of Feb, May, Aug, Nov)
 */
export default {
  // Source: RBI MPC press releases, verified 2026-07-17
  // Note: Future updates must use real MPC dates and decisions, not interpolated estimates.
  repoRate: [
    { date: '2026-06-06', value: 5.25, note: 'Status Quo' },
    { date: '2026-04-05', value: 5.25, note: 'Status Quo' },
    { date: '2026-02-08', value: 5.25, note: 'Status Quo' },
    { date: '2025-12-05', value: 5.25, note: 'Cut by 25bps' },
    { date: '2025-10-06', value: 5.50, note: 'Status Quo' },
    { date: '2025-08-10', value: 5.50, note: 'Status Quo' },
    { date: '2025-06-06', value: 5.50, note: 'Cut by 50bps' },
    { date: '2025-04-06', value: 6.00, note: 'Cut by 25bps' },
    { date: '2025-02-08', value: 6.25, note: 'Cut by 25bps' },
    { date: '2024-12-08', value: 6.50, note: 'Status Quo' },
    { date: '2024-10-06', value: 6.50, note: 'Status Quo' },
    { date: '2024-08-10', value: 6.50, note: 'Status Quo' }
  ],
  cpiInflation: [
    { date: '2026-06-30', value: 4.38 },
    { date: '2026-05-31', value: 3.93 },
    { date: '2026-04-30', value: 3.48 },
    { date: '2025-11-30', value: 0.71 },
    { date: '2025-10-31', value: 0.25 },
    { date: '2025-09-30', value: 2.90 },
    { date: '2025-08-31', value: 2.50 },
    { date: '2025-07-31', value: 1.55 }
  ],
  gdpGrowth: [
    { date: '2026-03-31', value: 7.8, note: 'Q4 FY26' },
    { date: '2025-12-31', value: 7.4, note: 'Q3 FY26' },
    { date: '2025-09-30', value: 8.2, note: 'Q2 FY26' },
    { date: '2025-06-30', value: 7.6, note: 'Q1 FY26' },
    { date: '2025-03-31', value: 7.4, note: 'Q4 FY25' },
    { date: '2024-12-31', value: 6.2, note: 'Q3 FY25' },
    { date: '2024-09-30', value: 5.6, note: 'Q2 FY25' },
    { date: '2024-06-30', value: 6.7, note: 'Q1 FY25' }
  ],
  iip: [
    { date: '2026-05-31', value: 5.1 },
    { date: '2026-04-30', value: 4.9 },
    { date: '2026-03-31', value: 4.1 },
    { date: '2026-02-28', value: 5.2 },
    { date: '2026-01-31', value: 4.8 }
  ]
};
