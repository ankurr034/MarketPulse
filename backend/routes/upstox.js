import express from 'express';
import upstoxAuthService from '../services/UpstoxAuthService.js';

const router = express.Router();

// GET /api/upstox/login
router.get('/login', (req, res) => {
  const url = upstoxAuthService.getAuthorizationUrl();
  res.redirect(url);
});

// GET /api/upstox/status
router.get('/status', (req, res) => {
  res.json({
    connected: !!upstoxAuthService.getValidToken()
  });
});

export default router;
