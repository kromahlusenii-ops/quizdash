import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, displayName || email.split('@')[0]);
      } else {
        await signIn(email, password);
      }
      navigate('/instructor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-md border border-line arcade-border">
        <p className="text-center font-arcade text-accent text-[10px] tracking-widest mb-1">
          QUIZDASH
        </p>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-muted text-xs mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface-alt border border-line text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-muted text-xs mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-alt border border-line text-white focus:outline-none focus:border-accent transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-muted text-xs mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-alt border border-line text-white focus:outline-none focus:border-accent transition-colors"
              placeholder="Password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/40 text-danger px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:bg-surface-alt disabled:text-dim text-white font-bold rounded-lg transition-colors shadow-[0_0_20px_rgba(33,33,222,0.3)]"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-accent hover:text-accent-hover text-sm transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
