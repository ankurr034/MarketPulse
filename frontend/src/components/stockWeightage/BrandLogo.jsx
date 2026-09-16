import React from 'react';

// Brand color palette & SVG logos for Indian Bluechips and AMCs
const BRAND_DATA = {
  // Stocks
  HDFCBANK: { bg: '#004c8f', fg: '#ffffff', type: 'hdfc' },
  RELIANCE: { bg: '#d9222a', fg: '#ffffff', type: 'reliance' },
  ICICIBANK: { bg: '#b82a2b', fg: '#ffffff', type: 'icici' },
  INFY: { bg: '#007cc3', fg: '#ffffff', type: 'infosys' },
  TCS: { bg: '#0a1e3f', fg: '#00d2ff', type: 'tcs' },
  BHARTIARTL: { bg: '#ffffff', fg: '#ed1c24', type: 'airtel' },
  LT: { bg: '#002f6c', fg: '#ffffff', type: 'lt' },
  ITC: { bg: '#002554', fg: '#ffd700', type: 'itc' },
  AXISBANK: { bg: '#97144d', fg: '#ffffff', type: 'axis' },
  HINDUNILVR: { bg: '#001a9c', fg: '#ffffff', type: 'hul' },
  SBIN: { bg: '#2252a3', fg: '#00bcd4', type: 'sbi' },
  KOTAKBANK: { bg: '#ed1c24', fg: '#ffffff', type: 'kotak' },
  TITAN: { bg: '#1a1a1a', fg: '#c5a059', type: 'titan' },
  BAJFINANCE: { bg: '#00529b', fg: '#ffffff', type: 'bajaj' },
  TATAMOTORS: { bg: '#00539f', fg: '#ffffff', type: 'tata' },
  TATASTEEL: { bg: '#00539f', fg: '#ffffff', type: 'tata' },
  MARUTI: { bg: '#c41230', fg: '#ffffff', type: 'maruti' },
  SUNPHARMA: { bg: '#e86a17', fg: '#ffffff', type: 'sunpharma' },
  NTPC: { bg: '#0b5394', fg: '#ffffff', type: 'ntpc' },
  ONGC: { bg: '#8b0000', fg: '#ffd700', type: 'ongc' },

  // AMCs / Mutual Funds
  HDFC_MF: { bg: '#004c8f', accent: '#ed1c24', type: 'hdfc' },
  ICICI_MF: { bg: '#b82a2b', accent: '#f58220', type: 'icici' },
  SBI_MF: { bg: '#2252a3', accent: '#00bcd4', type: 'sbi' },
  NIPPON_MF: { bg: '#d12421', accent: '#ffffff', type: 'nippon' },
  KOTAK_MF: { bg: '#ed1c24', accent: '#183884', type: 'kotak' },
  AXIS_MF: { bg: '#97144d', accent: '#ffffff', type: 'axis' },
  UTI_MF: { bg: '#f37023', accent: '#003366', type: 'uti' },
  LT_MF: { bg: '#002f6c', accent: '#ffffff', type: 'lt' },
  TATA_MF: { bg: '#00539f', accent: '#ffffff', type: 'tata' },
  INVESCO_MF: { bg: '#002b49', accent: '#00a3e0', type: 'invesco' },
  PPFAS_MF: { bg: '#1b365d', accent: '#4a90e2', type: 'ppfas' },
  BARODA_MF: { bg: '#f26522', accent: '#008559', type: 'baroda' },
  DSP_MF: { bg: '#2b2927', accent: '#e31b23', type: 'dsp' },
  MIRAE_MF: { bg: '#002d62', accent: '#ea7600', type: 'mirae' },
  ABSL_MF: { bg: '#ad1a1e', accent: '#fdb913', type: 'absl' }
};

export default function BrandLogo({ 
  identifier = '',
  symbol = '',
  amc = '',
  code = '',
  name = '', 
  size = 28, 
  rounded = 'rounded-lg',
  className = '' 
}) {
  // Normalize size
  let pxSize = 28;
  if (typeof size === 'number') {
    pxSize = size;
  } else if (typeof size === 'string') {
    const sizeMap = { xs: 20, sm: 24, md: 32, lg: 44, xl: 48 };
    pxSize = sizeMap[size.toLowerCase()] || parseInt(size, 10) || 28;
  }

  const rawKey = symbol || identifier || amc || code || name || '';
  const cleanId = String(rawKey).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanName = String(name || rawKey).toLowerCase();

  // 1. Resolve matching stock or AMC
  let brand = null;
  if (cleanId.includes('HDFC') || cleanName.includes('hdfc')) brand = BRAND_DATA.HDFCBANK;
  else if (cleanId.includes('RELIANCE') || cleanName.includes('reliance') || cleanName.includes('ril')) brand = BRAND_DATA.RELIANCE;
  else if (cleanId.includes('ICICI') || cleanName.includes('icici')) brand = BRAND_DATA.ICICIBANK;
  else if (cleanId.includes('INFY') || cleanName.includes('infosys')) brand = BRAND_DATA.INFY;
  else if (cleanId.includes('TCS') || cleanName.includes('tata consultancy')) brand = BRAND_DATA.TCS;
  else if (cleanId.includes('BHARTI') || cleanId.includes('AIRTEL') || cleanName.includes('airtel')) brand = BRAND_DATA.BHARTIARTL;
  else if (cleanId.includes('LT') || cleanName.includes('larsen') || cleanName.includes('toubro')) brand = BRAND_DATA.LT;
  else if (cleanId.includes('ITC') || cleanName.includes('itc')) brand = BRAND_DATA.ITC;
  else if (cleanId.includes('AXIS') || cleanName.includes('axis')) brand = BRAND_DATA.AXISBANK;
  else if (cleanId.includes('HINDUNILVR') || cleanId.includes('HUL') || cleanName.includes('unilever')) brand = BRAND_DATA.HINDUNILVR;
  else if (cleanId.includes('SBIN') || cleanId.includes('SBI') || cleanName.includes('state bank') || cleanName.includes('sbi')) brand = BRAND_DATA.SBIN;
  else if (cleanId.includes('KOTAK') || cleanName.includes('kotak')) brand = BRAND_DATA.KOTAKBANK;
  else if (cleanId.includes('TITAN') || cleanName.includes('titan')) brand = BRAND_DATA.TITAN;
  else if (cleanId.includes('BAJ') || cleanName.includes('bajaj')) brand = BRAND_DATA.BAJFINANCE;
  else if (cleanId.includes('TATAMOTORS') || cleanName.includes('tata motors')) brand = BRAND_DATA.TATAMOTORS;
  else if (cleanId.includes('NIPPON') || cleanName.includes('nippon')) brand = BRAND_DATA.NIPPON_MF;
  else if (cleanId.includes('UTI') || cleanName.includes('uti')) brand = BRAND_DATA.UTI_MF;
  else if (cleanId.includes('TATA') || cleanName.includes('tata')) brand = BRAND_DATA.TATA_MF;
  else if (cleanId.includes('DSP') || cleanName.includes('dsp')) brand = BRAND_DATA.DSP_MF;
  else if (cleanId.includes('MIRAE') || cleanName.includes('mirae')) brand = BRAND_DATA.MIRAE_MF;
  else if (cleanId.includes('BIRLA') || cleanId.includes('ABSL') || cleanName.includes('aditya birla')) brand = BRAND_DATA.ABSL_MF;
  else if (cleanId.includes('INVESCO') || cleanName.includes('invesco')) brand = BRAND_DATA.INVESCO_MF;
  else if (cleanId.includes('PARAG') || cleanId.includes('PPFAS') || cleanName.includes('parag parikh')) brand = BRAND_DATA.PPFAS_MF;
  else if (cleanId.includes('BARODA') || cleanId.includes('BNP') || cleanName.includes('baroda')) brand = BRAND_DATA.BARODA_MF;

  const containerStyle = {
    width: `${pxSize}px`,
    height: `${pxSize}px`,
    minWidth: `${pxSize}px`,
    minHeight: `${pxSize}px`
  };

  // Custom SVG renderers for authentic brand logos
  if (brand) {
    if (brand.type === 'hdfc') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-slate-200/60 dark:border-slate-700/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#004c8f' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="4" fill="#004c8f" />
            <rect x="6" y="6" width="28" height="28" fill="#d9251d" />
            <rect x="13" y="13" width="14" height="14" fill="#004c8f" />
            <path d="M10 17H30M10 23H30M17 10V30M23 10V30" stroke="#ffffff" strokeWidth="2.2" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'reliance') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-rose-200/60 dark:border-rose-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#d9222a' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
            <circle cx="16" cy="16" r="14" fill="#ffffff" />
            <circle cx="16" cy="16" r="12" fill="#d9222a" />
            <path d="M11 10H17C19.2 10 21 11.8 21 14C21 16.2 19.2 18 17 18H14V22H11V10Z" fill="#ffffff" />
            <path d="M16.5 17.5L21.5 22.5" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
            <rect x="14" y="13" width="3" height="3" fill="#d9222a" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'icici') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-red-200/60 dark:border-red-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#b82a2b' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-0.5" fill="none">
            <rect width="32" height="32" rx="4" fill="#b82a2b" />
            <path d="M8 8H12V24H8V8Z" fill="#f58220" />
            <path d="M14 16C14 11.58 17.58 8 22 8V12C19.79 12 18 13.79 18 16C18 18.21 19.79 20 22 20V24C17.58 24 14 20.42 14 16Z" fill="#ffffff" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'infosys') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-sky-300/60 dark:border-sky-800/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#007cc3' }}
          title={name || rawKey}
        >
          <span className="text-white font-black text-[11px] tracking-tighter uppercase font-sans">
            infy
          </span>
        </div>
      );
    }

    if (brand.type === 'tcs') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-slate-700/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#0a1e3f' }}
          title={name || rawKey}
        >
          <span className="text-[#00d2ff] font-extrabold text-[11px] tracking-tight font-sans">
            TCS
          </span>
        </div>
      );
    }

    if (brand.type === 'airtel') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-rose-200 dark:border-rose-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#ffffff' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
            <path d="M16 6C10.48 6 6 10.48 6 16C6 21.52 10.48 26 16 26C21.8 26 21.3 24.8 23.1 22.9L19.8 19.6C18.8 20.5 17.5 21 16 21C13.24 21 11 18.76 11 16C11 13.24 13.24 11 16 11C18.76 11 21 13.24 21 16V17.5C21 18.33 20.33 19 19.5 19C18.67 19 18 18.33 18 17.5V16C18 14.9 17.1 14 16 14C14.9 14 14 14.9 14 16C14 17.1 14.9 18 16 18" stroke="#ed1c24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }

    if (brand.type === 'lt') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-blue-300/60 dark:border-blue-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#002f6c' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
            <circle cx="16" cy="16" r="13" stroke="#ffffff" strokeWidth="1.5" />
            <text x="16" y="20" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">L&T</text>
          </svg>
        </div>
      );
    }

    if (brand.type === 'itc') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-blue-400/60 dark:border-blue-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#002554' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
            <polygon points="16,5 27,24 5,24" stroke="#ffd700" strokeWidth="1.8" fill="none" />
            <text x="16" y="21" fill="#ffd700" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">ITC</text>
          </svg>
        </div>
      );
    }

    if (brand.type === 'axis') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-rose-300/60 dark:border-rose-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#97144d' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1.5" fill="none">
            <path d="M16 6L25 24H19.5L16 16.5L12.5 24H7L16 6Z" fill="#ffffff" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'hul') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-blue-400/60 dark:border-blue-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#001a9c' }}
          title={name || rawKey}
        >
          <span className="text-white font-extrabold text-[10px] tracking-tight font-sans">
            HUL
          </span>
        </div>
      );
    }

    if (brand.type === 'sbi') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-cyan-300/60 dark:border-cyan-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#2252a3' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
            <circle cx="16" cy="16" r="13" fill="#00bcd4" />
            <circle cx="16" cy="14" r="5" fill="#2252a3" />
            <rect x="14.5" y="14" width="3" height="9" fill="#2252a3" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'kotak') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-red-300/60 dark:border-red-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#ed1c24' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1.5" fill="none">
            <path d="M16 6C10.5 6 6 10.5 6 16C6 21.5 10.5 26 16 26C21.5 26 26 21.5 26 16C26 10.5 21.5 6 16 6Z" fill="#183884" />
            <path d="M13 11V21M13 16L19 11M13 16L19 21" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'nippon') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-red-300/60 dark:border-red-900/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#d12421' }}
          title={name || rawKey}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1.5" fill="none">
            <polygon points="16,6 26,26 6,26" fill="#ffffff" />
            <polygon points="16,12 22,24 10,24" fill="#d12421" />
          </svg>
        </div>
      );
    }

    if (brand.type === 'uti') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-amber-300/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#f37023' }}
          title={name || rawKey}
        >
          <span className="text-[#003366] font-black text-[11px] tracking-tight font-sans">
            UTI
          </span>
        </div>
      );
    }

    if (brand.type === 'tata') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-blue-400/60 ${rounded} ${className}`}
          style={{ ...containerStyle, backgroundColor: '#00539f' }}
          title={name || rawKey}
        >
          <span className="text-white font-extrabold text-[10.5px] tracking-wider font-sans">
            TATA
          </span>
        </div>
      );
    }
  }

  // Fallback: Deterministic colorful initials badge with clean typography
  const initials = (name || rawKey || 'MP')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const palette = [
    { bg: 'bg-gradient-to-br from-blue-600 to-indigo-700', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-emerald-600 to-teal-700', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-cyan-600 to-blue-700', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-violet-600 to-purple-800', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-rose-600 to-red-700', text: 'text-white' }
  ];

  let hash = 0;
  const str = String(name || rawKey || 'MP');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  const color = palette[Math.abs(hash) % palette.length];

  return (
    <div 
      className={`flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs ${color.bg} ${color.text} ${rounded} ${className}`}
      style={containerStyle}
      title={name || rawKey}
    >
      {initials}
    </div>
  );
}
