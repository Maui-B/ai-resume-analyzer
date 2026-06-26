import type { Route } from './+types/auth';
import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '~/lib/auth';
import { isSupabaseConfigured } from '~/lib/env';

export const meta = () => [
  { title: 'Resumind | Auth' },
  { name: 'description', content: 'Sign in or create an account.' },
];

type Mode = 'signin' | 'signup';

const Auth = (_args: Route.ComponentProps) => {
  const { user, isLoading, error, signIn, signUp, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') ?? '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, navigate, next]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === 'signup') {
      await signUp(email, password, fullName);
    } else {
      await signIn(email, password);
    }
  };

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-lg w-full max-w-[640px]">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome</h1>
            <h2>{mode === 'signin' ? 'Log in to continue' : 'Create your account'}</h2>
          </div>

          {!supabaseConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-900">
              Supabase is not configured. You are in demo mode &mdash; auth is disabled.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="form-div">
                <label htmlFor="full-name">Full name</label>
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-div">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-div">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
            <button className="auth-button" type="submit" disabled={isLoading || !supabaseConfigured}>
              <p>{isLoading ? 'Working...' : mode === 'signin' ? 'Log In' : 'Sign Up'}</p>
            </button>
          </form>

          <div className="text-center text-sm text-dark-200">
            {mode === 'signin' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setMode('signup')}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setMode('signin')}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
