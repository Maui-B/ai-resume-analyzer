import type { Route } from './+types/dashboard.applications';
import { useEffect, useState } from 'react';
import { listApplications, updateApplicationStatus } from '~/lib/services/applications';
import type { ApplicationStatus } from '../../types/index';

const COLUMNS: { key: ApplicationStatus; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
];

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function DashboardApplications() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);

  const refresh = async () => {
    setApplications(await listApplications());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const move = async (id: string, status: ApplicationStatus) => {
    await updateApplicationStatus(id, status);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="!text-3xl">Applications</h1>
      <p className="text-dark-200 text-sm">
        Drag-to-reorder comes in Stage 4. For now, use the buttons on each card to move it.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const items = applications.filter((a) => a.status === col.key);
          return (
            <div key={col.key} className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="!text-dark-200 text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-dark-200">{items.length}</span>
              </div>
              {items.map((a) => (
                <div key={a.id} className="bg-white rounded-xl p-3 shadow-sm text-sm">
                  <p className="font-mono text-xs text-dark-200">{a.id.slice(0, 8)}</p>
                  {a.match_score != null && (
                    <p className="font-semibold mt-1">Match: {a.match_score}/100</p>
                  )}
                  {a.notes && <p className="text-xs text-dark-200 mt-1">{a.notes}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {COLUMNS.filter((c) => c.key !== a.status).map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => move(a.id, c.key)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1"
                      >
                        → {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
