import yahooFinanceService from './YahooFinanceService.js';

class SymbolResolver {
  constructor() {
    // In-memory cache to map company names to tickers
    this.cache = new Map();
    
    // Pre-populate some common ones to save API calls
    this.cache.set('hdfc bank ltd.', 'HDFCBANK.NS');
    this.cache.set('icici bank ltd.', 'ICICIBANK.NS');
    this.cache.set('reliance industries ltd.', 'RELIANCE.NS');
    this.cache.set('infosys ltd.', 'INFY.NS');
    this.cache.set('tata consultancy services ltd.', 'TCS.NS');
    this.cache.set('itc ltd.', 'ITC.NS');
    this.cache.set('larsen & toubro ltd.', 'LT.NS');
    this.cache.set('state bank of india', 'SBIN.NS');
    this.cache.set('bharti airtel ltd.', 'BHARTIARTL.NS');
    this.cache.set('bajaj finance ltd.', 'BAJFINANCE.NS');
  }

  async resolveSymbol(companyName) {
    if (!companyName) return null;
    
    // Normalize name for lookup
    const normalizedName = companyName.toLowerCase().trim();
    if (this.cache.has(normalizedName)) {
      return this.cache.get(normalizedName);
    }

    try {
      // Append NSE to prioritize Indian stocks
      const searchRes = await yahooFinanceService.search(`${companyName} NSE`);
      const searchResults = searchRes.available ? searchRes.data : [];
      
      // Look for the first result that ends in .NS (National Stock Exchange of India)
      // or .BO (Bombay Stock Exchange)
      const match = searchResults.find(r => r.symbol && (r.symbol.endsWith('.NS') || r.symbol.endsWith('.BO')));
      
      if (match) {
        this.cache.set(normalizedName, match.symbol);
        return match.symbol;
      }
      
      // If no Indian stock found, just cache null so we don't keep searching
      this.cache.set(normalizedName, null);
      return null;
    } catch (err) {
      console.error(`Failed to resolve symbol for ${companyName}:`, err.message);
      return null;
    }
  }

  async resolveSymbolsBatch(companyNames) {
    const results = {};
    const promises = companyNames.map(async (name, i) => {
      if (!name) return;
      
      // If already in cache, no need to stagger
      const normalizedName = name.toLowerCase().trim();
      if (this.cache.has(normalizedName)) {
        results[name] = this.cache.get(normalizedName);
        return;
      }
      
      // Stagger API calls to avoid rate limits
      await new Promise(r => setTimeout(r, i * 40));
      results[name] = await this.resolveSymbol(name);
    });
    
    await Promise.all(promises);
    return results;
  }
}

export default new SymbolResolver();
