# MarketPulse Pre-Cleanup Repository Manifest

**Date & Time**: 2026-09-08 18:10 IST  
**Git Branch**: `main`  
**Git Status**: Clean working tree with pending modifications from the bugfix sprint  

---

## 1. Root Folders

| Folder | Status / Purpose | Target Action |
|---|---|---|
| `.git/` | Git repository tracking metadata | RETAIN (unchanged) |
| `frontend/` | React/Vite web application | RETAIN as primary top-level folder |
| `backend/` | Express/Node.js server & services | RETAIN as primary top-level folder |
| `data/` | Root-level data cache & disclosures | MERGE into `backend/data/`, then remove |
| `docs/` | Empty directory | REMOVE |
| `shared/` | Contains `dateRangeTests.json` | MOVE fixture to `backend/tests/fixtures/`, then remove |
| `node_modules/` | Root dependencies (concurrently) | RETAIN in local dev (gitignored) |

---

## 2. Root Files Inventory (20 Files)

### Project Configuration & Core
1. `package.json` (1,304 bytes) — Root npm orchestrator scripts (`install-all`, `dev`, `test:marketpulse`)
2. `package-lock.json` (12,748 bytes) — Dependency lockfile
3. `docker-compose.yml` (787 bytes) — Docker environment definition
4. `.gitignore` (367 bytes) — Git ignore rules
5. `README.md` (6,004 bytes) — Repository introduction, architecture & setup guide
6. `.DS_Store` (8,196 bytes) — macOS system artifact (to be deleted)

### Final Technical Documentation (Target: others/documentation/)
7. `MARKETPULSE_FINAL_TECHNICAL_DOCUMENTATION.pdf` (1,267,602 bytes) — 17-page Institutional PDF
8. `MARKETPULSE_FINAL_TECHNICAL_DOCUMENTATION.md` (47,902 bytes) — Canonical Markdown source
9. `MARKETPULSE_FINAL_TECHNICAL_DOCUMENTATION.html` (78,823 bytes) — High-fidelity HTML rendering

### Legacy / Duplicate Documentation (To be removed after verification)
10. `MarketPulse_Complete_Technical_Documentation.pdf` (1,228,308 bytes) — Older 13-page PDF baseline
11. `MarketPulse_Complete_Technical_Documentation.md` (48,156 bytes) — Older Markdown baseline
12. `MarketPulse_Complete_Technical_Documentation.html` (68,547 bytes) — Older HTML baseline

### Audits & Verifications (Target: others/audits/)
13. `MARKETPULSE_DATA_INTEGRITY_AUDIT.md` (13,015 bytes) — Data integrity audit
14. `MARKETPULSE_FINAL_AUDIT.md` (6,030 bytes) — Master production audit result
15. `MARKETPULSE_PDF_VERIFICATION.md` (15,244 bytes) — PDF structural verification report
16. `stocks_performance_optimization_audit.md` (8,931 bytes) — Stock pipeline performance audit

### Test Reports & References (Target: others/reports/)
17. `BASELINE_TEST_REPORT.md` (1,919 bytes) — Initial baseline test run
18. `MARKETPULSE_TEST_REPORT.md` (6,238 bytes) — Comprehensive test execution report
19. `MARKETPULSE_DOCUMENTATION_CHANGELOG.md` (8,605 bytes) — Documentation update changelog
20. `MARKETPULSE_API_REFERENCE.md` (14,662 bytes) — API endpoint reference guide

---

## 3. Data & Fixture Files

- `shared/dateRangeTests.json` (920 bytes) — 6 canonical test cases for date range parsing
- `data/amc_disclosures/` (8 files) — Verified identical to `backend/data/amc_disclosures/`
- `data/verified_aum_cache.json` (143,665 bytes) — Verified identical to `backend/data/verified_aum_cache.json`
- `data/amfi_active_schemes.json` (4,271,266 bytes) — Legacy snapshot (`backend/data/` contains newer 6.5 MB version)
- `data/mfapi_cache/` (2,743 files) — 17 files unique to root cache that must be merged into `backend/data/mfapi_cache/`

---

## 4. Tests Baseline Verification Status

Prior to cleanup, all 12 test stages passed:
- `test_dateRangeUtils.js` (6/6 PASS)
- `regression_mf_data.test.js` (8/8 PASS)
- `test_quarterly_revenue_correctness.test.js` (184/184 PASS)
- `test_quarterly_revenue_suite.js` (109/109 PASS)
- `test_stocks_performance_pipeline.js` (10/10 PASS)
- `final_acceptance_check.js` (176/176 PASS)
- `test_cross_fund_holdings_isolation.test.js` (11/11 PASS)
- `test_aum_universe_separation.test.js` (13/13 PASS)
- `test_indian_stock_ranking.js` (25/25 PASS)
- `test_indian_mf_ranking.js` (22/22 PASS)
- `master_production_audit.js` (1,779 audited, PASS)
- Frontend build (PASS, built in 5.71s, 0 errors, 0 warnings)
