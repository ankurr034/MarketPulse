import mfapiCacheService from './services/MfapiCacheService.js';
import { readFileSync } from 'fs';
import sectorBasket from './config/sectorBasket.js';

const routeCode = readFileSync('./routes/indianMf.js', 'utf8');
const match = routeCode.match(/const EXTRA_SCHEMES_REGISTRY = (\[[\s\S]*?\]);/);

let extraRegistry = [];
if (match) {
  try {
    extraRegistry = eval(match[1]);
  } catch (e) {}
}

const allSchemes = [];
for (const sector in sectorBasket) {
  for (const f of sectorBasket[sector].funds) {
    if (f.region === 'india' && /^\d+$/.test(String(f.id))) {
      allSchemes.push({ source: `sectorBasket:${sector}`, id: String(f.id), name: f.name });
    }
  }
}

for (const f of extraRegistry) {
  allSchemes.push({ source: 'EXTRA_SCHEMES_REGISTRY', id: String(f.id), name: f.name });
}

const uniqueSchemesMap = new Map();
for (const s of allSchemes) {
  if (!uniqueSchemesMap.has(s.id)) {
    uniqueSchemesMap.set(s.id, s);
  }
}

console.log(`Auditing ${uniqueSchemesMap.size} unique Indian scheme codes for Strict Direct Growth compliance...`);

function isDirectGrowth(name) {
  const lower = name.toLowerCase();
  
  const isForbidden = lower.includes('idcw') || 
                      lower.includes('dividend') || 
                      lower.includes('regular') || 
                      lower.includes('bonus') || 
                      lower.includes('reinvestment') || 
                      lower.includes('segregated') || 
                      lower.includes('institutional') || 
                      lower.includes('interval') || 
                      lower.includes('payout');

  const isEtf = lower.includes('etf') || lower.includes('bees');
  if (isEtf) {
    return !isForbidden;
  }

  const isGrowth = lower.includes('growth') || lower.includes('-gr') || lower.includes('(gr)') || lower.includes(' growth');
  const isDirect = lower.includes('direct') || lower.includes('-dir') || lower.includes('(dir)') || lower.includes(' direct');

  return isDirect && isGrowth && !isForbidden;
}

async function auditAll() {
  const compliant = [];
  const nonCompliant = [];

  for (const [id, info] of uniqueSchemesMap.entries()) {
    try {
      const res = await mfapiCacheService.getSchemeData(id);
      const amfiName = res?.meta?.scheme_name || '';
      
      const pass = isDirectGrowth(amfiName);
      if (pass) {
        compliant.push({ id, name: info.name, amfiName });
      } else {
        console.warn(`❌ NON-COMPLIANT Scheme [${id}]: "${amfiName}" (Expected Direct Growth)`);
        nonCompliant.push({ id, name: info.name, amfiName });
      }
    } catch (e) {
      console.warn(`❌ ERROR for Scheme [${id}]: ${e.message}`);
      nonCompliant.push({ id, name: info.name, error: e.message });
    }
  }

  console.log("\n==================================================================");
  console.log(`TOTAL AUDITED: ${uniqueSchemesMap.size}`);
  console.log(`COMPLIANT (DIRECT GROWTH): ${compliant.length}`);
  console.log(`NON-COMPLIANT / FORBIDDEN VARIANTS: ${nonCompliant.length}`);
  console.log("==================================================================");

  if (nonCompliant.length > 0) {
    console.log("Non-compliant schemes to replace:", JSON.stringify(nonCompliant, null, 2));
  }
}

auditAll();
