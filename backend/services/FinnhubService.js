import axios from 'axios';
import dotenv from 'dotenv';
import cacheService from './CacheService.js';

dotenv.config();

class FinnhubService {
  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY;
    this.baseUrl = 'https://finnhub.io/api/v1';
  }

  async fetchFromApi(endpoint, params = {}) {
    if (!this.apiKey || this.apiKey === 'your_finnhub_api_key') {
      console.warn('Finnhub API key is not configured.');
      return null;
    }

    const queryParams = new URLSearchParams({
      ...params,
      token: this.apiKey
    }).toString();

    const cacheKey = `finnhub_${endpoint}_${queryParams}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/${endpoint}?${queryParams}`);
      // Cache standard responses for 15 minutes (STANDARD)
      cacheService.set(cacheKey, response.data, 'STANDARD');
      return response.data;
    } catch (error) {
      console.error(`Finnhub fetch error for ${endpoint}:`, error.message);
      return null;
    }
  }

  async getCompanyProfile(symbol) {
    return this.fetchFromApi('stock/profile2', { symbol });
  }

  async getCompanyNews(symbol, from, to) {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.fetchFromApi('company-news', {
      symbol,
      from: from || pastDate,
      to: to || today
    });
  }

  async getMarketNews(category = 'general') {
    return this.fetchFromApi('news', { category });
  }

  async getRecommendationTrends(symbol) {
    return this.fetchFromApi('stock/recommendation', { symbol });
  }

  async getInsiderTransactions(symbol) {
    return this.fetchFromApi('stock/insider-transactions', { symbol });
  }
}

export default new FinnhubService();
