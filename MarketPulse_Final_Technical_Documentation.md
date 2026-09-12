# MARKETPULSE
## Indian Stocks & Mutual Funds
### Data, Terms, Sources & Calculation Guide

**A simple user guide explaining MarketPulse data, rankings, ratings, formulas, sources and research metrics.**

---

### Document Overview & Control

- **Project Name**: MarketPulse (Indian Equities & Mutual Fund Market Intelligence Platform)
- **Document Version**: 3.0.0 (Final User-Facing Reference Edition)
- **Publication Date**: September 12, 2026
- **Purpose**: Clear, comprehensive guide for website users explaining where data comes from, what metrics mean, how rankings and stars work, exact formulas used, and how missing data is handled.
- **Coverage**: 12,536 deduplicated listed Indian equities (NSE and BSE across 30 sectors), 2,743 active Direct-Growth mutual fund schemes (across 40 AMCs), official portfolio holdings, and RBI macroeconomic indicators.
- **Data Integrity Policy**: Strict Zero-Fabrication Standard (Missing data is never replaced with zero, estimated values, or fake numbers. It is always shown as — or Data unavailable).
- **Intended Audience**: Investors, financial analysts, researchers, students, and everyday website users.

---

## Table of Contents

- [1. About MarketPulse](#1-about-marketpulse)
- [2. How MarketPulse Data Works](#2-how-marketpulse-data-works)
- [3. External Data Sources](#3-external-data-sources)
- [4. Data Classifications & Types](#4-data-classifications--types)
- [PART I — STOCKS](#part-i--stocks)
  - [5. Stock Overview](#5-stock-overview)
  - [6. Stock Sources](#6-stock-sources)
  - [7. Stock Data Behavior](#7-stock-data-behavior)
  - [8. Stock Terms](#8-stock-terms)
  - [9. Stock Rankings](#9-stock-rankings)
  - [10. Stock Star Marking](#10-stock-star-marking)
  - [11. Stock Calculations](#11-stock-calculations)
  - [12. Stock Performance](#12-stock-performance)
  - [13. Stock Screener](#13-stock-screener)
  - [14. Stock Limitations](#14-stock-limitations)
- [PART II — MUTUAL FUNDS](#part-ii--mutual-funds)
  - [15. Mutual Fund Overview](#15-mutual-fund-overview)
  - [16. Mutual Fund Sources](#16-mutual-fund-sources)
  - [17. Mutual Fund Data Behavior](#17-mutual-fund-data-behavior)
  - [18. Mutual Fund Terms](#18-mutual-fund-terms)
  - [19. Mutual Fund Rankings](#19-mutual-fund-rankings)
  - [20. Mutual Fund Star Marking](#20-mutual-fund-star-marking)
  - [21. Mutual Fund Performance](#21-mutual-fund-performance)
  - [22. Mutual Fund Risk Metrics](#22-mutual-fund-risk-metrics)
  - [23. Mutual Fund Portfolio Holdings](#23-mutual-fund-portfolio-holdings)
  - [24. Mutual Fund Screener](#24-mutual-fund-screener)
  - [25. Mutual Fund Limitations](#25-mutual-fund-limitations)
- [PART III — SHARED REFERENCE](#part-iii--shared-reference)
  - [26. Dynamic / Periodic / Calculated / Static / Manual](#26-dynamic--periodic--calculated--static--manual)
  - [27. Data Source vs Calculated Data](#27-data-source-vs-calculated-data)
  - [28. As-Of Date vs Update Date](#28-as-of-date-vs-update-date)
  - [29. Missing Data](#29-missing-data)
  - [30. Formula Reference](#30-formula-reference)
  - [31. Data Quality](#31-data-quality)
  - [32. Research Interpretation](#32-research-interpretation)
  - [33. Complete Glossary](#33-complete-glossary)
  - [34. Research Disclaimer](#34-research-disclaimer)

---

## 1. About MarketPulse

MarketPulse is an independent financial market intelligence and research website designed specifically for the Indian capital markets.

Its mission is to give every investor, analyst, researcher, and student clean, transparent, and authentic financial data.

### What MarketPulse Provides

1. **Indian Equities & Sectors**: Tracking of 30 standardized economic sectors (such as Nifty Bank, Nifty IT, Nifty Auto, Nifty FMCG) with live or delayed market data depending on the underlying feed (advancing, declining, and unchanged stocks) and constituent company performance.
2. **National Stock Directory**: Complete ranking of 12,536 listed Indian equities across both the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE), ranked strictly by full market capitalization.
3. **Quarterly Financials**: Quarterly financial data sourced from company filings, exchange disclosures and earnings reports, including Revenue from Operations, Operating Profit (EBIT), Net Profit, and true same-quarter Year-on-Year (YoY) growth.
4. **Mutual Fund Explorer**: An institutional-grade directory of 2,743 active Direct-Growth mutual fund schemes across 40 Asset Management Companies (AMCs), featuring 4-tier Assets Under Management (AUM) rankings, multi-period Compound Annual Growth Rate (CAGR) returns, and RBI-aligned risk ratios.
5. **Authentic Portfolio Holdings**: Detailed monthly portfolio disclosures for flagship schemes showing exact constituent stocks, debt holdings, sovereign securities, and cash weights.
6. **Multi-Factor Research Screeners**: Objective filtering tools allowing users to screen stocks and mutual funds using valuation, growth, financial health, returns, and risk criteria without commercial bias.

### Core Principles

- **Simplicity**: Complex financial concepts are presented in clear, accessible language without unnecessary jargon.
- **Data Authenticity**: Every number on MarketPulse comes from an authoritative primary source or a mathematically verified formula.
- **Zero Fabrication**: MarketPulse never generates fake numbers, placeholder revenue, simulated prices, or default ratios. If data is not reported by the company or regulator, it is clearly shown as —.
- **Apples-to-Apples Comparisons**: Mutual funds are categorized by plan and peer group to ensure fair comparisons (e.g. Direct Growth vs Direct Growth, Small Cap vs Small Cap).
- **Research Only**: MarketPulse is strictly an analytical and educational platform. It does not provide buy/sell advice, tips, price targets, or return guarantees.

---

## 2. How MarketPulse Data Works

Understanding where numbers come from is essential for smart investing and sound research. MarketPulse operates on a multi-stage data architecture designed to keep data fresh, accurate, and transparent.

### The 4-Step Data Flow

1. **Collection (Data Ingestion)**: MarketPulse connects to official regulatory portals, stock exchange feeds, and specialized financial market APIs. Live or delayed equity quotes depending on the underlying feed are ingested from Yahoo Finance; official daily Net Asset Values are fetched from AMFI; mutual fund stock portfolios, constituent holdings, equity weights, and sector breakdowns are fetched directly from FinAPI (Upvaly); quarterly corporate financial statements originate from BSE regulatory filings; and sovereign macroeconomic benchmarks are retrieved from the Reserve Bank of India (RBI).
2. **Cleaning & Normalization**: Raw data is checked for accuracy. Dual-listed stocks on NSE and BSE are deduplicated. Currency values are standardized into standard Indian numbering units (₹ Crores and Lakhs). Incompatible items (such as computing operating income for banks) are safely suppressed.
3. **Internal Calculations**: MarketPulse runs its own deterministic formulas to calculate metrics that are not provided directly by APIs. These include same-quarter YoY growth, multi-period price returns, AUM rankings, 3-year trailing Sharpe ratios, Sortino downside deviation, and beta against market benchmarks.
4. **Fast Delivery & Presentation**: Validated data is cached in memory to ensure near-instant page loading on the website. Live or delayed updates stream to user screens during market hours depending on the underlying feed.

### Trading Hours vs Post-Market Sessions

- **During Market Hours (9:15 AM to 3:30 PM IST, Monday to Friday)**: Stock prices, day change percentages, sector advances/declines, and intraday market breadth update dynamically with live or delayed market data depending on the underlying feed.
- **After Market Hours & Weekends**: Closing prices (Previous Close / LTP) remain static until the next trading session. Mutual fund NAVs update daily around 9:00 PM to 11:00 PM IST once published by AMFI.
- **Periodic Financial Updates**: Corporate earnings update quarterly as companies submit their results to stock exchanges. Mutual fund stock portfolios, constituent holdings, and AUM update periodically and monthly following FinAPI (Upvaly) synchronization and mandatory AMC disclosures.

---

## 3. External Data Sources

MarketPulse relies exclusively on verified external providers and official regulatory filing systems. The platform does not use synthetic feeds or unregulated scraping sources.

### Summary of Authoritative Providers

| Source Name | Organization Type | Primary Data Provided | Update Frequency |
|---|---|---|---|
| **Yahoo Finance (v2)** | Global Financial Data Feed | Live or delayed stock quotes depending on the underlying feed, OHLC prices, volume, market cap, historical price series, corporate profile. | Live / 15-min exchange delay during market hours |
| **FinAPI (Upvaly)** | Financial Market Data API | Mutual fund stock portfolios, constituent equity holdings, position weights, sector weightings, fund valuation multiples (P/E, P/B), verified scheme AUM. | Periodic / Monthly disclosures feed |
| **AMFI India** | Official Industry Regulator | Official daily Net Asset Values (NAV), scheme codes, ISINs, scheme classifications. | Daily (by 9:00 PM - 11:00 PM IST) |
| **Official AMC Disclosures** | Asset Management Companies | Monthly portfolio holdings, stock weights, sovereign securities, cash positions, scheme AUM (direct filings & offline fallback). | Monthly (typically by the 10th of each month) |
| **BSE Corporate Filings** | Stock Exchange Regulatory Portal | Quarterly financial statements, revenue from operations, net profit, scrip code cross-references. | Quarterly (as companies file results) |
| **Reserve Bank of India (RBI)** | Central Bank of India | 91-Day Treasury Bill yields, sovereign policy interest rates (used as risk-free benchmark). | Monthly / Periodic auction updates |
| **MFAPI Repository** | Historical Mutual Fund Cache | Long-term historical daily NAV time series for CAGR and multi-year risk calculations. | Daily synchronization |

---

## 4. Data Classifications & Types

Every metric displayed on MarketPulse belongs to one of seven distinct data classifications. Knowing the classification helps users understand how often a number changes and whether it is fetched or calculated.

1. **DYNAMIC**:
   - *Meaning*: Information that changes continuously during active market trading hours.
   - *Examples*: Current Stock Price (LTP), Day Change, Day Change %, Sector Advances/Declines, Traded Volume.
   - *Update Frequency*: Seconds to minutes during exchange hours.

2. **PERIODIC**:
   - *Meaning*: Information that updates at scheduled, fixed calendar intervals.
   - *Examples*: Daily Mutual Fund NAV, Monthly Scheme AUM, Monthly Portfolio Holdings, Quarterly Corporate Revenue and Profit.
   - *Update Frequency*: Daily, monthly, or quarterly.

3. **CALCULATED**:
   - *Meaning*: Numbers derived internally by MarketPulse using specific mathematical formulas applied to primary data.
   - *Examples*: Revenue YoY %, Net Profit YoY %, 3Y CAGR, Sharpe Ratio, Sortino Ratio, India Stock Rank, Category AUM Rank.
   - *Update Frequency*: Recomputed whenever underlying input data updates.

4. **STATIC**:
   - *Meaning*: Permanent or rarely changing reference information.
   - *Examples*: Company Name, NSE Ticker Symbol, BSE Scrip Code, ISIN, Sector Name, Fund Inception Date, AMC Name.
   - *Update Frequency*: Updated only upon corporate actions, rebrandings, or exchange reclassifications.

5. **MANUAL**:
   - *Meaning*: Verified administrative mappings maintained to ensure complete cross-exchange accuracy.
   - *Examples*: BSE Scrip to NSE Symbol mapping dictionaries, sector constituent basket definitions.
   - *Update Frequency*: Maintained by administrators as new securities list or indices rebalance.

6. **CACHED**:
   - *Meaning*: Previously fetched or calculated data stored in fast memory for instant webpage delivery.
   - *Examples*: Sector summary rollups, ranked stock lists, mutual fund directory snapshots.
   - *Update Frequency*: Automatically refreshed in the background according to predefined time-to-live (TTL) limits.

7. **DATA UNAVAILABLE**:
   - *Meaning*: Required source data has not been reported by the company, AMC, or exchange, or does not meet strict quality rules.
   - *Display on Website*: Displayed strictly as — or Data unavailable.
   - *Rule*: Never replaced with 0, an average, or an estimated guess.



---

# PART I — STOCKS

---

## 5. Stock Overview

MarketPulse provides comprehensive analytics for the Indian equity universe using live or delayed market data depending on the underlying feed, combined with verified historical time series.

### Scope of Coverage
- **12,536 Listed Equities**: Complete deduplicated universe of companies listed on the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE).
- **30 Standardized Economic Sectors**: Including Nifty 50, Nifty Bank, Nifty IT, Nifty Auto, Nifty FMCG, Nifty Pharma, Nifty Metal, Nifty Energy, Nifty Media, Nifty Realty, and sectoral sub-indices.
- **Dual-Listing Deduplication**: Indian companies frequently trade on both NSE and BSE under different symbols (e.g. `RELIANCE.NS` on NSE and `500325.BO` on BSE). MarketPulse groups dual listings under a single canonical company identity (`RELIANCE`) to prevent duplicate ranks and split market capitalizations.

### Key Visual & Analytical Features
1. **Interactive Sector Heatmaps**: Color-coded performance tiles showing which industries are gaining or losing on the trading day.
2. **Sector Breadth Summary Cards**:
   - *Total Sectors*: Count of monitored Indian market sectors (30).
   - *Advancing Sectors*: Sectors currently trading higher than previous close.
   - *Declining Sectors*: Sectors currently trading lower than previous close.
   - *Up Stocks*: Total constituent companies trading with positive day change.
   - *Down Stocks*: Total constituent companies trading with negative day change.
   - *Unchanged Stocks*: Total constituent companies trading at exactly 0.00% change.
3. **Inline Constituent Drill-Down**: Expanding any sector row instantly reveals its constituent stocks, their national ranks, prices, fundamentals, and returns without refreshing the page.

---

## 6. Stock Sources

MarketPulse integrates multiple authoritative data feeds to deliver complete equity coverage.

### 1. Yahoo Finance (v2 Market Feed)
- **Data Provided**: Last Traded Price (LTP), Open, High, Low, Previous Close, Trading Volume, Full Market Capitalization, 52-Week High, 52-Week Low, and historical daily price series (live or delayed market data depending on the underlying feed).
- **Data Type**: External API market feed data.
- **Update Frequency**: Live or delayed tick updates during market hours (9:15 AM to 3:30 PM IST); closing prices remain static post-market.
- **Important Limitations**: Standard public market feeds carry a 15-minute exchange delay during trading hours. Volume and closing prices are finalized during post-market reconciliation.

### 2. BSE Corporate Filings & Regulatory Announcements
- **Data Provided**: Quarterly financial statements, Revenue from Operations, Net Profit to Common Shareholders, EPS, and regulatory disclosures.
- **Data Type**: Periodic official exchange filing data.
- **Update Frequency**: Quarterly, as listed companies report earnings within 45 days of quarter-end.
- **Important Limitations**: Filing dates vary by company. Consolidated figures are prioritized; standalone figures are used only when consolidated statements are not filed.

### 3. MarketPulse Internal Financial Engine
- **Data Provided**: National Market Capitalization Rank (`indiaStockRank`), true same-quarter Year-on-Year (YoY) Revenue Growth, same-quarter Net Profit Growth, Reported EBIT in ₹ Crores, multi-period price returns (1W, 1M, 6M, 1Y, 3Y, 5Y, ALL), 52-Week Low Recovery %, and All-Time High Drawdown %.
- **Data Type**: Internal deterministic mathematical calculations.
- **Update Frequency**: Recalculated dynamically upon refreshed market quotes or quarterly filings.

---

## 7. Stock Data Behavior

The following comprehensive table details every stock metric implemented on MarketPulse, its source, update behavior, and missing data rule:

| Metric Name | Primary Source | Data Type | Update Frequency | Calculated? | Manual? | As-Of Date | Missing Data Rule |
|---|---|---|---|:---:|:---:|---|---|
| **Company Name** | BSE / NSE Reference | Static | Corporate Action | No | No | Listing date | Shows Ticker Symbol |
| **NSE Symbol** | NSE Master (`.NS`) | Static | Permanent | No | No | Listing date | — (if BSE only) |
| **BSE Code** | BSE Master (`.BO`) | Static | Permanent | No | Yes (map) | Listing date | — (if NSE only) |
| **ISIN** | NSDL / CDSL Master | Static | Permanent | No | No | Issuance date | — |
| **Sector** | MarketPulse Sector Map | Static | Reclassification | No | Yes (basket)| Rebalance date | Unclassified |
| **Industry** | GICS / Exchange Map | Static | Reclassification | No | No | Filing date | — |
| **Current Price (LTP)** | Yahoo Finance API | Dynamic | Live / 15m delay feed | No | No | Market feed time | — |
| **Day Change (₹)** | Yahoo Finance API | Dynamic | Live / 15m delay feed | Yes (LTP − Prev) | No | Market feed time | — |
| **Day Change %** | Yahoo Finance API | Dynamic | Live / 15m delay feed | Yes | No | Market feed time | — |
| **Open Price** | Yahoo Finance API | Dynamic | Daily at 9:15 AM | No | No | Current session | — |
| **Day High** | Yahoo Finance API | Dynamic | Intraday feed | No | No | Current session | — |
| **Day Low** | Yahoo Finance API | Dynamic | Intraday feed | No | No | Current session | — |
| **Previous Close** | Yahoo Finance API | Periodic | Daily post-market | No | No | Prior trading day | — |
| **Trading Volume** | Yahoo Finance API | Dynamic | Intraday cumulative | No | No | Current session | — |
| **Market Cap (₹ Cr)** | Yahoo Finance API | Dynamic | Live / 15m delay feed | Yes (Normalized) | No | Current session | — |
| **India Stock Rank** | MarketPulse Ranking Engine| Calculated| Session updates | Yes (MCap DESC) | No | Current session | — |
| **Quarterly Revenue** | BSE / Corporate Filings | Periodic | Quarterly | Yes (in ₹ Cr) | No | Fiscal quarter-end | — |
| **Revenue YoY %** | MarketPulse Engine | Calculated| Quarterly | Yes (Same-quarter)| No | Prior quarter-end | — |
| **Quarterly Net Profit** | BSE / Corporate Filings | Periodic | Quarterly | Yes (in ₹ Cr) | No | Fiscal quarter-end | — |
| **Net Profit YoY %** | MarketPulse Engine | Calculated| Quarterly | Yes (Same-quarter)| No | Prior quarter-end | — |
| **Reported EBIT (₹ Cr)** | MarketPulse Engine | Calculated| Quarterly / TTM | Yes (Rev × OpMargin)| No | Fiscal quarter-end | — (Not applicable for Banks) |
| **Operating Margin %** | Corporate Filings | Periodic | Quarterly / TTM | Yes (EBIT ÷ Rev) | No | Fiscal quarter-end | — |
| **Net Profit Margin %** | Corporate Filings | Periodic | Quarterly / TTM | Yes (Profit ÷ Rev)| No | Fiscal quarter-end | — |
| **Earnings Per Share (EPS)**| Corporate Filings | Periodic | Quarterly / TTM | No | No | Fiscal quarter-end | — |
| **P/E Ratio (Trailing)** | MarketPulse / Yahoo | Dynamic | Daily with LTP | Yes (Price ÷ EPS) | No | Current session | — |
| **P/B Ratio** | MarketPulse / Yahoo | Dynamic | Daily with LTP | Yes (Price ÷ Book)| No | Current session | — |
| **EV / EBITDA** | MarketPulse / Yahoo | Periodic | Quarterly / TTM | Yes | No | Current session | — |
| **PEG Ratio** | Corporate Filings | Periodic | Quarterly / TTM | Yes (PE ÷ Growth) | No | Current session | — |
| **Return on Equity (ROE)** | Corporate Filings | Periodic | Annual / TTM | Yes | No | Annual report date| — |
| **ROCE %** | Corporate Filings | Periodic | Annual / TTM | Yes | No | Annual report date| — |
| **Debt-to-Equity Ratio** | Corporate Filings | Periodic | Annual / TTM | Yes | No | Balance sheet date| — |
| **Interest Coverage** | Corporate Filings | Periodic | Annual / TTM | Yes | No | Fiscal quarter-end | — |
| **Current Ratio** | Corporate Filings | Periodic | Annual / TTM | Yes | No | Balance sheet date| — |
| **Dividend Yield %** | MarketPulse / Yahoo | Dynamic | Daily with LTP | Yes (Div ÷ Price) | No | Current session | — |
| **52-Week High** | Yahoo Finance API | Periodic | Daily rolling 52W | No | No | Rolling 52 weeks | — |
| **52-Week Low** | Yahoo Finance API | Periodic | Daily rolling 52W | No | No | Rolling 52 weeks | — |
| **52W Low Recovery %** | MarketPulse Engine | Calculated| Daily with LTP | Yes | No | Current session | — |
| **ATH Drawdown %** | MarketPulse Engine | Calculated| Daily with LTP | Yes | No | Current session | — |
| **1-Day Return %** | MarketPulse Engine | Dynamic | Daily with LTP | Yes (Day Change %)| No | Prior trading day | — |
| **1-Week Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (7-day lookback)| No | 7 days ago | — |
| **1-Month Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (1-mo lookback)| No | 1 month ago | — |
| **3-Month Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (3-mo lookback)| No | 3 months ago | — |
| **6-Month Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (6-mo lookback)| No | 6 months ago | — |
| **1-Year Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (1-yr lookback)| No | 1 year ago | — |
| **3-Year Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (3-yr lookback)| No | 3 years ago | — |
| **5-Year Return %** | MarketPulse Engine | Periodic | Daily with LTP | Yes (5-yr lookback)| No | 5 years ago | — |
| **ALL (Lifetime Return %)**| MarketPulse Engine | Periodic | Daily with LTP | Yes (From Inception)| No| First trading day | — |
| **Sector Advance/Decline** | MarketPulse Rollup | Dynamic | Live market hours | Yes (Breadth count)| No | Live market time | 0 |

---

## 8. Stock Terms

Clear, simple definitions for every equity term used across MarketPulse:

- **Company Name**: The legal name of the corporation (e.g. *Reliance Industries Ltd.*, *Tata Consultancy Services Ltd.*).
- **NSE Symbol**: The unique trading ticker assigned to the stock on the National Stock Exchange of India (e.g. `RELIANCE.NS`, `TCS.NS`).
- **BSE Code**: The numeric scrip identification code assigned by the Bombay Stock Exchange (e.g. `500325`, `532540`).
- **ISIN**: International Securities Identification Number — a 12-character global code uniquely identifying the security (e.g. `INE002A01018`).
- **Sector**: The broad economic area to which the company belongs (e.g. *Nifty Bank*, *Nifty Information Technology*, *Nifty Automobile*).
- **Industry**: The specific operational line of business within the sector (e.g. *Private Sector Bank*, *IT Consulting & Software*, *Commercial Vehicles*).
- **Current Price (LTP)**: Last Traded Price — the most recent price at which a trade occurred on the exchange.
- **Open Price**: The price at which the stock completed its first trade when the exchange opened at 9:15 AM IST.
- **Day High**: The highest transaction price recorded for the stock during today's trading hours.
- **Day Low**: The lowest transaction price recorded for the stock during today's trading hours.
- **Previous Close**: The official closing price of the stock at 3:30 PM on the preceding trading business day.
- **Day Change & Day Change %**: The absolute rupee difference and percentage change between the Current Price and the Previous Close.
- **Volume**: The total number of equity shares bought and sold during the current trading session.
- **Market Capitalization (Market Cap)**: The total rupee value of a company's equity, calculated as Current Share Price multiplied by Total Outstanding Shares.
- **Large Cap**: The top 100 largest listed companies in India by market capitalization.
- **Mid Cap**: Companies ranked 101 to 250 by market capitalization.
- **Small Cap**: Companies ranked 251 and below by market capitalization.
- **Revenue from Operations**: Money earned exclusively from primary commercial activities during the fiscal quarter, excluding other non-operating income.
- **Quarterly Revenue**: The total revenue generated in a specific 3-month financial period, expressed in ₹ Crores.
- **Revenue YoY %**: Year-on-Year percentage change comparing the current quarter's revenue with the exact same quarter of the previous calendar year.
- **Net Profit (Profit After Tax)**: The bottom-line financial surplus remaining after paying all operating costs, interest, depreciation, and corporate taxes.
- **Net Profit YoY %**: Year-on-Year percentage change comparing the current quarter's net profit with the exact same quarter of the previous calendar year.
- **Reported EBIT**: Earnings Before Interest and Taxes — a measure of core operational profitability in ₹ Crores.
- **Operating Margin %**: The percentage of revenue that turns into operating profit: `(EBIT ÷ Revenue) × 100`.
- **Net Profit Margin %**: The percentage of revenue that remains as net profit: `(Net Profit ÷ Revenue) × 100`.
- **Earnings Per Share (EPS)**: Net profit divided by the total number of common shares. It tells an investor how much profit each share earned.
- **Price-to-Earnings Ratio (P/E)**: Current share price divided by annual EPS. It shows how many rupees investors pay for each rupee of annual earnings.
- **Price-to-Book Ratio (P/B)**: Current share price divided by book value per share (net asset value). It shows what investors pay relative to liquidation value.
- **Return on Equity (ROE)**: Annual net income divided by shareholders' equity, expressed as a percentage. It measures how effectively management uses equity capital.
- **Return on Capital Employed (ROCE)**: Operating profit divided by total capital employed (equity plus long-term debt). It shows efficiency in generating profits from all available capital.
- **Debt-to-Equity Ratio**: Total corporate borrowings divided by shareholders' equity. High values indicate higher financial leverage.
- **Dividend Yield %**: Annual dividend paid per share divided by the current share price, expressed as a percentage.
- **52-Week High & Low**: The highest and lowest market prices recorded for the security over the past 52 trading weeks (one full year).
- **All-Time High (ATH)**: The single highest price ever recorded by the stock since its initial public listing.
- **Drawdown from ATH**: The percentage decline of the current share price from its historical All-Time High.
- **Recovery from 52W Low**: The percentage gain of the current share price from its 52-week low.

---

## 9. Stock Rankings

MarketPulse assigns a single, authoritative national market ranking to every Indian equity: **India Stock Rank** (`indiaStockRank`).

### How India Stock Rank Works
1. **Universe Scope**: The ranking encompasses the entire deduplicated Indian equity universe of **12,536 listed companies** across NSE and BSE.
2. **Ranking Criterion**: Companies are sorted strictly by full **Market Capitalization in descending order** (largest market cap to smallest market cap).
3. **Tie-Breaking Rule**: If two companies possess identical market capitalizations, the ranking breaks ties deterministically using alphabetical order of their canonical symbol ASC.
4. **Consecutive 1-Based Numbering**: The largest company in India is assigned **#1**, the second largest is assigned **#2**, and so on.
   - *#1*: Reliance Industries Ltd.
   - *#2*: Tata Consultancy Services Ltd.
   - *#3*: HDFC Bank Ltd.
   - *#4*: ICICI Bank Ltd.
   - *#5*: State Bank of India
5. **Deduplication Rule**: Dual-listed companies (trading simultaneously on NSE and BSE) receive a single canonical rank. For example, `RELIANCE.NS` and `RELIANCE.BO` both resolve to canonical `RELIANCE` at rank #1. Dual listings never consume two separate ranks.

### Absolute Invariance Rules
- **Sector Filtering**: Filtering by sector (e.g. looking only at *Nifty Bank*) **does NOT recalculate or renumber ranks**. HDFC Bank remains #3 nationally, ICICI Bank remains #4 nationally, and SBI remains #5 nationally. It does not renumber them #1, #2, #3.
- **Search Filtering**: Searching for a specific company name or ticker preserves its true national rank.
- **Table Sorting**: Sorting a table by Day Change %, P/E ratio, or 1-Year Return does not change the `indiaStockRank` column. It simply rearranges the rows.
- **Pagination**: Navigating between pages (e.g. viewing page 2 or rows 51 to 100) never alters a stock's assigned rank.
- **Missing Market Cap**: If a penny stock or newly suspended security lacks a verified market capitalization, its rank evaluates strictly to an unassigned value and displays as —.

### What India Stock Rank Is NOT
- It is **NOT** a recommendation to buy or sell.
- It is **NOT** a quality or financial safety score.
- It is **NOT** a prediction of future stock price performance.
- It simply reflects company size by market value in India today.

---

## 10. Stock Star Marking

### Official System Disclosure
**MarketPulse does NOT currently calculate, assign, or display an independent star rating or letter grade for individual stocks.**

### Why MarketPulse Does Not Assign Stock Star Ratings
1. **Zero Subjective Editorializing**: Unlike retail promotional portals that attach arbitrary 5-star badges or algorithmic buy signals to stocks, MarketPulse maintains an objective research standard.
2. **Transparent Accounting-Grade Data**: Instead of simplifying complex corporations into a single star rating, MarketPulse provides complete, unadulterated fundamental numbers: national market cap rank, reported revenue, same-quarter YoY growth, operating margin, debt ratios, and multi-period price returns.
3. **User Empowerment**: Investors and analysts evaluate companies based on their own criteria (e.g. valuation, growth, debt safety) rather than relying on black-box ratings.
4. **Display Behavior**: Stock cards and constituent tables display verified market metrics and national rank (`#1`, `#2`), with zero promotional star decorations.

---

## 11. Stock Calculations

MarketPulse applies deterministic mathematical formulas to calculate equity metrics.

### 1. Reported Operating Profit (EBIT in ₹ Cr)
- **Explanation**: Earnings Before Interest and Taxes represents the core operational profit of a non-financial corporation before capital structure decisions and taxes.
- **Formula**:
```formula
               Reported Total Revenue (TTM) × Reported Operating Margin (TTM)
EBIT (₹ Cr) = ──────────────────────────────────────────────────────────────
                                        10,000,000
```
- **Inputs**: Trailing Twelve Months (TTM) total revenue in ₹, TTM operating margin as a decimal ratio.
- **Unit Normalization**: Divided by 10,000,000 (10^7) to convert raw rupees into ₹ Crores.
- **THE FINANCIAL INSTITUTIONS RULE**:
  Commercial banks, non-banking financial companies (NBFCs), housing finance companies, and insurance corporations (such as *HDFC Bank*, *ICICI Bank*, *State Bank of India*, *Bajaj Finance*, *Axis Bank*, *Kotak Mahindra Bank*) evaluate EBIT strictly to non-applicable and display **—**.
  *Rationale*: In banking and financial institutions, interest expense is an operational cost of raw inventory (borrowed funds loaned out at interest spreads). Standard non-financial EBIT definitions are mathematically and economically invalid for financial institutions under Indian Accounting Standards (Ind AS) and IFRS.
- **Missing Data Rule**: If revenue or operating margin is unavailable, EBIT evaluates to —.

### 2. Operating Margin %
- **Explanation**: Shows how much operating cash profit a company extracts from every ₹100 of revenue.
- **Formula**:
```formula
                      Reported EBIT
Operating Margin % = ────────────────────────── × 100
                     Revenue from Operations
```
- **Missing Data Rule**: If either input is unavailable or revenue is zero, returns —.

### 3. Net Profit Margin %
- **Explanation**: Shows how much final net surplus remains from every ₹100 of revenue after all expenses, interest, and taxes.
- **Formula**:
```formula
                       Net Profit
Net Profit Margin % = ────────────────────────── × 100
                      Revenue from Operations
```
- **Missing Data Rule**: Returns — if revenue is zero or missing.

### 4. Price-to-Earnings Ratio (P/E)
- **Explanation**: Measures how many times annual earnings an investor pays for one share.
- **Formula**:
```formula
             Current Share Price
P/E Ratio = ────────────────────────────────────
            Trailing 12-Month Diluted EPS (TTM)
```
- **Missing Data Rule**: If EPS is negative (company made a loss) or zero, P/E displays as — (never a misleading zero or negative number).

### 5. Price-to-Book Ratio (P/B)
- **Explanation**: Compares market price to the company's accounting net worth per share.
- **Formula**:
```formula
             Current Share Price
P/B Ratio = ──────────────────────
             Book Value Per Share
```
- **Missing Data Rule**: Returns — if book value is negative or unreported.

### 6. Dividend Yield %
- **Explanation**: Measures the annual cash dividend payout relative to the stock's current market valuation.
- **Formula**:
```formula
                    Annual Dividend Per Share
Dividend Yield % = ─────────────────────────── × 100
                        Current Share Price
```
- **Missing Data Rule**: If the company paid zero dividends in the past 12 months or dividend data is unreported, Dividend Yield displays as 0.00% or —.

### 7. Day Change (₹) & Day Change %
- **Explanation**: Measures the intra-day price change from the previous session's official close.
- **Formulas**:
```formula
Day Change (₹) = Current Share Price − Previous Close

                Current Share Price − Previous Close
Day Change % = ────────────────────────────────────── × 100
                           Previous Close
```
- **Missing Data Rule**: If current price or previous close is unavailable, returns —.

### 8. Quarterly Revenue YoY Methodology (Same-Quarter Formula)
- **The Same-Quarter Principle**:
  Indian businesses frequently have seasonal revenue patterns. Comparing a quarter with the immediately preceding quarter (QoQ) gives a distorted view. True business growth must be measured against the exact same calendar quarter of the previous financial year:
  - **Apr–Jun 2026 = Q1 FY2027** compared with **Apr–Jun 2025 = Q1 FY2026**
  - **Jul–Sep 2026 = Q2 FY2027** compared with **Jul–Sep 2025 = Q2 FY2026**
  - **Oct–Dec 2026 = Q3 FY2027** compared with **Oct–Dec 2025 = Q3 FY2026**
  - **Jan–Mar 2027 = Q4 FY2027** compared with **Jan–Mar 2026 = Q4 FY2026**
- **Formula**:
```formula
                 Current Quarter Revenue − Same Quarter Last Year Revenue
Revenue YoY % = ────────────────────────────────────────────────────────── × 100
                             |Same Quarter Last Year Revenue|
```
- **Strict Data Integrity Rules**:
  - *Never Sequential QoQ*: MarketPulse NEVER compares Q2 with Q1 to generate YoY growth.
  - *Absolute Value Denominator*: Uses |Same Quarter Last Year Revenue| in the denominator to guarantee mathematical safety.
  - *Missing Prior Quarter*: If the exact same quarter from the prior year is missing, the calculation immediately evaluates to missing and displays as **—**. MarketPulse NEVER substitutes an adjacent quarter.

### 9. Quarterly Net Profit YoY Methodology
- **Formula**:
```formula
                    Current Quarter Net Profit − Same Quarter Last Year Net Profit
Net Profit YoY % = ──────────────────────────────────────────────────────────────── × 100
                             |Same Quarter Last Year Net Profit|
```
- **Example Calculation**:
  - Prior Year Same Quarter Profit: ₹100 Cr
  - Current Quarter Profit: ₹125 Cr
  - Net Profit YoY % = ((125 − 100) ÷ 100) × 100 = +25.00%

---

## 12. Stock Performance

MarketPulse tracks stock price performance across 9 standardized time horizons:
**1D (Day Change), 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, and ALL (Lifetime Inception)**.

### General Price Return Formula
For all equity horizons, returns represent simple capital price gains:
```formula
                  Current Share Price − Historical Benchmark Price
Price Return % = ────────────────────────────────────────────────── × 100
                             Historical Benchmark Price
```

### Horizon Definitions & Historical Lookback Dates
1. **1D (1 Day)**: Compares Current Price with Previous Close.
2. **1W (1 Week)**: Exact historical closing price 7 calendar days ago (nearest prior trading session).
3. **1M (1 Month)**: Exact historical closing price 1 calendar month ago (e.g. August 12 to September 12).
4. **3M (3 Months)**: Exact historical closing price 3 calendar months ago.
5. **6M (6 Months)**: Exact historical closing price 6 calendar months ago.
6. **1Y (1 Year)**: Exact historical closing price 52 calendar weeks (365 days) ago.
7. **3Y (3 Years)**: Exact historical closing price 156 calendar weeks ago.
8. **5Y (5 Years)**: Exact historical closing price 260 calendar weeks ago.
9. **ALL (Lifetime / Inception)**: Compares Current Price with the earliest official exchange listing close on record.

### Key Rules
- **Exclusion of Dividends**: Stock price return formulas reflect pure capital appreciation. Cash dividends are not added back into the stock price return series.
- **Distinct 5Y vs ALL**: Lifetime performance is strictly decoupled from 5-year performance. For example, a legacy bluechip like Infosys displays a +143,260% lifetime return since its 1993 debut, but a -33.14% return over the specific 5-year lookback window.
- **Missing History Tolerance**: If a stock listed less than 3 years ago (e.g. a recent IPO), its 3Y and 5Y return columns display **—**, while its 1M, 6M, and ALL columns display authentic figures.

### 52-Week Recovery
- **Explanation**: Measures how strongly a stock has rebounded from its lowest price over the past year.
- **Formula**:
```formula
                           Current Price − 52-Week Low
Recovery from 52W Low % = ───────────────────────────── × 100
                                   52-Week Low
```
- **Practical Meaning**: A value of +25.00% means the stock is trading 25% above its cheapest price of the last 52 weeks. The result is always zero or positive.

### ATH Drawdown (Drawdown from All-Time High)
- **Explanation**: Measures how far below its lifetime record peak the stock is currently trading.
- **Formula**:
```formula
                       Current Price − All-Time High
Drawdown from ATH % = ─────────────────────────────── × 100
                               All-Time High
```
- **Practical Meaning**: A stock trading at its record peak has an ATH Drawdown of 0.00%. A stock that has dropped 30% from its historical peak has an ATH Drawdown of -30.00%. The result is always zero or negative.

### Market Capitalization
- **Explanation**: The aggregate market valuation of the company's equity.
- **Formula**:
```formula
Market Capitalization = Current Share Price × Total Outstanding Shares

                    Market Capitalization (in ₹)
Market Cap (₹ Cr) = ────────────────────────────
                             10,000,000
```
- **Data Source**: MarketPulse ingests full market capitalization directly from the exchange market feed (Yahoo Finance / BSE) and normalizes it into standard ₹ Crores (1 Cr = 10,000,000 INR). MarketPulse does not invent share counts.

---

## 13. Stock Screener

The MarketPulse Stock Screener allows investors and analysts to filter the 12,536 Indian equities universe across 25+ quantitative parameters simultaneously.

### Implemented Screener Filters

1. **Exchange Filter**: National Stock Exchange (`NSE`) or Bombay Stock Exchange (`BSE`).
2. **Sector Filter**: Selection across all 30 Indian sectors (or `All`).
3. **Industry Filter**: Granular industry selection.
4. **Search Term**: Instant text search by company name, NSE symbol, or BSE code.
5. **India Stock Rank Range**: `minRank` and `maxRank` (e.g. Top 100 Large Caps).
6. **Market Capitalization Range**: `minMarketCapCr` and `maxMarketCapCr` in ₹ Crores.
7. **Valuation Multiples**:
   - P/E Ratio range (`minPe`, `maxPe`)
   - P/B Ratio range (`minPb`, `maxPb`)
   - EV/EBITDA range (`minEvEbitda`, `maxEvEbitda`)
   - PEG Ratio range (`minPeg`, `maxPeg`)
8. **Growth Metrics**:
   - Revenue YoY % range (`minRevenueYoY`, `maxRevenueYoY`)
   - Net Profit YoY % range (`minProfitYoY`, `maxProfitYoY`)
   - EPS Growth % range (`minEpsGrowth`, `maxEpsGrowth`)
9. **Return & Quality Ratios**:
   - ROE % range (`minRoe`, `maxRoe`)
   - ROCE % range (`minRoce`, `maxRoce`)
10. **Financial Health & Solvency**:
   - Debt-to-Equity range (`minDebtToEquity`, `maxDebtToEquity`)
   - Interest Coverage ratio range (`minInterestCoverage`, `maxInterestCoverage`)
   - Current Ratio range (`minCurrentRatio`, `maxCurrentRatio`)
11. **Profitability Margins**:
   - Operating Margin % range (`minOperatingMargin`, `maxOperatingMargin`)
   - Net Profit Margin % range (`minNetMargin`, `maxNetMargin`)
12. **Dividends**:
   - Dividend Yield % range (`minDividendYield`, `maxDividendYield`)
   - Dividend Payout Ratio range (`minPayoutRatio`, `maxPayoutRatio`)
13. **Momentum & Returns**:
   - 1-Month Return % range
   - 3-Month Return % range
   - 6-Month Return % range
   - 1-Year Return % range
   - % Distance from 52-Week Low
   - % Distance from All-Time High (Drawdown)

### Screener Invariants & Safety Gates
- **Missing Data Exclusion**: Missing values are NEVER treated as zero. If a user sets a filter `minRoe = 15%`, companies with missing ROE are excluded rather than coerced to zero.
- **Rank Preservation**: The screener preserves national `indiaStockRank` for all results.
- **Neutral Terminology**: Results are labeled as *Matches criteria* or *Research candidate*. The screener never produces labels such as *Strong Buy*, *Undervalued Gem*, or *Target Price*.

### Screener Direct Parameter Boundaries (Zero Synthetic Normalization)
MarketPulse does NOT transform fundamental metrics into synthetic composite scores, curve-fitted percentiles, or proprietary black-box ratings. Every screener filter applies deterministic inequality boundaries directly to verified raw data:
```formula
minThreshold ≤ Observed Metric Value ≤ maxThreshold
```
Missing data is never imputed as 0 or given a placeholder average; if a metric is unreported, the security is cleanly excluded from the range filter to maintain analytical integrity.

---

## 14. Stock Limitations

### Data Limitations
1. **Market Feed Latency**: Prices reflect live or delayed market data depending on the underlying feed (typically carrying an exchange delay of up to 15 minutes during trading sessions).
2. **Quarterly Reporting Cycle**: Companies report financial results every 3 months. Data remains unchanged between filing periods.
3. **Consolidated vs Standalone Differences**: MarketPulse prioritizes consolidated numbers (which include subsidiary operations). For holding companies or companies without subsidiaries, standalone statements are utilized.
4. **Historical Trading Depth**: Newly listed companies (IPOs) lack multi-year historical price series; long-term returns (3Y, 5Y) will be empty until sufficient trading history elapses.

### Missing Data Rules for Equities
- Missing Price: Displayed as —.
- Missing Quarterly Revenue: Displayed as —.
- Missing YoY %: Displayed as —.
- Negative P/E (Loss-making companies): Displayed as —.
- Operating Income for Financial Institutions: Displayed as —.
- **Zero Fabrication**: MarketPulse strictly prohibits guessing, averaging, or simulating missing stock metrics.



---

# PART II — MUTUAL FUNDS

---

## 15. Mutual Fund Overview

MarketPulse delivers institutional-grade mutual fund intelligence designed specifically for Indian fund investors and research analysts.

### Scope of Coverage
- **2,743 Active Direct-Growth Schemes**: Sourced directly from the official Association of Mutual Funds in India (AMFI) database across 40 asset management houses.
- **4 Broad Investment Categories**:
  1. *Equity Schemes* (Large Cap, Mid Cap, Small Cap, Flexi Cap, Multi Cap, Large & Mid Cap, Focused, ELSS Tax Saver, Value, Contra).
  2. *Hybrid Schemes* (Balanced Advantage, Aggressive Hybrid, Multi Asset Allocation, Arbitrage).
  3. *Debt Schemes* (Liquid, Corporate Bond, Banking & PSU, Gilt, Short Duration).
  4. *Solution Oriented & Other Schemes* (Retirement, Children, Index, ETFs).
- **The Direct-Growth Standard**: MarketPulse focuses strictly on **Direct Growth** plans.
  - *Direct Plans* bypass intermediary distributor commissions, ensuring higher compounding net returns for long-term investors.
  - *Growth Options* reinvest all dividends and capital profits back into the fund's NAV, providing a pure, unfragmented measure of total compound performance.

---

## 16. Mutual Fund Sources

MarketPulse integrates 5 primary regulatory and market data feeds for mutual funds:

### 1. FinAPI (Upvaly) — Primary Mutual Fund Holdings & Portfolio Engine
- **Endpoint**: `https://finapi.upvaly.com/api/mf/scheme-code/:schemeCode`
- **Data Provided**: Mutual fund stock portfolios, constituent equity holdings, position weights (%), market values (₹ Cr), sector allocation / weightings, fund expense ratio, 52-week high/low, P/E, P/B, and verified scheme AUM.
- **Data Type**: Authoritative REST API service.
- **Update Frequency**: Synchronized periodically and monthly upon AMC portfolio disclosures.
- **Role in MarketPulse**: Authoritative primary provider for mutual fund stock portfolio holdings. When a scheme is queried, MarketPulse queries FinAPI (Upvaly) first to retrieve authentic constituent stock holdings, weights, and sector weightings.

### 2. Association of Mutual Funds in India (AMFI)
- **Data Provided**: Official daily Net Asset Values (NAV), NAV dates, 6-digit numeric scheme codes, ISINs, and formal scheme category designations.
- **Data Type**: Official AMFI regulatory daily NAV feed.
- **Update Frequency**: Synchronized nightly between 9:00 PM and 11:00 PM IST on all business days.
- **Limitations**: Daily NAVs represent the previous business day's market close. AMFI daily files do not include underlying stock holdings.

### 3. Official Asset Management Company (AMC) Monthly Disclosures
- **Data Provided**: Official portfolio holdings, constituent equity weights (%), debt instruments, commercial paper, treasury bills, cash & TREPS positions, and total scheme AUM in ₹ Crores.
- **Data Type**: Official monthly regulatory Excel/CSV portfolio disclosures filed under SEBI regulations.
- **Update Frequency**: Monthly, typically between the 5th and 10th of each calendar month.
- **Role in MarketPulse**: Direct filing supplement and offline fallback source for flagship Indian mutual fund schemes across Parag Parikh, HDFC, ICICI Prudential, and SBI fund houses.

### 4. Reserve Bank of India (RBI) Benchmark Macro Data
- **Data Provided**: Sovereign 91-Day Treasury Bill (T-Bill) yields and policy rates.
- **Data Type**: Sovereign government debt benchmark.
- **Use in MarketPulse**: Serves as the authoritative Risk-Free Rate (Rf) and Minimum Acceptable Return (MAR) in all Sharpe and Sortino ratio calculations.
- **Update Frequency**: Updated following RBI primary treasury bill auctions.

### 5. MFAPI Historical NAV Repository
- **Data Provided**: Full historical daily NAV time series from each fund's inception date.
- **Data Type**: Cached historical time series.
- **Use in MarketPulse**: Powers multi-year return algorithms (1Y, 3Y, 5Y, Since Inception CAGR), monthly volatility modeling, and maximum drawdown tracking.

---

## 17. Mutual Fund Data Behavior

The following comprehensive table details every mutual fund metric implemented on MarketPulse:

| Metric Name | Primary Source | Data Type | Update Frequency | Calculated? | Manual? | As-Of Date | Missing Data Rule |
|---|---|---|---|:---:|:---:|---|---|
| **Scheme Name** | AMFI Master | Static | Permanent | No | No | Registration | — |
| **Scheme Code** | AMFI 6-Digit ID | Static | Permanent | No | No | Registration | — |
| **ISIN** | NSDL / CDSL Master | Static | Permanent | No | No | Issuance | — |
| **AMC (Fund House)**| AMFI / Factsheet | Static | Permanent | No | No | Registration | — |
| **Category** | AMFI Taxonomy | Static | SEBI Standard | No | No | Scheme launch | Other |
| **Subcategory** | AMFI / Scheme Info | Static | SEBI Standard | No | No | Scheme launch | General |
| **Plan Type** | Scheme Name Master | Static | Filtered (Direct)| No | No | Scheme launch | Direct |
| **Option** | Scheme Name Master | Static | Filtered (Growth)| No | No | Scheme launch | Growth |
| **Current NAV (₹)** | AMFI Official Feed | Dynamic | Daily (9-11 PM IST)| No | No | Latest trade day | — |
| **NAV Date** | AMFI Official Feed | Periodic | Daily | No | No | Latest trade day | — |
| **Scheme AUM (₹ Cr)**| FinAPI / AMC Disclosure| Periodic | Monthly | Yes (Normalized) | No | Month-end filing | — |
| **Global AUM Rank** | MarketPulse Engine | Calculated| Monthly / Session | Yes (AUM DESC) | No | Active cache | — (if AUM missing) |
| **Category AUM Rank**| MarketPulse Engine | Calculated| Monthly / Session | Yes (Within Cat) | No | Active cache | — (if AUM missing) |
| **Subcategory Rank**| MarketPulse Engine | Calculated| Monthly / Session | Yes (Within Sub) | No | Active cache | — (if AUM missing) |
| **Sector / Theme Rank**| MarketPulse Engine | Calculated| Monthly / Session | Yes (Within Sec) | No | Active cache | — (if AUM missing) |
| **Star Marking (★)**| MarketPulse Engine | Calculated| Daily with NAVs | Yes (3-Way Rule) | No | Active session | Non-starred |
| **1-Day Return %** | MarketPulse Engine | Dynamic | Daily with NAV | Yes (Day change) | No | Prior trade day | — |
| **1-Week Return %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (7-day lookback)| No | 7 days ago | — |
| **1-Month Return %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (1-mo lookback)| No | 1 month ago | — |
| **3-Month Return %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (3-mo lookback)| No | 3 months ago | — |
| **6-Month Return %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (6-mo lookback)| No | 6 months ago | — |
| **1-Year Return %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (Absolute/CAGR)| No | 1 year ago | — |
| **3-Year CAGR %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (Annualized) | No | 3 years ago | — (< 3Y history)|
| **5-Year CAGR %** | MarketPulse Engine | Periodic | Daily with NAV | Yes (Annualized) | No | 5 years ago | — (< 5Y history)|
| **Since Inception CAGR**| MarketPulse Engine | Periodic | Daily with NAV | Yes (Annualized) | No | Fund launch date | — (< 360 days) |
| **Volatility (Annual)**| MarketPulse Engine | Periodic | Daily / Monthly | Yes (Monthly stddev)| No | 36-mo rolling | — (< 3Y history)|
| **3Y Trailing Sharpe** | MarketPulse Engine | Periodic | Daily / Monthly | Yes (Excess return) | No | 36-mo rolling | Inception fallback |
| **3Y Trailing Sortino**| MarketPulse Engine | Periodic | Daily / Monthly | Yes (Downside dev) | No | 36-mo rolling | Inception fallback |
| **Beta** | MarketPulse Engine | Periodic | Monthly | Yes (vs Nifty 50) | No | 36-mo rolling | 1.0 (fallback when history unavailable) |
| **Jensen's Alpha %** | MarketPulse Engine | Periodic | Monthly | Yes (vs Nifty 50) | No | 36-mo rolling | — |
| **Maximum Drawdown %**| MarketPulse Engine | Periodic | Daily / Monthly | Yes (Peak-to-trough)| No | Full NAV series | — |
| **Expense Ratio %** | FinAPI / AMC Factsheet| Periodic | Monthly | No | No | Monthly report | — |
| **Portfolio Holdings**| FinAPI (Upvaly) / AMC | Periodic | Monthly | No | No | Month-end filing | Data unavailable|
| **Holding Weight %** | FinAPI (Upvaly) / AMC | Periodic | Monthly | No (Direct) | No | Month-end filing | Data unavailable|
| **Holding Rank** | MarketPulse Engine (FinAPI)| Calculated| Monthly | Yes (Weight DESC)| No | Month-end filing | Data unavailable|
| **Sector Allocation %**| FinAPI (Upvaly) / AMC | Calculated| Monthly | Yes (Weight sum) | No | Month-end filing | Data unavailable|
| **Portfolio P/E & P/B**| FinAPI (Upvaly) | Periodic | Monthly | No (Direct) | No | Monthly report | — |

---

## 18. Mutual Fund Terms

Clear, simple definitions for every mutual fund term used across MarketPulse:

- **Net Asset Value (NAV)**: The price of one single unit of the mutual fund scheme, representing the per-unit market value of all underlying investments after subtracting operating expenses.
- **Assets Under Management (AUM)**: The total market value of all investor capital currently managed by the fund, expressed in ₹ Crores.
- **Asset Management Company (AMC)**: The corporate investment firm (Fund House) legally registered to manage mutual funds (e.g. *PPFAS Mutual Fund*, *HDFC Asset Management*, *SBI Funds Management*).
- **Direct Plan**: A mutual fund plan purchased directly through the AMC or registered portals without a middleman distributor, resulting in lower ongoing management charges and higher investor returns.
- **Regular Plan**: A mutual fund plan sold through distributors or brokers where commission expenses are deducted daily from the fund's NAV.
- **Growth Option**: An investment option where all interest, dividends, and capital gains remain inside the scheme to compound over time. No dividends are paid out in cash.
- **IDCW Option**: Income Distribution cum Capital Withdrawal — an option where the fund occasionally pays cash out to the investor, reducing the NAV by the exact amount distributed.
- **Broad Category**: The high-level asset class of the fund per SEBI regulations (e.g. *Equity*, *Debt*, *Hybrid*, *Solution Oriented*).
- **Subcategory**: The specific investment mandate within the broad category (e.g. *Flexi Cap Fund*, *Large Cap Fund*, *Liquid Fund*, *Balanced Advantage Fund*).
- **Expense Ratio (TER)**: Total Expense Ratio — the annual percentage fee deducted daily from fund assets to cover portfolio management, administration, custody, and legal costs.
- **Portfolio Holdings**: The comprehensive list of individual corporate shares, bonds, commercial paper, and government debt held inside the fund.
- **Holding Weight %**: The percentage of the fund's total assets invested in a specific individual stock or security.
- **Holding Rank**: The position of a security within that specific mutual fund, ordered from largest position (#1) to smallest position.
- **Sector Allocation**: The percentage breakdown of fund assets across various economic industries (e.g. 28.5% in Financial Services, 18.2% in Information Technology).
- **Portfolio Concentration**: A risk metric measuring how much of the fund is concentrated in its Top 5 or Top 10 largest holdings.
- **Compound Annual Growth Rate (CAGR)**: The annualized constant rate of return required for an investment to grow from its initial value to its final value over multiple years.
- **Annualized Volatility**: A statistical measure of how wildly or smoothly a fund's returns fluctuate month to month. Higher volatility means larger price swings.
- **Sharpe Ratio**: A risk-adjusted performance score showing how much extra return a fund generated above the risk-free rate for each unit of total volatility risk taken.
- **Sortino Ratio**: A refined risk score that penalizes only bad downside volatility (losses below the risk-free benchmark), ignoring positive upward price surges.
- **Beta**: A measure of a fund's price sensitivity compared to the broad stock market index (Nifty 50 TRI).
- **Jensen's Alpha**: The percentage of excess return generated by the fund manager above what would be expected given the fund's market risk (Beta).
- **Maximum Drawdown**: The largest percentage decline in NAV from a previous historical peak to the subsequent lowest trough.

---

## 19. Mutual Fund Rankings

MarketPulse implements a deterministic, multi-level ranking hierarchy for mutual funds based strictly on verified scheme scale:

```formula
Ranking Input = Scheme AUM in ₹ Crores (DESC)
```

### The 4 Ranking Tiers

1. **Global India MF Rank (`indiaMfRank`)**:
   - Compares the scheme across **ALL 2,743 valid active schemes** in India.
   - Ranked #1 to #N purely by AUM in ₹ Crores descending.
2. **Category Rank (`indiaMfCategoryRank`)**:
   - Compares the scheme only against other schemes in its **broad asset class** (e.g. across all *Equity* funds or all *Debt* funds).
   - Ranked #1 to #M within that category.
3. **Subcategory Rank (`indiaMfSubcategoryRank`)**:
   - Compares the scheme strictly against its **direct peer group** (e.g. *Flexi Cap* vs *Flexi Cap*, *Small Cap* vs *Small Cap*).
   - Ranked #1 to #K within that exact subcategory.
4. **Sector / Theme Rank (`indiaMfSectorRank`)**:
   - Evaluates sectoral and thematic schemes against their specific industry peers (e.g. *Technology Funds* or *Healthcare Funds*).

### Why Multiple Ranks Exist: A Real-World Example
A fund can easily have different numbers across the 4 tiers:
- **Parag Parikh Flexi Cap Fund (Direct-Growth)**:
  - **Global India MF Rank**: **#22** (22nd largest fund in all of India across all asset classes).
  - **Category Rank**: **#12** (12th largest fund in the entire broad Equity category).
  - **Subcategory Rank**: **#3** (3rd largest fund in the specific Flexi Cap peer group).

This 4-tier structure allows users to evaluate a fund's scale from the national macro level down to its immediate peer group.

### Strict Invariance Rules
- **AUM DESC Only**: Rankings are based strictly on AUM size. They are NEVER ordered by short-term returns, past 1-month gains, Sharpe ratio, or popularity.
- **Missing AUM**: Schemes without verified AUM disclosures remain unranked across all ranking tiers and display as **—**.
- **Immutable Across Filters**: Searching for a fund, filtering by AMC, sorting by 3-year return, or moving between pagination pages NEVER recalculates or overwrites assigned ranks.
- **Complete Isolation from Stocks**: Mutual fund rankings are 100% separate from stock market cap rankings (`indiaStockRank`).

---

## 20. Mutual Fund Star Marking

### The Official 3-Way Star Algorithm
MarketPulse identifies outstanding long-term performers within each mutual fund subcategory using a deterministic **3-Way Star Algorithm** executed by the MarketPulse ranking engine.

A fund receives the **Gold Star Badge (★)** if and only if it qualifies through the following strict mathematical criteria:

```formula
Gold Star Schemes = Top 3 by Scheme AUM within { Top 10 by 5Y CAGR ∩ Top 10 by Inception CAGR }
```

```
Step 1: Top 10 by 5-Year CAGR (within peer subcategory)
                           ∩
Step 2: Top 10 by Since-Inception CAGR (within peer subcategory)
                           │
                           ▼
Step 3: Intersection Set -> Sorted by AUM (DESC: Largest to Smallest)
                           │
                           ▼
Step 4: Top 3 schemes receive the Gold Star Badge (★)
        (If < 3 funds in intersection, backfill up to 3 from Top 10 5Y by AUM)
```

### Step-by-Step Selection Mechanics
1. **5-Year Growth Leaderboard**: Identify the top 10 schemes in the peer subcategory with the highest verified 5-Year CAGR.
2. **Since-Inception Growth Leaderboard**: Identify the top 10 schemes in the peer subcategory with the highest verified Since-Inception CAGR.
3. **Common Intersection**: Find all schemes that appear in **BOTH** top 10 lists (demonstrating both 5-year sustained returns and lifetime compounding). Sort this intersection set by **AUM descending** (largest to smallest).
4. **Top 3 Star Allocation**:
   - If the intersection has 3 or more schemes, the **top 3 by AUM** receive the Star.
   - **Fallback Rule**: If fewer than 3 schemes qualify in the intersection, the remaining slots (up to 3) are filled from the Top 10 5-Year CAGR leaderboard, ordered by AUM descending.
   - Exactly 3 funds (or fewer if the entire subcategory contains fewer than 3 funds) receive the Star Badge in each peer subcategory. All other schemes are designated as non-starred.

### Objective Foundation of the Star
- The star is strictly rule-based and deterministic. It is **NOT** a commercial endorsement, subjective recommendation, or paid sponsorship.
- The star is determined exclusively by the documented criteria: 5-Year CAGR, Since-Inception CAGR, verified AUM, and top-10 intersection with AUM ordering.
- Other risk metrics (such as Sharpe ratio, Sortino ratio, volatility, or drawdown) are displayed independently for research purposes and do not determine star qualification.

---

## 21. Mutual Fund Performance

MarketPulse computes mutual fund returns across 7 standard horizons:
**1M, 3M, 6M, 1Y, 3Y, 5Y, and ALL (Since Inception)**.

### 1. Monthly NAV Return (Ri)
Measures the percentage change in net asset value between consecutive month-end valuation dates:
```formula
                      Month-End NAV(t) − Month-End NAV(t-1)
Monthly Return (Ri) = ─────────────────────────────────────
                                Month-End NAV(t-1)
```

### 2. Short-Term Horizons (< 1 Year: 1M, 3M, 6M)
Short-term performance is calculated as **Simple Absolute Return**:
```formula
                     Current NAV − Historical Benchmark NAV
Absolute Return % = ──────────────────────────────────────── × 100
                            Historical Benchmark NAV
```

### 3. Long-Term Horizons (≥ 1 Year: 1Y, 3Y, 5Y, ALL)
Long-term performance is calculated as **Compound Annual Growth Rate (CAGR)** to reflect the true annualized compounding rate:
```formula
CAGR % = [ (Current NAV ÷ Historical Benchmark NAV) ^ (365.25 ÷ Number of Days) − 1 ] × 100
```

### Calendar Mechanics & Precision
- **Leap-Year Normalization**: MarketPulse uses **365.25 days** in the exponent to account accurately for leap years over multi-year horizons.
- **Calendar Lookback Windows**:
  - *1M*: Exactly 1 calendar month ago (e.g. Aug 12 to Sep 12).
  - *3M*: Exactly 3 calendar months ago.
  - *6M*: Exactly 6 calendar months ago.
  - *1Y*: Exactly 365 calendar days ago.
  - *3Y*: Exactly 3 × 365.25 calendar days ago.
  - *5Y*: Exactly 5 × 365.25 calendar days ago.
  - *ALL (Since Inception)*: Exactly from the fund's official launch date.
- **Nearest Prior Trading Day Matching**: If the exact lookback target date fell on a weekend or public market holiday, the engine snaps deterministically to the **nearest valid NAV on or immediately before** that date (never looking forward into the future).
- **Tolerance Window**: Snapping is allowed within a maximum tolerance window of 30 calendar days. If no valid NAV exists within that window, the return evaluates to **—**.
- **Inception Return Eligibility**: If a scheme has operated for less than 360 calendar days, its *ALL* column displays simple absolute return; once it crosses 360 days, it transitions automatically to annualized CAGR.

---

## 22. Mutual Fund Risk Metrics

MarketPulse computes accounting-grade risk ratios aligned with official Reserve Bank of India (RBI) sovereign benchmarks.

### 1. Annualized Volatility (Standard Deviation)
- **Explanation**: Measures how much a fund's monthly returns swing around their average. Low volatility indicates a smooth ride; high volatility indicates sharp swings.
- **Lookback Window**: Latest **36 monthly NAV returns** (derived from 37 consecutive month-end NAV observations).
- **Formulas**:
```formula
Monthly Volatility (σ_monthly) = √[ Σ (Ri − R̄)² ÷ (N − 1) ]

Annualized Volatility = σ_monthly × √12
```
- **Annualization Factor**: Multiplied by √12 (12 calendar months per year).
- **Minimum Requirement**: Minimum 36 monthly returns. Returns — if history is shorter than 3 years.

### 2. Sharpe Ratio (3-Year Trailing Primary)
- **Explanation**: Measures excess return generated per unit of total risk. A higher Sharpe ratio indicates superior risk compensation.
- **Formula**:
```formula
                R̄_excess,monthly
Sharpe Ratio = ────────────────── × √12
                   σ_monthly

where:
R̄_excess,monthly = (1 ÷ N) × Σ (Ri − Rf,monthly)
```
- **Risk-Free Rate (Rf)**: Sourced from the **RBI 91-Day Treasury Bill** annual yield.
```formula
Monthly MAR = (1 + Rf,annual) ^ (1 ÷ 12) − 1
```
- **Evaluation Window**: Primary exposure is **3-Year Trailing Sharpe**.
- **Since-Inception Fallback**: If a scheme has between 12 and 35 monthly returns, the engine automatically falls back to Since-Inception Sharpe, ensuring newer funds still display verified risk metrics without breaking comparability.
- **Missing Data Rule**: Returns — if RBI rate is unverified or NAV history is under 12 months.

### 3. Sortino Ratio (Downside Risk Engine)
- **Explanation**: Similar to Sharpe, but penalizes **ONLY downside losses** below the risk-free rate. It does not penalize good upward volatility.
- **Formulas**:
```formula
                 R̄_excess,monthly
Sortino Ratio = ─────────────────────────── × √12
                Downside Deviation_monthly

Downside Deviation_monthly = √[ (1 ÷ N) × Σ min(Ri − Rf,monthly, 0)² ]
```
- **Minimum Acceptable Return (MAR)**: Monthly RBI 91-Day T-Bill rate.
- **Downside Only**: Any month where the fund outperformed the T-Bill contributes 0 to the downside penalty.

### 4. Beta (Market Sensitivity)
- **Explanation**: Measures how sensitively the fund moves relative to the broad market index (Nifty 50 TRI).
- **Formula**:
```formula
         Cov(Rfund, Rmarket)
Beta = ───────────────────────
            Var(Rmarket)
```
- **Interpretation**:
  - *Beta = 1.0*: The fund tends to move in tandem with the Nifty 50.
  - *Beta > 1.0*: The fund is more volatile than the market.
  - *Beta < 1.0*: The fund is less volatile and cushions market swings.
- **Fallback Value & Integrity Notice**:
  When a fund has fewer than 36 monthly returns or benchmark return series are unavailable, 1.0 may be a fallback value when required benchmark/history data is unavailable. It does not necessarily represent a measured Beta of exactly 1.0. MarketPulse never presents unmeasured fallback values as empirical regressions.

### 5. Jensen's Alpha
- **Explanation**: Measures the excess return generated by the fund manager above the return predicted by the fund's market risk (Beta).
- **Formula**:
```formula
Jensen's Alpha = R_fund − [ Rf + Beta × (R_market − Rf) ]
```
- **Practical Meaning**: A positive alpha (e.g. +3.50%) indicates the fund beat its risk-adjusted benchmark by 3.5% per year. Positive historical alpha does not guarantee future outperformance.

### 6. Maximum Drawdown
- **Explanation**: Shows the largest historical loss an investor would have experienced from peak to trough.
- **Formula**:
```formula
                        Lowest NAV Trough − Highest Prior NAV Peak
Maximum Drawdown % = ──────────────────────────────────────────────── × 100
                                Highest Prior NAV Peak
```
- **Practical Meaning**: Shows historical worst-case pain. A maximum drawdown of -18.5% means the fund once fell 18.5% from its high before recovering.

---

## 23. Mutual Fund Portfolio Holdings

MarketPulse provides verified portfolio transparency for Indian mutual fund schemes, fetching fund stock portfolios, constituent equity holdings, and sector weightings primarily from **FinAPI (Upvaly)** (`https://finapi.upvaly.com`), supplemented by official AMC monthly disclosures.

### Where Holdings Come From
- **Primary Live Provider: FinAPI (Upvaly)**: Queried dynamically via `https://finapi.upvaly.com/api/mf/scheme-code/:schemeCode`. It returns authentic constituent stock positions with company names, weight percentages, market values (₹ Cr), and sector allocations.
- **Direct AMC Disclosure Supplement**: Official monthly regulatory Excel/CSV portfolio statements published on AMC portals (such as PPFAS, HDFC, ICICI Prudential, and SBI) integrated as an offline cache fallback.
- **As-Of Reporting Date**: Clearly extracted from the source disclosure timestamp (e.g. *Portfolio as of June 30, 2026*).

### Ingestion & Processing Architecture
1. **Primary Query**: When a scheme details page or holdings view is requested, the backend service queries FinAPI (Upvaly) for the specified 6-digit AMFI scheme code.
2. **Payload Normalization**: The API response is parsed for individual holding objects:
   - `name`: Official corporate name of the held equity or security.
   - `weightage` / `weight`: Exact percentage allocation within the fund's total portfolio.
   - `marketValue`: Disclosed market valuation in ₹ Crores.
   - `sector`: Standardized economic sector assigned to the holding.
3. **Sector Breakdown**: Sector allocations are aggregated directly from the disclosed holdings or ingested from the API's `sector_weightings` payload.
4. **Fallback Handling**: If FinAPI (Upvaly) is temporarily unreachable or has not yet cataloged disclosures for a flagship fund, MarketPulse falls back to its local AMC disclosure cache.

### Asset Classes Monitored
1. **Indian Listed Equities**: Complete constituent stock positions (e.g. HDFC Bank, ICICI Bank, ITC, Infosys, Reliance Industries).
2. **Foreign Equities**: Overseas holdings disclosed by international and flexi-cap schemes (e.g. Alphabet Inc., Microsoft Corp., Amazon.com Inc., Meta Platforms Inc.).
3. **Debt Securities**: Corporate bonds, commercial paper, non-convertible debentures (NCDs), and certificates of deposit (CDs).
4. **Sovereign Securities**: Government of India dated securities (G-Secs) and State Development Loans (SDLs).
5. **Cash & Short-Term Assets**: Triparty Repo (TREPS), reverse repo, bank fixed deposits, and net current assets.

### Holding Weight & Ranking Rules
- **Direct Disclosed Weight**: Sourced exactly as reported by FinAPI (Upvaly) and AMC disclosures (e.g. `7.55%`).
- **NO Artificial Renormalization**: MarketPulse NEVER artificially inflates equity holdings to force a 100% total. If equity holdings total 78.4% and cash is 21.6%, the exact reported percentages are displayed without distortion.
- **Fund Holding Rank Formula**:
```formula
Holding Rank = Sort Index in { Fund Portfolio Holdings ordered by Position Weight DESC }
```
- **Fund Sector Allocation Formula**:
```formula
Sector Allocation % = Σ (Disclosed Position Weights of Holdings belonging to Sector S)
```

### Holding Rank vs India Stock Rank
- **Holding Rank**: The ranking of that stock **inside that specific fund** (e.g. HDFC Bank is #1 Holding in Fund A at 8.2%).
- **India Stock Rank**: The stock's position in the **entire national Indian market cap universe** (e.g. HDFC Bank is #3 nationally in India).
- *They are completely independent*: A mid-cap company ranked #180 nationally could be the #1 largest holding inside a Mid Cap fund.

### Supported Coverage vs Unsupported Schemes
- MarketPulse queries FinAPI (Upvaly) as the primary holdings provider for all active mutual fund schemes.
- Where FinAPI (Upvaly) or official AMC disclosures provide verified holdings, they are displayed with complete source provenance (`FinAPI (Upvaly)` or `Official AMC Disclosure`).
- If neither FinAPI (Upvaly) nor official AMC filings contain disclosed portfolio holdings for a fund, MarketPulse strictly adheres to the **Zero-Fabrication Standard**: the holdings endpoint returns `DATA_UNAVAILABLE` with an empty position list rather than fabricating mock holdings.

### Scheme AUM vs AMC AUM vs Industry AUM
- **Scheme-Level AUM**: The total asset size of that specific mutual fund scheme (illustrative example: *Parag Parikh Flexi Cap Fund manages approximately ₹72,500 Cr as of mid-2026 reporting*). This is the number used for all MarketPulse AUM rankings.
- **AMC Total AUM**: The aggregate assets managed across all funds by that entire fund house (illustrative example: *HDFC AMC manages over ₹6,50,000 Cr across all its schemes as of 2026*).
- **Industry Total AUM**: The total value of all mutual fund assets in India across all AMCs (illustrative example: *over ₹65 Lakh Crores as of mid-2026*).

---

## 24. Mutual Fund Screener

The MarketPulse Mutual Fund Screener enables multi-factor filtering across the active Indian mutual fund universe.

### Screener Direct Range Boundaries (Zero Synthetic Normalization)
MarketPulse evaluates all mutual fund filters directly against verified empirical metrics without synthetic scaling or arbitrary scores:
```formula
minThreshold ≤ Observed Scheme Metric ≤ maxThreshold
```

### Implemented Mutual Fund Filters
1. **Plan Filter**: `Direct` (default) or `Regular`.
2. **Option Filter**: `Growth` (default) or `IDCW`.
3. **AMC Filter**: Filter by fund house (e.g. *Parag Parikh*, *HDFC*, *SBI*, *ICICI Prudential*, or `All`).
4. **Category Filter**: *Equity*, *Debt*, *Hybrid*, *Solution Oriented*, *Other*.
5. **Subcategory Filter**: Granular peer groups (*Flexi Cap*, *Large Cap*, *Small Cap*, *Liquid*, *Balanced Advantage*).
6. **AUM Range (₹ Cr)**: `minAumCr` and `maxAumCr`.
7. **Ranking Ranges**:
   - Global AUM Rank range (`minGlobalRank`, `maxGlobalRank`)
   - Category Rank range (`minCategoryRank`, `maxCategoryRank`)
   - Subcategory Rank range (`minSubcategoryRank`, `maxSubcategoryRank`)
8. **Expense Ratio Range**: `minExpenseRatio` and `maxExpenseRatio`.
9. **Return Horizons**:
   - 1-Year Return % range
   - 3-Year CAGR % range
   - 5-Year CAGR % range
   - Since Inception CAGR % range
10. **Risk Metrics**:
    - Volatility range (`minVolatility`, `maxVolatility`)
    - Sharpe Ratio range (`minSharpe`, `maxSharpe`)
    - Sortino Ratio range (`minSortino`, `maxSortino`)
    - Maximum Drawdown range (`minMaxDrawdown`, `maxMaxDrawdown`)
    - Beta range (`minBeta`, `maxBeta`)
    - Alpha range (`minAlpha`, `maxAlpha`)
11. **Portfolio Composition**:
    - Holdings Count range (`minHoldingsCount`, `maxHoldingsCount`)
    - Equity Exposure % range (`minEquityPct`, `maxEquityPct`)
    - Debt Exposure % range (`minDebtPct`, `maxDebtPct`)
    - Cash Exposure % range (`minCashPct`, `maxCashPct`)

### Screener Output & Labels
All matching schemes are labeled neutrally as *Matches criteria* or *Research candidate*. The platform never outputs subjective recommendation labels.

---

## 25. Mutual Fund Limitations

1. **Daily NAV Publication Window**: Official daily NAVs are finalized by AMCs in the evening (between 9:00 PM and 11:00 PM IST). Intraday live NAVs do not exist in mutual funds.
2. **Monthly Portfolio Reporting Lag**: AMCs disclose complete portfolio holdings once per month (within 10 days of month-end), which are subsequently synchronized into FinAPI (Upvaly) and AMC disclosures. Changes made by fund managers during the active calendar month are not visible until the next official monthly filing.
3. **AUM Coverage**: Complete verified monthly AUM is integrated for active schemes; newly launched or merging schemes may have temporary reporting gaps.
4. **Holdings Coverage Boundary**: Constituent stock holdings are fetched via FinAPI (Upvaly) and verified AMC disclosures. Schemes without active disclosures display `Data unavailable` rather than synthetic holdings.



---

# PART III — SHARED REFERENCE

---

## 26. Dynamic / Periodic / Calculated / Static / Manual

Understanding how data is classified on MarketPulse clarifies how often numbers update, where they originate, and how reliable they are.

| Data Classification | Simple Definition | Concrete Platform Examples | Update Cadence |
|---|---|---|---|
| **DYNAMIC** | Live or delayed market feed data depending on the underlying feed that updates during active exchange trading hours. | Last Traded Price (LTP), Day Change (₹), Day Change %, Traded Volume, Live Sector Advances/Declines. | Seconds to minutes during 9:15 AM – 3:30 PM IST |
| **PERIODIC** | Numbers officially released by companies, AMCs, or regulators at fixed, scheduled calendar intervals. | Daily AMFI NAVs, Monthly Scheme AUM, Monthly Portfolio Holdings, Quarterly Corporate Revenue and Profits. | Daily (nightly), Monthly (by the 10th), or Quarterly (earnings season) |
| **CALCULATED** | Figures computed internally by MarketPulse formulas using primary source inputs. | Same-Quarter Revenue YoY %, 3Y CAGR, Sharpe Ratio, Sortino Ratio, India Stock Rank, Category AUM Rank. | Recomputed dynamically when underlying primary inputs update |
| **STATIC** | Permanent or slowly evolving reference metadata identifying the corporate or fund entity. | Company Legal Name, NSE Symbol, BSE Scrip Code, ISIN, Sector ID, Scheme Inception Date, AMC Name. | Maintained permanently; updated only upon corporate actions or rebranding |
| **MANUAL** | Verified administrative mapping dictionaries maintained to ensure cross-exchange integrity. | BSE Scrip to NSE Symbol mapping registry, sector basket constituent lists. | Updated by platform administrators upon index rebalances or new IPO listings |
| **CACHED** | Validated data temporarily stored in fast in-memory storage to ensure sub-second page loads. | Sector overview summaries, ranked equities lists, mutual fund directory snapshots. | Automatically warmed and refreshed according to strict background TTL rules |
| **DATA UNAVAILABLE** | Information that has not been reported by the entity, exchange, or regulator, or is missing. | Unreported quarterly revenue, loss-making P/E, EBIT for commercial banks, holdings for unsupported funds. | Displayed strictly as — or Data unavailable; never coerced to zero |

---

## 27. Data Source vs Calculated Data

MarketPulse maintains a clear line between data received directly from external feeds and data computed internally by the platform:

| Financial Metric | Primary Source Data Origin | API / Regulatory Provider | Calculated by MarketPulse? | Update Type |
|---|---|---|:---:|---|
| **Stock Price (LTP)** | Direct exchange market feed | Yahoo Finance API (live / delayed feed) | No (Direct) | Dynamic |
| **Previous Close** | Prior session closing price | Yahoo Finance API | No (Direct) | Periodic (Daily) |
| **Market Capitalization** | Share price × Total shares | Yahoo Finance / Exchange | Yes (Unit normalized to ₹ Cr) | Dynamic |
| **India Stock Rank** | Market Cap ranking across India | MarketPulse Ranking Engine | Yes (Sorted MCap DESC) | Dynamic / Daily |
| **Quarterly Revenue** | Corporate financial filing / disclosure | BSE Filings / Yahoo Finance | No (Direct in ₹ Cr) | Periodic (Quarterly) |
| **Revenue YoY %** | Current & prior same-quarter revenue | MarketPulse Financial Engine | Yes (Same-quarter formula) | Periodic (Quarterly) |
| **Reported EBIT (₹ Cr)** | Revenue × Operating Margin | MarketPulse Accounting Engine| Yes (Rev × Margin ÷ 10^7) | Periodic (Quarterly) |
| **Operating Margin %** | Corporate income statement | BSE Filings / Corporate report| No (Direct ratio) | Periodic (Quarterly) |
| **Net Profit (₹ Cr)** | Corporate income statement | BSE Filings / Corporate report| No (Direct in ₹ Cr) | Periodic (Quarterly) |
| **Net Profit YoY %** | Current & prior same-quarter profit | MarketPulse Financial Engine | Yes (Same-quarter formula) | Periodic (Quarterly) |
| **Stock Price Returns**| Historical closing price series | MarketPulse Return Engine | Yes (1W, 1M, 6M, 1Y, 3Y, 5Y, ALL)| Periodic (Daily) |
| **52-Week Recovery %** | Current price and 52W low | MarketPulse Financial Engine | Yes ((LTP − 52W Low) ÷ 52W Low)| Dynamic |
| **ATH Drawdown %** | Current price and all-time high | MarketPulse Financial Engine | Yes ((LTP − ATH) ÷ ATH) | Dynamic |
| **Mutual Fund NAV** | Official daily NAV feed | AMFI Official Portal | No (Direct) | Periodic (Daily) |
| **Scheme AUM (₹ Cr)** | Monthly AMC regulatory disclosure | FinAPI (Upvaly) / AMC Factsheet| Yes (Normalized to ₹ Cr) | Periodic (Monthly) |
| **Global MF Rank** | Scheme AUM across all funds | MarketPulse Ranking Engine | Yes (Sorted AUM DESC) | Periodic (Monthly) |
| **Category MF Rank** | Scheme AUM within broad category | MarketPulse Ranking Engine | Yes (Sorted AUM DESC in Cat) | Periodic (Monthly) |
| **Subcategory MF Rank** | Scheme AUM within peer subcategory| MarketPulse Ranking Engine | Yes (Sorted AUM DESC in Sub) | Periodic (Monthly) |
| **Star Marking (★)** | 5Y CAGR, Inception CAGR, AUM | MarketPulse Star Engine | Yes (3-Way Intersection Rule) | Periodic (Daily) |
| **Fund Returns & CAGR** | Historical NAV time series | MarketPulse Return Engine | Yes (Absolute & Annualized) | Periodic (Daily) |
| **Fund Volatility** | 36-month NAV returns | MarketPulse Risk Engine | Yes (Monthly std dev × sqrt(12))| Periodic (Daily) |
| **Sharpe Ratio** | NAV returns & RBI 91D T-Bill | MarketPulse Risk Engine | Yes (Trailing 3Y excess return)| Periodic (Daily) |
| **Sortino Ratio** | NAV returns & RBI 91D T-Bill | MarketPulse Risk Engine | Yes (Trailing 3Y downside dev) | Periodic (Daily) |
| **Beta** | Fund returns vs Nifty 50 TRI | MarketPulse Risk Engine | Yes (Covariance ÷ Variance) | Periodic (Monthly) |
| **Jensen's Alpha** | Fund return, Beta, Benchmark | MarketPulse Risk Engine | Yes (Alpha formulation) | Periodic (Monthly) |
| **Maximum Drawdown** | Full historical NAV series | MarketPulse Risk Engine | Yes (Peak-to-trough drop) | Periodic (Daily) |
| **Portfolio Holdings** | Monthly fund stock portfolio | FinAPI (Upvaly) / AMC Disclosures| No (Direct) | Periodic (Monthly) |
| **Holding Weight %** | Monthly fund stock portfolio | FinAPI (Upvaly) / AMC Disclosures| No (Direct reported %) | Periodic (Monthly) |
| **Sector Allocation %**| Disclosed sector weights | FinAPI (Upvaly) / AMC Disclosures| Yes (Aggregated) | Periodic (Monthly) |
| **Fund P/E and P/B** | Disclosed portfolio multiples | FinAPI (Upvaly) | No (Direct) | Periodic (Monthly) |

---

## 28. As-Of Date vs Update Date

A fundamental concept on MarketPulse is the difference between an **As-Of Date** and an **Updated / Fetched Date**:

- **As-Of Date**: The official financial date that the number actually represents.
- **Updated / Fetched Date**: The date and time when MarketPulse fetched, verified, and refreshed the number in its system.

### Concrete Real-World Examples
1. **Quarterly Revenue**:
   - *As-Of Date*: June 30, 2026 (the final day of the financial quarter being reported).
   - *Fetched Date*: August 10, 2026 (the day the company filed its results with the exchange and MarketPulse updated its database).
2. **Mutual Fund Portfolio Holdings**:
   - *As-Of Date*: June 30, 2026 (the snapshot date of the fund's actual holdings).
   - *Fetched Date*: July 10, 2026 (the day the AMC published its monthly portfolio disclosure spreadsheet).
3. **Mutual Fund NAV**:
   - *As-Of Date*: September 11, 2026 (the trading session represented by the NAV).
   - *Fetched Date*: September 11, 2026 at 10:15 PM IST (the moment AMFI published the data).

Users should always look at the **As-Of Date** to know what reporting period a financial metric reflects.

---

## 29. Missing Data

MarketPulse operates under an institutional **Zero-Fabrication Standard**.

### The Golden Rule: Missing Data Is Never Zero
```formula
Missing Data ≠ 0
```

- If a company's revenue has not been filed: it is **NOT** ₹0.
- If a stock has no debt: its debt is 0. But if debt data is unreported: it is **NOT** 0.
- If a mutual fund is less than 3 years old: its 3-year CAGR does **NOT** exist. It is **NOT** 0.00%.
- If a bank has no operating income: it is **NOT** ₹0 EBIT. Interest expense makes EBIT non-applicable.

### Concrete Presentation Rules
1. **The Em-Dash (—)**: Whenever a data point is missing, unreported, mathematically non-computable, or unverified, it is strictly displayed as **—**.
2. **Data Unavailable**: In portfolio holdings and factsheet panels, schemes without official AMC filing integration clearly display **Data unavailable**.
3. **No Synthetic Fillers**: MarketPulse never generates synthetic stock prices, estimated revenues, placeholder PE ratios, or fake portfolio holdings.
4. **Screener Safety**: Missing values are excluded from numeric range filters. For example, filtering for `P/E < 25` will not include companies with missing P/E or negative earnings.

---

## 30. Formula Reference

The master mathematical formula reference table for all calculated metrics across MarketPulse:

| Metric Name | Mathematical Formula | Primary Inputs | Frequency | Calculation Type |
|---|---|---|---|---|
| **Day Change (₹)** | Current Share Price − Previous Close | Live LTP, Yesterday's Close | Dynamic | Price Change |
| **Day Change %** | ((Current Share Price − Previous Close) ÷ Previous Close) × 100 | Live LTP, Yesterday's Close | Dynamic | Percentage |
| **Reported EBIT (₹ Cr)** | (TTM Total Revenue × TTM Operating Margin) ÷ 10,000,000 | Revenue, Operating Margin (Suppressed for Banks)| Quarterly / TTM | Accounting Profit |
| **Operating Margin %** | (Reported EBIT ÷ Revenue from Operations) × 100 | Reported EBIT, Revenue | Quarterly / TTM | Profitability Ratio |
| **Net Profit Margin %** | (Net Profit ÷ Revenue from Operations) × 100 | Net Profit, Revenue | Quarterly / TTM | Profitability Ratio |
| **Revenue YoY %** | ((Current Quarter Revenue − Same Quarter Last Year Revenue) ÷ \|Same Quarter Last Year Revenue\|) × 100 | Current Qtr Rev, Same Qtr Last Year Rev | Quarterly | Same-Quarter YoY Growth |
| **Net Profit YoY %** | ((Current Quarter Net Profit − Same Quarter Last Year Net Profit) ÷ \|Same Quarter Last Year Net Profit\|) × 100 | Current Qtr Profit, Same Qtr Last Year Profit | Quarterly | Same-Quarter YoY Growth |
| **P/E Ratio** | Current Share Price ÷ Trailing 12-Month Diluted EPS | Current Price, TTM EPS | Dynamic | Valuation Multiple |
| **P/B Ratio** | Current Share Price ÷ Book Value Per Share | Current Price, Book Value | Dynamic | Valuation Multiple |
| **Dividend Yield %** | (Annual Dividend Per Share ÷ Current Share Price) × 100 | Annual Dividend, Current Price | Dynamic | Income Yield |
| **Stock Price Return %**| ((Current Share Price − Historical Benchmark Price) ÷ Historical Benchmark Price) × 100 | Current Price, Lookback Price | Periodic (Daily) | Price Appreciation |
| **52W Low Recovery %** | ((Current Price − 52W Low) ÷ 52W Low) × 100 | Current Price, Rolling 52W Low | Dynamic | Technical Momentum |
| **ATH Drawdown %** | ((Current Price − All-Time High) ÷ All-Time High) × 100 | Current Price, Lifetime Peak Price | Dynamic | Technical Drawdown |
| **Market Capitalization** | Current Share Price × Total Outstanding Shares | Share Price, Total Shares | Dynamic | Market Valuation |
| **Fund Absolute Return %**| ((Current NAV − Past NAV) ÷ Past NAV) × 100 | Current NAV, Historical NAV (< 1Y)| Periodic (Daily) | NAV Return |
| **Fund CAGR %** | [ (Current NAV ÷ Past NAV) ^ (365.25 ÷ Days) − 1 ] × 100 | Current NAV, Past NAV (≥ 1Y, 360d) | Periodic (Daily) | Compounded Annual Return |
| **Monthly NAV Return (Ri)** | (Month-End NAV[t] − Month-End NAV[t-1]) ÷ Month-End NAV[t-1] | Consecutive Month-End NAVs | Monthly | Monthly Series |
| **Monthly MAR (Rf,monthly)** | (1 + Rf,annual) ^ (1 ÷ 12) − 1 | RBI 91-Day T-Bill Yield | Periodic (Monthly) | Hurdle Rate |
| **Annualized Volatility** | σ_monthly × √12, where σ_monthly = √[ Σ(Ri − R̄)² ÷ (N − 1) ] | 36 consecutive monthly NAV returns | Periodic (Daily) | Statistical Dispersion |
| **Sharpe Ratio** | (R̄_excess,monthly ÷ σ_monthly) × √12 | 36 monthly returns, RBI 91D T-Bill | Periodic (Daily) | Risk-Adjusted Return |
| **Downside Deviation** | √[ (1 ÷ N) × Σ min(Ri − Rf,monthly, 0)² ] | 36 monthly returns, Monthly MAR | Periodic (Daily) | Downside Volatility |
| **Sortino Ratio** | (R̄_excess,monthly ÷ Downside Deviation_monthly) × √12 | 36 monthly returns, RBI 91D T-Bill | Periodic (Daily) | Downside Risk-Adjusted |
| **Beta** | Covariance(R_fund, R_market) ÷ Variance(R_market) | Fund returns, Nifty 50 TRI (1.0 fallback if missing) | Periodic (Monthly) | Market Sensitivity |
| **Jensen's Alpha** | R_fund − [ Rf + Beta × (R_market − Rf) ] | Fund Return, Beta, Nifty 50 Return | Periodic (Monthly) | Excess Manager Skill |
| **Maximum Drawdown %** | ((Lowest Trough − Highest Prior Peak) ÷ Highest Prior Peak) × 100 | Full historical NAV price series | Periodic (Daily) | Peak-to-Trough Loss |
| **India Stock Rank** | Sort Index in { Companies ranked by Market Cap DESC } | Full market cap of 12,536 equities | Dynamic / Daily | National Market Rank |
| **India MF AUM Rank** | Sort Index in { Schemes ranked by AUM DESC } | Scheme AUM across 2,743 schemes | Periodic (Monthly) | National Fund Rank |
| **Fund Holding Rank** | Sort Index in { Fund Holdings ordered by Weight DESC } | Disclosed Portfolio Weights | Periodic (Monthly) | Portfolio Rank |
| **Sector Allocation %** | Σ (Disclosed Weights of Holdings in Sector S) | Constituent stock sector weights | Periodic (Monthly) | Portfolio Breakdown |
| **MF Star Allocation** | Top 3 by AUM in { Top 10 5Y CAGR ∩ Top 10 Inception CAGR } | 5Y CAGR, Inception CAGR, Scheme AUM| Periodic (Daily) | Subcategory Gold Star |

---

## 31. Data Quality

### The Zero-Fabrication Rulebook
MarketPulse never intentionally creates fake financial numbers.
- **No fake stock prices**: Missing quotes evaluate strictly to —.
- **No fake revenue or profit**: If an earnings release is delayed or unavailable, the quarterly cells display —.
- **No fake NAVs**: NAVs update solely upon AMFI publication.
- **No fake AUM**: Scheme scale reflects official AMC disclosures.
- **No fake holdings**: Unsupported mutual fund holdings display *Data unavailable*.
- **No fake rankings**: Unranked securities display —.
- **No fake star ratings**: MarketPulse only awards stars based on verified 5Y and Inception CAGR and reported AUM.

---

## 32. Research Interpretation

### How to Interpret MarketPulse Data Responsibly
1. **Combine Fundamentals with Valuation**: A company ranked #1 or with +40% Revenue YoY is not automatically an attractive purchase. Users must examine its valuation multiples (P/E, P/B, EV/EBITDA) and debt burden.
2. **Examine Both Returns and Risk**: High 3-Year CAGR means little if accompanied by high volatility and severe drawdowns. Always cross-reference returns with Sharpe and Sortino ratios.
3. **Respect Scheme Mandates**: A Small Cap fund will naturally exhibit higher volatility and larger drawdowns than a Large Cap or Balanced Advantage fund. Compare funds only within their direct peer group.
4. **Beware of Short Track Records**: A mutual fund with only 1 year of history may have benefited from a temporary market cycle. Prefer funds with verified 3-Year and 5-Year CAGR records.
5. **Notice the Star Badge (★)**: The Gold Star in mutual funds highlights schemes with dual long-term excellence (both 5-year and lifetime top 10 performance) backed by substantial institutional AUM.

---

## 33. Complete Glossary

- **All-Time High (ATH)**: The highest price a stock or index has ever reached in its history.
- **Alpha (Jensen's Alpha)**: The excess return delivered by an investment manager above the expected benchmark return.
- **AMC**: Asset Management Company — the legal corporate entity managing mutual fund investments.
- **AMFI**: Association of Mutual Funds in India — the official regulatory and industry body for mutual funds.
- **Annualized Return**: A multi-year return converted into an equivalent single-year compounding percentage.
- **Arbitrage Fund**: A hybrid mutual fund that exploits simultaneous price differences between cash and futures markets to generate low-risk returns.
- **AUM**: Assets Under Management — the total market value of financial assets managed by a fund.
- **Balanced Advantage Fund (BAF)**: A dynamic hybrid fund that automatically shifts asset allocation between equity and debt based on market valuation models.
- **Benchmark**: A standard market index (e.g. Nifty 50 TRI, BSE 500) against which a fund's performance is measured.
- **Beta**: A statistical measure of how sensitively an asset reacts to broader market swings. A value of 1.0 may be used as a neutral fallback value when required benchmark or history data is unavailable, and does not necessarily represent a measured Beta of exactly 1.0.
- **Bluechip**: A large, well-established, financially stable corporation with a multi-decade operating history.
- **Book Value**: The net accounting worth of a company (Assets minus Liabilities).
- **BSE**: Bombay Stock Exchange — Asia's oldest stock exchange, located in Mumbai.
- **CAGR**: Compound Annual Growth Rate — the smoothed annual growth rate over multiple years.
- **Capital Gains**: The profit realized when an asset is sold at a higher price than its purchase cost.
- **Cash Flow from Operations**: Cash generated directly from the company's core operational activities.
- **Contra Fund**: An equity fund that follows a contrarian strategy, buying currently out-of-favor companies.
- **Current Ratio**: Current assets divided by current liabilities; measures short-term solvency.
- **Debt-to-Equity (D/E)**: Total borrowed debt divided by shareholders' equity.
- **Diluted EPS**: Earnings per share calculated assuming all convertible options and warrants are exercised.
- **Direct Plan**: A mutual fund bought directly without broker commissions.
- **Dividend Yield**: Annual dividends per share divided by the current share price.
- **Downside Deviation**: A volatility measure that counts only negative swings falling below a benchmark.
- **Drawdown**: The percentage loss from a historical high point to a subsequent low point.
- **EBIT**: Earnings Before Interest and Taxes — operating profit from core commercial activities.
- **ELSS**: Equity Linked Savings Scheme — a tax-saving mutual fund offering Section 80C deductions with a mandatory 3-year lock-in.
- **EPS**: Earnings Per Share — net profit divided by total common shares.
- **EV / EBITDA**: Enterprise Value divided by EBITDA; an institutional valuation multiple independent of capital structure.
- **Expense Ratio (TER)**: Total Expense Ratio — annual fee deducted from a mutual fund's assets.
- **FinAPI (Upvaly)**: The specialized financial market API service (`https://finapi.upvaly.com`) serving as MarketPulse's primary provider for mutual fund stock portfolios, constituent holdings, equity weights, and sector breakdowns.
- **Fiscal Year (FY)**: In India, the 12-month accounting period beginning April 1 and ending March 31.
- **Flexi Cap Fund**: An open-ended equity mutual fund that invests across large, mid, and small-cap stocks without rigid statutory allocation limits.
- **Gilt Fund**: A debt mutual fund investing exclusively in Government of India sovereign debt securities.
- **Growth Option**: A mutual fund option where earnings compound inside the fund without cash payouts.
- **Holding Rank**: The ranking of a specific stock inside a single mutual fund's portfolio.
- **IDCW**: Income Distribution cum Capital Withdrawal (formerly called Dividend Option).
- **India MF Rank (`indiaMfRank`)**: Global national AUM ranking of a mutual fund scheme across all active schemes in India.
- **India Stock Rank (`indiaStockRank`)**: Global national market capitalization ranking of an equity across all 12,536 listed Indian stocks.
- **Interest Coverage Ratio**: EBIT divided by interest expenses; measures ease of servicing debt.
- **ISIN**: International Securities Identification Number — standard 12-character identifier.
- **Large & Mid Cap Fund**: An equity fund mandated to invest at least 35% in large caps and 35% in mid caps.
- **Large Cap**: Companies ranked in the top 100 by market capitalization in India.
- **Liquid Fund**: A low-risk debt fund investing in debt and money market instruments maturing within 91 days.
- **LTP**: Last Traded Price — the most recent transaction price on the exchange.
- **Market Breadth**: The ratio of advancing stocks versus declining stocks across an index or sector.
- **Market Capitalization**: Total value of a company's outstanding shares (Share Price × Outstanding Shares).
- **Mid Cap**: Companies ranked 101 to 250 by market capitalization in India.
- **Minimum Acceptable Return (MAR)**: The baseline hurdle rate used in Sortino calculations (RBI 91-Day T-Bill).
- **Multi Asset Allocation Fund**: A hybrid fund investing in at least three distinct asset classes (e.g. Equity, Debt, Gold).
- **Multi Cap Fund**: An equity fund mandated to hold at least 25% each in large caps, mid caps, and small caps.
- **NAV**: Net Asset Value — the per-unit book price of a mutual fund.
- **Net Profit**: Profit remaining after all expenses, interest, and taxes are subtracted from revenue.
- **Nifty 50**: India's flagship stock market index comprising 50 of the largest and most liquid NSE stocks.
- **NSE**: National Stock Exchange of India — India's largest financial exchange.
- **Operating Margin**: Operating profit (EBIT) expressed as a percentage of operational revenue.
- **P/B Ratio**: Price-to-Book ratio.
- **P/E Ratio**: Price-to-Earnings ratio.
- **Previous Close**: The final trade price on the preceding business day.
- **Regular Plan**: A mutual fund plan that includes ongoing commissions paid to financial distributors.
- **Revenue from Operations**: Core operating turnover excluding non-operating income.
- **Risk-Free Rate (Rf)**: The return on zero-default sovereign debt (measured on MarketPulse by RBI 91-Day T-Bills).
- **ROCE**: Return on Capital Employed.
- **ROE**: Return on Equity.
- **Sharpe Ratio**: Excess return per unit of total standard deviation risk.
- **Small Cap**: Companies ranked 251 and below by market capitalization in India.
- **Sortino Ratio**: Excess return per unit of harmful downside deviation risk.
- **TTM**: Trailing Twelve Months — the sum of financial results over the past 4 consecutive quarters.
- **Value Fund**: An equity fund that seeks undervalued companies trading at discounts to their intrinsic worth.
- **Volatility**: The statistical dispersion of asset returns over a specified time window.
- **Volume**: The total number of shares traded during a given market session.
- **YoY**: Year-on-Year — comparison of a financial metric against the same period of the prior year.

---

## 34. Research Disclaimer

### Institutional Notice & Terms of Use

1. **Research & Educational Platform Only**:
   MarketPulse is built solely as an analytical, educational, and information dashboard for market visualization. MarketPulse is **NOT** a registered investment adviser, broker-dealer, portfolio manager, or research analyst under the Securities and Exchange Board of India (SEBI) or any foreign regulatory authority.

2. **No Investment Recommendations**:
   Nothing on MarketPulse constitutes investment advice, financial planning, a stock tip, or a solicitation to buy, sell, or hold any security, derivative, mutual fund unit, or financial instrument.

3. **Past Performance Warning**:
   Historical returns, CAGR figures, Sharpe ratios, and rankings are backward-looking historical calculations. **Past performance does not guarantee future financial results.**

4. **Independent Verification Required**:
   While MarketPulse strives for institutional accuracy and adheres to a strict Zero-Fabrication Standard, financial data is sourced from third-party market feeds, public filings, and regulatory disclosures that may contain delays, timing differences, or reporting revisions. Users must independently verify all critical financial data through official exchange announcements (NSE/BSE), company quarterly reports, and AMC scheme information documents before executing any financial transaction.
