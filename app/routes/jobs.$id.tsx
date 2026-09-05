import type { Route } from './+types/jobs.$id';
import { Link, redirect, useNavigate } from 'react-router';
import { useState } from 'react';
import Navbar from '~/components/Navbar';
import { useAuthStore } from '~/lib/auth';
import { getJob } from '~/lib/services/jobs';
import { listMyResumes } from '~/lib/services/resumes';
import { createApplication } from '~/lib/services/applications';

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.job ? `Resumind | ${data.job.title}` : 'Resumind | Job' },
  { name: 'description', content: data?.job?.description?.slice(0, 160) ?? 'Job details' },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const job = await getJob(params.id);
  if (!job) throw redirect('/jobs');

  const { user } = useAuthStore.getState();
  let resumes: Resume[] = [];
  if (user?.role === 'jobseeker') {
    resumes = await listMyResumes();
  }

  return { job, resumes, isJobseeker: user?.role === 'jobseeker', isAuthenticated: !!user };
}

export default function JobDetail({ loaderData }: Route.ComponentProps) {
  const { job, resumes, isJobseeker, isAuthenticated } = loaderData;
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?next=/jobs/${job.id}`);
      return;
    }
    if (!selectedResumeId) {
      setError('Please upload a resume first.');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      await createApplication({ jobId: job.id, resumeId: selectedResumeId });
      setApplied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (min && max) return `R${min.toLocaleString()} – R${max.toLocaleString()}`;
    if (min) return `From R${min.toLocaleString()}`;
    if (max) return `Up to R${max.toLocaleString()}`;
    return null;
  };

  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="w-full max-w-[800px] flex flex-col gap-6 py-8">
          <Link to="/jobs" className="text-sm text-blue-600 hover:underline self-start">
            ← Back to jobs
          </Link>

          <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="!text-black text-3xl">{job.title}</h1>
                <p className="text-dark-200 mt-1">{job.location ?? 'Location TBD'}</p>
              </div>
              <span className="capitalize bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                {job.status}
              </span>
            </div>

            {salary && (
              <p className="text-lg font-semibold text-dark-200">{salary}</p>
            )}

            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {job.description && (
              <div className="mt-4">
                <h2 className="!text-black text-lg mb-2">About this role</h2>
                <p className="text-dark-200 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </p>
              </div>
            )}
          </div>

          {isJobseeker && (
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="!text-black text-xl">Apply for this position</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
                  {error}
                </div>
              )}

              {applied ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                  <p className="font-semibold">Application submitted!</p>
                  <p className="text-sm mt-1">
                    You can track your application status on your{' '}
                    <Link to="/" className="underline">
                      dashboard
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <>
                  {resumes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="resume-select" className="text-sm text-dark-200">
                        Choose a resume
                      </label>
                      <select
                        id="resume-select"
                        value={selectedResumeId}
                        onChange={(e) => setSelectedResumeId(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.jobTitle ?? 'Untitled'} {r.companyName ? `@ ${r.companyName}` : ''}{' '}
                            — Score: {r.feedback?.overallScore ?? 'N/A'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-dark-200">
                      You don&apos;t have any resumes yet.{' '}
                      <Link to="/upload" className="text-blue-600 underline">
                        Upload one first
                      </Link>
                      .
                    </p>
                  )}
                  <button
                    type="button"
                    className="primary-button w-fit"
                    onClick={handleApply}
                    disabled={applying || resumes.length === 0}
                  >
                    {applying ? 'Submitting…' : 'Apply now'}
                  </button>
                </>
              )}
            </div>
          )}

          {!isJobseeker && !isAuthenticated && (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <p className="text-dark-200 mb-3">Sign in to apply for this position.</p>
              <Link
                to={`/auth?next=/jobs/${job.id}`}
                className="primary-button inline-block"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
