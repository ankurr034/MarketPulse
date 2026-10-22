import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import redisCache from '../services/RedisCacheService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config();

const DEFAULT_INSECURE_SECRET = 'super_secret_trading_dashboard_jwt_key_2026';

/**
 * Revokes an active token (e.g. on logout or administrative revocation).
 * Stored in Redis (with automatic in-memory fallback) with TTL matching token expiration.
 */
export async function revokeToken(token) {
  if (!token) return;
  try {
    const decoded = jwt.decode(token);
    const ttlSeconds = decoded?.exp
      ? Math.max(1, Math.ceil(decoded.exp - Date.now() / 1000))
      : 7 * 24 * 3600;
    await redisCache.revokeToken(token, ttlSeconds);
  } catch (e) {
    await redisCache.revokeToken(token, 7 * 24 * 3600);
  }
}

/**
 * Checks if a token is in the revocation store (Redis with in-memory fallback).
 */
export async function isTokenRevoked(token) {
  if (!token) return false;
  try {
    return await redisCache.isTokenRevoked(token);
  } catch (e) {
    return false;
  }
}

export function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === DEFAULT_INSECURE_SECRET || secret.length < 32) {
      throw new Error('SECURITY ERROR: JWT_SECRET must be set to a cryptographically secure key of at least 32 characters in production.');
    }
    return secret;
  }
  return secret || DEFAULT_INSECURE_SECRET;
}

/**
 * Role-based authorization middleware.
 * Enforces that req.user has one of the allowed roles.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions.' });
    }
    next();
  };
}

/**
 * JWT authentication middleware for protected routes.
 * Expects Authorization header: Bearer <token>
 * Enforces:
 *  1. HS256 algorithm enforcement.
 *  2. Immediate rejection of revoked tokens (persistent Redis store + memory fallback).
 *  3. Fail-closed security on sensitive/mutating operations when DB is disconnected.
 *  4. Live verification of user existence and revocation status when DB is connected.
 *  5. Graceful offline fallback to verified token payload for read operations when DB is disconnected.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Cookie fallback for secure HttpOnly cookie sessions
  if (!token && req.headers.cookie) {
    const cookieMatches = req.headers.cookie.match(/(?:^|;\s*)marketpulse_token=([^;]+)/);
    if (cookieMatches) {
      token = decodeURIComponent(cookieMatches[1]);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const revoked = await isTokenRevoked(token);
  if (revoked) {
    return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    // Block two-factor pending tokens from accessing full protected routes
    if (decoded.stage === 'totp_pending') {
      return res.status(403).json({ error: 'Two-factor authentication required. Please complete 2FA verification.' });
    }

    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const isLogout = req.path === '/logout' || req.originalUrl?.endsWith('/logout');
    const isSensitiveOperation = !isLogout && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';

    // Fail-closed for sensitive / mutating operations when DB is unavailable
    if (!isDbConnected && isSensitiveOperation) {
      return res.status(503).json({
        error: 'Database service unavailable. Cannot verify authorization for sensitive operation.'
      });
    }

    // Live account existence and revocation check when DB is online
    if (isDbConnected && decoded.id) {
      try {
        const user = await User.findById(decoded.id).select('role isRevoked');
        if (!user || user.isRevoked) {
          return res.status(401).json({ error: 'User account no longer exists or has been revoked.' });
        }
        decoded.role = user.role || 'user';
      } catch (dbErr) {
        if (isSensitiveOperation) {
          return res.status(503).json({
            error: 'Database service unavailable. Cannot verify authorization for sensitive operation.'
          });
        }
      }
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export default authenticateToken;
