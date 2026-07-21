// backend/config/stockSectorMap.js

export const stockSectorMap = {
  "Technology": "Technology",
  "Financial Services": "Financials",
  "Financial": "Financials",
  "Healthcare": "Healthcare",
  "Healthcare Services": "Healthcare",
  "Industrials": "Infrastructure",
  "Industrial Goods": "Infrastructure",
  "Utilities": "Infrastructure",
  "Real Estate": "Infrastructure",
  "Basic Materials": "Infrastructure",
  "Energy": "Energy",
  "Consumer Cyclical": "Consumption",
  "Consumer Defensive": "Consumption",
  "Communication Services": "Technology",
  "Consumer Goods": "Consumption",
  "Services": "Consumption"
};

export function mapSector(rawSector) {
  if (!rawSector) return "Other/Unmapped";
  const matched = stockSectorMap[rawSector];
  if (!matched) {
    console.warn(`[stockSectorMap] Warning: Raw sector "${rawSector}" is not mapped. Falling back to "Other/Unmapped".`);
    return "Other/Unmapped";
  }
  return matched;
}

export default { stockSectorMap, mapSector };
