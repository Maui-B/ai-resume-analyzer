import type { Route } from './+types/home';
import { redirect } from 'react-router';
import Navbar from '~/components/Navbar';
import ResumeCard from '~/components/ResumeCard';
import { Link, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '~/lib/auth';
import { listMyResumes } from '~/lib/services/resumes';
import { listApplications } from '~/lib/services/applications';

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Resumind' },
    { name: 'description', content: 'Track your applications and resume feedback.' },
  ];
}

/**
 * clientLoader runs before render — no flash of protected content.
 * - Recruiters and company_admins land on /dashboard.
 * - Unauthenticated visitors go to /auth.
 * - Jobseekers stay on /.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) {
    const next = new URL(request.url).pathname;
    throw redirect(`/auth?next=${encodeURIComponent(next)}`);
  }
  if (user.role === 'recruiter' || user.role === 'company_admin') {
    throw redirect('/dashboard');
  }
  if (!user.role) {
    throw redirect('/onboarding');
  }
  const [resumes, applications] = await Promise.all([listMyResumes(), listApplications({ jobseekerId: user.id })]);
  return { resumes, applications };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>(loaderData?.resumes ?? []);
  const [applications, setApplications] = useState<ApplicationRow[]>(loaderData?.applications ?? []);

  useEffect(() => {
    if (!user) {
      navigate('/auth?next=/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (loaderData) {
      setResumes(loaderData.resumes);
      setApplications(loaderData.applications);
    }
  }, [loaderData]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          {resumes.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}
        </div>

        {resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
        )}

        {applications.length > 0 && (
          <div className="w-full max-w-[1200px] mt-16">
            <h2 className="text-2xl mb-4">Your Applications</h2>
            <div className="flex flex-col gap-2">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-row justify-between items-center bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div>
                    <p className="font-semibold">Application {app.id.slice(0, 8)}</p>
                    <p className="text-sm text-dark-200">Status: {app.status}</p>
                  </div>
                  {app.match_score != null && (
                    <div className="text-sm text-dark-200">Match: {app.match_score}/100</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
