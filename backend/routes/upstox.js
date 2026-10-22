import express from 'express';
import upstoxAuthService from '../services/UpstoxAuthService.js';
import upstoxMarketDataService from '../services/UpstoxMarketDataService.js';

import authenticateToken, { requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/upstox/login
router.get('/login', (req, res) => {
  const url = upstoxAuthService.getAuthorizationUrl();
  res.redirect(url);
});

// GET /api/upstox/callback
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    await upstoxAuthService.exchangeCodeForToken(code);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    res.redirect(`${frontendUrl}/?upstox=connected`);
  } catch (err) {
    console.error('Upstox callback error:', err.message);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    res.redirect(`${frontendUrl}/?upstox=error`);
  }
});

// GET /api/upstox/status
router.get('/status', async (req, res) => {
  const authStatus = upstoxAuthService.getAuthStatus();
  const streamerStatus = upstoxMarketDataService.getStatus();
  res.json({
    ...authStatus,
    streamer: streamerStatus
  });
});

// POST /api/upstox/token
router.post('/token', authenticateToken, requireRole('admin'), async (req, res) => {
  const { token, expiryHours } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  upstoxAuthService.setAccessToken(token, expiryHours || 24);
  const isValid = await upstoxAuthService.verifyToken();
  res.json({
    success: true,
    isValid,
    status: upstoxAuthService.getAuthStatus()
  });
});

export default router;
