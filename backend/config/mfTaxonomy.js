// backend/config/mfTaxonomy.js

export const AMC_LIST = [
  "NJ", "Abakkus", "Choice", "The Wealth Company", "Capitalmind", "JioBlackRock", "Unifi",
  "Helios", "Bajaj Finserv", "Navi", "Bandhan", "Union", "Nippon India", "360 ONE",
  "WhiteOak Capital", "PGIM India", "Motilal Oswal", "Bank of India", "Mirae Asset",
  "Aditya Birla Sun Life", "Franklin Templeton", "LIC", "JM Financial",
  "ICICI Prudential", "Quant", "Canara Robeco", "ITI", "TRUST", "AlphaGrep", "Samco",
  "Mahindra Manulife", "SBI", "DSP", "Tata", "Edelweiss", "Invesco", "Sundaram", "HDFC", "HSBC",
  "PPFAS", "Baroda BNP Paribas", "Quantum", "Taurus", "Shriram", "Groww", "Kotak Mahindra",
  "Zerodha", "Axis", "UTI"
];

export const CATEGORY_GROUPS = {
  Equity: [
    "Flexi Cap", "Mid Cap", "Small Cap", "Large Cap", "Large & MidCap",
    "Multi Cap", "Value", "Contra", "Focused", "Dividend Yield"
  ],
  "Tax Saver (ELSS)": [
    "ELSS Funds"
  ],
  "Sectoral & Thematic": [
    "Banking & Financial Services", "Technology", "Healthcare & Pharma",
    "Infrastructure", "FMCG & Consumption", "PSU", "Auto",
    "Defence Funds", "Energy Funds", "BlueChip Funds", "Innovation Funds",
    "Manufacturing Funds", "Quant Funds", "Business Cycle Funds", "MNC Funds", "ESG Funds",
    "Other Sectoral"
  ],
  Hybrid: [
    "Arbitrage", "Balanced Advantage Funds", "Dynamic Asset Allocation Funds", "Active Momentum Funds", "Aggressive Hybrid",
    "Conservative Hybrid", "Multi Asset", "Equity Savings", "Balanced Hybrid"
  ],
  Debt: [
    "Overnight", "Liquid", "Ultra Short Duration", "Low Duration", "Money Market",
    "Short Duration", "Medium Duration", "Medium to Long Duration", "Long Duration",
    "Dynamic Bond", "Corporate Bond", "Credit Risk", "Banking and PSU", "Gilt",
    "Gilt with 10Y Constant Duration", "Floater"
  ],
  "Index Funds & ETFs": [
    "Index Funds", "ETFs & Index Funds", "Gold ETF", "Silver ETF"
  ],
  Commodities: [
    "Gold", "Silver", "Commodities & Gold", "Precious Metals"
  ],
  Others: [
    "Children", "Retirement", "Fund of Funds", "Other"
  ]
};

export const RISK_LEVELS = ["Low", "Moderate", "High"];

export const DURATION_LEVELS = ["Low", "Medium", "Long"];
