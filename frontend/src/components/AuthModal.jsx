import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setCredentials, 
  setAuthModalOpen, 
  setAuthModalTab, 
  setError, 
  setLoading 
} from '../store/slices/authSlice';
import { X, Mail, Lock, User, AlertCircle, Loader2, ArrowRight, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function AuthModal() {
  const dispatch = useDispatch();
  const { authModalOpen, authModalTab, loading, error } = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  // Two-Factor Authentication state
  const [step2fa, setStep2fa] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  if (!authModalOpen) return null;

  const isLogin = authModalTab === 'login';

  const handleClose = () => {
    dispatch(setAuthModalOpen(false));
    setLocalError('');
    setEmail('');
    setPassword('');
    setName('');
    setStep2fa(false);
    setTempToken('');
    setTotpCode('');
  };

  const handleTabSwitch = (tab) => {
    dispatch(setAuthModalTab(tab));
    setLocalError('');
    setStep2fa(false);
    setTempToken('');
    setTotpCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    dispatch(setLoading(true));

    try {
      const endpoint = isLogin ? `${API_BASE}/auth/login` : `${API_BASE}/auth/signup`;
      const payload = isLogin ? { email, password } : { email, password, name };

      const res = await axios.post(endpoint, payload);
      
      // Handle 2FA Challenge Response
      if (res.data && res.data.requires2fa) {
        setStep2fa(true);
        setTempToken(res.data.tempToken);
        setLocalError('');
        return;
      }
      if (res.data && res.data.requires2faSetup) {
        setStep2fa(true);
        setTempToken(res.data.tempToken);
        setLocalError(res.data.message || 'Two-factor setup is required for this account.');
        return;
      }

      if (res.data && res.data.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        dispatch(setCredentials({ token: res.data.token, user: res.data.user }));
        handleClose();
      } else {
        setLocalError('Unexpected response from server.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || err.message || 'Authentication failed';
      setLocalError(msg);
      dispatch(setError(msg));
    } finally {
      dispatch(setLoading(false));
    }
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
    // Redirect to backend Google OAuth initiation route
    window.location.href = `${API_BASE}/auth/google`;
  };

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
              {step2fa ? <ShieldCheck size={18} /> : <User size={18} />}
            </div>
            <div>
              <h3 className="font-display font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                {step2fa ? 'Two-Factor Authentication' : isLogin ? 'Sign In to The lal Street' : 'Create an Account'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {step2fa 
                  ? 'Enter 6-digit code from Google Authenticator'
                  : isLogin ? 'Access market analytics & watchlists' : 'Track live markets & portfolios'}
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
            /* Standard Auth View */
            <>
              {/* Tab Switcher */}
              <div className="flex rounded-lg p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isLogin 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signup')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    !isLogin 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-semibold text-xs sm:text-sm transition-all hover:bg-[var(--bg-card-hover)] active:scale-[0.99]"
                style={{ 
                  borderColor: 'var(--border-color)', 
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)' 
                }}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-[1px]" style={{ background: 'var(--border-color)' }} />
                <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Or with email
                </span>
                <div className="flex-1 h-[1px]" style={{ background: 'var(--border-color)' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-1 transition-colors"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          '--tw-ring-color': 'var(--accent)'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-1 transition-colors"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        '--tw-ring-color': 'var(--accent)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-1 transition-colors"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        '--tw-ring-color': 'var(--accent)'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer switch prompt */}
              <div className="text-center text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                {isLogin ? (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('signup')}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Sign Up
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('login')}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Sign In
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
