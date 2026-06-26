import type { Route } from './+types/dashboard._index';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '~/lib/auth';
import { listJobs } from '~/lib/services/jobs';
import { listApplications } from '~/lib/services/applications';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function DashboardHome() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);

  useEffect(() => {
    void listJobs().then(setJobs);
    void listApplications().then(setApplications);
  }, []);

  const openJobs = jobs.filter((j) => j.status === 'open').length;
  const newApplications = applications.filter(
    (a) => Date.now() - new Date(a.created_at).getTime() < 7 * 24 * 3600 * 1000,
  ).length;
  const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;

  return (
    <div className="flex flex-col gap-8">
      <div className="page-heading items-start">
        <h1 className="!text-4xl">Welcome back{user?.fullName ? `, ${user.fullName}` : ''}</h1>
        <h2>Here&apos;s what&apos;s happening with your roles.</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Open jobs" value={openJobs} to="/dashboard/jobs" />
        <KpiCard label="New applications (7d)" value={newApplications} to="/dashboard/applications" />
        <KpiCard label="Shortlisted" value={shortlisted} to="/dashboard/applications" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="!text-black">Recent applications</h2>
          <Link to="/dashboard/applications" className="text-sm text-blue-600">
            View all →
          </Link>
        </div>
        {applications.length === 0 ? (
          <p className="text-dark-200 text-sm">No applications yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {applications.slice(0, 5).map((a) => (
              <li key={a.id} className="py-3 flex justify-between text-sm">
                <span className="font-mono">{a.id.slice(0, 8)}</span>
                <span className="capitalize">{a.status}</span>
                <span>{a.match_score != null ? `${a.match_score}/100` : '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col gap-2"
    >
      <span className="text-sm text-dark-200">{label}</span>
      <span className="text-4xl font-bold">{value}</span>
    </Link>
  );
}
