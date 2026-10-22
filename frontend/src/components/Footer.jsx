import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setActiveSector, 
  setActiveSymbol, 
  setRegion, 
  setAssetClass, 
  setActiveView, 
  setHowToUseOpen,
  setHowToUseTab 
} from '../store/slices/marketSlice';
import { 
  FileText, 
  ExternalLink, 
  Globe, 
  Shield, 
  Scale, 
  X,
  Mail,
  Phone,
  MessageCircle,
  Instagram,
  Linkedin,
  ShieldAlert
} from 'lucide-react';

export default function Footer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { lastUpdated, theme } = useSelector(state => state.market);
  const [legalModal, setLegalModal] = useState(null); // 'privacy' | 'terms' | null

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleNavLanding = () => {
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('landing'));
    dispatch(setHowToUseOpen(false));
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavStocks = () => {
    dispatch(setRegion('india'));
    dispatch(setAssetClass('stocks'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('heatmap'));
    dispatch(setHowToUseOpen(false));
    navigate('/stocks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavMutualFunds = () => {
    dispatch(setAssetClass('indian-mf'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('indian-mf'));
    dispatch(setHowToUseOpen(false));
    navigate('/mutual-funds');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavAnalytics = () => {
    dispatch(setAssetClass('analytics'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('mf-analytics'));
    dispatch(setHowToUseOpen(false));
    navigate('/analytics');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavGlobalStocks = () => {
    dispatch(setRegion('global'));
    dispatch(setAssetClass('stocks'));
    dispatch(setActiveSector(null));
    dispatch(setActiveSymbol(null));
    dispatch(setActiveView('heatmap'));
    dispatch(setHowToUseOpen(false));
    navigate('/global-stocks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t mt-auto" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
      {/* Upper Footer Columns */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          
          {/* Column 1: Brand & Bio */}
          <div className="space-y-4">
            <button 
              onClick={handleNavLanding}
              className="flex items-center gap-2 group text-left focus:outline-none"
              title="The lal Street"
            >
              <img 
                src={theme === 'dark' ? '/branding/logo-dark-trimmed.png' : '/branding/logo-light-trimmed.png'} 
                alt="The lal Street"
                className="h-8 sm:h-9 w-auto object-contain"
                onError={(e) => {
                  e.target.src = theme === 'dark' ? '/branding/logo-dark.png' : '/branding/logo-light.png';
                }}
              />
            </button>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              The lal Street helps you make smarter investment decisions with reliable data, powerful analytics and simple tools.
            </p>

            {/* Social / Official Presence */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <a
                href="https://www.thelalstreet.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--bg-card-hover)]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                title="Official Website"
              >
                <Globe size={13} className="text-blue-500" />
                <span>thelalstreet.com</span>
              </a>
              <a
                href="https://www.instagram.com/thelal.street?igsh=MXA0bHhlaGlqdzRyeA%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border transition-colors hover:bg-pink-500/10 hover:border-pink-400 hover:text-pink-500"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                title="Follow on Instagram"
              >
                <Instagram size={14} className="text-pink-500" />
              </a>
              <a
                href="https://www.linkedin.com/company/the-lal-street"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border transition-colors hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-500"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                title="Connect on LinkedIn"
              >
                <Linkedin size={14} className="text-blue-500" />
              </a>
              <a
                href="https://api.whatsapp.com/message/UE6A7P44TSENF1?autoload=1&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border transition-colors hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-500"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                title="Chat on WhatsApp"
              >
                <MessageCircle size={14} className="text-emerald-500" />
              </a>
            </div>
          </div>

          {/* Column 2: Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Product
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              <li>
                <button 
                  onClick={handleNavStocks} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Stocks
                </button>
              </li>
              <li>
                <button 
                  onClick={handleNavMutualFunds} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Mutual Funds
                </button>
              </li>
              <li>
                <button 
                  onClick={handleNavAnalytics} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Analytics
                </button>
              </li>
              <li>
                <button 
                  onClick={handleNavGlobalStocks} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Global Stocks
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { dispatch(setHowToUseTab('overview')); dispatch(setHowToUseOpen(true)); navigate('/how-to-use'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  How to Use
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Support
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              <li>
                <button 
                  onClick={() => { 
                    dispatch(setHowToUseTab('help-center')); 
                    dispatch(setHowToUseOpen(true)); 
                    navigate('/how-to-use'); 
                    window.scrollTo({ top: 0, behavior: 'smooth' }); 
                  }} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { navigate('/disclaimer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400 font-semibold"
                >
                  Disclaimer
                </button>
              </li>
              <li>
                <a
                  href="/MarketPulse_Final_Technical_Documentation.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <FileText size={13} />
                  <span>Data Guide &amp; Methodology</span>
                </a>
              </li>
              <li>
                <button 
                  onClick={() => setLegalModal('privacy')} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setLegalModal('terms')} 
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Corporate & Platform Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Corporate Info
            </h4>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                The Lal Street Wealth Managers Pvt. Ltd.
              </p>
              <p className="font-mono text-[11px]">
                CIN: <span className="font-semibold text-slate-700 dark:text-slate-300">U63990CT2025PTC019339</span>
              </p>
              <p>
                Corporate Office: Nehru Nagar West Bhilai, Chhattisgarh 490020, IN
              </p>
              <p className="flex items-center gap-1.5 pt-1">
                <Mail size={12} className="text-red-500 shrink-0" />
                <a 
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=thelalstreet.04@gmail.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                  title="Click to email thelalstreet.04@gmail.com"
                >
                  thelalstreet.04@gmail.com
                </a>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={12} className="text-emerald-500 shrink-0" />
                <a href="tel:+919171516100" className="hover:underline font-mono text-slate-700 dark:text-slate-300">
                  +91 91715 16100
                </a>
              </p>
              <p className="flex items-center gap-1.5">
                <MessageCircle size={12} className="text-emerald-500 shrink-0" />
                <a 
                  href="https://api.whatsapp.com/message/UE6A7P44TSENF1?autoload=1&app_absent=0" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  WhatsApp: Message Us
                </a>
              </p>
              <div className="pt-1 text-[11px] font-mono">
                System Sync: {formatTime(lastUpdated)}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── REGULATORY DISCLAIMER (AFTER FOOTER & ABOVE COPYRIGHT) ── */}
      <div 
        className="border-t py-6 px-4 md:px-6"
        style={{ 
          borderColor: 'var(--border-color)', 
          background: 'var(--bg-card)' 
        }}
      >
        <div className="max-w-[1600px] mx-auto space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert size={15} />
              <span>Regulatory Disclosures &amp; Investment Disclaimer</span>
            </div>
            <button
              onClick={() => { navigate('/disclaimer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Read Full Disclaimer</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="space-y-2 text-[11px] sm:text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <p>
              <strong>The lal Street</strong> is a financial research, analytical intelligence, and market quantitative screening platform operated by <strong>The Lal Street Wealth Managers Pvt. Ltd.</strong> (CIN: U63990CT2025PTC019339). All information, indicators (EMA 20, 50, 200), trendlines, heatmaps, sector breadth statistics, and mutual fund portfolio weightage screeners provided on this platform are strictly for <strong>informational, research, and educational purposes only</strong>. Nothing contained herein constitutes investment, financial, legal, or tax advice, nor is it an endorsement, solicitation, or recommendation to purchase or liquidate any security, derivative, or mutual fund scheme.
            </p>
            <p>
              <strong>Market Risk Notice:</strong> Securities market trading and Mutual Fund investments are subject to market risks. Read all scheme-related offer documents, risk disclosures, and regulatory filings carefully before investing. Past performance of any company, index, mutual fund scheme, or economic sector is not an indicator of future returns. The Lal Street Wealth Managers Pvt. Ltd. does not offer investment advisory services, stock tips, or guaranteed return schemes.
            </p>
            <p>
              Data is aggregated from official AMFI disclosures, exchange feeds, and public regulatory sources. Market quotes may be delayed by ~15 minutes. For inquiries, grievance redressal, or compliance queries, contact us at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=thelalstreet.04@gmail.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">thelalstreet.04@gmail.com</a> or helpline <a href="tel:+919171516100" className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono">+91 91715 16100</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Lower Bar with Copyright */}
      <div className="border-t py-4 px-4 md:px-6 text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <span>
              &copy; 2026 The Lal Street Wealth Managers Pvt. Ltd. All rights reserved.
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="font-mono text-[11px]">
              CIN: U63990CT2025PTC019339
            </span>
          </div>
          <span className="text-[11px]">
            For informational &amp; research purposes only.
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            Invest Wisely. Grow Consistently.
          </span>
        </div>
      </div>

      {/* Privacy Policy / Terms Modal */}
      {legalModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setLegalModal(null)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-primary)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {legalModal === 'privacy' ? <Shield size={18} className="text-blue-500" /> : <Scale size={18} className="text-blue-500" />}
                <h3 className="font-bold text-base">
                  {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
              </div>
              <button 
                onClick={() => setLegalModal(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    The lal Street values user privacy. All market metrics, sector data, and portfolio calculations are computed locally or derived from public financial disclosures.
                  </p>
                  <p>
                    We do not sell personal data or trade execution records to third parties. Theme choices and user interface preferences are saved locally on your device.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    The lal Street provides financial data, sector performance indicators, and mutual fund analytics for informational and analytical purposes only.
                  </p>
                  <p>
                    Content on this platform does not constitute financial, investment, legal, or tax advice. Market quotes may be delayed. Consult a licensed financial advisor before making investment decisions.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
