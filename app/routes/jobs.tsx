import type { Route } from './+types/jobs';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import Navbar from '~/components/Navbar';
import { listJobs } from '~/lib/services/jobs';

export const meta = () => [
  { title: 'Resumind | Jobs' },
  { name: 'description', content: 'Browse open roles.' },
];

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const jobs = await listJobs({ status: 'open' });
  return { jobs };
}

export default function Jobs({ loaderData }: Route.ComponentProps) {
  const [jobs, setJobs] = useState<JobRow[]>(loaderData?.jobs ?? []);
  useEffect(() => {
    if (loaderData) setJobs(loaderData.jobs);
  }, [loaderData]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Open Roles</h1>
          <h2>Browse positions that match your skills</h2>
        </div>
        {jobs.length === 0 ? (
          <p className="text-dark-200">No open jobs right now.</p>
        ) : (
          <div className="w-full max-w-[1000px] flex flex-col gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-row justify-between items-center"
              >
                <div>
                  <h2 className="!text-black">{job.title}</h2>
                  <p className="text-dark-200 text-sm">{job.location ?? 'Location TBD'}</p>
                  {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-gray-100 text-dark-200 px-2 py-1 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-sm text-blue-600">View →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
