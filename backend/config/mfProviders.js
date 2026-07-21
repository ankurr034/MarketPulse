/**
 * Configuration for Mutual Fund Data Providers
 */

export default {
  twelveData: {
    baseUrl: process.env.TWELVEDATA_BASE_URL || 'https://api.twelvedata.com',
    apiKey: process.env.TWELVEDATA_API_KEY || ''
  },
  indianProviders: {
    mfdata: {
      baseUrl: 'https://mfdata.in/api/v1'
    },
    mfapi: {
      baseUrl: 'https://api.mfapi.in/mf'
    }
  }
};
