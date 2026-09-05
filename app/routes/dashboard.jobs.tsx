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
  const [filteredJobs, setFilteredJobs] = useState<JobRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');

  useEffect(() => {
    void listJobs().then(setJobs);
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredJobs(jobs);
    } else {
      setFilteredJobs(jobs.filter(job => job.status === statusFilter));
    }
  }, [statusFilter, jobs]);

  const handleClose = async (id: string) => {
    await updateJobStatus(id, 'closed');
    setJobs(await listJobs());
  };

  const handleReopen = async (id: string) => {
    await updateJobStatus(id, 'open');
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
      
      {/* Status Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-full text-sm ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-3 py-1 rounded-full text-sm ${
            statusFilter === 'open'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`px-3 py-1 rounded-full text-sm ${
            statusFilter === 'closed'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Closed
        </button>
        <button
          onClick={() => setStatusFilter('paused')}
          className={`px-3 py-1 rounded-full text-sm ${
            statusFilter === 'paused'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Paused
        </button>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <p className="text-dark-200">No jobs found.</p>
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
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j) => (
                <tr key={j.id} className="border-b last:border-0">
                  <td className="p-4 font-semibold">{j.title}</td>
                  <td className="p-4">
                    <span className={`capitalize px-2 py-1 rounded-full text-xs ${
                      j.status === 'open' ? 'bg-green-100 text-green-800' :
                      j.status === 'closed' ? 'bg-red-100 text-red-800' :
                      j.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="p-4">{j.location ?? '—'}</td>
                  <td className="p-4">{new Date(j.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {j.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleClose(j.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Close
                        </button>
                      )}
                      {j.status === 'closed' && (
                        <button
                          type="button"
                          onClick={() => handleReopen(j.id)}
                          className="text-sm text-green-600 hover:underline"
                        >
                          Reopen
                        </button>
                      )}
                      {j.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleReopen(j.id)}
                          className="text-sm text-green-600 hover:underline"
                        >
                          Resume
                        </button>
                      )}
                    </div>
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
