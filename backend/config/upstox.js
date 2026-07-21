import dotenv from 'dotenv';
dotenv.config();

export default {
  apiKey: process.env.UPSTOX_API_KEY || '',
  apiSecret: process.env.UPSTOX_API_SECRET || '',
  redirectUri: process.env.UPSTOX_REDIRECT_URI || 'http://localhost:5001/auth/upstox/callback',
  analyticsToken: process.env.UPSTOX_ANALYTICS_TOKEN || null,
  baseUrl: 'https://api.upstox.com/v2'
};
