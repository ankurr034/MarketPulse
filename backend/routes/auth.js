import express from 'express';
import upstoxAuthService from '../services/UpstoxAuthService.js';

const router = express.Router();

// GET /auth/upstox/callback
router.get('/upstox/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // In a full implementation, you would validate the `state` parameter here
    // against a session or stored state to prevent CSRF.

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Exchange code for token securely on the backend
    await upstoxAuthService.exchangeCodeForToken(code);
    
    // Redirect back to frontend - do NOT pass the token in the URL
    res.redirect('http://localhost:3000/?upstox=connected');
  } catch (err) {
    console.error('Upstox callback error:', err.message);
    res.redirect('http://localhost:3000/?upstox=error');
  }
});

export default router;
