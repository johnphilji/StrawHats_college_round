import { useState } from 'react';
import styles from './AuthModal.module.css';
import { supabase } from './lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
  onAuthSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'signin',
  onAuthSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!supabase) {
      setErrorMsg('Supabase authentication client is not configured.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSuccessMsg('Authenticated successfully.');
        setTimeout(() => {
          onClose();
          onAuthSuccess?.();
        }, 500);
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Account created. Check your email for verification link.');
        setTimeout(() => {
          onClose();
          onAuthSuccess?.();
        }, 1200);
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg('Password reset instructions sent to your email.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthGitHub = async () => {
    setErrorMsg(null);
    if (!supabase) {
      setErrorMsg('Supabase client is not configured.');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin, scopes: 'read:user user:email' },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'GitHub OAuth initiation failed.');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brandBadge}>
            <div className={styles.logoSquare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <span className={styles.brandTitle}>PATCHWORK</span>
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            {mode === 'signin' && 'Sign in to Patchwork'}
            {mode === 'signup' && 'Create your developer account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className={styles.subtitle}>
            {mode === 'signin' && 'Enter your credentials or authenticate via your organization.'}
            {mode === 'signup' && 'Connect repositories and visually edit websites in real time.'}
            {mode === 'forgot' && "Enter your account email to receive a recovery link."}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && <div className={styles.alertError} role="alert">{errorMsg}</div>}
        {successMsg && <div className={styles.alertSuccess} role="status">{successMsg}</div>}

        {/* GitHub OAuth Button */}
        {mode !== 'forgot' && (
          <div className={styles.oauthSection}>
            <button type="button" className={styles.githubBtn} onClick={handleOAuthGitHub}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
            </button>
            <div className={styles.dividerRow}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>or continue with email</span>
              <span className={styles.dividerLine} />
            </div>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">Work Email</label>
            <input
              id="auth-email"
              type="email"
              required
              className={styles.input}
              placeholder="developer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="auth-password">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className={styles.passwordWrapper}>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={styles.input}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className={styles.spinnerWrapper}>
                <span className={styles.spinner} />
                Processing...
              </span>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : mode === 'signup' ? (
              'Create Account'
            ) : (
              'Send Recovery Link'
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div className={styles.footerSwitch}>
          {mode === 'signin' && (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                className={styles.switchBtn}
                onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Sign up
              </button>
            </span>
          )}
          {mode === 'signup' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                className={styles.switchBtn}
                onClick={() => { setMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Sign in
              </button>
            </span>
          )}
          {mode === 'forgot' && (
            <span>
              Remembered your password?{' '}
              <button
                type="button"
                className={styles.switchBtn}
                onClick={() => { setMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Back to Sign in
              </button>
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles.guestBtn}
          onClick={() => {
            onClose();
            onAuthSuccess?.();
          }}
          title="Instant access for hackathon / demo evaluation"
        >
          Enter as Demo Developer →
        </button>
      </div>
    </div>
  );
}
