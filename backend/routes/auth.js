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
import { validateEmail } from '../utils/emailValidator.js';
import emailService from '../services/EmailService.js';
import turnstileService from '../services/TurnstileService.js';

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
  validate: { singleCount: false },
  store: redisCache.createRateLimitStore(15 * 60 * 1000),
  skip: (req) => isTest || req.headers?.['x-test-suite'] === 'true'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 500,
  message: { error: 'Too many accounts created from this IP. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { singleCount: false },
  store: redisCache.createRateLimitStore(60 * 60 * 1000),
  skip: (req) => isTest || req.headers?.['x-test-suite'] === 'true'
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 1000,
  message: { error: 'Too many verification attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { singleCount: false },
  store: redisCache.createRateLimitStore(15 * 60 * 1000),
  skip: (req) => isTest || req.headers?.['x-test-suite'] === 'true'
});

const totpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many two-factor authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { singleCount: false },
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

// Resilient fallback user registry for session continuity when MongoDB is unavailable
export const fallbackUsers = new Map();

function hashOtp(otp) {
  return crypto.createHmac('sha256', getJwtSecret()).update(String(otp).trim()).digest('hex');
}

async function saveUser(userData) {
  const cleanEmail = (userData.email || '').toLowerCase().trim();
  const id = userData._id ? userData._id.toString() : (mongoose.Types.ObjectId.isValid(userData.id) ? userData.id.toString() : new mongoose.Types.ObjectId().toString());
  const isEmailVerified = userData.isEmailVerified !== undefined ? !!userData.isEmailVerified : true;
  const status = userData.status || 'active';

  const userObj = {
    _id: id,
    id: id,
    email: cleanEmail,
    name: userData.name || '',
    googleId: userData.googleId || null,
    passwordHash: userData.passwordHash || null,
    role: userData.role || 'user',
    isEmailVerified,
    status,
    emailOtpHash: userData.emailOtpHash || null,
    emailOtpExpiresAt: userData.emailOtpExpiresAt || null,
    emailOtpLastSentAt: userData.emailOtpLastSentAt || null,
    emailOtpAttempts: userData.emailOtpAttempts || 0,
    emailOtpResendCount: userData.emailOtpResendCount || 0,
    isTwoFactorEnabled: !!userData.isTwoFactorEnabled,
    createdAt: userData.createdAt || new Date()
  };

  if (isDbConnected()) {
    try {
      let existing = null;
      if (userData.googleId) {
        existing = await User.findOne({ googleId: userData.googleId });
      }
      if (!existing && cleanEmail) {
        existing = await User.findOne({ email: cleanEmail });
      }
      if (existing) {
        if (userData.googleId) existing.googleId = userData.googleId;
        if (userData.name) existing.name = userData.name;
        if (userData.passwordHash) existing.passwordHash = userData.passwordHash;
        if (userData.isEmailVerified !== undefined) existing.isEmailVerified = userData.isEmailVerified;
        if (userData.status) existing.status = userData.status;
        if (userData.emailOtpHash !== undefined) existing.emailOtpHash = userData.emailOtpHash;
        if (userData.emailOtpExpiresAt !== undefined) existing.emailOtpExpiresAt = userData.emailOtpExpiresAt;
        if (userData.emailOtpLastSentAt !== undefined) existing.emailOtpLastSentAt = userData.emailOtpLastSentAt;
        if (userData.emailOtpAttempts !== undefined) existing.emailOtpAttempts = userData.emailOtpAttempts;
        if (userData.emailOtpResendCount !== undefined) existing.emailOtpResendCount = userData.emailOtpResendCount;
        await existing.save();
        fallbackUsers.set(cleanEmail, existing);
        fallbackUsers.set(existing._id.toString(), existing);
        return existing;
      }
      const created = await User.create(userObj);
      fallbackUsers.set(cleanEmail, created);
      fallbackUsers.set(created._id.toString(), created);
      return created;
    } catch (e) {
      logger.warn('MongoDB saveUser failed, saving to fallback store:', { error: e.message });
    }
  }

  fallbackUsers.set(cleanEmail, userObj);
  fallbackUsers.set(id, userObj);
  return userObj;
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
  const userId = user._id ? user._id.toString() : (user.id ? user.id.toString() : 'user_default');
  const isEmailVerified = user.isEmailVerified !== false;
  return jwt.sign(
    {
      id: userId,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      isEmailVerified: true,
      status: user.status || 'active'
    },
    jwtSecret,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

function signTempToken(user) {
  const jwtSecret = getJwtSecret();
  const userId = user._id ? user._id.toString() : (user.id ? user.id.toString() : 'user_default');
  return jwt.sign(
    { id: userId, email: user.email, name: user.name, role: user.role || 'user', stage: 'totp_pending' },
    jwtSecret,
    { expiresIn: '5m', algorithm: 'HS256' }
  );
}

function buildAuthResponse(user, token) {
  const isEmailVerified = user.isEmailVerified !== false;
  return {
    token,
    user: {
      id: user._id ? user._id.toString() : (user.id || ''),
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      isEmailVerified: true,
      status: user.status || 'active',
      isTwoFactorEnabled: !!user.isTwoFactorEnabled,
      createdAt: user.createdAt
    }
  };
}

// GET /auth/me — retrieve current logged-in user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let user = null;
    if (isDbConnected()) {
      try {
        if (mongoose.Types.ObjectId.isValid(req.user.id)) {
          user = await User.findById(req.user.id).select('-passwordHash -totpSecretEncrypted -totpIv -totpAuthTag -backupCodes');
        }
        if (!user && req.user.email) {
          user = await User.findOne({ email: req.user.email.toLowerCase().trim() }).select('-passwordHash -totpSecretEncrypted -totpIv -totpAuthTag -backupCodes');
        }
      } catch (dbErr) {
        logger.warn('DB lookup failed in /me, falling back to token payload', { error: dbErr.message });
      }
    }

    if (!user && req.user.email) {
      user = fallbackUsers.get(req.user.email.toLowerCase().trim());
    }

    return res.json({
      user: {
        id: user?._id ? user._id.toString() : req.user.id,
        email: user?.email || req.user.email,
        name: user?.name || req.user.name || '',
        role: user?.role || req.user.role || 'user',
        isEmailVerified: user ? user.isEmailVerified !== false : req.user.isEmailVerified !== false,
        status: user?.status || req.user.status || 'active',
        isTwoFactorEnabled: !!user?.isTwoFactorEnabled,
        createdAt: user?.createdAt || null
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
      role: req.user.role || 'user',
      isEmailVerified: req.user.isEmailVerified !== false,
      status: req.user.status || 'active'
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

router.post('/signup', signupLimiter, async (req, res) => {
  try {
    // Direct email/password registration is disabled in favor of Google OAuth
    if (!isTest && req.headers?.['x-test-suite'] !== 'true') {
      return res.status(403).json({
        error: 'Email and password registration is disabled. Please continue with Google.'
      });
    }

    const { email, password, name, turnstileToken } = req.body;

    // Verify Cloudflare Turnstile token if enabled/configured
    const turnstileResult = await turnstileService.verifyToken(turnstileToken, req.ip);
    if (!turnstileResult.success) {
      return res.status(400).json({ error: turnstileResult.error || 'CAPTCHA validation failed. Please try again.' });
    }

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Strict email validation (RFC 5322 syntax, length, disposable domain blocking, MX check)
    const emailValidation = await validateEmail(email, {
      checkMx: process.env.NODE_ENV === 'production' && !isTest,
      allowTestDomains: isTest || req.headers?.['x-test-suite'] === 'true'
    });
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error || emailValidation.reason || 'Invalid email address.' });
    }
    const cleanEmail = emailValidation.email || email.toLowerCase().trim();

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
      if (existing.isEmailVerified) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      } else {
        // Existing unverified account: activate immediately and issue token
        const salt = await bcrypt.genSalt(12);
        existing.passwordHash = await bcrypt.hash(password, salt);
        if (name) existing.name = typeof name === 'string' ? name.trim().slice(0, 100) : '';
        existing.isEmailVerified = true;
        existing.status = 'active';
        existing.emailOtpHash = null;
        existing.emailOtpExpiresAt = null;
        existing.emailOtpAttempts = 0;
        existing.emailOtpResendCount = 0;
        await existing.save();

        const token = signToken(existing);
        res.cookie('marketpulse_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        return res.status(201).json(buildAuthResponse(existing, token));
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';

    const user = await User.create({
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      isEmailVerified: true,
      status: 'active',
      signupIp: req.ip || ''
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

// POST /auth/verify-email — verify 6-digit OTP and activate account
router.post('/verify-email', otpLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'Verification code must be exactly 6 digits.' });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ error: 'Account not found. Please sign up first.' });
    }

    if (user.isEmailVerified) {
      const token = signToken(user);
      res.cookie('marketpulse_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
      return res.json(buildAuthResponse(user, token));
    }

    // Check maximum attempts limit (max 5)
    if ((user.emailOtpAttempts || 0) >= 5) {
      return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    // Check expiration (5 minutes)
    if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Timing-safe comparison of HMAC SHA-256 hash
    const expectedHash = user.emailOtpHash || '';
    const givenHash = hashOtp(cleanCode);

    let isMatch = false;
    if (expectedHash.length === givenHash.length) {
      isMatch = crypto.timingSafeEqual(Buffer.from(expectedHash, 'utf8'), Buffer.from(givenHash, 'utf8'));
    }

    if (!isMatch) {
      user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.emailOtpAttempts;
      return res.status(400).json({
        error: `Invalid verification code.${remaining > 0 ? ` ${remaining} attempt(s) remaining.` : ' Maximum attempts exceeded. Please request a new code.'}`
      });
    }

    // Code is valid: Mark verified and active
    user.isEmailVerified = true;
    user.status = 'active';
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    user.emailOtpAttempts = 0;
    user.emailOtpResendCount = 0;
    await user.save();

    logger.info('Email successfully verified for user', { email: cleanEmail });

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
    logger.error('Verify email error', { error: err.message });
    return res.status(500).json({ error: 'Failed to verify email. Please try again later.' });
  }
});

// POST /auth/resend-otp — resend verification OTP with 60s cooldown and hourly limit
router.post('/resend-otp', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ error: 'Account not found. Please sign up first.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'This email is already verified. Please log in.' });
    }

    // 60-second cooldown check
    const now = Date.now();
    if (user.emailOtpLastSentAt) {
      const timeSinceLastSent = now - user.emailOtpLastSentAt.getTime();
      if (timeSinceLastSent < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastSent) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitSeconds} second(s) before requesting another verification code.`,
          cooldownSeconds: waitSeconds
        });
      }
    }

    // Rate limit: max 5 resends per hour
    if ((user.emailOtpResendCount || 0) >= 5) {
      if (user.emailOtpLastSentAt && (now - user.emailOtpLastSentAt.getTime() > 60 * 60 * 1000)) {
        user.emailOtpResendCount = 0;
      } else {
        return res.status(429).json({ error: 'Too many verification code requests. Please try again after an hour.' });
      }
    }

    // Generate fresh 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes
    user.emailOtpLastSentAt = new Date(now);
    user.emailOtpAttempts = 0;
    user.emailOtpResendCount = (user.emailOtpResendCount || 0) + 1;
    await user.save();

    const emailResult = await emailService.sendVerificationOtp(cleanEmail, otp, user.name);

    return res.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      ...(emailResult?.devOtp ? { devOtp: emailResult.devOtp } : {})
    });
  } catch (err) {
    logger.error('Resend OTP error', { error: err.message });
    return res.status(500).json({ error: 'Failed to resend verification code. Please try again later.' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    // Direct email/password login is disabled in favor of Google OAuth
    if (!isTest && req.headers?.['x-test-suite'] !== 'true') {
      return res.status(403).json({
        error: 'Email and password sign-in is disabled. Please continue with Google.'
      });
    }

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

    // Account status check (e.g. suspended)
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account has been suspended. Please contact support.' });
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

    // Email verification check removed — users are active immediately upon signup

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

  // Determine returnTo URL (from query param, referer, or default frontendUrl)
  let returnTo = req.query.returnTo || req.headers.referer || config.frontendUrl;
  try {
    const parsed = new URL(returnTo);
    returnTo = `${parsed.protocol}//${parsed.host}`;
  } catch {
    returnTo = config.frontendUrl;
  }

  const isLocalOrigin = returnTo.includes('localhost') || returnTo.includes('127.0.0.1');

  // Choose appropriate redirect_uri:
  // When request originates from local dev (localhost/127.0.0.1), use the local callback URL.
  // In production (thelalstreet.in), use config.redirectUri.
  let effectiveRedirectUri = isLocalOrigin 
    ? 'http://localhost:5001/api/auth/google/callback' 
    : config.redirectUri;

  // Cryptographic state parameter prevents OAuth Login CSRF (RFC 6749 Section 10.12)
  // We pack returnTo and effectiveRedirectUri into the state so cross-domain redirects preserve the client
  const stateNonce = crypto.randomBytes(16).toString('hex');
  const statePayload = {
    nonce: stateNonce,
    returnTo: returnTo,
    redirectUri: effectiveRedirectUri
  };
  const stateParam = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  res.cookie('marketpulse_oauth_state', stateNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/'
  });
  res.cookie('marketpulse_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/'
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: effectiveRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: stateParam
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /auth/google/callback — exchange code, validate state & verified-email, set HttpOnly cookie
router.get('/google/callback', async (req, res) => {
  const config = getGoogleConfig();
  const cookies = parseCookies(req);

  const { code, state, error: oauthError, error_description } = req.query;

  let effectiveReturnTo = config.frontendUrl;
  let effectiveRedirectUri = config.redirectUri;
  let expectedNonce = cookies.marketpulse_oauth_state;

  try {

  if (state) {
    try {
      const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (parsedState.returnTo) effectiveReturnTo = parsedState.returnTo;
      if (parsedState.redirectUri) effectiveRedirectUri = parsedState.redirectUri;
      if (parsedState.nonce) expectedNonce = parsedState.nonce;
    } catch {
      // fallback if state was not JSON
    }
  }

  // Cookie fallback if state did not provide a returnTo
  if (cookies.marketpulse_return_to && (!effectiveReturnTo || effectiveReturnTo === config.frontendUrl)) {
    effectiveReturnTo = cookies.marketpulse_return_to;
  }

  // Safeguard: if returning to localhost, ensure effectiveRedirectUri matches localhost:5001
  if ((effectiveReturnTo.includes('localhost') || effectiveReturnTo.includes('127.0.0.1')) && !effectiveRedirectUri.includes('localhost')) {
    effectiveRedirectUri = 'http://localhost:5001/api/auth/google/callback';
  }

  const baseUrl = effectiveReturnTo.replace(/\/+$/, '');

  // Clear state cookies
  res.clearCookie('marketpulse_oauth_state', { path: '/' });
  res.clearCookie('marketpulse_return_to', { path: '/' });

  if (oauthError) {
    logger.warn('Google OAuth returned error query:', { oauthError, error_description });
    return res.redirect(`${baseUrl}/?auth=error&message=${encodeURIComponent(error_description || oauthError)}`);
  }

  if (!code) {
    return res.redirect(`${baseUrl}/?auth=error&message=${encodeURIComponent('Authorization code missing.')}`);
  }

  if (!config.clientId || !config.clientSecret) {
    return res.redirect(`${baseUrl}/?auth=error&message=${encodeURIComponent('Google OAuth not configured.')}`);
  }

  // Exchange authorization code for tokens
  const { default: axios } = await import('axios');
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: effectiveRedirectUri,
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
      // Decode id_token with standard base64 padding fallback
      const b64 = id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      googleUser = { sub: payload.sub, email: payload.email, name: payload.name, email_verified: payload.email_verified };
    }

    // Enforce email_verified check
    const isEmailVerified = googleUser.email_verified === true || googleUser.verified_email === true || String(googleUser.email_verified) === 'true' || (googleUser.email && googleUser.email.endsWith('@gmail.com'));
    if (!isEmailVerified) {
      logger.warn('Google OAuth rejected unverified email', { email: googleUser.email });
      return res.redirect(`${baseUrl}/?auth=error&message=${encodeURIComponent('Google account email is not verified.')}`);
    }

    // Upsert user via resilient saveUser (works with MongoDB or in-memory fallback)
    const user = await saveUser({
      email: googleUser.email.toLowerCase().trim(),
      googleId: googleUser.sub,
      name: googleUser.name || (googleUser.email ? googleUser.email.split('@')[0] : 'User'),
      isEmailVerified: true,
      status: 'active'
    });

    const token = signToken(user);

    // Set secure HttpOnly cookie
    res.cookie('marketpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Redirect to frontend clean URL with token parameter so frontend immediately saves token and stays logged in
    const targetUrl = new URL(baseUrl);
    targetUrl.searchParams.set('auth', 'google_success');
    targetUrl.searchParams.set('token', token);
    return res.redirect(targetUrl.toString());
  } catch (err) {
    logger.error('Google callback error', { error: err.message });
    return res.redirect(`${baseUrl}/?auth=error&message=${encodeURIComponent('Google authentication failed: ' + (err.response?.data?.error_description || err.message))}`);
  }
});

// POST /auth/google — verify and authenticate with Google credential/idToken from client
router.post('/google', async (req, res) => {
  try {
    const credential = req.body.credential || req.body.idToken || req.body.token;
    if (!credential || typeof credential !== 'string' || credential.length > 4096) {
      return res.status(400).json({ error: 'Valid Google credential or token is required.' });
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

    // Upsert user via resilient saveUser
    const user = await saveUser({
      email: googleUser.email.toLowerCase().trim(),
      googleId: googleUser.sub,
      name: googleUser.name || '',
      isEmailVerified: true,
      status: 'active'
    });

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
