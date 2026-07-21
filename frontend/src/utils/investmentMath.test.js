import { describe, it, expect } from 'vitest';
import { calculateSIP, calculateLumpsum } from './investmentMath';

describe('investmentMath', () => {
  describe('calculateSIP', () => {
    it('calculates correctly for positive CAGR', () => {
      // 5000/month, 12% CAGR, 10 years
      const result = calculateSIP(5000, 12, 10);
      expect(result.investedAmount).toBe(600000);
      
      // Expected total around 11,61,695
      expect(Math.round(result.totalValue)).toBe(1161695);
      expect(Math.round(result.expectedReturns)).toBe(561695);
    });

    it('calculates correctly for zero CAGR', () => {
      const result = calculateSIP(5000, 0, 10);
      expect(result.investedAmount).toBe(600000);
      expect(result.totalValue).toBe(600000);
      expect(result.expectedReturns).toBe(0);
    });

    it('calculates correctly for negative CAGR', () => {
      // 5000/month, -5% CAGR, 10 years
      const result = calculateSIP(5000, -5, 10);
      expect(result.investedAmount).toBe(600000);
      expect(result.totalValue).toBeLessThan(600000);
      expect(result.expectedReturns).toBeLessThan(0);
    });

    it('handles multi-decade durations properly', () => {
      // 5000/month, 12% CAGR, 30 years
      const result = calculateSIP(5000, 12, 30);
      expect(result.investedAmount).toBe(1800000);
      // Expected around 1,76,49,569
      expect(Math.round(result.totalValue)).toBe(17649569);
    });

    it('handles zero inputs', () => {
      const result = calculateSIP(0, 12, 10);
      expect(result.totalValue).toBe(0);
      
      const result2 = calculateSIP(5000, 12, 0);
      expect(result2.totalValue).toBe(0);
    });
  });

  describe('calculateLumpsum', () => {
    it('calculates correctly for positive CAGR', () => {
      // 100000 lumpsum, 12% CAGR, 10 years
      const result = calculateLumpsum(100000, 12, 10);
      expect(result.investedAmount).toBe(100000);
      
      // Expected around 3,10,584.82 -> 310585
      expect(Math.round(result.totalValue)).toBe(310585);
      expect(Math.round(result.expectedReturns)).toBe(210585);
    });

    it('calculates correctly for zero CAGR', () => {
      const result = calculateLumpsum(100000, 0, 10);
      expect(result.investedAmount).toBe(100000);
      expect(result.totalValue).toBe(100000);
      expect(result.expectedReturns).toBe(0);
    });

    it('calculates correctly for negative CAGR', () => {
      // 100000 lumpsum, -5% CAGR, 10 years
      const result = calculateLumpsum(100000, -5, 10);
      expect(result.investedAmount).toBe(100000);
      expect(result.totalValue).toBeLessThan(100000);
      expect(result.expectedReturns).toBeLessThan(0);
    });

    it('handles multi-decade durations properly', () => {
      // 100000 lumpsum, 12% CAGR, 30 years
      const result = calculateLumpsum(100000, 12, 30);
      expect(result.investedAmount).toBe(100000);
      // Expected around 29,95,992
      expect(Math.round(result.totalValue)).toBe(2995992);
    });
    
    it('handles zero inputs', () => {
      const result = calculateLumpsum(0, 12, 10);
      expect(result.totalValue).toBe(0);
      
      const result2 = calculateLumpsum(100000, 12, 0);
      expect(result2.totalValue).toBe(100000);
    });
  });
});
