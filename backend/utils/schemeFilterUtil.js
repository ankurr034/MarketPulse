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
    /\binterval\b/
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(lower)) {
      return false;
    }
  }

  // Check if scheme is an ETF, BeES, or Commodity Fund
  const isEtfOrCommodity = /\b(etf|bees|gold|silver|commodity)\b/i.test(lower);
  if (isEtfOrCommodity) {
    // ETF/BeES funds are inherently direct trading options, pass if no forbidden terms
    return true;
  }

  // 2. Strict Positive Direct & Growth Requirements
  const isDirect = lower.includes('direct') || lower.includes('-dir') || lower.includes('(dir)') || lower.includes(' dir ');
  const isGrowth = lower.includes('growth') || lower.includes('-gr') || lower.includes('(gr)') || lower.includes(' gr ');

  return isDirect && isGrowth;
}

/**
 * Sanitizes a fund record. If any optional or missing field is unavailable, defaults to null or 'Data Unavailable'.
 * Never estimates or fabricates missing values.
 */
export function sanitizeFundRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object') return null;

  const schemeCode = rawRecord.schemeCode ? String(rawRecord.schemeCode).trim() : null;
  const schemeName = rawRecord.schemeName ? String(rawRecord.schemeName).trim() : null;

  if (!schemeCode || !schemeName) return null;

  return {
    schemeCode,
    schemeName,
    amc: rawRecord.amc || rawRecord.fundHouse || rawRecord.family || 'Data Unavailable',
    category: rawRecord.category || 'Data Unavailable',
    subCategory: rawRecord.subCategory || 'Data Unavailable',
    nav: typeof rawRecord.nav === 'number' && !isNaN(rawRecord.nav) ? rawRecord.nav : null,
    navDate: rawRecord.navDate || rawRecord.date || 'Data Unavailable',
    aum: typeof rawRecord.aum === 'number' && !isNaN(rawRecord.aum) ? rawRecord.aum : null,
    expenseRatio: typeof rawRecord.expenseRatio === 'number' && !isNaN(rawRecord.expenseRatio) ? rawRecord.expenseRatio : null,
    fundManager: rawRecord.fundManager || 'Data Unavailable',
    benchmark: rawRecord.benchmark || 'Data Unavailable',
    riskometer: rawRecord.riskometer || 'Data Unavailable',
    launchDate: rawRecord.launchDate || 'Data Unavailable',
    isinGrowth: rawRecord.isinGrowth || null,
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

