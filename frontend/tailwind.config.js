/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // High fidelity theme colors
        darkBg: '#090d16',
        darkCard: '#111827',
        darkBorder: '#1f2937',
        brandGreen: '#10b981', // emerald-500
        brandRed: '#f43f5e', // rose-500
        brandGray: '#9ca3af',
        accentBlue: '#06b6d4', // cyan-500
        gain: { DEFAULT: '#22c55e', dark: '#16a34a', light: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
        loss: { DEFAULT: '#ef4444', dark: '#dc2626', light: '#f87171', bg: 'rgba(239,68,68,0.1)' },
        neutral: { DEFAULT: '#64748b', light: '#94a3b8' },
        surface: { DEFAULT: '#0f1724', hover: '#162032', border: '#1e293b' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'skeleton': 'skeleton-pulse 1.8s ease-in-out infinite',
        'ticker-scroll': 'ticker-scroll 30s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
