import axios from 'axios';
import querystring from 'querystring';
import config from '../config/upstox.js';

class UpstoxAuthService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Auto-setup analytics token if provided
    if (config.analyticsToken) {
      console.log('Upstox: Using Analytics Token');
      this.accessToken = config.analyticsToken;
      // Analytics tokens generally do not expire daily like OAuth, 
      // but we set a very long expiry to bypass daily checks.
      this.tokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); 
    }
  }

  getAuthorizationUrl(state = '') {
    return `${config.baseUrl}/login/authorization/dialog?response_type=code&client_id=${config.apiKey}&redirect_uri=${config.redirectUri}&state=${state}`;
  }

  async exchangeCodeForToken(code) {
    if (config.analyticsToken) {
      console.log('Upstox: Analytics token is already configured, ignoring OAuth exchange.');
      return this.accessToken;
    }

    try {
      const data = querystring.stringify({
        code: code,
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code'
      });

      const response = await axios.post(`${config.baseUrl}/login/authorization/token`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      this.accessToken = response.data.access_token;
      
      // Calculate token expiry (tokens expire at 3:30 AM IST of the next day)
      // We'll set a basic 24-hour expiry here, or you could do strict 3:30 AM IST logic
      this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      console.log('Upstox: Standard OAuth token fetched successfully.');
      return this.accessToken;
    } catch (err) {
      console.error('Upstox Access Token error:', err.response?.data || err.message);
      throw new Error('Failed to fetch Upstox access token');
    }
  }

  getValidToken() {
    // If no token, or if token has expired
    if (!this.accessToken) {
      console.warn('Upstox: No access token available. Please authenticate.');
      return null;
    }
    
    if (this.tokenExpiry && new Date() > this.tokenExpiry) {
      if (!config.analyticsToken) {
        console.warn('Upstox: OAuth token has expired. Manual re-authentication required.');
        this.accessToken = null;
        return null;
      }
    }

    return this.accessToken;
  }
}

export default new UpstoxAuthService();
