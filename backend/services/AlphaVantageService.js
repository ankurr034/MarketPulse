import axios from 'axios';
import dotenv from 'dotenv';
import cacheService from './CacheService.js';

dotenv.config();

class AlphaVantageService {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.baseUrl = 'https://www.alphavantage.co/query';
  }

  async fetchFromApi(params) {
    if (!this.apiKey || this.apiKey === 'your_alpha_vantage_api_key') {
      console.warn('Alpha Vantage API key is not configured.');
      return null;
    }

    const queryParams = new URLSearchParams({
      ...params,
      apikey: this.apiKey
    }).toString();

    const cacheKey = `av_${queryParams}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}?${queryParams}`);
      if (response.data && !response.data['Note'] && !response.data['Error Message']) {
        // Cache for 24 hours (STATIC) to avoid hitting 25 requests/day limit
        cacheService.set(cacheKey, response.data, 'STATIC');
        return response.data;
      } else {
        if (response.data['Note']) {
          console.warn('Alpha Vantage API limit hit:', response.data['Note']);
        }
        if (response.data['Error Message']) {
          console.error('Alpha Vantage API error:', response.data['Error Message']);
        }
        return null;
      }
    } catch (error) {
      console.error('Alpha Vantage fetch error:', error.message);
      return null;
    }
  }

  async getGlobalQuote(symbol) {
    const data = await this.fetchFromApi({
      function: 'GLOBAL_QUOTE',
      symbol
    });
    if (!data || !data['Global Quote']) return null;

    const quote = data['Global Quote'];
    return {
      symbol: quote['01. symbol'],
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      price: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume']),
      latestTradingDay: quote['07. latest trading day'],
      previousClose: parseFloat(quote['08. previous close']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
    };
  }

  async getEconomicIndicator(indicatorFunction) {
    // Functions: GDP, REAL_GDP_PER_CAPITA, TREASURY_YIELD, INTEREST_RATE, INFLATION, UNEMPLOYMENT
    const data = await this.fetchFromApi({
      function: indicatorFunction
    });
    if (!data || !data.data) return null;
    return data.data.map(item => ({
      date: item.date,
      value: parseFloat(item.value)
    }));
  }
}

export default new AlphaVantageService();
