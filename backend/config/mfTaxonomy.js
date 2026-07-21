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
  Debt: [
    "Banking and PSU", "Floater", "Gilt with 10Y Constant Duration", "Long Duration", 
    "Medium to Long Duration", "Money Market", "Overnight", "Short Duration", 
    "Target Maturity", "Corporate Bond", "Low Duration", "Medium Duration",
    "Dynamic Bond", "Gilt", "Credit Risk", "Liquid", "Ultra Short Duration"
  ],
  Commodities: [
    "Gold", "Silver", "Commodities & Gold", "Precious Metals"
  ],
  ETFs: [
    "Gold ETF", "Silver ETF", "ETFs & Index Funds", "Sectoral / Thematic ETF", "International ETF", "Exchange Traded Funds"
  ],
  Hybrid: [
    "Balanced Hybrid", "Dynamic Asset Allocation", "Equity Savings",
    "Multi Asset Allocation", "Aggressive Hybrid", "Conservative Hybrid", "Arbitrage"
  ],
  Equity: [
    "Multi Cap", "Flexi Cap", "International", "Large & MidCap", "Thematic", 
    "Large Cap", "Mid Cap", "Small Cap", "ELSS", "Dividend Yield", "Sectoral",
    "Contra", "Value Oriented"
  ],
  Others: [
    "Infrastructure", "PSU", "Energy (Renewable)", "Consumption (FMCG)", "Banking", "Technology (IT)"
  ]
};

export const RISK_LEVELS = ["Low", "Moderate", "High"];

export const DURATION_LEVELS = ["Low", "Medium", "Long"];
