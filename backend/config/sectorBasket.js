// backend/config/sectorBasket.js

/**
 * Single source of truth for curated funds and ETFs by Sector.
 * Includes both Indian (INR) and Global (USD) options.
 */
const sectorBasket = {
  Technology: {
    description: "Focus on IT, software, and tech hardware.",
    funds: [
      { id: '120594', name: 'ICICI Prudential Technology Fund', family: 'ICICI', region: 'india', currency: 'INR' },
      { id: '150344', name: 'Tata Digital India Fund', family: 'Tata', region: 'india', currency: 'INR' },
      { id: 'QQQ', name: 'Invesco QQQ Trust', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'XLK', name: 'Technology Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Financials: {
    description: "Banks, NBFCs, and financial services.",
    funds: [
      { id: '133859', name: 'SBI Banking & Financial Services Fund', family: 'SBI', region: 'india', currency: 'INR' },
      { id: '118589', name: 'Nippon India Banking & Financial Services Fund', family: 'Nippon', region: 'india', currency: 'INR' },
      { id: 'XLF', name: 'Financial Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'VFH', name: 'Vanguard Financials ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Healthcare: {
    description: "Pharmaceuticals, biotech, and hospital networks.",
    funds: [
      { id: '118759', name: 'Nippon India Pharma Fund', family: 'Nippon', region: 'india', currency: 'INR' },
      { id: '119783', name: 'SBI Healthcare Opportunities Fund', family: 'SBI', region: 'india', currency: 'INR' },
      { id: 'XLV', name: 'Health Care Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'VHT', name: 'Vanguard Health Care ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Infrastructure: {
    description: "Construction, engineering, and capital goods.",
    funds: [
      { id: '118557', name: 'Franklin Build India Fund', family: 'Franklin', region: 'india', currency: 'INR' },
      { id: '120621', name: 'ICICI Prudential Infrastructure Fund', family: 'ICICI', region: 'india', currency: 'INR' },
      { id: 'IGF', name: 'iShares Global Infrastructure ETF', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'PAVE', name: 'Global X U.S. Infrastructure Development ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Energy: {
    description: "Power generation, transmission, renewable energy, and utilities.",
    funds: [
      { id: '118763', name: 'Nippon India Power & Infra Fund', family: 'Nippon', region: 'india', currency: 'INR' },
      { id: '135813', name: 'Tata Resources & Energy Fund', family: 'Tata', region: 'india', currency: 'INR' },
      { id: 'XLE', name: 'Energy Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'VDE', name: 'Vanguard Energy ETF', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  },
  Consumption: {
    description: "FMCG, retail, consumer products, and lifestyle brands.",
    funds: [
      { id: '120575', name: 'SBI Consumption Opportunities Fund', family: 'SBI', region: 'india', currency: 'INR' },
      { id: '142951', name: 'ICICI Prudential Bharat Consumption Fund', family: 'ICICI', region: 'india', currency: 'INR' },
      { id: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' },
      { id: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund', family: 'ETF', region: 'global', currency: 'USD' }
    ]
  }
};

export default sectorBasket;
