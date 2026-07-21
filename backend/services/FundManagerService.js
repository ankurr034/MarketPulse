import cacheService from './CacheService.js';

class FundManagerService {
  constructor() {
    this.managers = [
      { name: 'Rajeev Thakkar', amc: 'PPFAS Mutual Fund', fundsCount: 3, consistencyScore: 92, avgReturn: 18.5, primarySectors: ['Technology', 'Financials'], riskScore: 8, expRatio: '1.3%' },
      { name: 'Sankaran Naren', amc: 'ICICI Prudential Mutual Fund', fundsCount: 5, consistencyScore: 89, avgReturn: 16.2, primarySectors: ['Banking', 'Energy'], riskScore: 7, expRatio: '1.1%' },
      { name: 'Neelesh Surana', amc: 'Mirae Asset Mutual Fund', fundsCount: 4, consistencyScore: 90, avgReturn: 17.8, primarySectors: ['FMCG', 'Auto'], riskScore: 8, expRatio: '1.2%' },
      { name: 'R. Srinivasan', amc: 'SBI Mutual Fund', fundsCount: 6, consistencyScore: 88, avgReturn: 15.9, primarySectors: ['Healthcare', 'Metals'], riskScore: 7, expRatio: '1.4%' }
    ];
  }

  async getManagerProfile(managerName) {
    const mgr = this.managers.find(m => m.name.toLowerCase() === managerName.toLowerCase());
    if (mgr) return mgr;
    return {
      name: managerName,
      amc: 'Global Active Fund House',
      fundsCount: 2,
      consistencyScore: 85,
      avgReturn: 14.8,
      primarySectors: ['Technology', 'Financials'],
      riskScore: 7,
      expRatio: '1.2%'
    };
  }

  async getManagerRanking(sortBy = 'consistencyScore') {
    const list = [...this.managers];
    list.sort((a, b) => b[sortBy] - a[sortBy]);
    return list;
  }
}

export default new FundManagerService();
