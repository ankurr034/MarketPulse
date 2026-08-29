import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import axios from 'axios';

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
import mongoose from 'mongoose';

// Import services
import simulator from './services/SimulatorService.js';
import sectorDataService from './services/SectorDataService.js';
import upstoxMarketDataService from './services/UpstoxMarketDataService.js';
import upstoxInstrumentService from './services/UpstoxInstrumentService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Permit all frontend requests in local dev
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Disclaimer middleware
app.use((req, res, next) => {
  res.setHeader('X-Data-Disclaimer', 'Delayed data - not investment advice');
  next();
});

// Mount routers
app.use('/api/market', marketRouter);
app.use('/api/sectors', sectorsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/upstox', upstoxRouter);
app.use('/api/mf', mfRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/auth', authRouter);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
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

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trading-dashboard';
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
