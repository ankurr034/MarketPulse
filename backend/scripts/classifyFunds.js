import axios from 'axios';

async function run() {
  const url = 'https://portal.amfiindia.com/spages/NAVAll.txt';
  const res = await axios.get(url);
  const rawText = res.data;
  
  const lines = rawText.split('\n');
  const rawRecords = [];
  let currentCategory = 'Other';

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.includes('Open Ended Schemes') || line.includes('Close Ended Schemes')) {
      const match = line.match(/\((.*?)\)/);
      currentCategory = match ? match[1].trim() : line.trim();
      continue;
    }

    const parts = line.split(';');
    if (parts.length >= 6 && /^\d+$/.test(parts[0])) {
      const schemeName = parts[3];
      const lower = schemeName.toLowerCase();
      // Simple filter for direct growth
      if ((lower.includes('direct') && lower.includes('growth')) || lower.includes('dir gr')) {
         if (!lower.includes('regular') && !lower.includes('idcw') && !lower.includes('dividend')) {
           rawRecords.push({
             schemeCode: parts[0],
             schemeName: parts[3],
             category: currentCategory
           });
         }
      }
    }
  }

  // Deduplicate
  const unique = new Map();
  rawRecords.forEach(r => {
    if (!unique.has(r.schemeCode)) unique.set(r.schemeCode, r);
  });
  const eligibleSchemes = Array.from(unique.values());

  const taxonomyCounts = {
    equity: {},
    taxSaver: {},
    debt: {},
    hybrid: {},
    index: {},
    global: {},
    commodities: {},
    sectors: {},
    other: {}
  };
  
  let classifiedSchemes = 0;
  let unclassifiedSchemes = 0;
  let duplicateAssignments = 0;

  function inc(main, sub) {
    if (!taxonomyCounts[main]) taxonomyCounts[main] = {};
    taxonomyCounts[main][sub] = (taxonomyCounts[main][sub] || 0) + 1;
  }

  eligibleSchemes.forEach(s => {
    let mainCat = null;
    let subCat = null;
    let count = 0;

    const catStr = (s.category || '').toLowerCase();
    const nameStr = (s.schemeName || '').toLowerCase();

    const setClassification = (main, sub) => {
      mainCat = main;
      subCat = sub;
      count++;
    };

    if (catStr.includes('equity scheme - large cap') || catStr.includes('equity schemes - large cap')) {
      setClassification('equity', 'Large Cap');
    } else if (catStr.includes('large & mid cap')) {
      setClassification('equity', 'Large & Mid Cap');
    } else if (catStr.includes('mid cap') && !catStr.includes('large')) {
      setClassification('equity', 'Mid Cap');
    } else if (catStr.includes('small cap')) {
      setClassification('equity', 'Small Cap');
    } else if (catStr.includes('flexi cap')) {
      setClassification('equity', 'Flexi Cap');
    } else if (catStr.includes('multi cap')) {
      setClassification('equity', 'Multi Cap');
    } else if (catStr.includes('dividend yield')) {
      setClassification('equity', 'Dividend Yield');
    } else if (catStr.includes('value')) {
      setClassification('equity', 'Value');
    } else if (catStr.includes('focused')) {
      setClassification('equity', 'Focused');
    } else if (catStr.includes('contra')) {
      setClassification('equity', 'Contra');
    } else if (catStr.includes('elss') || catStr.includes('tax saver')) {
      setClassification('taxSaver', 'ELSS Funds');
    } else if (catStr.includes('sectoral') || catStr.includes('thematic')) {
      // dynamic subcategories based on name for Sectoral/Thematic
      let theme = 'Other Sector/Thematic';
      if (nameStr.includes('tech') || nameStr.includes('digital') || nameStr.includes('it etf')) theme = 'Technology';
      else if (nameStr.includes('bank') || nameStr.includes('financial')) theme = 'Banking & Financial Services';
      else if (nameStr.includes('pharma') || nameStr.includes('health')) theme = 'Healthcare & Pharma';
      else if (nameStr.includes('infra')) theme = 'Infrastructure';
      else if (nameStr.includes('fmcg') || nameStr.includes('consumption')) theme = 'FMCG & Consumption';
      else if (nameStr.includes('auto')) theme = 'Auto';
      else if (nameStr.includes('psu') || nameStr.includes('cpes')) theme = 'PSU';
      setClassification('sectors', theme);
    } else if (catStr.includes('debt scheme') || catStr.includes('income/debt oriented') || catStr === 'gilt' || catStr === 'income') {
      let dSub = 'Other Debt';
      if (catStr.includes('liquid')) dSub = 'Liquid Fund';
      else if (catStr.includes('corporate bond')) dSub = 'Corporate Bond';
      else if (catStr.includes('banking and psu') || catStr.includes('banking & psu')) dSub = 'Banking & PSU';
      else if (catStr.includes('gilt') && catStr.includes('10 year')) dSub = 'Gilt - 10Y Constant Duration';
      else if (catStr.includes('gilt')) dSub = 'Gilt';
      else if (catStr.includes('short duration') || catStr.includes('short term')) dSub = 'Short Duration';
      else if (catStr.includes('overnight')) dSub = 'Overnight';
      else if (catStr.includes('ultra short')) dSub = 'Ultra Short Duration';
      else if (catStr.includes('low duration')) dSub = 'Low Duration';
      else if (catStr.includes('money market')) dSub = 'Money Market';
      else if (catStr.includes('medium to long')) dSub = 'Medium to Long Duration';
      else if (catStr.includes('medium duration')) dSub = 'Medium Duration';
      else if (catStr.includes('long duration')) dSub = 'Long Duration';
      else if (catStr.includes('dynamic bond') || catStr.includes('dynamic term')) dSub = 'Dynamic Bond';
      else if (catStr.includes('credit risk')) dSub = 'Credit Risk';
      else if (catStr.includes('floater')) dSub = 'Floater';
      setClassification('debt', dSub);
    } else if (catStr.includes('hybrid scheme')) {
      let hSub = 'Other Hybrid';
      if (catStr.includes('aggressive')) hSub = 'Aggressive Hybrid';
      else if (catStr.includes('balanced advantage') || catStr.includes('dynamic asset')) hSub = 'Balanced Advantage / Dynamic Asset Allocation';
      else if (catStr.includes('multi asset')) hSub = 'Multi Asset Allocation';
      else if (catStr.includes('arbitrage')) hSub = 'Arbitrage';
      else if (catStr.includes('conservative')) hSub = 'Conservative Hybrid';
      else if (catStr.includes('equity savings')) hSub = 'Equity Savings';
      else if (catStr.includes('balanced hybrid')) hSub = 'Balanced Hybrid';
      setClassification('hybrid', hSub);
    } else if (catStr.includes('index') || catStr.includes('etf')) {
      // It's index/etf, determine subcategory
      if (nameStr.includes('gold')) setClassification('commodities', 'Gold');
      else if (nameStr.includes('silver')) setClassification('commodities', 'Silver');
      else if (nameStr.includes('nasdaq')) setClassification('global', 'Nasdaq');
      else if (nameStr.includes('s&p 500') || nameStr.includes('sp 500')) setClassification('global', 'S&P 500');
      else if (nameStr.includes('fang') || nameStr.includes('ai')) setClassification('global', 'Global Tech / AI & Tech');
      else if (nameStr.includes('global') || nameStr.includes('world')) setClassification('global', 'Global Equity');
      else if (nameStr.includes('russell')) setClassification('global', 'Russell');
      else if (nameStr.includes('nifty 50') || nameStr.includes('nifty50')) setClassification('index', 'Nifty 50');
      else if (nameStr.includes('nifty next 50')) setClassification('index', 'Nifty Next 50');
      else if (nameStr.includes('nifty 100')) setClassification('index', 'Nifty 100');
      else if (nameStr.includes('nifty 200 momentum 30')) setClassification('index', 'Nifty 200 Momentum 30');
      else if (nameStr.includes('nifty 200')) setClassification('index', 'Nifty 200');
      else if (nameStr.includes('nifty 500')) setClassification('index', 'Nifty 500');
      else if (nameStr.includes('nifty midcap 150')) setClassification('index', 'Nifty Midcap 150');
      else if (nameStr.includes('nifty smallcap 250')) setClassification('index', 'Nifty Smallcap 250');
      else if (nameStr.includes('nifty bank') || nameStr.includes('bank bees')) setClassification('index', 'Nifty Bank');
      else if (nameStr.includes('sensex')) setClassification('index', 'Sensex');
      else if (nameStr.includes('nifty') || nameStr.includes('index')) setClassification('index', 'Other Index');
    } else if (catStr.includes('fof overseas') || nameStr.includes('overseas') || nameStr.includes('global') || nameStr.includes('international')) {
      setClassification('global', 'Other Global');
    }

    // Default catch-all
    if (count === 0) {
      if (nameStr.includes('gift city') || nameStr.includes('ifsc')) {
        setClassification('other', 'GIFT City');
      } else {
        setClassification('other', 'Other');
      }
    }

    if (count > 1) {
      duplicateAssignments++;
    } else if (count === 1) {
      classifiedSchemes++;
      inc(mainCat, subCat);
    } else {
      unclassifiedSchemes++;
    }
  });

  console.log(`TAXONOMY IMPLEMENTATION REPORT\n`);
  console.log(`ELIGIBLE SCHEMES: ${eligibleSchemes.length}`);
  console.log(`CLASSIFIED: ${classifiedSchemes}`);
  console.log(`UNCLASSIFIED: ${unclassifiedSchemes}`);
  console.log(`DUPLICATE ASSIGNMENTS: ${duplicateAssignments}\n`);

  for (const [main, subs] of Object.entries(taxonomyCounts)) {
    console.log(`${main.toUpperCase()}:`);
    for (const [sub, cnt] of Object.entries(subs)) {
      console.log(`  ${sub}: ${cnt}`);
    }
    console.log('');
  }
}

run().catch(console.error);
