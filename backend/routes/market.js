import express from 'express';
import simulator from '../services/SimulatorService.js';

const router = express.Router();

// Get indices values
router.get('/indices', (req, res) => {
  res.json(simulator.getIndices());
});

// Check if market is open/closed
router.get('/status', (req, res) => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();
  
  // Market hours: Mon-Fri 9:15 AM to 3:30 PM (9.25 to 15.5)
  const isWeekday = day >= 1 && day <= 5;
  const currentTime = hours + minutes / 60;
  const isOpen = isWeekday && currentTime >= 9.25 && currentTime <= 15.5;

  let countdown = 0;
  if (isOpen) {
    // Minutes remaining to close (3:30 PM is 15.5)
    countdown = Math.floor((15.5 - currentTime) * 60);
  } else {
    // Simple minutes countdown to next 9:15 AM
    countdown = 840; // Default placeholder
  }

  res.json({
    status: isOpen ? 'Open' : 'Closed',
    countdown,
    timezone: 'Asia/Kolkata'
  });
});

// Market Breadth (Advances/Declines/Ratio/Highs/Lows)
router.get('/breadth', (req, res) => {
  res.json(simulator.getMarketBreadth());
});

// Top Performers (Gainers, Losers, Active, Volume, Breakouts)
router.get('/top-performers', (req, res) => {
  res.json(simulator.getTopPerformers());
});

// Heatmap Treemap Data
router.get('/heatmap', (req, res) => {
  res.json(simulator.getHeatmap());
});

// Financial News and Sentiment Analysis
router.get('/news', (req, res) => {
  res.json(simulator.getNews());
});

// Macro-Economic Indicators
router.get('/economic', (req, res) => {
  res.json(simulator.getEconomics());
});

// AI Generated Insights Summary
router.get('/ai/insights', (req, res) => {
  res.json(simulator.getAIInsights());
});

export default router;
