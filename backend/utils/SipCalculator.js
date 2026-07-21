class SipCalculator {
  /**
   * Calculate SIP Future Value
   * @param {number} monthlyInvestment 
   * @param {number} expectedAnnualReturnPct 
   * @param {number} years 
   * @returns {Object} { investedAmount, expectedWealth, wealthGain }
   */
  calculateSipReturns(monthlyInvestment, expectedAnnualReturnPct, years) {
    if (monthlyInvestment <= 0 || years <= 0) {
      return { investedAmount: 0, expectedWealth: 0, wealthGain: 0 };
    }
    
    const months = years * 12;
    const monthlyRate = (expectedAnnualReturnPct / 100) / 12;
    
    const investedAmount = monthlyInvestment * months;
    
    let expectedWealth = 0;
    if (monthlyRate === 0) {
      expectedWealth = investedAmount;
    } else {
      expectedWealth = monthlyInvestment * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate);
    }
    
    return {
      investedAmount: Math.round(investedAmount),
      expectedWealth: Math.round(expectedWealth),
      wealthGain: Math.round(expectedWealth - investedAmount)
    };
  }

  /**
   * Calculate Inflation Adjusted Returns (Real Return)
   * @param {number} nominalReturnPct 
   * @param {number} inflationRatePct 
   * @returns {number} Real return percentage
   */
  calculateInflationAdjustedReturn(nominalReturnPct, inflationRatePct) {
    const nominal = 1 + (nominalReturnPct / 100);
    const inflation = 1 + (inflationRatePct / 100);
    return ((nominal / inflation) - 1) * 100;
  }
}

export default new SipCalculator();
