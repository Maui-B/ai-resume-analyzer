import type { Route } from './+types/dashboard.jobs';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '~/lib/auth';
import { listJobs, updateJobStatus } from '~/lib/services/jobs';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function DashboardJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    void listJobs().then(setJobs);
  }, []);

  const handleClose = async (id: string) => {
    await updateJobStatus(id, 'closed');
    setJobs(await listJobs());
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="!text-3xl">Your Jobs</h1>
        <Link to="/dashboard/jobs/new" className="primary-button w-fit">
          + Post a Job
        </Link>
      </div>
      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <p className="text-dark-200">No jobs yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Location</th>
                <th className="p-4">Posted</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b last:border-0">
                  <td className="p-4 font-semibold">{j.title}</td>
                  <td className="p-4 capitalize">{j.status}</td>
                  <td className="p-4">{j.location ?? '—'}</td>
                  <td className="p-4">{new Date(j.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    {j.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleClose(j.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
