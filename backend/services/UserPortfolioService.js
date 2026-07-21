import mongoose from 'mongoose';
import UserMfHolding from '../models/UserMfHolding.js';
import unifiedMfService from './UnifiedMfService.js';
import upstoxService from './UpstoxService.js';

class UserPortfolioService {
  async getHoldings(userId) {
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected. Returning empty holdings to avoid timeout.');
      return [];
    }
    
    const holdings = await UserMfHolding.find({ userId }).lean();
    
    // Enrich with latest live NAV
    const enriched = await Promise.all(holdings.map(async (holding) => {
      // Try to get latest NAV. We fetch a very short range and get the last candle.
      const navHistory = await unifiedMfService.getFundNavHistory(holding.schemeCode, holding.region || 'india', '1y'); 
      let currentNav = holding.avgBuyNav; // fallback to buy nav if live fails
      
      if (navHistory && navHistory.length > 0) {
        currentNav = navHistory[navHistory.length - 1].value;
      }

      const currentValue = holding.units * currentNav;
      const investedValue = holding.units * holding.avgBuyNav;
      const gainLoss = currentValue - investedValue;
      const gainLossPct = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

      return {
        ...holding,
        currentNav,
        currentValue,
        investedValue,
        gainLoss,
        gainLossPct
      };
    }));

    return enriched;
  }

  async addHolding(data) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected. Cannot add holding.');
    }
    const holding = new UserMfHolding(data);
    await holding.save();
    return holding;
  }

  async deleteHolding(id, userId) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected. Cannot delete holding.');
    }
    return UserMfHolding.findOneAndDelete({ _id: id, userId });
  }

  async syncUpstoxHoldings(userId) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected. Cannot sync holdings.');
    }
    const holdings = await upstoxService.getMfHoldings();
    if (!holdings) {
      throw new Error("Upstox Access Token is missing or invalid. Please connect Upstox first.");
    }

    const upsertPromises = holdings.map(async (h) => {
      // Assuming Upstox returns { isin, fund_name, quantity, average_price, ... }
      // We will map this to our schema
      const schemeCode = h.isin || h.instrument_token || 'UNKNOWN';
      const schemeName = h.fund_name || h.tradingsymbol || 'Unknown Fund';
      
      return UserMfHolding.findOneAndUpdate(
        { userId, schemeCode },
        {
          schemeName,
          units: h.quantity,
          avgBuyNav: h.average_price,
          buyDate: new Date().toISOString().split('T')[0] // Approximation since buyDate might not be singular
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(upsertPromises);
    return this.getHoldings(userId);
  }

  async getPortfolioAnalytics(userId) {
    const enrichedHoldings = await this.getHoldings(userId);
    let totalPortfolioValue = 0;
    
    // Calculate total value
    enrichedHoldings.forEach(h => {
      totalPortfolioValue += (h.currentValue || 0);
    });

    if (totalPortfolioValue === 0) {
      return { sectorAllocation: [] };
    }

    const sectorWeights = {};

    // For each holding, fetch its sector breakdown and weight it
    await Promise.all(enrichedHoldings.map(async (h) => {
      if (!h.currentValue || h.currentValue <= 0) return;
      
      const holdingWeight = h.currentValue / totalPortfolioValue;
      const schemeData = await unifiedMfService.getFundProfile(h.schemeCode, h.region || 'india');
      
      if (schemeData.available && schemeData.sectorBreakdown) {
        // sectorBreakdown is usually { "Financial": "35.5", "Technology": "12.0" }
        for (const [sector, pct] of Object.entries(schemeData.sectorBreakdown)) {
          const allocationVal = parseFloat(pct) || 0;
          const weightedAllocation = (allocationVal / 100) * holdingWeight;
          
          if (!sectorWeights[sector]) {
            sectorWeights[sector] = 0;
          }
          sectorWeights[sector] += weightedAllocation;
        }
      } else {
        // If no sector breakdown available, put it in 'Others'
        if (!sectorWeights['Others']) sectorWeights['Others'] = 0;
        sectorWeights['Others'] += holdingWeight;
      }
    }));

    // Convert to sorted array of percentages
    const sectorAllocation = Object.entries(sectorWeights)
      .map(([sector, weight]) => ({
        sector,
        allocationPct: weight * 100
      }))
      .sort((a, b) => b.allocationPct - a.allocationPct);

    return {
      totalPortfolioValue,
      sectorAllocation
    };
  }
}

export default new UserPortfolioService();
