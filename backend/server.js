import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

dns.setDefaultResultOrder('ipv4first');
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Import routers
import marketRouter from './routes/market.js';
import sectorsRouter from './routes/sectors.js';
import stocksRouter from './routes/stocks.js';
import upstoxRouter from './routes/upstox.js';
import mfRouter from './routes/mf.js';
import portfolioRouter from './routes/portfolio.js';
import analyticsRouter from './routes/analytics.js';
import authRouter from './routes/auth.js';
import newsRouter from './routes/news.js';
import economyRouter from './routes/economy.js';
import aiRouter from './routes/ai.js';
import riskRouter from './routes/risk.js';
import etfRouter from './routes/etf.js';
import smartMoneyRouter from './routes/smartmoney.js';
import countriesRouter from './routes/countries.js';
import screenerRouter from './routes/screener.js';
import assetsRouter from './routes/assets.js';
import sectorTrendsRouter from './routes/sectorTrends.js';
import indianMfRouter from './routes/indianMf.js';
import comparisonRouter from './routes/comparison.js';
import holdingsFallbackRouter from './routes/holdingsFallback.js';
import stockWeightageRouter from './routes/stockWeightage.js';
import mongoose from 'mongoose';

// Import services
import simulator from './services/SimulatorService.js';
import sectorDataService from './services/SectorDataService.js';
import upstoxMarketDataService from './services/UpstoxMarketDataService.js';
import upstoxInstrumentService from './services/UpstoxInstrumentService.js';
import redisCache from './services/RedisCacheService.js';
import logger from './utils/logger.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __serverFilename = fileURLToPath(import.meta.url);
const __serverDirname = path.dirname(__serverFilename);
dotenv.config({ path: path.resolve(__serverDirname, '.env'), override: true });
dotenv.config();

const app = express();
app.disable('x-powered-by');

// Trusted reverse-proxy configuration for production environments (enables proper client IP resolution and HTTPS detection)
function getTrustProxyConfig() {
  const val = process.env.TRUST_PROXY;
  if (!val) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }
  const parsedNum = parseInt(val, 10);
  if (!Number.isNaN(parsedNum)) {
    return parsedNum;
  }
  if (val.toLowerCase() === 'true') {
    // Discourage boolean true to prevent client header spoofing; default to 1 upstream hop
    console.warn('[SECURITY] TRUST_PROXY=true is unsafe against client header spoofing. Enforcing 1 hop.');
    return 1;
  }
  if (val.toLowerCase() === 'false') {
    return false;
  }
  return val.split(',').map(s => s.trim());
}

const trustProxyConfig = getTrustProxyConfig();
if (trustProxyConfig !== false) {
  app.set('trust proxy', trustProxyConfig);
}

const server = http.createServer(app);

// Whitelisted CORS origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

const isTest = process.env.NODE_ENV === 'test';

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by Socket.IO CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser with strict size limits to prevent payload DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL Operator Injection Sanitizer: strips keys starting with $ or containing .
function sanitizeMongoOperators(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeMongoOperators(obj[key]);
    }
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body) sanitizeMongoOperators(req.body);
  if (req.query) sanitizeMongoOperators(req.query);
  if (req.params) sanitizeMongoOperators(req.params);
  next();
});

// Security & Disclaimer Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict-Transport-Security (HSTS)
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content-Security-Policy (CSP) - Compatible with TradingView and Vite
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; frame-src https://*.tradingview.com https://accounts.google.com;"
  );

  res.setHeader('X-Data-Disclaimer', 'Delayed data - not investment advice');
  next();
});

// Distributed API rate limiting with Redis backing and memory fallback
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisCache.createRateLimitStore(15 * 60 * 1000),
  skip: () => isTest
});
app.use('/api', globalApiLimiter);

// Mount routers
app.use('/api/market', marketRouter);
app.use('/api/sectors', sectorsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/upstox', upstoxRouter);
app.use('/api/mf', mfRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/api/news', newsRouter);
app.use('/api/economy', economyRouter);
app.use('/api/ai', aiRouter);
app.use('/api/risk', riskRouter);
app.use('/api/etf', etfRouter);
app.use('/api/smart-money', smartMoneyRouter);
app.use('/api/countries', countriesRouter);
app.use('/api/screener', screenerRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/sector-trends', sectorTrendsRouter);
app.use('/api/indian-mf', indianMfRouter);
app.use('/api/comparison', comparisonRouter);
app.use('/api', holdingsFallbackRouter);
app.use('/api/analytics/mutual-fund/stock-weightage', stockWeightageRouter);
app.use('/api/analytics/mutual-funds', stockWeightageRouter);
app.use('/api/mutual-funds/screener', stockWeightageRouter);

// Health check (Liveness)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date(),
    topology: {
      database: mongoose.connection && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cacheMode: redisCache.isDistributed() ? 'redis_distributed' : 'single_instance_memory'
    }
  });
});

// Readiness check (returns 200 when ready, 503 when database is unavailable)
app.get('/ready', (req, res) => {
  const isDbReady = mongoose.connection && mongoose.connection.readyState === 1;
  if (isDbReady) {
    return res.json({
      status: 'ready',
      ready: true,
      time: new Date(),
      database: 'connected',
      cacheMode: redisCache.isDistributed() ? 'redis_distributed' : 'single_instance_memory'
    });
  }
  return res.status(503).json({
    status: 'degraded',
    ready: false,
    time: new Date(),
    database: 'disconnected',
    message: 'Database service currently unavailable. Market feeds and public APIs are operational; authentication and portfolio mutations require database connection.'
  });
});

// 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(status).json({
    error: status === 404 ? 'Not Found' : 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' && status === 500
      ? 'An unexpected error occurred'
      : (err.message || 'An error occurred')
  });
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  // Join room to receive real-time stock ticks
  socket.on('join_ticks', () => {
    socket.join('ticks');
  });

  // Join room to receive real-time index values
  socket.on('join_indices', () => {
    socket.join('indices');
  });

  // Watch a specific stock's live candles
  socket.on('watch_stock', (symbol) => {
    if (symbol) {
      socket.join(`stock:${symbol.toUpperCase()}`);
    }
  });

  socket.on('unwatch_stock', (symbol) => {
    if (symbol) {
      socket.leave(`stock:${symbol.toUpperCase()}`);
    }
  });

  socket.on('disconnect', () => {
    // Left rooms automatically
  });
});

// Initialize simulation only if explicitly enabled
if (process.env.ENABLE_MARKET_SIMULATOR === 'true') {
  simulator.initialize(io);
}

// Connect to MongoDB with auto-reconnection and graceful non-blocking fallback
mongoose.set('bufferCommands', false);
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trading-dashboard';

let reconnectTimer = null;
let isConnecting = false;

async function attemptMongoConnect() {
  if (isConnecting || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }
  isConnecting = true;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000
    });
  } catch (err) {
    // Expected during network partition or Atlas IP restriction
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Scheduling background reconnect...');
  startBackgroundReconnect();
});

mongoose.connection.on('error', (err) => {
  console.warn('⚠️ MongoDB connection error:', err.message);
});

function startBackgroundReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 0) {
      await attemptMongoConnect();
    }
  }, 10000); // Continually retry every 10s until connection succeeds
}

// Bounded startup: attempt connection before listening, then start HTTP server
async function startServer() {
  console.log('🔌 Connecting to database...');
  try {
    await attemptMongoConnect();
  } catch (e) {
    // Non-fatal
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ MongoDB unavailable on initial startup — running in degraded mode (auth routes will return controlled 503). Background auto-reconnect is active.');
    startBackgroundReconnect();
  }

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
    // Start non-blocking background warming only after server is actively listening
    if (process.env.NODE_ENV !== 'test') {
      sectorDataService.startBackgroundWarming();
      setTimeout(async () => {
        try {
          const { default: liveMfAnalyticsService } = await import('./services/LiveMfAnalyticsService.js');
          const { default: allFundsDirectoryService } = await import('./services/AllFundsDirectoryService.js');
          await Promise.allSettled([
            liveMfAnalyticsService.getLiveDashboardSummary('all'),
            allFundsDirectoryService.getAllSchemes(1, 20)
          ]);
          console.log('⚡ Background warming completed for mutual funds directory and dashboard summary');
        } catch (e) {
          // Non-blocking
        }
      }, 4000);
    }
  });
}

startServer();

// Graceful shutdown & lifecycle handling for container/orchestrator deployments
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed to new connections.');

    try {
      io.close();
      logger.info('Socket.io connections closed.');
    } catch (e) {}

    try {
      if (redisCache.client && redisCache.client.isOpen) {
        await redisCache.client.quit();
        logger.info('Redis connection closed.');
      }
    } catch (e) {}

    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed.');
      }
    } catch (e) {}

    logger.info('Graceful shutdown completed.');
    process.exit(signal === 'uncaughtException' ? 1 : 0);
  });

  // Force exit after 10s if connections fail to drain
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.stack || reason.message : String(reason)
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    error: err.stack || err.message
  });
  gracefulShutdown('uncaughtException');
});
