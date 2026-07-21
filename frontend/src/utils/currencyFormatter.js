export const isGlobalSymbol = (symbol) => {
  if (!symbol) return false;
  // Indian stocks typically have .NS or .BO suffix, or are 6-digit MF codes
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return false;
  if (/^\d{5,6}$/.test(symbol)) return false; // Indian MF scheme codes
  // Global stocks/ETFs are usually purely alphabetic without suffix (e.g. AAPL, SPY)
  if (/^[A-Z]+$/.test(symbol)) return true;
  return false;
};

export const formatPrice = (price, symbol) => {
  if (price === null || price === undefined) return '—';
  
  const isGlobal = isGlobalSymbol(symbol);
  
  return new Intl.NumberFormat(isGlobal ? 'en-US' : 'en-IN', {
    style: 'currency',
    currency: isGlobal ? 'USD' : 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

export const formatMarketCap = (marketCapStr, symbol) => {
  if (!marketCapStr && marketCapStr !== 0) return '—';
  const isGlobal = isGlobalSymbol(symbol);
  const prefix = isGlobal ? '$' : '₹';
  const suffix = isGlobal ? 'B' : ' Cr'; // Displaying billion for USD and Cr for INR
  
  // Convert number formatting
  let formatted = marketCapStr.toLocaleString(isGlobal ? 'en-US' : 'en-IN');
  
  return `${prefix}${formatted}${suffix}`;
};
