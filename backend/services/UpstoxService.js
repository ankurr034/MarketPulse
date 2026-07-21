import axios from 'axios';
import config from '../config/upstox.js';
import upstoxAuthService from './UpstoxAuthService.js';

class UpstoxService {
  constructor() {
    this.baseUrl = config.baseUrl;
  }

  // Deprecated - routing is now handled via UpstoxAuthService / auth.js
  getLoginUrl() {
    return upstoxAuthService.getAuthorizationUrl();
  }

  async getQuotes(instrumentKeys) {
    const token = upstoxAuthService.getValidToken();
    if (!token) return null; // Fail gracefully
    
    try {
      const response = await axios.get(`${this.baseUrl}/market-quote/quotes?instrument_key=${instrumentKeys.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      return response.data.data;
    } catch (err) {
      console.error('Upstox Quotes error:', err.response?.data || err.message);
      return null;
    }
  }

  async getMfHoldings() {
    const token = upstoxAuthService.getValidToken();
    if (!token) {
      console.warn('Cannot fetch MF Holdings: Upstox Access Token is missing or invalid.');
      return null;
    }
    
    try {
      const response = await axios.get(`${this.baseUrl}/mf/holdings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      return response.data.data;
    } catch (err) {
      console.error('Upstox MF Holdings error:', err.response?.data || err.message);
      // Propagate the error gracefully
      return null;
    }
  }
}

export default new UpstoxService();
