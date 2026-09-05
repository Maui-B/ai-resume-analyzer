import type { Route } from './+types/dashboard.team';
import { useCallback, useEffect, useState } from 'react';
import {
  listCompanyMembers,
  inviteToCompany,
  updateMemberRole,
  deactivateMember,
  type CompanyMemberRow,
} from '~/lib/services/companies';
import { useAuthStore } from '~/lib/auth';

interface InviteState {
  email: string;
  sending: boolean;
  result: 'idle' | 'ok' | 'error';
  error?: string;
}

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function DashboardTeam() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteState>({
    email: '',
    sending: false,
    result: 'idle',
  });

  const refresh = useCallback(async () => {
    try {
      const ms = await listCompanyMembers();
      setMembers(ms);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Invite handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.email.trim()) return;
    setInvite((prev) => ({ ...prev, sending: true, result: 'idle' }));
    const res = await inviteToCompany(invite.email.trim(), 'recruiter');
    setInvite({ email: '', sending: false, result: res.success ? 'ok' : 'error', error: res.error });
    if (res.success) await refresh();
  };

  // Deactivate
  const handleDeactivate = async (userId: string) => {
    if (!confirm('Remove this member from the company?')) return;
    try {
      await deactivateMember(userId);
      await refresh();
    } catch {
      alert('Failed to remove member.');
    }
  };

  // Role change
  const handleRoleChange = async (userId: string, newRole: 'owner' | 'recruiter') => {
    try {
      await updateMemberRole(userId, newRole);
      await refresh();
    } catch {
      alert('Failed to update role.');
    }
  };

  const isCurrentUserAdmin =
    user?.role === 'company_admin' || user?.role === 'recruiter';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="!text-3xl">Team Management</h1>
      </div>

      {/* ── Invite section ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="!text-lg font-semibold mb-3">Invite a team member</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-dark-200">Email address</span>
            <input
              type="email"
              value={invite.email}
              onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
              placeholder="recruiter@example.com"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72"
              disabled={invite.sending}
            />
          </label>
          <button
            type="submit"
            disabled={invite.sending || !invite.email.trim()}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {invite.sending ? 'Sending…' : 'Invite'}
          </button>
          {invite.result === 'ok' && (
            <span className="text-xs text-green-600 font-medium">✓ Invite sent successfully</span>
          )}
          {invite.result === 'error' && (
            <span className="text-xs text-red-600">{invite.error}</span>
          )}
        </form>
      </section>

      {/* ── Members table ──────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="!text-lg font-semibold mb-4">
          Current members ({members.length})
        </h2>
        {loading ? (
          <p className="text-xs text-dark-200">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-xs text-dark-200">No team members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-dark-200">
                  <th className="text-left pb-2 pr-4 font-medium">Name</th>
                  <th className="text-left pb-2 pr-4 font-medium">Email</th>
                  <th className="text-left pb-2 pr-4 font-medium">Role</th>
                  <th className="text-left pb-2 pr-4 font-medium">Joined</th>
                  <th className="text-left pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isOwner = m.member_role === 'owner';
                  return (
                    <tr key={m.user_id} className="border-b last:border-0 hover:bg-gray-50 transition">
                      <td className="py-2.5 pr-4 truncate max-w-[150px]">
                        {m.full_name ?? '—'}
                        {isOwner && (
                          <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            Owner
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-dark-200 truncate max-w-[200px]">
                        {m.email ?? '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <select
                          value={m.member_role}
                          disabled={isOwner}
                          onChange={(e) => handleRoleChange(m.user_id, e.target.value as 'owner' | 'recruiter')}
                          className={`text-xs rounded-md border px-2 py-1 ${
                            isOwner ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                        >
                          <option value="recruiter">Recruiter</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>
                      <td className="py-2.5 pr-4 text-dark-200 text-xs">
                        {new Date(m.invited_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
                        {!isOwner && (
                          <button
                            onClick={() => handleDeactivate(m.user_id)}
                            className="text-xs text-red-500 hover:text-red-700 underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
