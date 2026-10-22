import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MessageCircle, 
  Instagram, 
  Linkedin, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  Scale,
  CheckCircle2
} from 'lucide-react';

export default function DisclaimerPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>

        <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Last Updated: 2026
        </span>
      </div>

      {/* Hero Header */}
      <div 
        className="rounded-3xl p-6 sm:p-10 border shadow-sm relative overflow-hidden"
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Official Regulatory Disclosure
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                CIN: U63990CT2025PTC019339
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>
              Disclaimer &amp; Terms of Use
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
              The Lal Street Wealth Managers Pvt. Ltd. | Platform: thelalstreet.in / thelalstreet.com
            </p>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div 
          className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full opacity-[0.03] pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        />
      </div>

      {/* Main Legal Content Cards */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Educational & Analytical Nature */}
        <div 
          className="rounded-2xl p-6 border space-y-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
            <FileText size={18} />
            <h2>1. Informational and Analytical Use Only</h2>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The content, tools, heatmaps, interactive charts, moving averages (EMA 20, 50, 200), trendlines, Mutual Fund portfolio holdings, and institutional weightage screeners provided on <strong>The lal Street</strong> are strictly for <strong>educational, informational, and quantitative research purposes</strong>. The platform compiles publicly available financial disclosures to assist users in understanding market trends and sector performance.
          </p>
        </div>

        {/* 2. No Investment Advice / SEBI Disclosure */}
        <div 
          className="rounded-2xl p-6 border space-y-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm uppercase tracking-wider">
            <AlertTriangle size={18} />
            <h2>2. No Financial, Tax, Legal, or Investment Advice</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p>
              Nothing published, calculated, displayed, or linked on this platform constitutes a recommendation, endorsement, solicitation, or offer to buy, sell, or hold any security, equity share, derivative contract, commodity, or mutual fund scheme.
            </p>
            <p>
              <strong>The Lal Street Wealth Managers Pvt. Ltd.</strong> does not provide personalized investment advisory or portfolio management services through this public web application. You should always consult with a qualified, SEBI-registered Investment Adviser (RIA), licensed stockbroker, or certified financial planner before executing any financial transaction.
            </p>
          </div>
        </div>

        {/* 3. Market Risk Warning */}
        <div 
          className="rounded-2xl p-6 border space-y-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-wider">
            <Scale size={18} />
            <h2>3. Securities Market &amp; Mutual Funds Risk Acknowledgment</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Mutual fund investments and securities market trading are subject to market risks. Please read all scheme-related documents, offer letters, and terms carefully before investing.
            </p>
            <p>
              Past performance of any stock, index, mutual fund scheme, or sector is not indicative of future performance. Prices and returns fluctuate continuously based on market dynamics, and investors may lose their invested principal.
            </p>
          </div>
        </div>

        {/* 4. Data Sources, Accuracy & Delay Notice */}
        <div 
          className="rounded-2xl p-6 border space-y-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 size={18} />
            <h2>4. Data Accuracy, Delays &amp; Third-Party Sources</h2>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Market data, stock price quotes, Net Asset Values (NAVs), and AMC portfolio filings are aggregated from authorized AMFI disclosures, exchange feeds, and public data providers. Market quotes may be delayed by approximately 15 minutes. While reasonable efforts are made to verify calculation integrity, <strong>The Lal Street Wealth Managers Pvt. Ltd.</strong> makes no warranties or representations regarding completeness, absolute accuracy, or uninterrupted server availability.
          </p>
        </div>

        {/* 5. Limitation of Liability */}
        <div 
          className="rounded-2xl p-6 border space-y-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider">
            <ShieldAlert size={18} />
            <h2>5. Limitation of Liability</h2>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Under no circumstances shall <strong>The Lal Street Wealth Managers Pvt. Ltd.</strong>, its directors, officers, associates, or engineering staff be held liable for any direct, indirect, special, incidental, punitive, or consequential losses or damages (including lost profits or loss of capital) arising out of the use of, or inability to use, the platform and its analytical features.
          </p>
        </div>

      </div>

      {/* Corporate & Direct Contact Strip */}
      <div 
        className="rounded-3xl p-6 sm:p-8 border space-y-5"
        style={{ 
          background: 'var(--bg-secondary)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <div>
          <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>
            Official Corporate Details &amp; Investor Grievance
          </h3>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            For compliance queries, data verification, technical support, or partnership discussions:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Email Card */}
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=thelalstreet.04@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:border-blue-400 group"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            title="Click to email thelalstreet.04@gmail.com"
          >
            <div className="p-2.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Mail size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Official Email
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                thelalstreet.04@gmail.com
              </div>
            </div>
          </a>

          {/* Contact Number Card */}
          <a
            href="tel:+919171516100"
            className="p-4 rounded-xl border flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:border-emerald-400 group"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="p-2.5 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Phone size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Phone Helpline
              </div>
              <div className="font-semibold font-mono text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                +91 91715 16100
              </div>
            </div>
          </a>

          {/* WhatsApp Support Card */}
          <a
            href="https://api.whatsapp.com/message/UE6A7P44TSENF1?autoload=1&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:border-emerald-500 group"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                WhatsApp Direct
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <span>Start Instant Chat</span>
                <ExternalLink size={12} className="opacity-60" />
              </div>
            </div>
          </a>
        </div>

        {/* Social Links Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Connect with us:
          </span>
          <a
            href="https://www.instagram.com/thelal.street?igsh=MXA0bHhlaGlqdzRyeA%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-pink-500/10 hover:border-pink-400 hover:text-pink-600"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Instagram size={14} className="text-pink-500" />
            <span>Instagram</span>
          </a>
          <a
            href="https://www.linkedin.com/company/the-lal-street"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-600"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Linkedin size={14} className="text-blue-500" />
            <span>LinkedIn</span>
          </a>
          <a
            href="https://www.thelalstreet.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-600"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <ExternalLink size={14} className="text-blue-500" />
            <span>thelalstreet.com</span>
          </a>
        </div>

        {/* Corporate Address & CIN */}
        <div className="pt-2 text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            The Lal Street Wealth Managers Pvt. Ltd.
          </p>
          <p className="font-mono text-[11px]">
            CIN: U63990CT2025PTC019339
          </p>
          <p>
            Registered Office: Nehru Nagar West Bhilai, Chhattisgarh 490020, India
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          Return to Platform
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { navigate('/stocks'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Explore Stocks
          </button>
          <span className="text-slate-400">•</span>
          <button
            onClick={() => { navigate('/mutual-funds'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Explore Mutual Funds
          </button>
        </div>
      </div>
    </div>
  );
}
