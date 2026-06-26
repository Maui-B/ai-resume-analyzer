import type { Route } from './+types/settings';
import { redirect, useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuthStore } from '~/lib/auth';
import { listMyResumes } from '~/lib/services/resumes';
import { listApplications } from '~/lib/services/applications';
import Navbar from '~/components/Navbar';

export const meta = () => [
  { title: 'Resumind | Settings' },
  { name: 'description', content: 'Account, data export, and delete.' },
];

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) throw redirect('/auth?next=/settings');
  return null;
}

export default function Settings() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [confirmStep, setConfirmStep] = useState(0); // 0=idle, 1=first confirm, 2=second confirm
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [resumes, applications] = await Promise.all([
        listMyResumes(),
        listApplications({ jobseekerId: user.id }),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: user,
        resumes,
        applications,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumind-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    // In Stage 1 we only stub this. Stage 2 wires Supabase auth.admin.deleteUser
    // via an Edge Function for proper cascade (auth.users → profiles → resumes → applications).
    await new Promise((r) => setTimeout(r, 400));
    await signOut();
    navigate('/auth', { replace: true });
    setDeleting(false);
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-12">
          <h1>Settings</h1>
        </div>
        <div className="w-full max-w-[640px] flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="!text-black mb-3">Account</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-dark-200">Email</dt>
              <dd>{user?.email ?? '—'}</dd>
              <dt className="text-dark-200">Name</dt>
              <dd>{user?.fullName ?? '—'}</dd>
              <dt className="text-dark-200">Role</dt>
              <dd className="capitalize">{(user?.role ?? 'unknown').replace('_', ' ')}</dd>
              <dt className="text-dark-200">User ID</dt>
              <dd className="font-mono text-xs">{user?.id}</dd>
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="!text-black">Data</h2>
            <p className="text-sm text-dark-200">
              Download everything we hold for you &mdash; resumes, applications, profile.
            </p>
            <button
              type="button"
              className="primary-button w-fit"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Preparing…' : 'Export my data'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="!text-black">Session</h2>
            <button type="button" className="primary-button w-fit" onClick={handleSignOut}>
              Sign out
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-200 flex flex-col gap-3">
            <h2 className="!text-black">Delete account</h2>
            <p className="text-sm text-dark-200">
              This permanently removes your profile, resumes, and applications. This action
              cannot be undone.
            </p>
            {confirmStep === 0 && (
              <button
                type="button"
                className="bg-red-600 text-white rounded-full px-4 py-2 w-fit"
                onClick={() => setConfirmStep(1)}
              >
                Delete my account…
              </button>
            )}
            {confirmStep === 1 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-700">Are you sure?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bg-red-600 text-white rounded-full px-4 py-2"
                    onClick={() => setConfirmStep(2)}
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    className="bg-gray-200 rounded-full px-4 py-2"
                    onClick={() => setConfirmStep(0)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {confirmStep === 2 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-700">
                  Final confirmation. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bg-red-700 text-white rounded-full px-4 py-2"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Permanently delete'}
                  </button>
                  <button
                    type="button"
                    className="bg-gray-200 rounded-full px-4 py-2"
                    onClick={() => setConfirmStep(0)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
