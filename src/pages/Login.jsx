import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';

import { BACKEND_URL } from '../utils/api';


export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Incorrect email or password.' }));
        throw new Error(errorData.detail || 'Incorrect email or password.');
      }

      const data = await res.json();
      login({
        email: email,
        tier: data.tier || 'free',
        accessToken: data.access_token
      });

      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials and server connection.');
    }
  };

  return (
    <div className="bg-background min-h-[80vh] flex flex-col justify-center items-center px-margin-mobile py-xl relative">
      <SEOHead title="Login — DocForge" description="Log in to your DocForge account to manage your documents and track conversion history." />
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
          <h2 className="font-h2 text-h2 text-on-background">Welcome Back</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Enter your details to log in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container/10 border border-error/20 rounded-lg text-error font-body-sm text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
          </div>

          <button
            type="submit"
            className="w-full font-button text-button btn-theme-primary py-3 rounded-lg shadow-sm mt-2"
          >
            Log In
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-outline-variant">
          <p className="font-body-sm text-sm text-on-surface-variant">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}