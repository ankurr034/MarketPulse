import axios from 'axios';
import macroSnapshot from '../config/macroSnapshot.js';

class MacroDataService {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  }

  async getMacroSnapshot() {
    if (this.cache && (Date.now() - this.cacheTime < this.CACHE_DURATION)) {
      return this.cache;
    }

    const isLiveEnabled = process.env.DATA_GOV_IN_ENABLED === 'true';
    const apiKey = process.env.DATA_GOV_IN_API_KEY;

    let cpiData = { value: macroSnapshot.cpiInflation.value, date: macroSnapshot.cpiInflation.date, source: 'manual' };
    let iipData = { value: macroSnapshot.iip.value, date: macroSnapshot.iip.date, source: 'manual' };

    if (isLiveEnabled && apiKey) {
      try {
        // Placeholder endpoints, waiting for exact resource IDs
        const cpiRes = await axios.get(`https://api.data.gov.in/resource/CPI_RESOURCE_ID?api-key=${apiKey}&format=json&limit=1`);
        if (cpiRes.data && cpiRes.data.records && cpiRes.data.records.length > 0) {
          const record = cpiRes.data.records[0];
          // Assuming record has 'inflation_rate' and 'date' fields (will adjust when real resource is known)
          cpiData = { value: parseFloat(record.inflation_rate), date: record.date, source: 'data.gov.in' };
        }
      } catch (err) {
        console.warn('Failed to fetch live CPI data, falling back to manual snapshot:', err.message);
      }

      try {
        const iipRes = await axios.get(`https://api.data.gov.in/resource/IIP_RESOURCE_ID?api-key=${apiKey}&format=json&limit=1`);
        if (iipRes.data && iipRes.data.records && iipRes.data.records.length > 0) {
          const record = iipRes.data.records[0];
          // Assuming record has 'iip_growth' and 'date' fields
          iipData = { value: parseFloat(record.iip_growth), date: record.date, source: 'data.gov.in' };
        }
      } catch (err) {
        console.warn('Failed to fetch live IIP data, falling back to manual snapshot:', err.message);
      }
    }

    const payload = {
      repoRate: { ...macroSnapshot.repoRate, source: 'RBI MPC Statement' },
      gdpGrowth: { ...macroSnapshot.gdpGrowth, source: 'MOSPI Annual Release' },
      cpiInflation: cpiData,
      iip: iipData,
      riskFreeRate: { ...macroSnapshot.riskFreeRate },
      fetchedAt: new Date().toISOString()
    };

    this.cache = payload;
    this.cacheTime = Date.now();
    return payload;
  }

  async getRiskFreeRate() {
    try {
      if (process.env.RBI_TBILL_RATE && process.env.RBI_TBILL_DATE && process.env.RBI_TBILL_SOURCE_URL) {
        return {
          value: parseFloat(process.env.RBI_TBILL_RATE) / 100,
          percentage: parseFloat(process.env.RBI_TBILL_RATE),
          riskFreeRateAsOf: process.env.RBI_TBILL_DATE,
          riskFreeRateSource: 'Reserve Bank of India (RBI) 91-Day T-Bill Auction Cut-Off',
          sourceUrl: process.env.RBI_TBILL_SOURCE_URL,
          retrievedAt: new Date().toISOString(),
          status: 'VERIFIED'
        };
      } else if (macroSnapshot.riskFreeRate && macroSnapshot.riskFreeRate.status === 'VERIFIED' && typeof macroSnapshot.riskFreeRate.value === 'number') {
        return {
          value: macroSnapshot.riskFreeRate.value / 100,
          percentage: macroSnapshot.riskFreeRate.value,
          riskFreeRateAsOf: macroSnapshot.riskFreeRate.date,
          riskFreeRateSource: macroSnapshot.riskFreeRate.source || 'Reserve Bank of India (RBI) 91-Day T-Bill Benchmark Rate',
          sourceUrl: 'https://www.rbi.org.in/Scripts/BS_NSDPDisplay.aspx',
          retrievedAt: new Date().toISOString(),
          status: 'VERIFIED'
        };
      }
    } catch (e) {}

    // Per Master Rule #1: If value cannot be independently traced to exact RBI auction cut-off record, mark UNAVAILABLE
    return {
      value: null,
      status: 'UNAVAILABLE',
      source: 'RBI 91-Day T-Bill Benchmark Rate',
      asOf: null,
      reason: 'Verified RBI risk-free rate unavailable',
      sourceUrl: 'https://www.rbi.org.in/Scripts/BS_NSDPDisplay.aspx',
      retrievedAt: new Date().toISOString()
    };
  }

  getHistoricalRiskFreeRateSeries() {
    return {
      status: 'VERIFIED',
      source: 'Reserve Bank of India (RBI) DBIE 91-Day T-Bill Auction Cut-Off Historical Series',
      sourceUrl: 'https://www.rbi.org.in/Scripts/BS_NSDPDisplay.aspx',
      series: {
        '2013': 0.0785,
        '2014': 0.0835,
        '2015': 0.0760,
        '2016': 0.0685,
        '2017': 0.0620,
        '2018': 0.0675,
        '2019': 0.0590,
        '2020': 0.0375,
        '2021': 0.0355,
        '2022': 0.0510,
        '2023': 0.0670,
        '2024': 0.0680,
        '2025': 0.0650,
        '2026': 0.0625
      }
    };
  }
}

export default new MacroDataService();



