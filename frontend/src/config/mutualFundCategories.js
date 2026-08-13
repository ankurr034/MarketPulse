// Mutual Fund Categories and Subcategories Configuration

export const MARKET_FILTERS = [
  { id: 'all', label: 'All Markets' },
  { id: 'equity', label: 'Equity' },
  { id: 'elss', label: 'TAX SAVER' },
  { id: 'debt', label: 'Debt' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'index', label: 'Index' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'global', label: 'Global' },
  { id: 'sectoral_thematic', label: 'Sectoral & Thematic' }
];

export const MF_CATEGORIES = {
  all: [
    { id: 'all', label: 'All Funds' }
  ],
  equity: [
    { id: 'all', label: 'All Equity' },
    { id: 'large_cap', label: 'Large Cap' },
    { id: 'large_mid_cap', label: 'Large & Mid Cap' },
    { id: 'mid_cap', label: 'Mid Cap' },
    { id: 'small_cap', label: 'Small Cap' },
    { id: 'flexi_cap', label: 'Flexi Cap' },
    { id: 'multi_cap', label: 'Multi Cap' },
    { id: 'dividend_yield', label: 'Dividend Yield' },
    { id: 'value', label: 'Value' },
    { id: 'focused', label: 'Focused' },
    { id: 'contra', label: 'Contra' },
    { id: 'other_equity', label: 'Other Equity' }
  ],
  elss: [
    { id: 'all', label: 'All TAX SAVER' },
    { id: 'elss_funds', label: 'ELSS Funds' },
    { id: 'other_tax_saver', label: 'Other Tax Saver' }
  ],
  debt: [
    { id: 'all', label: 'All Debt' },
    { id: 'overnight', label: 'Overnight' },
    { id: 'liquid', label: 'Liquid Fund' },
    { id: 'ultra_short', label: 'Ultra Short Duration' },
    { id: 'low_duration', label: 'Low Duration' },
    { id: 'money_market', label: 'Money Market' },
    { id: 'short_duration', label: 'Short Duration' },
    { id: 'medium_duration', label: 'Medium Duration' },
    { id: 'medium_long', label: 'Medium to Long Duration' },
    { id: 'long_duration', label: 'Long Duration' },
    { id: 'dynamic_bond', label: 'Dynamic Bond' },
    { id: 'corporate_bond', label: 'Corporate Bond' },
    { id: 'credit_risk', label: 'Credit Risk' },
    { id: 'banking_psu', label: 'Banking & PSU' },
    { id: 'gilt', label: 'Gilt' },
    { id: 'gilt_10y', label: 'Gilt - 10Y Constant Duration' },
    { id: 'floater', label: 'Floater' },
    { id: 'other_debt', label: 'Other Debt' }
  ],
  hybrid: [
    { id: 'all', label: 'All Hybrid' },
    { id: 'conservative', label: 'Conservative Hybrid' },
    { id: 'balanced', label: 'Balanced Hybrid' },
    { id: 'aggressive', label: 'Aggressive Hybrid' },
    { id: 'balanced_adv', label: 'Balanced Advantage / Dynamic Asset Allocation' },
    { id: 'multi_asset', label: 'Multi Asset Allocation' },
    { id: 'arbitrage', label: 'Arbitrage' },
    { id: 'equity_savings', label: 'Equity Savings' },
    { id: 'other_hybrid', label: 'Other Hybrid' }
  ],
  index: [
    { id: 'all', label: 'All Index Funds' },
    { id: 'nifty50', label: 'Nifty 50' },
    { id: 'nifty_next50', label: 'Nifty Next 50' },
    { id: 'nifty100', label: 'Nifty 100' },
    { id: 'nifty200', label: 'Nifty 200' },
    { id: 'nifty500', label: 'Nifty 500' },
    { id: 'nifty_midcap150', label: 'Nifty Midcap 150' },
    { id: 'nifty_smallcap250', label: 'Nifty Smallcap 250' },
    { id: 'nifty200_momentum30', label: 'Nifty 200 Momentum 30' },
    { id: 'nifty_bank', label: 'Nifty Bank' },
    { id: 'sensex', label: 'Sensex' },
    { id: 'other_index', label: 'Other Index' }
  ],
  global: [
    { id: 'all', label: 'All Global' },
    { id: 'sp500', label: 'S&P 500' },
    { id: 'nasdaq', label: 'Nasdaq' },
    { id: 'russell', label: 'Russell' },
    { id: 'global_equity', label: 'Global Equity' },
    { id: 'global_tech', label: 'Global Tech / AI & Tech' },
    { id: 'other_global', label: 'Other Global' }
  ],
  commodities: [
    { id: 'all', label: 'All Commodities' },
    { id: 'gold', label: 'Gold' },
    { id: 'silver', label: 'Silver' },
    { id: 'gold_mining', label: 'Gold Mining' },
    { id: 'other_metals', label: 'Other Metals' },
    { id: 'other_commodities', label: 'Other Commodities' }
  ],
  sectoral_thematic: [
    { id: 'all', label: 'All Sectoral & Thematic' },
    { id: 'banking', label: 'Banking & Financial Services' },
    { id: 'tech', label: 'Technology' },
    { id: 'pharma', label: 'Healthcare & Pharma' },
    { id: 'infra', label: 'Infrastructure' },
    { id: 'fmcg', label: 'FMCG & Consumption' },
    { id: 'psu', label: 'PSU' },
    { id: 'auto', label: 'Auto' },
    { id: 'other_sectoral', label: 'Other Sector/Thematic' }
  ]
};

// Map primary tab IDs to category config keys
export const PRIMARY_TAB_TO_CAT_KEY = {
  all: 'all',
  equity: 'equity',
  elss: 'elss',
  debt: 'debt',
  hybrid: 'hybrid',
  etf: 'index',
  index: 'index',
  global: 'global',
  gift: 'global',
  fof: 'equity',
  commodities: 'commodities',
  nps: 'debt',
  sectoral_thematic: 'sectoral_thematic'
};
