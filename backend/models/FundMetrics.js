import mongoose from 'mongoose';

const FundMetricsSchema = new mongoose.Schema({
  fundId: { type: String, required: true, unique: true },
  fundName: { type: String, required: true },
  region: { type: String, enum: ['india', 'global'], required: true },
  
  // NAV Metrics
  returns: {
    daily: Number,
    weekly: Number,
    monthly: Number,
    threeMonths: Number,
    sixMonths: Number,
    oneYear: Number,
    threeYearCagr: Number,
    fiveYearCagr: Number,
    tenYearCagr: Number,
  },
  
  // Risk Metrics
  risk: {
    alpha: Number,
    beta: Number,
    sharpeRatio: Number,
    sortinoRatio: Number,
    treynorRatio: Number,
    informationRatio: Number,
    standardDeviation: Number,
    maxDrawdown: Number,
    volatilityScore: Number
  },

  // Scores
  scores: {
    growth: Number,
    risk: Number,
    quality: Number,
    diversification: Number,
    overall: Number
  },

  recommendation: {
    label: { type: String, enum: ['Strong Buy', 'Buy', 'Hold', 'Reduce Exposure', 'Sell'] },
    reasoning: [String]
  },

  lastUpdated: { type: Date, default: Date.now }
});

// Index for fast querying
FundMetricsSchema.index({ fundId: 1 });

export default mongoose.model('FundMetrics', FundMetricsSchema);
