import { jest } from '@jest/globals';
import mfDataAggregatorService from '../services/MfDataAggregatorService.js';
import macroEconomicService from '../services/MacroEconomicService.js';
import benchmarkService from '../services/BenchmarkService.js';
import holdingsFallbackService from '../services/HoldingsFallbackService.js';

// Mock axios and yahoo-finance2
jest.mock('axios');
jest.mock('yahoo-finance2', () => ({
  default: {
    chart: jest.fn(),
    quote: jest.fn(),
    search: jest.fn()
  }
}));
jest.mock('../services/RedisCacheService.js', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true)
}));

describe('Service Data Availability Contracts', () => {

  describe('MfDataAggregatorService', () => {
    it('returns { available: false } when NAV fetch fails', async () => {
      const axios = (await import('axios')).default;
      axios.get.mockRejectedValue(new Error('Network error'));
      
      const res = await mfDataAggregatorService.getSchemeNavHistory('12345');
      expect(res.available).toBe(false);
      expect(res.data).toEqual([]);
      expect(res.reason).toBeDefined();
    });

    it('returns { available: false } when Holdings fetch fails', async () => {
      const axios = (await import('axios')).default;
      axios.get.mockRejectedValue(new Error('Network error'));
      
      const res = await mfDataAggregatorService.getSchemeHoldings('12345');
      expect(res.available).toBe(false);
      expect(res.holdings).toEqual([]);
      expect(res.reason).toBeDefined();
    });
  });

  describe('MacroEconomicService', () => {
    it('returns { available: false } since external API is not implemented', async () => {
      const res = await macroEconomicService.getMacroIndicators('india');
      expect(res.available).toBe(false);
      expect(res.reason).toBeDefined();
    });
  });

  describe('BenchmarkService', () => {
    it('returns { available: false } when Yahoo Finance fetch fails', async () => {
      const { default: yahooFinance } = await import('yahoo-finance2');
      yahooFinance.chart.mockRejectedValue(new Error('YF error'));
      
      const res = await benchmarkService.getBenchmarkReturns('^NSEI');
      expect(res.available).toBe(false);
      expect(res.reason).toBeDefined();
    });
  });
  describe('HoldingsFallbackService', () => {
    it('returns { available: false } when Yahoo Finance fetch fails for global tickers', async () => {
      const { yahooFinance } = await import('../services/YahooFinanceService.js');
      yahooFinance.quoteSummary = jest.fn().mockRejectedValue(new Error('YF error'));
      
      const res = await holdingsFallbackService.getHoldings('AAPL');
      expect(res.available).toBe(false);
      expect(res.reason).toBeDefined();
    });

    it('returns { available: false } when FinAPI fetch fails for Indian tickers', async () => {
      const axios = (await import('axios')).default;
      axios.get.mockRejectedValue(new Error('Network error'));
      
      const res = await holdingsFallbackService.getHoldings('12345', 'Some Fund');
      expect(res.available).toBe(false);
      expect(res.reason).toBeDefined();
    });
  });
});
