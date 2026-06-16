import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';

function getPasswordStrength(password) {
  if (!password) return { label: '', color: '', width: '0%' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: '25%' };
  if (score <= 2) return { label: 'Fair', color: 'bg-yellow-400', width: '50%' };
  if (score <= 3) return { label: 'Good', color: 'bg-blue-400', width: '75%' };
  return { label: 'Strong', color: 'bg-green-500', width: '100%' };
}

export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const BACKEND_URL = 'http://localhost:8000';

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Registration failed.' }));
        throw new Error(errorData.detail || 'Registration failed. An account with this email may already exist.');
      }

      const data = await res.json();
      login({
        email: email,
        tier: data.tier || 'free',
        accessToken: data.access_token
      });

      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="bg-background min-h-[80vh] flex flex-col justify-center items-center px-margin-mobile py-xl relative">
      <SEOHead title="Create Account — DocForge" description="Sign up for a free DocForge account to unlock historical file metrics and manage document history." />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      {/* Back to Home link */}
      <div className="w-full max-w-md mb-4 z-10">
        <Link to="/" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary text-sm font-medium transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Home
        </Link>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-8 max-w-md w-full shadow-md z-10 text-left">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 font-h3 text-h3 font-semibold text-primary">
            <span className="material-symbols-outlined text-[28px] fill">description</span>
            <span>DocForge</span>
          </Link>
          <h2 className="font-h2 text-h2 text-on-background">Create Account</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Get started with private browser document processing</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container/10 border border-error/20 rounded-lg text-error font-body-sm text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-mono text-label-mono text-outline uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-mono text-label-mono text-outline uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-surface-container-low border border-outline-variant rounded-lg text-on-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {/* Password Strength Indicator */}
            {password && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <span className="text-[11px] font-medium text-on-surface-variant min-w-[40px]">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-mono text-label-mono text-outline uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-surface-container-low border border-outline-variant rounded-lg text-on-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {/* Password match indicator */}
            {confirmPassword && (
              <div className="flex items-center gap-1 mt-0.5">
                {password === confirmPassword ? (
                  <>
                    <span className="material-symbols-outlined text-green-500 text-[14px]">check_circle</span>
                    <span className="text-[11px] text-green-600 font-medium">Passwords match</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-red-400 text-[14px]">cancel</span>
                    <span className="text-[11px] text-red-500 font-medium">Passwords don't match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full font-button text-button btn-theme-primary py-3 rounded-lg shadow-sm mt-2"
          >
            Create Account
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-outline-variant">
          <p className="font-body-sm text-sm text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
