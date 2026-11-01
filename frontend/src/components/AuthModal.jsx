import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setCredentials, 
  setAuthModalOpen, 
  setError, 
  setLoading 
} from '../store/slices/authSlice';
import { X, AlertCircle, Loader2, ShieldCheck, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function AuthModal() {
  const dispatch = useDispatch();
  const { authModalOpen, loading, error } = useSelector(state => state.auth);

  const [localError, setLocalError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Two-Factor Authentication state
  const [step2fa, setStep2fa] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleClose = () => {
    dispatch(setAuthModalOpen(false));
    setLocalError('');
    setGoogleLoading(false);
    setStep2fa(false);
    setTempToken('');
    setTotpCode('');
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!totpCode || totpCode.trim().length < 6) {
      setLocalError('Please enter a valid 6-digit authenticator code or backup recovery code.');
      return;
    }

    dispatch(setLoading(true));
    try {
      const res = await axios.post(`${API_BASE}/auth/2fa/verify`, {
        tempToken,
        code: totpCode.trim()
      });

      if (res.data && res.data.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        dispatch(setCredentials({ token: res.data.token, user: res.data.user }));
        handleClose();
      } else {
        setLocalError('Verification failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Invalid or expired authentication code.';
      setLocalError(msg);
      dispatch(setError(msg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setLocalError('');
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `${API_BASE}/auth/google?returnTo=${returnTo}`;
  };

  if (!authModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-md flex flex-col rounded-2xl shadow-2xl overflow-hidden border"
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b" 
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              {step2fa ? <ShieldCheck size={18} /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-display font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                {step2fa ? 'Two-Factor Authentication' : 'Welcome to The Lal Street'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {step2fa 
                  ? 'Enter 6-digit code from Google Authenticator'
                  : 'Fast, secure Google sign-in & registration'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Error Banner */}
          {(localError || error) && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{localError || error}</span>
            </div>
          )}

          {step2fa ? (
            /* 2FA Verification View */
            <form onSubmit={handleVerify2fa} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Authenticator Code or Backup Code
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={14}
                    placeholder="e.g. 123456 or XXXX-XXXX"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-mono tracking-wider border focus:outline-none focus:ring-1 transition-colors"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--accent)'
                    }}
                  />
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Open your Google Authenticator, Authy, or Microsoft Authenticator app to view your verification code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep2fa(false);
                  setTempToken('');
                  setTotpCode('');
                  setLocalError('');
                }}
                className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>
            </form>
          ) : (
            /* Google-Only Sign-in & Sign-up View */
            <div className="flex flex-col gap-4 py-2">
              <div className="text-center px-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Sign in or create your free account
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Get instant access to Indian stock screeners, quarterly financials, and mutual fund analytics.
                </p>
              </div>

              {/* Google OAuth Primary Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border font-semibold text-sm transition-all shadow-xs hover:shadow-md hover:bg-[var(--bg-card-hover)] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                style={{ 
                  borderColor: 'var(--border-color)', 
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)' 
                }}
              >
                {googleLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Platform Highlights */}
              <div 
                className="rounded-xl p-3.5 border flex flex-col gap-2"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-color)' 
                }}
              >
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>One-click sign in & instant registration</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Personal watchlists & portfolio tracking</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <Lock size={14} className="text-blue-500 shrink-0" />
                  <span>Safe and secured via Google OAuth 2.0</span>
                </div>
              </div>

              {/* Terms and Privacy Disclaimer */}
              <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
