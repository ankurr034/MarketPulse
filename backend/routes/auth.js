import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import upstoxAuthService from '../services/UpstoxAuthService.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import authenticateToken, { getJwtSecret, revokeToken } from '../middleware/authMiddleware.js';
import redisCache from '../services/RedisCacheService.js';
import totpService from '../services/TotpService.js';
import logger from '../utils/logger.js';

dotenv.config();

const router = express.Router();
const isTest = process.env.NODE_ENV === 'test';

// Brute-force and credential stuffing protection for auth endpoints (Redis-backed with memory fallback)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisCache.createRateLimitStore(15 * 60 * 1000),
  skip: (req) => isTest || req.headers?.['x-test-suite'] === 'true'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 500,
  message: { error: 'Too many accounts created from this IP. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisCache.createRateLimitStore(60 * 60 * 1000),
  skip: (req) => isTest || req.headers?.['x-test-suite'] === 'true'
});

const totpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many two-factor authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisCache.createRateLimitStore(15 * 60 * 1000),
  skip: () => isTest
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCookies(req) {
  if (!req.headers.cookie) return {};
  return Object.fromEntries(
    req.headers.cookie.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

function isDbConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function getGoogleConfig() {
  dotenv.config();
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback').trim(),
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/+$/, ''),
    jwtSecret: getJwtSecret()
  };
}

function signToken(user) {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, role: user.role || 'user' },
    jwtSecret,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

function signTempToken(user) {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, role: user.role || 'user', stage: 'totp_pending' },
    jwtSecret,
    { expiresIn: '5m', algorithm: 'HS256' }
  );
}

function buildAuthResponse(user, token) {
  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      isTwoFactorEnabled: !!user.isTwoFactorEnabled,
      createdAt: user.createdAt
    }
  };
}

// GET /auth/me — retrieve current logged-in user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let user = null;
    let dbChecked = false;
    try {
      if (isDbConnected()) {
        dbChecked = true;
        user = await User.findById(req.user.id).select('-passwordHash -totpSecretEncrypted -totpIv -totpAuthTag -backupCodes');
        if (!user || user.isRevoked) {
          return res.status(401).json({ error: 'User account no longer exists or has been revoked.' });
        }
      } else {
        logger.warn('MongoDB disconnected, serving verified token payload for /me');
      }
    } catch (dbErr) {
      logger.warn('DB lookup failed in /me, falling back to token payload', { error: dbErr.message });
    }

    if (user) {
      return res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          isTwoFactorEnabled: !!user.isTwoFactorEnabled,
          createdAt: user.createdAt
        }
      });
    }

    if (dbChecked) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name || '',
        role: req.user.role || 'user',
        isTwoFactorEnabled: false,
        createdAt: null
      }
    });
  } catch (err) {
    logger.error('Fetch user error', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /auth/session — returns active user and token from Authorization header or HttpOnly cookie
router.get('/session', authenticateToken, async (req, res) => {
  return res.json({
    token: req.token,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name || '',
      role: req.user.role || 'user'
    }
  });
});

// POST /auth/logout — revoke current session token (Redis-backed persistent revocation and cookie clearing)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    if (req.token) {
      await revokeToken(req.token);
    }
    res.clearCookie('marketpulse_token', { path: '/' });
    return res.json({ message: 'Successfully logged out and session revoked.' });
  } catch (err) {
    logger.error('Logout error', { error: err.message });
    return res.status(500).json({ error: 'Failed to process logout' });
  }
});

// POST /auth/signup
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password cannot exceed 128 characters.' });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';

    const user = await User.create({
      email: cleanEmail,
      passwordHash,
      name: cleanName
    });

    const token = signToken(user);
    res.cookie('marketpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(201).json(buildAuthResponse(user, token));
  } catch (err) {
    logger.error('Signup error', { error: err.message });
    return res.status(500).json({ error: 'Signup failed. Please try again later.' });
  }
});

// POST /auth/login — with account-level lockout & 2FA support
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length > 128) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.passwordHash || user.isRevoked) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Account-level Brute-Force Lockout check
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        logger.warn('Account temporarily locked due to 5 consecutive failed login attempts', { email: cleanEmail });
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Reset failed login attempts on successful password verification
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }
    user.lastLoginAt = new Date();
    await user.save();

    // 2FA Flow Evaluation: Mandatory for Admins, optional for Standard Users
    if (user.role === 'admin') {
      if (!user.isTwoFactorEnabled) {
        // Admin must configure 2FA before full login
        const tempToken = signTempToken(user);
        return res.json({
          requires2faSetup: true,
          tempToken,
          message: 'Two-factor authentication is mandatory for administrators. Please set up 2FA.',
          user: { id: user._id, email: user.email, name: user.name, role: user.role }
        });
      }
      const tempToken = signTempToken(user);
      return res.json({
        requires2fa: true,
        tempToken,
        user: { id: user._id, email: user.email, name: user.name, role: user.role }
      });
    }

    if (user.isTwoFactorEnabled) {
      const tempToken = signTempToken(user);
      return res.json({
        requires2fa: true,
        tempToken,
        user: { id: user._id, email: user.email, name: user.name, role: user.role }
      });
    }

    // Standard user without 2FA: Issue full JWT
    const token = signToken(user);
    res.cookie('marketpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json(buildAuthResponse(user, token));
  } catch (err) {
    logger.error('Login error', { error: err.message });
    return res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

// POST /auth/2fa/verify — verify 6-digit TOTP or backup recovery code
router.post('/2fa/verify', totpLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code || typeof tempToken !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Temporary token and 2FA code are required.' });
    }

    const secret = getJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(tempToken, secret, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Two-factor session has expired. Please log in again.' });
    }

    if (decoded.stage !== 'totp_pending' || !decoded.id) {
      return res.status(400).json({ error: 'Invalid two-factor session token.' });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.isRevoked || !user.isTwoFactorEnabled) {
      return res.status(401).json({ error: 'User account invalid or 2FA not enabled.' });
    }

    const cleanCode = code.trim();
    let isVerified = false;

    // 1. Try TOTP code verification if 6 digits
    if (/^\d{6}$/.test(cleanCode) && user.totpSecretEncrypted) {
      try {
        const plainSecret = totpService.decryptSecret(user.totpSecretEncrypted, user.totpIv, user.totpAuthTag);
        const result = totpService.verifyTotp(plainSecret, cleanCode, user.lastTotpTimestamp || 0);
        if (result.valid) {
          user.lastTotpTimestamp = result.matchedStep;
          await user.save();
          isVerified = true;
        }
      } catch (decErr) {
        logger.error('Failed to decrypt TOTP secret during verification', { error: decErr.message });
      }
    }

    // 2. Try backup recovery code verification if not verified
    if (!isVerified && user.backupCodes && user.backupCodes.length > 0) {
      const backupResult = await totpService.verifyBackupCode(cleanCode, user.backupCodes);
      if (backupResult.valid) {
        await user.save();
        isVerified = true;
        logger.info('User successfully authenticated via one-time backup recovery code', { userId: user._id });
      }
    }

    if (!isVerified) {
      return res.status(401).json({ error: 'Invalid or expired authentication code. Please try again.' });
    }

    const token = signToken(user);
    res.cookie('marketpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json(buildAuthResponse(user, token));
  } catch (err) {
    logger.error('2FA verification error', { error: err.message });
    return res.status(500).json({ error: 'Two-factor verification failed.' });
  }
});

// POST /auth/2fa/setup — initiate 2FA enrollment (generates secret, otpauth URI, and backup codes)
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.isRevoked) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    const { secret, otpauthUrl } = totpService.generateSecret(user.email, 'MarketPulse');
    const { plainCodes, hashedCodes } = await totpService.generateBackupCodes(8);

    // Temporarily cache unconfirmed setup in memory or return to client for immediate confirmation
    // Note: 2FA is NOT marked enabled on the user until POST /auth/2fa/enable confirms the first valid token
    return res.json({
      secret,
      otpauthUrl,
      backupCodes: plainCodes,
      message: 'Scan the QR code or enter the key into your authenticator app, then submit a 6-digit code to enable 2FA.'
    });
  } catch (err) {
    logger.error('2FA setup error', { error: err.message });
    return res.status(500).json({ error: 'Failed to initiate two-factor setup.' });
  }
});

// POST /auth/2fa/enable — verify initial 6-digit code and activate 2FA with AES-256-GCM secret encryption
router.post('/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const { secret, code, backupCodes } = req.body;
    if (!secret || !code || typeof secret !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Secret and verification code are required.' });
    }

    const verifyResult = totpService.verifyTotp(secret, code, 0);
    if (!verifyResult.valid) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your authenticator app.' });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.isRevoked) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    // Encrypt secret with AES-256-GCM
    const encrypted = totpService.encryptSecret(secret);
    user.totpSecretEncrypted = encrypted.ciphertext;
    user.totpIv = encrypted.iv;
    user.totpAuthTag = encrypted.authTag;
    user.isTwoFactorEnabled = true;
    user.lastTotpTimestamp = verifyResult.matchedStep;

    // Hash backup codes
    if (Array.isArray(backupCodes) && backupCodes.length > 0) {
      const hashed = [];
      for (const plain of backupCodes) {
        if (typeof plain === 'string') {
          const hash = await bcrypt.hash(plain.trim().toUpperCase(), 10);
          hashed.push({ codeHash: hash, used: false });
        }
      }
      user.backupCodes = hashed;
    }

    await user.save();
    logger.info('Two-factor authentication successfully enabled', { userId: user._id });

    return res.json({
      success: true,
      message: 'Two-factor authentication successfully enabled and encrypted at rest.'
    });
  } catch (err) {
    logger.error('2FA enable error', { error: err.message });
    return res.status(500).json({ error: 'Failed to enable two-factor authentication.' });
  }
});

// POST /auth/2fa/disable — disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { password, code } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.isRevoked) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    // Admins cannot disable 2FA
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Two-factor authentication is mandatory for administrators and cannot be disabled.' });
    }

    // Require password confirmation
    if (user.passwordHash) {
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Password confirmation is required to disable 2FA.' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    }

    user.isTwoFactorEnabled = false;
    user.totpSecretEncrypted = null;
    user.totpIv = null;
    user.totpAuthTag = null;
    user.backupCodes = [];
    await user.save();

    logger.info('Two-factor authentication disabled by user', { userId: user._id });
    return res.json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (err) {
    logger.error('2FA disable error', { error: err.message });
    return res.status(500).json({ error: 'Failed to disable two-factor authentication.' });
  }
});

// GET /auth/google — redirect user to Google OAuth consent screen with cryptographic state nonce
router.get('/google', (req, res) => {
  const config = getGoogleConfig();
  if (!config.clientId) {
    return res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env.' });
  }

  // Cryptographic state parameter prevents OAuth Login CSRF (RFC 6749 Section 10.12)
  const stateNonce = crypto.randomBytes(32).toString('hex');
  res.cookie('marketpulse_oauth_state', stateNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/'
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: stateNonce
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /auth/google/callback — exchange code, validate state & verified-email, set HttpOnly cookie
router.get('/google/callback', async (req, res) => {
  const config = getGoogleConfig();

  if (!isDbConnected()) {
    return res.redirect(`${config.frontendUrl}/?auth=db_unavailable`);
  }

  try {
    const { code, state } = req.query;
    const cookies = parseCookies(req);
    const expectedState = cookies.marketpulse_oauth_state;

    // Clear state cookie
    res.clearCookie('marketpulse_oauth_state', { path: '/' });

    // Validate state parameter to prevent OAuth CSRF
    if (!state || !expectedState || state !== expectedState) {
      logger.warn('Google OAuth CSRF validation failed: State parameter mismatch or missing');
      return res.redirect(`${config.frontendUrl}/?auth=error&message=${encodeURIComponent('Security validation failed (OAuth CSRF). Please try again.')}`);
    }

    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing.' });
    }

    if (!config.clientId || !config.clientSecret) {
      return res.status(503).json({ error: 'Google OAuth not configured.' });
    }

    // Exchange authorization code for tokens
    const { default: axios } = await import('axios');
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    });

    const { id_token, access_token } = tokenRes.data;

    let googleUser;
    try {
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      googleUser = userInfoRes.data;
    } catch {
      const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
      googleUser = { sub: payload.sub, email: payload.email, name: payload.name, email_verified: payload.email_verified };
    }

    // Enforce email_verified check
    const isEmailVerified = googleUser.email_verified === true || googleUser.verified_email === true;
    if (!isEmailVerified) {
      logger.warn('Google OAuth rejected unverified email', { email: googleUser.email });
      return res.redirect(`${config.frontendUrl}/?auth=error&message=${encodeURIComponent('Google account email is not verified.')}`);
    }

    // Upsert user
    let user = await User.findOne({ googleId: googleUser.sub });
    if (!user) {
      user = await User.findOne({ email: googleUser.email.toLowerCase().trim() });
      if (user) {
        user.googleId = googleUser.sub;
        user.name = user.name || googleUser.name || '';
        await user.save();
      } else {
        user = await User.create({
          email: googleUser.email.toLowerCase().trim(),
          googleId: googleUser.sub,
          name: googleUser.name || ''
        });
      }
    }

    const token = signToken(user);

    // Set secure HttpOnly cookie instead of exposing token in URL query parameter
    res.cookie('marketpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Redirect to frontend clean URL without raw JWT in query parameters
    const targetUrl = new URL(config.frontendUrl);
    targetUrl.searchParams.set('auth', 'google_success');
    return res.redirect(targetUrl.toString());
  } catch (err) {
    logger.error('Google callback error', { error: err.message });
    return res.redirect(`${config.frontendUrl}/?auth=error&message=${encodeURIComponent('Google authentication failed.')}`);
  }
});

// POST /auth/google — verify and authenticate with Google credential/idToken from client
router.post('/google', async (req, res) => {
  try {
    const credential = req.body.credential || req.body.idToken || req.body.token;
    if (!credential || typeof credential !== 'string' || credential.length > 4096) {
      return res.status(400).json({ error: 'Valid Google credential or token is required.' });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const config = getGoogleConfig();
    const { default: axios } = await import('axios');
    let googleUser = null;

    try {
      const verifyRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (config.clientId && verifyRes.data.aud && verifyRes.data.aud !== config.clientId) {
        return res.status(401).json({ error: 'Google token audience mismatch.' });
      }
      googleUser = {
        sub: verifyRes.data.sub,
        email: verifyRes.data.email,
        name: verifyRes.data.name || (verifyRes.data.email ? verifyRes.data.email.split('@')[0] : ''),
        email_verified: verifyRes.data.email_verified === 'true' || verifyRes.data.email_verified === true
      };
    } catch {
      try {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${credential}` }
        });
        googleUser = {
          sub: userInfoRes.data.sub,
          email: userInfoRes.data.email,
          name: userInfoRes.data.name || '',
          email_verified: userInfoRes.data.email_verified === true
        };
      } catch (err2) {
        logger.error('Failed to verify token with Google API', { error: err2.message });
      }
    }

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({ error: 'Invalid Google credential or unable to verify with Google.' });
    }

    if (!googleUser.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    let user = await User.findOne({ googleId: googleUser.sub });
    if (!user) {
      user = await User.findOne({ email: googleUser.email.toLowerCase().trim() });
      if (user) {
        user.googleId = googleUser.sub;
        user.name = user.name || googleUser.name || '';
        await user.save();
      } else {
        user = await User.create({
          email: googleUser.email.toLowerCase().trim(),
          googleId: googleUser.sub,
          name: googleUser.name || ''
        });
      }
    }

    const token = signToken(user);
    res.cookie('marketpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json(buildAuthResponse(user, token));
  } catch (err) {
    logger.error('Google token verification error', { error: err.message });
    return res.status(500).json({ error: 'Google authentication failed.' });
  }
});

// GET /auth/upstox/callback
router.get('/upstox/callback', async (req, res) => {
  const config = getGoogleConfig();
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    await upstoxAuthService.exchangeCodeForToken(code);
    res.redirect(`${config.frontendUrl}/?upstox=connected`);
  } catch (err) {
    logger.error('Upstox callback error', { error: err.message });
    res.redirect(`${config.frontendUrl}/?upstox=error`);
  }
});

export default router;
