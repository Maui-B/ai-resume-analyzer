import type { Route } from './+types/onboarding';
import { redirect, useNavigate } from 'react-router';
import { useState, type FormEvent } from 'react';
import { useAuthStore } from '~/lib/auth';
import { createCompany } from '~/lib/services/companies';

export const meta = () => [
  { title: 'Resumind | Onboarding' },
  { name: 'description', content: 'Pick your role to get started.' },
];

type Role = UserRole;

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) throw redirect('/auth?next=/onboarding');
  if (user.role) throw redirect('/');
  return null;
}

export default function Onboarding() {
  const { user, setRole, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const [role, setSelectedRole] = useState<Role | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role || !user) return;
    setSubmitting(true);
    try {
      if (role === 'recruiter' || role === 'company_admin') {
        if (!companyName.trim()) return;
        const company = await createCompany({
          name: companyName.trim(),
          website: companyWebsite.trim() || undefined,
        });
        await setRole(role, company.id);
      } else {
        await setRole(role);
      }
      navigate(role === 'jobseeker' ? '/' : '/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center p-4">
      <div className="gradient-border shadow-lg w-full max-w-[760px]">
        <section className="flex flex-col gap-6 bg-white rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome{user?.fullName ? `, ${user.fullName}` : ''}</h1>
            <h2>Tell us how you&apos;ll use Resumind</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['jobseeker', 'recruiter', 'company_admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <p className="font-semibold capitalize">{r.replace('_', ' ')}</p>
                  <p className="text-sm text-dark-200 mt-1">
                    {r === 'jobseeker' && 'Upload resumes, get AI feedback, apply to jobs.'}
                    {r === 'recruiter' && 'Post jobs, review applications, run match scoring.'}
                    {r === 'company_admin' && 'Manage a team of recruiters and your company profile.'}
                  </p>
                </button>
              ))}
            </div>

            {(role === 'recruiter' || role === 'company_admin') && (
              <div className="flex flex-col gap-3 border-t pt-4">
                <div className="form-div">
                  <label htmlFor="company-name">Company name</label>
                  <input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-div">
                  <label htmlFor="company-website">Website (optional)</label>
                  <input
                    id="company-website"
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={!role || isLoading || submitting}
            >
              {submitting ? 'Setting up...' : 'Continue'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
