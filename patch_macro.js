import fs from 'fs';

let content = fs.readFileSync('backend/services/MacroEconomicService.js', 'utf-8');
content = content.replace(
`class MacroEconomicService {
  constructor() {
    // In a production environment, we would fetch these from FRED/World Bank APIs
    this.mockMacroData = {
      india: {
        inflation: 4.8,
        interestRate: 6.5,
        gdpGrowth: 7.2,
        crudeOil: 82.5,
        usdInr: 83.2
      },
      global: {
        inflation: 3.1,
        interestRate: 5.25,
        gdpGrowth: 2.1,
        crudeOil: 82.5
      }
    };
  }

  async getMacroIndicators(region = 'india') {
    // Simulate API fetch delay
    await new Promise(res => setTimeout(res, 200));
    return this.mockMacroData[region] || this.mockMacroData.india;
  }
}`,
`class MacroEconomicService {
  constructor() {}

  async getMacroIndicators(region = 'india') {
    // In a production environment, we would fetch these from FRED/World Bank APIs
    return { available: false, reason: "Macro indicators external API not implemented" };
  }
}`
);

fs.writeFileSync('backend/services/MacroEconomicService.js', content);
