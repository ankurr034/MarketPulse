/**
 * Scheme Filter & Data Validation Utility for MarketPulse Mutual Funds Module
 */

export function isStrictDirectGrowth(schemeName) {
  if (!schemeName || typeof schemeName !== 'string') return false;

  const lower = schemeName.toLowerCase();

  // 1. Strict Negative Exclusions
  const forbiddenPatterns = [
    /\bregular\b/,
    /\breg\b/,
    /\bidcw\b/,
    /\bdividend\b/,
    /\bdiv\b/,
    /\bpayout\b/,
    /\breinvestment\b/,
    /\breinvest\b/,
    /\bbonus\b/,
    /\bsegregated\b/,
    /\bclosed\b/,
    /\bmatured\b/,
    /\bmerged\b/,
    /\binactive\b/,
    /\binstitutional\b/,
    /\binterval\b/,
    /\bstandard\b/
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(lower)) {
      return false;
    }
  }

  // Check if scheme is an ETF / BeES (Inherently Direct exchange-traded instruments)
  const isEtf = /\b(etf|bees|exchange traded fund)\b/i.test(lower);
  if (isEtf) {
    return true;
  }

  // 2. Strict Positive Direct & Growth Requirements for all Mutual Fund Schemes
  const isDirect = lower.includes('direct') || lower.includes('-dir') || lower.includes('(dir)') || lower.includes(' dir ');
  const isGrowth = lower.includes('growth') || lower.includes('-gr') || lower.includes('(gr)') || lower.includes(' gr ') || lower.includes('index fund') || lower.includes('index scheme');

  return isDirect && isGrowth;
}

/**
 * Canonical SEBI Registered AMC Resolver
 * Reliably maps fund names or raw provider strings to official AMC names.
 */
export function resolveAmcName(fundHouseOrName) {
  if (!fundHouseOrName || typeof fundHouseOrName !== 'string') return 'Other Mutual Fund';
  const str = fundHouseOrName.trim();
  const lower = str.toLowerCase();

  if (/\bbank of india\b|\bboi\b/i.test(lower)) return 'Bank of India Mutual Fund';
  if (/\bbandhan\b|\bidfc\b/i.test(lower)) return 'Bandhan Mutual Fund';
  if (/\bhdfc\b/i.test(lower)) return 'HDFC Mutual Fund';
  if (/\bicici\b|\bprudential\b/i.test(lower)) return 'ICICI Prudential Mutual Fund';
  if (/\bsbi\b|\bstate bank\b/i.test(lower)) return 'SBI Mutual Fund';
  if (/\bnippon\b|\breliance\b/i.test(lower)) return 'Nippon India Mutual Fund';
  if (/\bparag parikh\b|\bppfas\b/i.test(lower)) return 'PPFAS Mutual Fund';
  if (/\bquant\b/i.test(lower)) return 'Quant Mutual Fund';
  if (/\bkotak\b/i.test(lower)) return 'Kotak Mahindra Mutual Fund';
  if (/\baxis\b/i.test(lower)) return 'Axis Mutual Fund';
  if (/\btata\b/i.test(lower)) return 'Tata Mutual Fund';
  if (/\bmirae\b/i.test(lower)) return 'Mirae Asset Mutual Fund';
  if (/\baditya birla\b|\babsl\b|\bbirla sun life\b/i.test(lower)) return 'Aditya Birla Sun Life Mutual Fund';
  if (/\bmotilal\b|\boswal\b/i.test(lower)) return 'Motilal Oswal Mutual Fund';
  if (/\buti\b/i.test(lower)) return 'UTI Mutual Fund';
  if (/\bdsp\b/i.test(lower)) return 'DSP Mutual Fund';
  if (/\bfranklin\b|\btempleton\b/i.test(lower)) return 'Franklin Templeton Mutual Fund';
  if (/\bcanara\b|\brobeco\b/i.test(lower)) return 'Canara Robeco Mutual Fund';
  if (/\bhsbc\b/i.test(lower)) return 'HSBC Mutual Fund';
  if (/\bedelweiss\b/i.test(lower)) return 'Edelweiss Mutual Fund';
  if (/\binvesco\b/i.test(lower)) return 'Invesco Mutual Fund';
  if (/\bsundaram\b/i.test(lower)) return 'Sundaram Mutual Fund';
  if (/\bpgim\b/i.test(lower)) return 'PGIM India Mutual Fund';
  if (/\bunion\b/i.test(lower)) return 'Union Mutual Fund';
  if (/\bbaroda\b|\bbnp\b/i.test(lower)) return 'Baroda BNP Paribas Mutual Fund';
  if (/\bmahindra\b|\bmanulife\b/i.test(lower)) return 'Mahindra Manulife Mutual Fund';
  if (/\bwhiteoak\b/i.test(lower)) return 'WhiteOak Capital Mutual Fund';
  if (/\bnavi\b/i.test(lower)) return 'Navi Mutual Fund';
  if (/\bgroww\b/i.test(lower)) return 'Groww Mutual Fund';
  if (/\bzerodha\b/i.test(lower)) return 'Zerodha Mutual Fund';
  if (/\bjm\b|\bjm financial\b/i.test(lower)) return 'JM Financial Mutual Fund';
  if (/\blic\b/i.test(lower)) return 'LIC Mutual Fund';
  if (/\bquantum\b/i.test(lower)) return 'Quantum Mutual Fund';
  if (/\btaurus\b/i.test(lower)) return 'Taurus Mutual Fund';
  if (/\bshriram\b/i.test(lower)) return 'Shriram Mutual Fund';
  if (/\btrust\b|\btrustmf\b/i.test(lower)) return 'Trust Mutual Fund';
  if (/\biti\b/i.test(lower)) return 'ITI Mutual Fund';
  if (/\bsamco\b/i.test(lower)) return 'Samco Mutual Fund';
  if (/\bhelios\b/i.test(lower)) return 'Helios Mutual Fund';
  if (/\bbajaj\b|\bfinserv\b/i.test(lower)) return 'Bajaj Finserv Mutual Fund';
  if (/\b360 one\b|\biifl\b/i.test(lower)) return '360 ONE Mutual Fund';
  if (/\bjio\b|\bblackrock\b/i.test(lower)) return 'JioBlackRock Mutual Fund';
  if (/\bcapitalmind\b/i.test(lower)) return 'Capitalmind Mutual Fund';
  if (/\bunifi\b/i.test(lower)) return 'Unifi Mutual Fund';
  if (/\bchoice\b/i.test(lower)) return 'Choice Mutual Fund';
  if (/\babakkus\b/i.test(lower)) return 'Abakkus Mutual Fund';
  if (/\bnj\b/i.test(lower)) return 'NJ Mutual Fund';

  if (str.toLowerCase().includes('mutual fund')) return str;
  return `${str} Mutual Fund`;
}

/**
 * Resolves Plan (Direct vs Regular) and Option (Growth vs IDCW vs Bonus) from scheme name
 */
export function resolvePlanAndOption(schemeName) {
  if (!schemeName || typeof schemeName !== 'string') {
    return { plan: 'Direct', option: 'Growth' };
  }
  const lower = schemeName.toLowerCase();

  let plan = 'Direct';
  if (/\bregular\b|\breg\b/i.test(lower) && !/\bdirect\b/i.test(lower)) {
    plan = 'Regular';
  } else if (/\bdirect\b|\b-dir\b|\b\(dir\)\b|\bdir\b/i.test(lower)) {
    plan = 'Direct';
  }

  let option = 'Growth';
  if (/\bidcw\b|\bdividend\b|\bdiv\b|\bpayout\b|\breinvestment\b|\breinvest\b/i.test(lower)) {
    option = 'IDCW';
  } else if (/\bbonus\b/i.test(lower)) {
    option = 'Bonus';
  } else if (/\bgrowth\b|\b-gr\b|\b\(gr\)\b|\bgr\b/i.test(lower)) {
    option = 'Growth';
  }

  return { plan, option };
}

/**
 * Builds a 5-tuple canonical identity for a mutual fund scheme
 */
export function buildCanonicalIdentity(schemeCode, schemeName, amc, isin, customPlan, customOption) {
  const code = String(schemeCode || '').trim();
  const name = String(schemeName || '').trim();
  const resolvedAmc = resolveAmcName(amc || name);
  const { plan: parsedPlan, option: parsedOption } = resolvePlanAndOption(name);
  const plan = customPlan || parsedPlan;
  const option = customOption || parsedOption;
  const cleanIsin = isin ? String(isin).trim() : null;

  return {
    schemeCode: code,
    schemeName: name,
    amc: resolvedAmc,
    fundHouse: resolvedAmc,
    family: resolvedAmc,
    isin: cleanIsin,
    isinGrowth: cleanIsin,
    plan,
    planType: plan,
    option,
    canonicalKey: `${code}_${cleanIsin || 'NOISIN'}_${resolvedAmc.replace(/\s+/g, '')}_${plan}_${option}`
  };
}

/**
 * Authoritative Commodity Classification Resolver
 * Isolates and enriches ONLY Commodity schemes (Gold, Silver, Metals, Mining)
 * while preserving all other categories untouched.
 */
/**
 * Authoritative Commodity Classification Resolver
 * Isolates and enriches ONLY Commodity schemes (Gold, Silver, Metals, Mining)
 */
export function resolveCommodityClassification(schemeName, rawCategory = '') {
  const n = (schemeName || '').toLowerCase();
  const c = (rawCategory || '').toLowerCase();

  // Commodities (Gold, Silver, Gold Mining, Metals, Precious Metals, Commodity FoFs, Commodity ETFs)
  const isCommodity = n.includes('gold') || n.includes('silver') || n.includes('commodity') || n.includes('precious') || n.includes('metal') || n.includes('mining') || c.includes('gold') || c.includes('silver') || c.includes('commodity');
  if (!isCommodity) {
    return null;
  }

  // Exclude Overseas / Global funds unless they are explicit commodity mining / precious metals funds
  if (c.includes('fof overseas') || c.includes('overseas') || n.includes('overseas') || n.includes('world') || n.includes('global agri')) {
    if (!(n.includes('gold') || n.includes('silver') || n.includes('mining') || n.includes('metal') || n.includes('goldmine'))) {
      return null;
    }
  }
  
  let sub = 'other_commodities';
  let subLabel = 'Other Commodities';
  if (n.includes('goldmine') || n.includes('mining') || n.includes('mine')) { sub = 'gold_mining'; subLabel = 'Gold Mining'; }
  else if (n.includes('metal') || n.includes('copper')) { sub = 'other_metals'; subLabel = 'Other Metals'; }
  else if (n.includes('silver')) { sub = 'silver'; subLabel = 'Silver'; }
  else if (n.includes('gold')) { sub = 'gold'; subLabel = 'Gold'; }
  return { 
    specifiedType: 'commodities', 
    specifiedSub: sub, 
    type: 'commodities', 
    subType: sub, 
    subLabel,
    parentCategory: 'COMMODITIES',
    parentCategoryLabel: 'Commodities'
  };
}

/**
 * Authoritative Mutual Fund Classification Resolver
 * Accurately categorizes all Indian Mutual Funds strictly according to SEBI/AMFI taxonomy:
 * - Equity: Flexi Cap, Mid Cap, Small Cap, Large Cap, Large & Mid Cap, Multi Cap, Value, Contra, Focused, Dividend Yield
 * - Tax Saver (ELSS): Strictly isolated under TAX SAVER (never leaked into Equity)
 * - Sectoral / Thematic: Strictly isolated under Sectoral & Thematic (never leaked into Equity)
 * - Hybrid: Dynamic Asset Allocation / Balanced Advantage, Aggressive, Arbitrage, Multi Asset, Conservative, Equity Savings, Balanced
 * - Debt: Liquid, Overnight, Money Market, Ultra Short, Low Duration, Short Duration, Medium, Medium to Long, Long, Corporate Bond, Credit Risk, Banking & PSU, Gilt, Floater
 * - Index / ETFs: Nifty 50, Nifty Next 50, Nifty 100, Nifty 200, Nifty 500, Midcap 150, Smallcap 250, Momentum 30, Nifty Bank, Sensex, Other Index
 * - Commodities: Gold, Silver, Gold Mining, Other Metals, Other Commodities
 * - Global: Nasdaq, S&P 500, Russell, Global Equity, Global Tech, Other Global
 */
export function resolveSchemeClassification(schemeName, rawCategory = '') {
  const n = (schemeName || '').toLowerCase();
  const c = (rawCategory || '').toLowerCase();

  // 0. Close-ended FMP / Interval schemes -> DEBT
  if (c.includes('fixed term') || c.includes('fmp') || c.includes('interval') || n.includes('fixed maturity') || n.includes('fmp - series')) {
    return { 
      parentCategory: 'DEBT', 
      parentCategoryLabel: 'Debt', 
      type: 'debt', 
      subType: 'other_debt', 
      subLabel: 'Other Debt', 
      specifiedType: 'debt', 
      specifiedSub: 'other_debt' 
    };
  }

  // 0b. Solution Oriented Schemes (Retirement, Children, Life Cycle) -> OTHER
  if (c.includes('retirement') || c.includes('children') || c.includes('life cycle') || n.includes('retirement') || n.includes('children') || n.includes('life cycle')) {
    return { 
      parentCategory: 'OTHER', 
      parentCategoryLabel: 'Other', 
      type: 'other', 
      subType: 'solution_oriented', 
      subLabel: 'Solution Oriented', 
      specifiedType: 'other', 
      specifiedSub: 'solution_oriented' 
    };
  }

  // 1. Tax Saver (ELSS) - Strictly isolated; NEVER leaked into Equity
  if (c.includes('elss') || c.includes('tax saver') || n.includes('elss') || n.includes('tax saver') || n.includes('tax-saver')) {
    let sub = 'elss_funds';
    let subLabel = 'ELSS Funds';
    if (n.includes('large') || n.includes('bluechip')) {
      sub = 'large_elss';
      subLabel = 'Large Cap ELSS';
    } else if (n.includes('mid') || n.includes('small')) {
      sub = 'mid_small_elss';
      subLabel = 'Mid/Small Cap ELSS';
    }
    return { 
      parentCategory: 'TAX SAVER', 
      parentCategoryLabel: 'TAX SAVER', 
      type: 'elss', 
      subType: sub, 
      subLabel, 
      specifiedType: 'elss', 
      specifiedSub: sub 
    };
  }

  // 2. Commodities (Gold, Silver, Mining, Metals)
  const commodityResult = resolveCommodityClassification(schemeName, rawCategory);
  if (commodityResult) {
    return commodityResult;
  }

  // 3. Sectoral / Thematic - Strictly isolated; NEVER leaked into Equity
  const isActiveMomentum = (n.includes('momentum') || n.includes('active momentum')) && !n.includes('index') && !n.includes('etf') && !c.includes('index') && !c.includes('etf');
  const isHybridScheme = (
    c.includes('hybrid') || c.includes('dynamic asset') || c.includes('balanced advantage') || 
    c.includes('arbitrage') || c.includes('equity savings') || c.includes('multi asset') || 
    n.includes('balanced advantage') || n.includes('baf') || n.includes('equity savings') || 
    n.includes('multi asset') || n.includes('arbitrage') || isActiveMomentum
  );
  const isExplicitSectoral = c.includes('sectoral') || c.includes('thematic');
  const isQuantThematic = (
    n.includes('quant fund') || n.includes('quantamental') || n.includes('quantitative') ||
    n.includes('multi-factor') || n.includes('multi factor') ||
    n.includes('minimum variance') || (n.includes('quality') && !n.includes('large') && !n.includes('mid') && !n.includes('small') && !n.includes('flexi'))
  );
  const isSectorKeywordsInName = (
    n.includes('technology') || n.includes('pharma') || n.includes('healthcare') || 
    n.includes('banking') || n.includes('infrastructure') || n.includes('consumption') || 
    n.includes('manufacturing') || n.includes('manufactur') || n.includes('energy') || 
    n.includes('business cycle') || n.includes('defense') || n.includes('defence') || 
    n.includes('auto') || n.includes('mobility') || n.includes('power') || 
    n.includes('special opportunities') || n.includes('opportunities fund') ||
    n.includes('gennext') || n.includes('services') || n.includes('esg') ||
    n.includes('innovation') || n.includes('innovative') || n.includes('pioneer') || 
    n.includes('mnc') || isQuantThematic
  );
  const isPureCapName = (
    n.includes('large & mid') || n.includes('large and mid') || 
    n.includes('flexi') || n.includes('multi cap') || 
    n.includes('contra') || n.includes('value discovery')
  );

  if (!isHybridScheme && (isExplicitSectoral || (c.includes('equity') && isSectorKeywordsInName && !isPureCapName))) {
    let sub = 'other_sectoral';
    let subLabel = 'Other Sector/Thematic';
    if (n.includes('defence') || n.includes('defense') || n.includes('aerospace')) { sub = 'defence'; subLabel = 'Defence Funds'; }
    else if (n.includes('energy') || n.includes('power') || n.includes('natural resource') || n.includes('comma') || n.includes('oil & gas') || n.includes('petro') || n.includes('commodit')) { sub = 'energy'; subLabel = 'Energy Funds'; }
    else if (n.includes('innovation') || n.includes('innovator') || n.includes('innovative') || n.includes('pioneer') || n.includes('disruption') || n.includes('special opportunities') || n.includes('opportunities fund') || n.includes('special situation')) { sub = 'innovation'; subLabel = 'Innovation Funds'; }
    else if (n.includes('manufactur') || n.includes('make in india')) { sub = 'manufacturing'; subLabel = 'Manufacturing Funds'; }
    else if (n.includes('business cycle') || n.includes('business cycles') || n.includes('conglomerate')) { sub = 'business_cycle'; subLabel = 'Business Cycle Funds'; }
    else if (n.includes('mnc') || n.includes('multinational')) { sub = 'mnc'; subLabel = 'MNC Funds'; }
    else if (n.includes('esg') || n.includes('sustainability') || n.includes('sustainable') || n.includes('climate') || n.includes('ethical')) { sub = 'esg'; subLabel = 'ESG Funds'; }
    else if (n.includes('bluechip') && (isExplicitSectoral || c.includes('thematic') || n.includes('thematic'))) { sub = 'bluechip'; subLabel = 'BlueChip Funds'; }
    else if (isQuantThematic) { sub = 'quant'; subLabel = 'Quant Funds'; }
    else if (n.includes('bank') || n.includes('finan') || n.includes('bfsi')) { sub = 'banking'; subLabel = 'Banking & Financial Services'; }
    else if (n.includes('tech') || n.includes('teck') || n.includes('digital') || n.includes('it ') || n.includes('technology')) { sub = 'tech'; subLabel = 'Technology'; }
    else if (n.includes('pharma') || n.includes('health') || n.includes('healthcare')) { sub = 'pharma'; subLabel = 'Healthcare & Pharma'; }
    else if (n.includes('infra') || n.includes('infrastructure') || n.includes('build india') || n.includes('tiger') || n.includes('t.i.g.e.r') || n.includes('housing')) { sub = 'infra'; subLabel = 'Infrastructure'; }
    else if (n.includes('fmcg') || n.includes('consumption') || n.includes('consumer')) { sub = 'fmcg'; subLabel = 'FMCG & Consumption'; }
    else if (n.includes('psu') || n.includes('cpse')) { sub = 'psu'; subLabel = 'PSU'; }
    else if (n.includes('auto') || n.includes('mobility') || n.includes('transportation')) { sub = 'auto'; subLabel = 'Auto'; }
    return { 
      parentCategory: 'SECTORAL_THEMATIC', 
      parentCategoryLabel: 'Sectoral & Thematic', 
      type: 'sectoral_thematic', 
      subType: sub, 
      subLabel, 
      specifiedType: 'sectoral_thematic', 
      specifiedSub: sub 
    };
  }

  // 4. Hybrid Funds - Strictly isolated; NEVER leaked into Equity
  if (
    c.includes('hybrid') || c.includes('dynamic asset') || c.includes('balanced advantage') || 
    c.includes('arbitrage') || c.includes('equity savings') || c.includes('multi asset') || 
    n.includes('balanced advantage') || n.includes('baf') || n.includes('equity savings') || 
    n.includes('multi asset') || n.includes('arbitrage') || isActiveMomentum
  ) {
    let sub = 'other_hybrid';
    let subLabel = 'Other Hybrid';
    if (isActiveMomentum) {
      sub = 'active_momentum'; subLabel = 'Active Momentum Funds';
    } else if ((n.includes('balanced advantage') || n.includes('baf')) && !n.includes('formerly known as sundaram balanced advantage')) {
      sub = 'balanced_adv'; subLabel = 'Balanced Advantage Funds';
    } else if (n.includes('dynamic asset') || c.includes('dynamic asset')) {
      sub = 'dynamic_asset'; subLabel = 'Dynamic Asset Allocation Funds';
    } else if (c.includes('aggressive') || n.includes('aggressive')) {
      sub = 'aggressive'; subLabel = 'Aggressive Hybrid';
    } else if (c.includes('arbitrage') || n.includes('arbitrage')) {
      sub = 'arbitrage'; subLabel = 'Arbitrage';
    } else if (c.includes('multi asset') || n.includes('multi asset')) {
      sub = 'multi_asset'; subLabel = 'Multi Asset Allocation';
    } else if (c.includes('conservative') || n.includes('conservative')) {
      sub = 'conservative'; subLabel = 'Conservative Hybrid';
    } else if (c.includes('equity savings') || n.includes('equity savings')) {
      sub = 'equity_savings'; subLabel = 'Equity Savings';
    } else if (c.includes('balanced') || n.includes('balanced')) {
      sub = 'balanced'; subLabel = 'Balanced Hybrid';
    }
    return { 
      parentCategory: 'HYBRID', 
      parentCategoryLabel: 'Hybrid', 
      type: 'hybrid', 
      subType: sub, 
      subLabel, 
      specifiedType: 'hybrid', 
      specifiedSub: sub 
    };
  }

  // 5. Global / Overseas Funds - Strictly isolated
  if (
    c.includes('fof overseas') || c.includes('overseas') || n.includes('overseas') || 
    n.includes('global') || n.includes('world') || n.includes('international') || 
    n.includes('nasdaq') || n.includes('s&p 500') || n.includes('sp 500') || 
    n.includes('us equity') || n.includes('greater china') || n.includes('taiwan') || 
    n.includes('brazil') || n.includes('japan') || n.includes('asian') || 
    n.includes('europe') || n.includes('emerging markets')
  ) {
    let sub = 'other_global';
    let subLabel = 'Other Global';
    if (n.includes('nasdaq')) { sub = 'nasdaq'; subLabel = 'Nasdaq'; }
    else if (n.includes('s&p 500') || n.includes('sp 500')) { sub = 'sp500'; subLabel = 'S&P 500'; }
    else if (n.includes('russell')) { sub = 'russell'; subLabel = 'Russell'; }
    else if (n.includes('tech') || n.includes('ai') || n.includes('semiconductor')) { sub = 'global_tech'; subLabel = 'Global Tech / AI & Tech'; }
    else { sub = 'global_equity'; subLabel = 'Global Equity'; }
    return { 
      parentCategory: 'GLOBAL', 
      parentCategoryLabel: 'Global', 
      type: 'global', 
      subType: sub, 
      subLabel, 
      specifiedType: 'global', 
      specifiedSub: sub 
    };
  }

  // 6. Index Funds & ETFs (excluding commodities & global already handled above)
  if (
    c.includes('index') || c.includes('etf') || c.includes('exchange traded') || 
    n.includes('index fund') || n.includes('etf') || n.includes('bees') || 
    n.includes('nifty') || n.includes('sensex')
  ) {
    let sub = 'other_index';
    let subLabel = 'Other Index';
    if (n.includes('nifty 200 momentum 30') || n.includes('momentum 30')) { sub = 'nifty200_momentum30'; subLabel = 'Nifty 200 Momentum 30'; }
    else if (n.includes('nifty next 50') || n.includes('next 50') || n.includes('juniorbees')) { sub = 'nifty_next50'; subLabel = 'Nifty Next 50'; }
    else if (n.includes('nifty 50') || n.includes('nifty50') || n.includes('nifty bees')) { sub = 'nifty50'; subLabel = 'Nifty 50'; }
    else if (n.includes('nifty 100') || n.includes('nifty100')) { sub = 'nifty100'; subLabel = 'Nifty 100'; }
    else if (n.includes('nifty 200') || n.includes('nifty200')) { sub = 'nifty200'; subLabel = 'Nifty 200'; }
    else if (n.includes('nifty 500') || n.includes('nifty500')) { sub = 'nifty500'; subLabel = 'Nifty 500'; }
    else if (n.includes('midcap 150') || n.includes('midcap150')) { sub = 'nifty_midcap150'; subLabel = 'Nifty Midcap 150'; }
    else if (n.includes('smallcap 250') || n.includes('smallcap250')) { sub = 'nifty_smallcap250'; subLabel = 'Nifty Smallcap 250'; }
    else if (n.includes('bank') || n.includes('bank bees') || n.includes('bankbees')) { sub = 'nifty_bank'; subLabel = 'Nifty Bank'; }
    else if (n.includes('sensex') || n.includes('sensexbees')) { sub = 'sensex'; subLabel = 'Sensex'; }
    return { 
      parentCategory: 'INDEX', 
      parentCategoryLabel: 'Index', 
      type: 'index', 
      subType: sub, 
      subLabel, 
      specifiedType: 'index', 
      specifiedSub: sub 
    };
  }

  // 7. Debt Schemes
  if (
    c.includes('debt') || c.includes('income') || c.includes('gilt') || 
    c.includes('bond') || c.includes('liquid') || c.includes('money market') || 
    c.includes('overnight') || c.includes('floater') || c.includes('floating') || 
    c.includes('treasury') || n.includes('liquid') || n.includes('gilt') || 
    n.includes('overnight') || n.includes('money market') || n.includes('corporate bond') || 
    n.includes('banking and psu') || n.includes('psu debt')
  ) {
    let sub = 'other_debt';
    let subLabel = 'Other Debt';
    if (c.includes('overnight') || n.includes('overnight')) { sub = 'overnight'; subLabel = 'Overnight'; }
    else if (c.includes('liquid') || n.includes('liquid')) { sub = 'liquid'; subLabel = 'Liquid Fund'; }
    else if (c.includes('ultra short') || n.includes('ultra short')) { sub = 'ultra_short'; subLabel = 'Ultra Short Duration'; }
    else if (c.includes('low duration') || n.includes('low duration')) { sub = 'low_duration'; subLabel = 'Low Duration'; }
    else if (c.includes('money market') || n.includes('money market')) { sub = 'money_market'; subLabel = 'Money Market'; }
    else if (c.includes('short duration') || c.includes('short term') || n.includes('short duration') || n.includes('short term')) { sub = 'short_duration'; subLabel = 'Short Duration'; }
    else if (c.includes('medium to long') || n.includes('medium to long')) { sub = 'medium_long'; subLabel = 'Medium to Long Duration'; }
    else if (c.includes('medium duration') || c.includes('medium term') || n.includes('medium duration') || n.includes('medium term')) { sub = 'medium_duration'; subLabel = 'Medium Duration'; }
    else if (c.includes('long duration') || c.includes('long term') || n.includes('long duration') || n.includes('long term')) { sub = 'long_duration'; subLabel = 'Long Duration'; }
    else if (c.includes('dynamic bond') || c.includes('dynamic term') || n.includes('dynamic bond')) { sub = 'dynamic_bond'; subLabel = 'Dynamic Bond'; }
    else if (c.includes('corporate bond') || n.includes('corporate bond')) { sub = 'corporate_bond'; subLabel = 'Corporate Bond'; }
    else if (c.includes('credit risk') || n.includes('credit risk')) { sub = 'credit_risk'; subLabel = 'Credit Risk'; }
    else if (c.includes('banking and psu') || c.includes('banking & psu') || n.includes('banking & psu') || n.includes('banking and psu') || n.includes('psu debt')) { sub = 'banking_psu'; subLabel = 'Banking & PSU'; }
    else if (c.includes('10-year') || c.includes('10 year') || n.includes('10 year') || n.includes('10y')) { sub = 'gilt_10y'; subLabel = 'Gilt - 10Y Constant Duration'; }
    else if (c.includes('gilt') || n.includes('gilt')) { sub = 'gilt'; subLabel = 'Gilt'; }
    else if (c.includes('float') || n.includes('floater')) { sub = 'floater'; subLabel = 'Floater'; }
    return { 
      parentCategory: 'DEBT', 
      parentCategoryLabel: 'Debt', 
      type: 'debt', 
      subType: sub, 
      subLabel, 
      specifiedType: 'debt', 
      specifiedSub: sub 
    };
  }

  // 8. Equity Schemes (Pure Equity only)
  // Strictly: Flexi Cap, Mid Cap, Small Cap, Large Cap, Large & Mid Cap, Multi Cap, Value, Contra, Focused, Dividend Yield
  // Note: Large & Mid Cap MUST be evaluated before Mid Cap or Large Cap!
  const isEquityMatch = c.includes('equity') || 
    n.includes('flexi cap') || n.includes('flexicap') ||
    n.includes('mid cap') || n.includes('midcap') ||
    n.includes('small cap') || n.includes('smallcap') ||
    n.includes('large cap') || n.includes('largecap') || n.includes('bluechip') ||
    n.includes('large & mid') || n.includes('large and mid') ||
    n.includes('multi cap') || n.includes('multicap') ||
    n.includes('value fund') || n.includes('value discovery') ||
    n.includes('contra') || n.includes('focused');

  if (isEquityMatch) {
    let sub = null;
    let subLabel = null;
    if (c.includes('large & mid') || c.includes('large and mid') || n.includes('large & mid') || n.includes('large and mid') || n.includes('equity opportunities')) {
      sub = 'large_mid_cap'; subLabel = 'Large & Mid Cap';
    } else if (c.includes('flexi cap') || n.includes('flexi cap') || n.includes('flexicap')) {
      sub = 'flexi_cap'; subLabel = 'Flexi Cap';
    } else if (c.includes('mid cap') || n.includes('mid cap') || n.includes('midcap') || n.includes('emerging equity')) {
      sub = 'mid_cap'; subLabel = 'Mid Cap';
    } else if (c.includes('small cap') || n.includes('small cap') || n.includes('smallcap')) {
      sub = 'small_cap'; subLabel = 'Small Cap';
    } else if (c.includes('large cap') || n.includes('large cap') || n.includes('largecap') || n.includes('bluechip') || n.includes('top 100')) {
      sub = 'large_cap'; subLabel = 'Large Cap';
    } else if (c.includes('multi cap') || n.includes('multi cap') || n.includes('multicap')) {
      sub = 'multi_cap'; subLabel = 'Multi Cap';
    } else if (c.includes('value') || n.includes('value')) {
      sub = 'value'; subLabel = 'Value';
    } else if (c.includes('contra') || n.includes('contra')) {
      sub = 'contra'; subLabel = 'Contra';
    } else if (c.includes('focused') || n.includes('focused') || n.includes('focus')) {
      sub = 'focused'; subLabel = 'Focused';
    } else if (c.includes('dividend yield') || n.includes('dividend yield')) {
      sub = 'dividend_yield'; subLabel = 'Dividend Yield';
    }

    if (sub) {
      return { 
        parentCategory: 'EQUITY', 
        parentCategoryLabel: 'Equity', 
        type: 'equity', 
        subType: sub, 
        subLabel, 
        specifiedType: 'equity', 
        specifiedSub: sub 
      };
    }
  }

  // Solution oriented / Other catch-all
  return { 
    parentCategory: 'OTHER', 
    parentCategoryLabel: 'Other', 
    type: 'other', 
    subType: 'other', 
    subLabel: 'Other', 
    specifiedType: 'other', 
    specifiedSub: 'other' 
  };
}

/**
 * Canonical Category and Subcategory Filter Matcher
 * Strictly maps funds to their parent categories and subcategories:
 * - Equity: pure equity only (Flexi, Mid, Small, Large, Large & Mid, Multi, Value, Contra, Focused, Dividend Yield)
 * - Tax Saver (ELSS): strictly isolated under TAX SAVER (never under Equity)
 * - Sectoral / Thematic: strictly isolated under Sectoral & Thematic (never under Equity)
 * - Hybrid: strictly isolated under Hybrid (never under Equity)
 * - Debt: strictly isolated under Debt
 * - Index / ETFs: strictly isolated under Index
 * - Commodities: strictly isolated under Commodities
 * - Global: strictly isolated under Global
 */
export function matchesCategoryFilter(schemeName, rawCategory = '', targetFilter = '') {
  if (!targetFilter) return true;
  const filter = String(targetFilter).toLowerCase().trim();
  if (filter === 'all' || filter === 'all categories' || filter === 'all funds') return true;

  const cls = resolveSchemeClassification(schemeName, rawCategory);
  if (!cls) return false;

  const parentKey = (cls.parentCategory || '').toLowerCase();
  const parentLabel = (cls.parentCategoryLabel || '').toLowerCase();
  const type = (cls.type || '').toLowerCase();
  const subType = (cls.subType || '').toLowerCase();
  const subLabel = (cls.subLabel || '').toLowerCase();

  // 1. Strict Parent Category Checks
  if (filter === 'equity' || filter === 'all equity') {
    return parentKey === 'equity' || type === 'equity';
  }
  if (filter === 'elss' || filter === 'tax saver' || filter === 'all tax saver' || filter.includes('tax saving') || filter.includes('elss')) {
    return parentKey === 'tax saver' || type === 'elss';
  }
  if (filter === 'sectoral_thematic' || filter === 'sectoral' || filter === 'thematic' || filter.includes('sector')) {
    return parentKey === 'sectoral_thematic' || type === 'sectoral_thematic';
  }
  if (filter === 'hybrid' || filter === 'all hybrid') {
    return parentKey === 'hybrid' || type === 'hybrid';
  }
  if (filter === 'debt' || filter === 'all debt') {
    return parentKey === 'debt' || type === 'debt';
  }
  if (filter === 'index' || filter === 'all index' || filter === 'etf' || filter === 'etfs' || filter === 'index funds' || filter === 'etfs & index funds') {
    return parentKey === 'index' || type === 'index' || type === 'etf';
  }
  if (filter === 'commodities' || filter === 'all commodities' || filter.includes('gold') || filter.includes('silver') || filter.includes('commodity')) {
    if (filter === 'gold etf' || filter === 'gold') return subType === 'gold';
    if (filter === 'silver etf' || filter === 'silver') return subType === 'silver';
    return parentKey === 'commodities' || type === 'commodities';
  }
  if (filter === 'global' || filter === 'all global' || filter === 'international') {
    return parentKey === 'global' || type === 'global';
  }
  if (filter === 'other' || filter === 'solution oriented') {
    return parentKey === 'other' || type === 'other';
  }

  // 2. Subcategory Checks
  // Normalize alphanumeric strings for robust comparison
  const cleanFilter = filter.replace(/[^a-z0-9]/g, '');
  const cleanSubType = subType.replace(/[^a-z0-9]/g, '');
  const cleanSubLabel = subLabel.replace(/[^a-z0-9]/g, '');

  if (cleanSubType === cleanFilter || cleanSubLabel === cleanFilter) return true;
  if (subLabel.includes(filter) || subType.replace(/_/g, ' ') === filter) return true;

  // Specific canonical subcategory aliases
  if (filter.includes('flexi') && subType === 'flexi_cap') return true;
  if ((filter.includes('large & mid') || filter.includes('large and mid') || filter.includes('large & mid-cap')) && subType === 'large_mid_cap') return true;
  if ((filter.includes('large cap') || filter.includes('large-cap') || filter.includes('large')) && !filter.includes('mid') && subType === 'large_cap') return true;
  if ((filter.includes('mid cap') || filter.includes('mid-cap') || filter.includes('mid')) && !filter.includes('large') && subType === 'mid_cap') return true;
  if ((filter.includes('small cap') || filter.includes('small-cap') || filter.includes('small')) && subType === 'small_cap') return true;
  if ((filter.includes('multi cap') || filter.includes('multi-cap') || filter.includes('multi')) && subType === 'multi_cap') return true;
  if (filter.includes('contra') && subType === 'contra') return true;
  if (filter.includes('value') && subType === 'value') return true;
  if (filter.includes('focused') && subType === 'focused') return true;
  if (filter.includes('dividend') && subType === 'dividend_yield') return true;
  if (filter.includes('arbitrage') && subType === 'arbitrage') return true;
  if (filter.includes('balanced advantage') && subType === 'balanced_adv') return true;
  if (filter.includes('dynamic asset') && subType === 'dynamic_asset') return true;
  if ((filter.includes('active momentum') || filter.includes('active_momentum') || (filter.includes('momentum') && !filter.includes('index') && !filter.includes('etf'))) && subType === 'active_momentum') return true;
  if (filter.includes('aggressive') && subType === 'aggressive') return true;
  if (filter.includes('conservative') && subType === 'conservative') return true;
  if (filter.includes('multi asset') && subType === 'multi_asset') return true;
  if (filter.includes('equity savings') && subType === 'equity_savings') return true;
  if (filter.includes('balanced') && !filter.includes('advantage') && subType === 'balanced') return true;
  if (filter.includes('liquid') && subType === 'liquid') return true;
  if (filter.includes('overnight') && subType === 'overnight') return true;
  if (filter.includes('money market') && subType === 'money_market') return true;
  if (filter.includes('ultra short') && subType === 'ultra_short') return true;
  if (filter.includes('low duration') && subType === 'low_duration') return true;
  if (filter.includes('short duration') && subType === 'short_duration') return true;
  if (filter.includes('medium duration') && subType === 'medium_duration') return true;
  if (filter.includes('medium to long') && subType === 'medium_long') return true;
  if (filter.includes('long duration') && subType === 'long_duration') return true;
  if (filter.includes('dynamic bond') && subType === 'dynamic_bond') return true;
  if (filter.includes('corporate bond') && subType === 'corporate_bond') return true;
  if (filter.includes('credit risk') && subType === 'credit_risk') return true;
  if ((filter.includes('banking & psu') || filter.includes('banking and psu')) && subType === 'banking_psu') return true;
  if ((filter.includes('government bond') || filter.includes('gilt')) && (subType === 'gilt' || subType === 'gilt_10y')) return true;
  if (filter.includes('floating') && subType === 'floater') return true;
  if (filter.includes('banking') && subType === 'banking') return true;
  if ((filter.includes('tech') || filter.includes('technology')) && subType === 'tech') return true;
  if ((filter.includes('pharma') || filter.includes('healthcare')) && subType === 'pharma') return true;
  if (filter.includes('infra') && subType === 'infra') return true;
  if ((filter.includes('fmcg') || filter.includes('consum')) && subType === 'fmcg') return true;
  if ((filter.includes('defence') || filter.includes('defense')) && subType === 'defence') return true;
  if ((filter.includes('energy') || filter.includes('power')) && subType === 'energy') return true;
  if (filter.includes('bluechip') && subType === 'bluechip') return true;
  if (filter.includes('innovation') && subType === 'innovation') return true;
  if (filter.includes('manufacturing') && subType === 'manufacturing') return true;
  if (filter.includes('quant') && subType === 'quant') return true;
  if (filter.includes('business cycle') && subType === 'business_cycle') return true;
  if (filter.includes('mnc') && subType === 'mnc') return true;
  if (filter.includes('esg') && subType === 'esg') return true;
  if ((filter.includes('children') || filter.includes('retirement') || filter.includes('solution')) && subType === 'solution_oriented') return true;
  if (filter.includes('fund of funds') && (type === 'other' || subType === 'solution_oriented')) return true;

  return false;
}

/**
 * Sanitizes a fund record. Attaches canonical scheme identity metadata.
 * Never estimates or fabricates missing values.
 */
export function sanitizeFundRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object') return null;

  const schemeCode = rawRecord.schemeCode ? String(rawRecord.schemeCode).trim() : null;
  const schemeName = rawRecord.schemeName ? String(rawRecord.schemeName).trim() : null;

  if (!schemeCode || !schemeName) return null;

  const rawAmc = rawRecord.amc || rawRecord.fundHouse || rawRecord.family || null;
  const resolvedAmc = resolveAmcName(rawAmc || schemeName);
  const { plan, option } = resolvePlanAndOption(schemeName);
  const isin = rawRecord.isinGrowth || rawRecord.isin || rawRecord.isinReinvest || null;
  const canonicalKey = `${schemeCode}_${isin || 'NOISIN'}_${resolvedAmc.replace(/\s+/g, '')}_${plan}_${option}`;

  return {
    schemeCode,
    schemeName,
    amc: resolvedAmc,
    fundHouse: resolvedAmc,
    family: resolvedAmc,
    plan,
    planType: plan,
    option,
    canonicalKey,
    category: rawRecord.category || 'Data Unavailable',
    subCategory: rawRecord.subCategory || 'Data Unavailable',
    nav: (typeof rawRecord.nav === 'number' && !isNaN(rawRecord.nav) && rawRecord.nav > 0) ? rawRecord.nav : null,
    date: rawRecord.date || rawRecord.navDate || 'Data Unavailable',
    navDate: rawRecord.navDate || rawRecord.date || 'Data Unavailable',
    asOfDate: rawRecord.asOfDate || rawRecord.navDate || rawRecord.date || 'Data Unavailable',
    navAsOfDate: rawRecord.navAsOfDate || rawRecord.navDate || rawRecord.date || 'Data Unavailable',
    performanceAsOfDate: rawRecord.performanceAsOfDate || rawRecord.navDate || rawRecord.date || 'Data Unavailable',
    aum: (typeof rawRecord.aum === 'number' && !isNaN(rawRecord.aum) && rawRecord.aum > 0) ? rawRecord.aum : null,
    aumCr: (typeof rawRecord.aum === 'number' && !isNaN(rawRecord.aum) && rawRecord.aum > 0) ? rawRecord.aum : null,
    expenseRatio: typeof rawRecord.expenseRatio === 'number' && !isNaN(rawRecord.expenseRatio) ? rawRecord.expenseRatio : null,
    fundManager: rawRecord.fundManager || 'Data Unavailable',
    benchmark: rawRecord.benchmark || 'Data Unavailable',
    riskometer: rawRecord.riskometer || 'Data Unavailable',
    launchDate: rawRecord.launchDate || 'Data Unavailable',
    isinGrowth: rawRecord.isinGrowth || isin,
    isinReinvest: rawRecord.isinReinvest || null,
    lastUpdated: rawRecord.lastUpdated || new Date().toISOString()
  };
}

/**
 * Filter and deduplicate raw AMFI / Scheme master records.
 * Multi-Key Scheme Identity: schemeCode / ISIN + amc + schemeName + plan + option.
 * Dynamic Breakdown: rawRecordsCount, uniqueSchemeCodes, directPlansCount, directGrowthCount, activeSchemesCount.
 * Returns { filteredSchemes, auditReport }
 */
export function filterAndDeduplicateSchemes(rawRecords) {
  let totalProcessed = 0;
  let rawRecordsCount = rawRecords.length;
  let uniqueSchemeCodesSet = new Set();
  let directPlansCount = 0;
  let directGrowthCount = 0;
  let rejectedCount = 0;

  let rejectionReasons = {
    regular: 0,
    idcw: 0,
    dividend: 0,
    notDirectGrowth: 0,
    invalidRecord: 0
  };
  let duplicatesRemoved = 0;

  const uniqueMap = new Map();
  const duplicateLogs = [];

  for (const raw of rawRecords) {
    totalProcessed++;

    if (!raw || !raw.schemeName || !raw.schemeCode) {
      rejectionReasons.invalidRecord++;
      rejectedCount++;
      continue;
    }

    const codeStr = String(raw.schemeCode).trim();
    uniqueSchemeCodesSet.add(codeStr);

    const lower = raw.schemeName.toLowerCase();
    const isDirect = lower.includes('direct') || lower.includes('-dir') || lower.includes('(dir)') || lower.includes(' dir ');
    if (isDirect) {
      directPlansCount++;
    }

    if (lower.includes('regular') || /\breg\b/.test(lower)) {
      rejectionReasons.regular++;
      rejectedCount++;
      continue;
    }
    if (lower.includes('idcw')) {
      rejectionReasons.idcw++;
      rejectedCount++;
      continue;
    }
    if (lower.includes('dividend') || /\bdiv\b/.test(lower)) {
      rejectionReasons.dividend++;
      rejectedCount++;
      continue;
    }

    if (!isStrictDirectGrowth(raw.schemeName)) {
      rejectionReasons.notDirectGrowth++;
      rejectedCount++;
      continue;
    }

    directGrowthCount++;

    const sanitized = sanitizeFundRecord(raw);
    if (!sanitized) {
      rejectionReasons.invalidRecord++;
      rejectedCount++;
      continue;
    }

    // Multi-key identity: Scheme Code is primary key in AMFI NAV master file
    if (uniqueMap.has(codeStr)) {
      duplicatesRemoved++;
      duplicateLogs.push({
        schemeCode: codeStr,
        existingName: uniqueMap.get(codeStr).schemeName,
        duplicateName: sanitized.schemeName
      });
    } else {
      uniqueMap.set(codeStr, sanitized);
    }
  }

  const filteredSchemes = Array.from(uniqueMap.values());

  const auditReport = {
    totalProcessed: rawRecordsCount,
    rawRecordsCount,
    uniqueSchemeCodesCount: uniqueSchemeCodesSet.size,
    directPlansCount,
    directGrowthCount,
    finalActiveDirectGrowthCount: filteredSchemes.length,
    activeSchemesCount: filteredSchemes.length,
    rejectedCount,
    rejectionReasons,
    duplicatesRemoved,
    asOfDate: new Date().toISOString().split('T')[0],
    source: 'AMFI NAVAll.txt Official Feed',
    duplicateLogs: duplicateLogs.slice(0, 50)
  };

  return { filteredSchemes, auditReport };
}

