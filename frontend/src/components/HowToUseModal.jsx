import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  X, 
  TrendingUp, 
  PieChart, 
  SlidersHorizontal, 
  Globe, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  HelpCircle,
  Mail,
  Phone,
  MessageCircle,
  Instagram,
  Linkedin,
  ShieldAlert,
  Building2
} from 'lucide-react';

export default function HowToUseModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const reduxTab = useSelector(state => state.market?.howToUseTab);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (reduxTab) {
      setActiveTab(reduxTab);
    }
  }, [reduxTab, isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CheckCircle2 },
    { id: 'stocks', label: 'Stocks', icon: TrendingUp },
    { id: 'mutual-funds', label: 'Mutual Funds', icon: PieChart },
    { id: 'analytics', label: 'Analytics', icon: SlidersHorizontal },
    { id: 'global-stocks', label: 'Global Stocks', icon: Globe },
    { id: 'help-center', label: 'Help Center & Contact', icon: HelpCircle },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border"
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                How to Use The lal Street
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Platform guide and analytical workflow instructions
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--border-color)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 shrink-0 ${
                  isActive 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/5' 
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  Welcome to The lal Street
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  The lal Street is a high-performance financial market intelligence platform designed for investors, researchers, and portfolio managers. Access verified data across Indian equities, mutual funds, global benchmarks, and institutional holding screeners.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    <TrendingUp size={14} className="text-blue-500" />
                    Indian Equities Universe
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Sector-level market breadth, multi-period price returns (1W to All-Time), and verified fundamental accounting metrics (EBIT, EPS, P/E).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    <PieChart size={14} className="text-emerald-500" />
                    Mutual Funds Analysis
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    AMFI-synchronized NAV tracking, AUM-weighted sector allocations, scheme comparisons, and interactive portfolio workbench.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    <SlidersHorizontal size={14} className="text-purple-500" />
                    Stock Weightage Screener
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Bi-directional institutional consensus tool: discover which mutual funds own any stock and explore complete AMC portfolios.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Globe size={14} className="text-amber-500" />
                    Global Stock Sectors
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Benchmark international markets with GICS sector classifications and macro performance correlation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stocks' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Navigating Stocks Performance
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-500 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Market Breadth Cards</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Quickly review Advancing vs. Declining sectors, plus the total ratio of advancing constituent stocks across the Indian market.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-500 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Sector Constituent Drill-Down</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Click the arrow or row on any sector to view constituent equities inline. Filter stocks by Top Gainers, Top Losers, Volume, or Market Cap.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-500 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Multi-Period Lookback &amp; CSV Export</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Switch between 1W, 1M, 6M, 1Y, 3Y, 5Y, and All-Time returns. Click Export to download the full accounting dataset in CSV format.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mutual-funds' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Using Mutual Funds Analytics
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/10 text-emerald-500 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Category Explorer</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Filter funds across Large Cap, Mid Cap, Small Cap, Flexi Cap, Hybrid, Debt, ETF, and Index categories with official AMFI NAV updates.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/10 text-emerald-500 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>AUM &amp; Sector Allocation</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Inspect portfolio weightings across industries, analyze risk-adjusted Sharpe &amp; Sortino ratios, and verify fund asset allocation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/10 text-emerald-500 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Fund Comparison Workbench</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Pin multiple mutual funds to the bottom workbench to compare performance metrics, sector overlaps, and risk ratios side-by-side.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Stock Weightage Screener
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-600/10 text-purple-500 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Stock-to-Fund View</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Search or select any stock to see every mutual fund holding it, the weight percentage in each fund, and the total institutional capital committed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-600/10 text-purple-500 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Fund-to-Stock Disclosures</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Select an AMC or fund scheme to inspect its verified monthly portfolio disclosure, top holdings, and percentage concentration.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-600/10 text-purple-500 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Zero-Fabrication Data</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      All data is derived from direct monthly AMC disclosures. If a fund hasn&apos;t released recent filings, it honestly displays &apos;Awaiting publication&apos;.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'global-stocks' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Global Stock Sectors
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                The Global Stocks view covers international equities organized by GICS sectors (Information Technology, Healthcare, Financials, Consumer Discretionary, etc.).
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <span className="font-semibold text-[var(--text-primary)]">Global Benchmarking: </span>
                  Compare Indian market performance against global trends to spot cross-market momentum.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'help-center' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <HelpCircle size={18} className="text-blue-500" />
                  Help Center &amp; Support Channels
                </h3>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Have questions, research inquiries, or need platform assistance? Reach out directly to <strong>The Lal Street Wealth Managers Pvt. Ltd.</strong>
                </p>
              </div>

              {/* Contact Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Gmail Card */}
                <div className="p-4 rounded-xl border flex flex-col justify-between gap-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <Mail size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Help Centre Email</h4>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Write to us for research, accounts, or platform queries.
                      </p>
                      <a 
                        href="https://mail.google.com/mail/?view=cm&fs=1&to=thelalstreet1997@gmail.com" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-1 break-all cursor-pointer"
                        title="Click to compose email to thelalstreet1997@gmail.com"
                      >
                        <span>thelalstreet1997@gmail.com</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=thelalstreet1997@gmail.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
                      title="Open directly in Gmail Web"
                    >
                      <Mail size={13} />
                      <span>Open in Gmail</span>
                    </a>
                    <a
                      href="mailto:thelalstreet1997@gmail.com"
                      className="py-2 px-2.5 rounded-lg text-xs font-semibold border hover:bg-[var(--bg-card-hover)] text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors text-center"
                      style={{ borderColor: 'var(--border-color)' }}
                      title="Open default email application"
                    >
                      <ExternalLink size={12} />
                      <span>Mail App</span>
                    </a>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="p-4 rounded-xl border flex flex-col justify-between gap-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Phone size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Direct Phone Helpline</h4>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Call our support team directly during business hours.
                      </p>
                      <a 
                        href="tel:+919171516100" 
                        className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline block mt-1"
                      >
                        +91 91715 16100 (9171516100)
                      </a>
                    </div>
                  </div>
                  <a
                    href="tel:+919171516100"
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <Phone size={13} />
                    <span>Call Now</span>
                  </a>
                </div>

                {/* WhatsApp Card */}
                <div className="p-4 rounded-xl border flex flex-col justify-between gap-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                      <MessageCircle size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>WhatsApp Support</h4>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Instant messaging and direct query assistance.
                      </p>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
                        Active &amp; Responsive
                      </span>
                    </div>
                  </div>
                  <a
                    href="https://api.whatsapp.com/message/UE6A7P44TSENF1?autoload=1&app_absent=0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <MessageCircle size={13} />
                    <span>Chat on WhatsApp</span>
                    <ExternalLink size={11} className="opacity-80" />
                  </a>
                </div>

                {/* Social Profiles Card */}
                <div className="p-4 rounded-xl border flex flex-col justify-between gap-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Globe size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Official Social Channels</h4>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Follow our market insights, releases, and updates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://www.instagram.com/thelal.street?igsh=MXA0bHhlaGlqdzRyeA%3D%3D&utm_source=qr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all hover:bg-pink-500/10 hover:border-pink-500 hover:text-pink-500 flex items-center justify-center gap-1 text-center"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <Instagram size={13} className="text-pink-500" />
                      <span>Instagram</span>
                    </a>
                    <a
                      href="https://www.linkedin.com/company/the-lal-street"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-1 text-center"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <Linkedin size={13} className="text-blue-500" />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Corporate Identity & Regulatory Notice */}
              <div className="p-4 rounded-xl border space-y-2.5" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-blue-500" />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      The Lal Street Wealth Managers Pvt. Ltd.
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    CIN: U63990CT2025PTC019339
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <p>Registered Office: Nehru Nagar West Bhilai, Chhattisgarh 490020, India</p>
                  <a 
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=thelalstreet.04@gmail.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    title="Corporate Inquiries"
                  >
                    <Mail size={11} />
                    <span>thelalstreet.04@gmail.com</span>
                  </a>
                </div>
                <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-2 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <ShieldAlert size={12} />
                    Educational &amp; Analytical platform only.
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/disclaimer');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Read Full Disclaimer Page</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t text-xs" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <a
            href="/MarketPulse_Final_Technical_Documentation.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            <ExternalLink size={13} />
            Download Complete Technical Documentation (PDF)
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors w-full sm:w-auto text-center"
          >
            Got it, start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
