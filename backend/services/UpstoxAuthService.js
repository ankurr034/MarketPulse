import axios from 'axios';
import querystring from 'querystring';
import config from '../config/upstox.js';

class UpstoxAuthService {
  constructor() {
    this.accessToken = config.accessToken || null;
    this.tokenExpiry = this.accessToken ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    this.isValidated = false;
    this.validationError = null;

    if (this.accessToken) {
      console.log('UpstoxAuthService: Initialized with environment access token.');
    }
  }

  getAuthorizationUrl(state = '') {
    return `${config.baseUrl}/login/authorization/dialog?response_type=code&client_id=${config.apiKey}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=${state}`;
  }

  async exchangeCodeForToken(code) {
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
      this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      this.isValidated = true;
      this.validationError = null;
      
      console.log('UpstoxAuthService: OAuth access token generated successfully.');
      return this.accessToken;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('Upstox Access Token error:', errMsg);
      this.validationError = errMsg;
      throw new Error(`Failed to exchange Upstox authorization code: ${errMsg}`);
    }
  }

  setAccessToken(token, expiryHours = 24) {
    if (!token) return;
    this.accessToken = token;
    this.tokenExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    this.isValidated = true;
    this.validationError = null;
    console.log('UpstoxAuthService: Access token updated programmatically.');
  }

  async verifyToken() {
    if (!this.accessToken) {
      this.isValidated = false;
      this.validationError = 'No access token provided';
      return false;
    }

    try {
      const res = await axios.get(`${config.baseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (res.data && res.data.status === 'success') {
        this.isValidated = true;
        this.validationError = null;
        return true;
      }
      this.isValidated = false;
      this.validationError = 'Invalid response from Upstox profile endpoint';
      return false;
    } catch (err) {
      const errMsg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || err.message;
      this.isValidated = false;
      this.validationError = errMsg;
      return false;
    }
  }

  getValidToken() {
    if (!this.accessToken) {
      return null;
    }
    
    if (this.tokenExpiry && new Date() > this.tokenExpiry) {
      this.accessToken = null;
      this.isValidated = false;
      this.validationError = 'Token expired';
      return null;
    }

    return this.accessToken;
  }

  getAuthStatus() {
    const token = this.getValidToken();
    return {
      authenticated: !!token,
      isValidated: this.isValidated,
      validationError: this.validationError,
      hasCredentials: !!(config.apiKey && config.apiSecret),
      tokenExpiry: this.tokenExpiry ? this.tokenExpiry.toISOString() : null,
      source: this.accessToken ? (process.env.UPSTOX_ACCESS_TOKEN ? 'ENV' : 'OAUTH') : 'NONE'
    };
  }
}

export default new UpstoxAuthService();
