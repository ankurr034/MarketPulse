import React from 'react';

// Brand color palette & SVG icons for Indian Bluechips and AMCs
const BRAND_DATA = {
  // Stocks
  HDFCBANK: {
    bg: '#004c8f',
    fg: '#ffffff',
    text: 'HDFC',
    type: 'hdfc'
  },
  RELIANCE: {
    bg: '#d9222a',
    fg: '#ffffff',
    text: 'RIL',
    type: 'reliance'
  },
  ICICIBANK: {
    bg: '#b82a2b',
    fg: '#ffffff',
    text: 'ICICI',
    type: 'icici'
  },
  INFY: {
    bg: '#007cc3',
    fg: '#ffffff',
    text: 'infy',
    type: 'infosys'
  },
  TCS: {
    bg: '#0a1e3f',
    fg: '#00d2ff',
    text: 'TCS',
    type: 'tcs'
  },
  BHARTIARTL: {
    bg: '#ed1c24',
    fg: '#ffffff',
    text: 'airtel',
    type: 'airtel'
  },
  LT: {
    bg: '#002f6c',
    fg: '#ffffff',
    text: 'L&T',
    type: 'lt'
  },
  ITC: {
    bg: '#002554',
    fg: '#ffd700',
    text: 'ITC',
    type: 'itc'
  },
  AXISBANK: {
    bg: '#97144d',
    fg: '#ffffff',
    text: 'AXIS',
    type: 'axis'
  },
  HINDUNILVR: {
    bg: '#001a9c',
    fg: '#ffffff',
    text: 'HUL',
    type: 'hul'
  },
  SBIN: {
    bg: '#2252a3',
    fg: '#00bcd4',
    text: 'SBI',
    type: 'sbi'
  },
  KOTAKBANK: {
    bg: '#ed1c24',
    fg: '#ffffff',
    text: 'KOTAK',
    type: 'kotak'
  },
  TITAN: {
    bg: '#1a1a1a',
    fg: '#c5a059',
    text: 'TITAN',
    type: 'titan'
  },
  BAJFINANCE: {
    bg: '#00529b',
    fg: '#ffffff',
    text: 'BAJAJ',
    type: 'bajaj'
  },

  // AMCs / Mutual Funds
  HDFC_MF: {
    bg: '#004c8f',
    accent: '#ed1c24',
    type: 'hdfc'
  },
  ICICI_MF: {
    bg: '#b82a2b',
    accent: '#f58220',
    type: 'icici'
  },
  SBI_MF: {
    bg: '#2252a3',
    accent: '#00bcd4',
    type: 'sbi'
  },
  NIPPON_MF: {
    bg: '#d12421',
    accent: '#ffffff',
    type: 'nippon'
  },
  KOTAK_MF: {
    bg: '#ed1c24',
    accent: '#183884',
    type: 'kotak'
  },
  AXIS_MF: {
    bg: '#97144d',
    accent: '#ffffff',
    type: 'axis'
  },
  UTI_MF: {
    bg: '#f37023',
    accent: '#003366',
    type: 'uti'
  },
  LT_MF: {
    bg: '#002f6c',
    accent: '#ffffff',
    type: 'lt'
  },
  TATA_MF: {
    bg: '#00539f',
    accent: '#ffffff',
    type: 'tata'
  },
  INVESCO_MF: {
    bg: '#002b49',
    accent: '#00a3e0',
    type: 'invesco'
  },
  PPFAS_MF: {
    bg: '#1b365d',
    accent: '#4a90e2',
    type: 'ppfas'
  },
  BARODA_MF: {
    bg: '#f26522',
    accent: '#008559',
    type: 'baroda'
  }
};

export default function BrandLogo({ 
  identifier = '', 
  name = '', 
  size = 28, 
  rounded = 'rounded-lg',
  className = '' 
}) {
  const cleanId = (identifier || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanName = (name || '').toLowerCase();

  // 1. Resolve matching stock or AMC
  let brand = null;
  if (cleanId.includes('HDFC') || cleanName.includes('hdfc')) brand = BRAND_DATA.HDFCBANK;
  else if (cleanId.includes('RELIANCE') || cleanName.includes('reliance')) brand = BRAND_DATA.RELIANCE;
  else if (cleanId.includes('ICICI') || cleanName.includes('icici')) brand = BRAND_DATA.ICICIBANK;
  else if (cleanId.includes('INFY') || cleanName.includes('infosys')) brand = BRAND_DATA.INFY;
  else if (cleanId.includes('TCS') || cleanName.includes('tata consultancy')) brand = BRAND_DATA.TCS;
  else if (cleanId.includes('BHARTI') || cleanId.includes('AIRTEL') || cleanName.includes('airtel')) brand = BRAND_DATA.BHARTIARTL;
  else if (cleanId.includes('LT') || cleanName.includes('larsen') || cleanName.includes('toubro')) brand = BRAND_DATA.LT;
  else if (cleanId.includes('ITC') || cleanName.includes('itc')) brand = BRAND_DATA.ITC;
  else if (cleanId.includes('AXIS') || cleanName.includes('axis')) brand = BRAND_DATA.AXISBANK;
  else if (cleanId.includes('HINDUNILVR') || cleanId.includes('HUL') || cleanName.includes('unilever')) brand = BRAND_DATA.HINDUNILVR;
  else if (cleanId.includes('SBI') || cleanName.includes('sbi')) brand = BRAND_DATA.SBIN;
  else if (cleanId.includes('KOTAK') || cleanName.includes('kotak')) brand = BRAND_DATA.KOTAKBANK;
  else if (cleanId.includes('NIPPON') || cleanName.includes('nippon')) brand = BRAND_DATA.NIPPON_MF;
  else if (cleanId.includes('UTI') || cleanName.includes('uti')) brand = BRAND_DATA.UTI_MF;
  else if (cleanId.includes('TATA') || cleanName.includes('tata')) brand = BRAND_DATA.TATA_MF;
  else if (cleanId.includes('INVESCO') || cleanName.includes('invesco')) brand = BRAND_DATA.INVESCO_MF;
  else if (cleanId.includes('PARAG') || cleanId.includes('PPFAS') || cleanName.includes('parag parikh')) brand = BRAND_DATA.PPFAS_MF;
  else if (cleanId.includes('BARODA') || cleanId.includes('BNP') || cleanName.includes('baroda')) brand = BRAND_DATA.BARODA_MF;

  // Custom SVG renderers for authentic brand logos
  if (brand) {
    if (brand.type === 'hdfc') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#004c8f' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#d9222a' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#b82a2b' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#007cc3' }}
          title={name || identifier}
        >
          <span className="text-white font-black text-[10px] tracking-tighter uppercase font-sans">
            infy
          </span>
        </div>
      );
    }

    if (brand.type === 'tcs') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#0a1e3f' }}
          title={name || identifier}
        >
          <span className="text-[#00d2ff] font-extrabold text-[10.5px] tracking-tight font-sans">
            TCS
          </span>
        </div>
      );
    }

    if (brand.type === 'airtel') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#ffffff', border: '1px solid #fee2e2' }}
          title={name || identifier}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
            <path d="M16 6C10.48 6 6 10.48 6 16C6 21.52 10.48 26 16 26C18.8 26 21.3 24.8 23.1 22.9L19.8 19.6C18.8 20.5 17.5 21 16 21C13.24 21 11 18.76 11 16C11 13.24 13.24 11 16 11C18.76 11 21 13.24 21 16V17.5C21 18.33 20.33 19 19.5 19C18.67 19 18 18.33 18 17.5V16C18 14.9 17.1 14 16 14C14.9 14 14 14.9 14 16C14 17.1 14.9 18 16 18" stroke="#ed1c24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }

    if (brand.type === 'lt') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#002f6c' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#002554' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#97144d' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#001a9c' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#2252a3' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#ed1c24' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#d12421' }}
          title={name || identifier}
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
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#f37023' }}
          title={name || identifier}
        >
          <span className="text-[#003366] font-black text-[10.5px] tracking-tight font-sans">
            UTI
          </span>
        </div>
      );
    }

    if (brand.type === 'tata') {
      return (
        <div 
          className={`flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundColor: '#00539f' }}
          title={name || identifier}
        >
          <span className="text-white font-extrabold text-[10px] tracking-wider font-sans">
            TATA
          </span>
        </div>
      );
    }
  }

  // Fallback: Deterministic colorful initials badge
  const initials = (name || identifier || 'MP')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const palette = [
    { bg: 'bg-blue-600', text: 'text-white' },
    { bg: 'bg-indigo-600', text: 'text-white' },
    { bg: 'bg-emerald-600', text: 'text-white' },
    { bg: 'bg-teal-600', text: 'text-white' },
    { bg: 'bg-amber-600', text: 'text-white' },
    { bg: 'bg-rose-600', text: 'text-white' },
    { bg: 'bg-violet-600', text: 'text-white' }
  ];

  let hash = 0;
  for (let i = 0; i < (name || identifier).length; i++) {
    hash = (hash << 5) - hash + (name || identifier).charCodeAt(i);
  }
  const color = palette[Math.abs(hash) % palette.length];

  return (
    <div 
      className={`flex items-center justify-center font-bold text-[10px] shrink-0 border border-white/10 shadow-xs ${color.bg} ${color.text} ${rounded} ${className}`}
      style={{ width: size, height: size }}
      title={name || identifier}
    >
      {initials}
    </div>
  );
}
