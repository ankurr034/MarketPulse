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
  if (n.includes('goldmine') || n.includes('mining') || n.includes('mine')) sub = 'gold_mining';
  else if (n.includes('metal') || n.includes('copper')) sub = 'other_metals';
  else if (n.includes('silver')) sub = 'silver';
  else if (n.includes('gold')) sub = 'gold';
  return { specifiedType: 'commodities', specifiedSub: sub, type: 'commodities', subType: sub, parentCategory: 'COMMODITIES' };
}

export function resolveSchemeClassification(schemeName, rawCategory = '') {
  return resolveCommodityClassification(schemeName, rawCategory);
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

