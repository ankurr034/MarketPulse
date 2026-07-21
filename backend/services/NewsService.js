import axios from 'axios';
import dotenv from 'dotenv';
import finnhubService from './FinnhubService.js';
import cacheService from './CacheService.js';

dotenv.config();

class NewsService {
  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
    this.baseUrl = 'https://newsapi.org/v2';
  }

  async getMarketNewsFeed() {
    const cacheKey = 'market_news_feed';
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    let articles = [];

    // 1. Try to fetch from NewsAPI
    if (this.apiKey && this.apiKey !== 'your_newsapi_key') {
      try {
        const response = await axios.get(`${this.baseUrl}/top-headlines`, {
          params: {
            category: 'business',
            language: 'en',
            apiKey: this.apiKey,
            pageSize: 20
          }
        });
        if (response.data && response.data.articles) {
          articles = response.data.articles.map(art => ({
            title: art.title,
            description: art.description,
            source: art.source?.name || 'NewsAPI',
            url: art.url,
            urlToImage: art.urlToImage,
            publishedAt: art.publishedAt,
            sentiment: this.calculateBasicSentiment(art.title + ' ' + (art.description || ''))
          }));
        }
      } catch (error) {
        console.error('NewsAPI fetch error, falling back to Finnhub:', error.message);
      }
    }

    // 2. If NewsAPI returns nothing or failed, fallback/merge with Finnhub news
    if (articles.length === 0) {
      try {
        const finnhubNews = await finnhubService.getMarketNews('general');
        if (finnhubNews && Array.isArray(finnhubNews)) {
          articles = finnhubNews.slice(0, 20).map(art => ({
            title: art.headline,
            description: art.summary,
            source: art.source || 'Finnhub',
            url: art.url,
            urlToImage: art.image,
            publishedAt: new Date(art.datetime * 1000).toISOString(),
            sentiment: this.calculateBasicSentiment(art.headline + ' ' + (art.summary || ''))
          }));
        }
      } catch (error) {
        console.error('Finnhub news fetch error:', error.message);
      }
    }

    // Cache news feed for 30 minutes (STANDARD is 5 min, let's cache for 15 min or use SLOW 1hr)
    cacheService.set(cacheKey, articles, 'STANDARD');
    return articles;
  }

  calculateBasicSentiment(text) {
    const positiveWords = ['grow', 'bull', 'profit', 'gain', 'rise', 'up', 'surge', 'higher', 'positive', 'beat', 'outperform', 'strong', 'boost', 'rally', 'record high'];
    const negativeWords = ['fall', 'bear', 'loss', 'drop', 'down', 'plunge', 'lower', 'negative', 'miss', 'underperform', 'weak', 'slump', 'crash', 'fears', 'worry', 'deficit'];

    const lowerText = text.toLowerCase();
    let posCount = 0;
    let negCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) posCount += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) negCount += matches.length;
    });

    if (posCount > negCount) return 'Bullish';
    if (negCount > posCount) return 'Bearish';
    return 'Neutral';
  }
}

export default new NewsService();
