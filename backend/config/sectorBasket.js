// backend/config/sectorBasket.js

/**
 * Single source of truth for curated funds and ETFs by Sector.
 * Includes both Indian (INR) and Global (USD) options with 100% verified Direct Growth AMFI Scheme Codes.
 */
const sectorBasket = {
  Technology: {
    description: "Focus on IT, software, and tech hardware.",
    funds: [
      { id: '120594', name: 'ICICI Prudential Technology Fund Direct Growth', family: 'ICICI Prudential', region: 'india', currency: 'INR' },
      { id: '135800', name: 'Tata Digital India Fund Direct Growth', family: 'Tata', region: 'india', currency: 'INR' },
      { id: '120578', name: 'SBI Technology Opportunities Fund Direct Growth', family: 'SBI', region: 'india', currency: 'INR' },
      { id: '120539', name: 'Aditya Birla Sun Life Digital India Fund Direct Growth', family: 'Aditya Birla', region: 'india', currency: 'INR' },
      { id: 'QQQ', name: 'Invesco QQQ Trust', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'XLK', name: 'Technology Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Financials: {
    description: "Banks, NBFCs, and financial services.",
    funds: [
      { id: '133859', name: 'SBI Banking & Financial Services Fund Direct Growth', family: 'SBI', region: 'india', currency: 'INR' },
      { id: '118589', name: 'Nippon India Banking & Financial Services Fund Direct Growth', family: 'Nippon India', region: 'india', currency: 'INR' },
      { id: '120244', name: 'ICICI Prudential Banking & Financial Services Fund Direct Growth', family: 'ICICI Prudential', region: 'india', currency: 'INR' },
      { id: 'XLF', name: 'Financial Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'VFH', name: 'Vanguard Financials ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Healthcare: {
    description: "Pharmaceuticals, biotech, and hospital networks.",
    funds: [
      { id: '118759', name: 'Nippon India Pharma Fund Direct Growth', family: 'Nippon India', region: 'india', currency: 'INR' },
      { id: '119783', name: 'SBI Healthcare Opportunities Fund Direct Growth', family: 'SBI', region: 'india', currency: 'INR' },
      { id: 'XLV', name: 'Health Care Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'VHT', name: 'Vanguard Health Care ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Infrastructure: {
    description: "Construction, engineering, and capital goods.",
    funds: [
      { id: '120621', name: 'ICICI Prudential Infrastructure Fund Direct Growth', family: 'ICICI Prudential', region: 'india', currency: 'INR' },
      { id: '118763', name: 'Nippon India Power & Infra Fund Direct Growth', family: 'Nippon India', region: 'india', currency: 'INR' },
      { id: '118557', name: 'Franklin Build India Fund Direct Growth', family: 'Franklin Templeton', region: 'india', currency: 'INR' },
      { id: 'IGF', name: 'iShares Global Infrastructure ETF', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'PAVE', name: 'Global X U.S. Infrastructure Development ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Energy: {
    description: "Power generation, transmission, renewable energy, and utilities.",
    funds: [
      { id: '118763', name: 'Nippon India Power & Infra Fund Direct Growth', family: 'Nippon India', region: 'india', currency: 'INR' },
      { id: 'XLE', name: 'Energy Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'VDE', name: 'Vanguard Energy ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Consumption: {
    description: "FMCG, retail, consumer products, and lifestyle brands.",
    funds: [
      { id: '120575', name: 'SBI Consumption Opportunities Fund Direct Growth', family: 'SBI', region: 'india', currency: 'INR' },
      { id: '146951', name: 'ICICI Prudential Bharat Consumption Fund Direct Growth', family: 'ICICI Prudential', region: 'india', currency: 'INR' },
      { id: '135805', name: 'Tata India Consumer Fund Direct Growth', family: 'Tata', region: 'india', currency: 'INR' },
      { id: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  }
};

export default sectorBasket;
