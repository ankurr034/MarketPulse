import express from 'express';
import newsService from '../services/NewsService.js';

const router = express.Router();

// GET /api/news
router.get('/', async (req, res) => {
  try {
    const feed = await newsService.getMarketNewsFeed();
    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/news/sentiment
router.get('/sentiment', async (req, res) => {
  try {
    const feed = await newsService.getMarketNewsFeed();
    const sentimentCounts = { Bullish: 0, Bearish: 0, Neutral: 0 };
    feed.forEach(art => {
      sentimentCounts[art.sentiment] = (sentimentCounts[art.sentiment] || 0) + 1;
    });
    res.json(sentimentCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
