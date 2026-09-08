# Baseline Test Report

Generated: 2026-09-07 (MarketPulse)

## Summary

| Test Suite | Total | Passed | Failed | Skipped | Duration | Status |
|---|---|---|---|---|---|---|
| `test_quarterly_revenue_correctness.test.js` | 181 | 181 | 0 | 0 | ~12m | PASS |
| `test_quarterly_revenue_suite.js` | 104 | 104 | 0 | 0 | ~6m | PASS |
| `test_stocks_performance_pipeline.js` | 163 | 163 | 0 | 0 | ~10m | PASS |
| `final_acceptance_check.js` | 174 | 174 | 0 | 0 | ~8m | PASS |
| `test_cross_fund_holdings_isolation.test.js` | 11 | 11 | 0 | 0 | ~38s | PASS |
| `test_aum_universe_separation.test.js` | 13 | 13 | 0 | 0 | ~15s | PASS |
| `test_indian_stock_ranking.js` | 25 | 25 | 0 | 0 | ~1m40s | PASS |
| `test_indian_mf_ranking.js` | 22 | 22 | 0 | 0 | ~4m | PASS |
| `frontend production build` | 1 | 1 | 0 | 0 | 7.49s | PASS |
| **Total Baseline** | **694** | **694** | **0** | **0** | **~42m** | **100% PASS** |

## Critical Invariants Verified

1. **Quarterly Revenue Same-Quarter YoY**: Latest reported quarter strictly compared against same reporting quarter one fiscal year earlier (Q1 FY27 $\rightarrow$ Q1 FY26). No array-index guessing, no sequential quarter fallback, no adjacent-quarter tolerance.
2. **Global Stock Ranking**: `indiaStockRank` is calculated globally across the Indian NSE/BSE equity universe (Reliance #1, TCS #2, HDFC Bank #3, ICICI Bank #4, SBIN #5). Immutable across search, sector, category, sorting, and pagination.
3. **Mutual Fund Universe & Ranking**: 2,743 active Direct Growth schemes strictly separated from Regular and IDCW plans. `indiaMfRank` is global AUM rank. Category/subcategory ranks are distinct and independent.
4. **Holdings Isolation**: Authentic portfolio disclosures strictly tied to scheme code & ISIN. Zero cross-fund contamination. When authoritative holdings are unavailable, returns `available: false, positions: [], dataStatus: "DATA_UNAVAILABLE"`. Zero fabrication.
