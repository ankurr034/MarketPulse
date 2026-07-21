import fs from 'fs';

let content = fs.readFileSync('backend/services/MfDataAggregatorService.js', 'utf-8');

// 1. Update getSchemeNavHistory
// It currently returns `data = []`. We need it to return `{ available: boolean, data: [], reason?: string }`
content = content.replace(
`    if (!data) data = [];

    console.log(\`[DEBUG] getSchemeNavHistory(\${schemeCode}, \${range}) -> data length: \${data.length}\`);

    this._setCache(cacheKey, data);
    return data;`,
`    if (!data || data.length === 0) {
      const result = { available: false, data: [], reason: 'NAV data unavailable from all sources' };
      this._setCache(cacheKey, result);
      return result;
    }

    const result = { available: true, data };
    console.log(\`[DEBUG] getSchemeNavHistory(\${schemeCode}, \${range}) -> data length: \${data.length}\`);

    this._setCache(cacheKey, result);
    return result;`
);

// 2. Update getSchemeHoldings to remove mock generation
content = content.replace(
`    } catch (err) {
      console.warn(\`mfdata.in Holdings fetch failed for \${schemeCode}. Falling back to mfapi.in metadata.\`);
      
      let backupMeta = null;
      try {
        const metaRes = await axios.get(\`https://api.mfapi.in/mf/\${schemeCode}\`, { timeout: 10000 });
        if (metaRes.data && metaRes.data.meta) {
          backupMeta = metaRes.data.meta;
        }
      } catch(e) {}

      // Generate stable mock data based on schemeCode to prevent completely blank UI
      const numericCode = parseInt(schemeCode) || 12345;
      const mockAum = 10000 + (numericCode % 50000);
      const mockExpense = 0.5 + ((numericCode % 10) * 0.1);
      const mockYield = 0.8 + ((numericCode % 15) * 0.1);
      const mockSharpe = (0.5 + ((numericCode % 20) * 0.05)).toFixed(2);
      
      const mockHoldings = [
        { stock: 'HDFC Bank Ltd.', allocation: (8 + (numericCode % 4)).toFixed(2) },
        { stock: 'Reliance Industries Ltd.', allocation: (7 + (numericCode % 3)).toFixed(2) },
        { stock: 'ICICI Bank Ltd.', allocation: (5 + (numericCode % 5)).toFixed(2) },
        { stock: 'Infosys Ltd.', allocation: (4 + (numericCode % 2)).toFixed(2) },
        { stock: 'Larsen & Toubro Ltd.', allocation: (3 + (numericCode % 3)).toFixed(2) }
      ];

      return { 
        available: false,
        schemeCode: schemeCode,
        schemeName: backupMeta ? backupMeta.scheme_name : 'Unknown Fund',
        category: backupMeta ? backupMeta.scheme_category : null,
        fundManager: null,
        benchmark: null,
        risk: null,
        expenseRatio: mockExpense,
        yield: mockYield,
        aum: mockAum,
        sharpeRatio: mockSharpe,
        holdings: mockHoldings,
        sectors: []
      };
    }`,
`    } catch (err) {
      console.warn(\`mfdata.in Holdings fetch failed for \${schemeCode}.\`);
      return { 
        available: false,
        reason: 'Holdings data currently unavailable (mfdata.in timeout)',
        schemeCode: schemeCode,
        schemeName: 'Unknown Fund',
        holdings: [],
        sectors: []
      };
    }`
);

fs.writeFileSync('backend/services/MfDataAggregatorService.js', content);
