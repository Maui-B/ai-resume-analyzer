import type { Route } from './+types/dashboard.applications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listApplications, updateApplicationStatus } from '~/lib/services/applications';
import { getJob } from '~/lib/services/jobs';
import { listMyResumes } from '~/lib/services/resumes';
import { getMyProfile } from '~/lib/services/profiles';
import ActivityLogModal from '~/components/ActivityLogModal';

// ── types ───────────────────────────────────────────────────────────────
type SortBy = 'matchScore' | 'createdAt' | 'status';

interface CandidateMeta {
  job?: JobRow;
  resume?: Resume;
  profile?: { fullName: string | null; email: string | null };
}

// ── constants ───────────────────────────────────────────────────────────
const COLUMNS: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  { key: 'reviewed', label: 'Reviewed', color: 'bg-purple-100 text-purple-800' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-green-100 text-green-800' },
  { key: 'interviewing', label: 'Interviewing', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'hired', label: 'Hired', color: 'bg-teal-100 text-teal-800' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

const MASKED_NAME = '🔒 Masked';

// ── helpers ─────────────────────────────────────────────────────────────
function scoreBadge(score: number): string {
  if (score > 70) return 'bg-badge-green text-green-600';
  if (score > 49) return 'bg-badge-yellow text-yellow-600';
  return 'bg-badge-red text-red-600';
}

// ── component ───────────────────────────────────────────────────────────
export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function DashboardApplications() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobRow>>({});
  const [resumes, setResumes] = useState<Record<string, Resume>>({});
  const [profiles, setProfiles] = useState<Record<string, { fullName: string | null; email: string | null }>>({});

  // Feature 1 — sorting
  const [sortBy, setSortBy] = useState<SortBy>('matchScore');
  // Feature 2 — anonymity toggle
  const [revealIdentities, setRevealIdentities] = useState(false);
  // Feature 3 — bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Feature 4 — inline notes editing
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  // Feature 4b — activity log modal
  const [viewingActivityFor, setViewingActivityFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const apps = await listApplications();
    setApplications(apps);

    const jobIds = Array.from(new Set(apps.map((a) => a.job_id)));
    const resumeIds = Array.from(new Set(apps.map((a) => a.resume_id).filter(Boolean as unknown as string)));
    const seekerIds = Array.from(new Set(apps.map((a) => a.jobseeker_id)));

    const jobMap: Record<string, JobRow> = {};
    const resumeMap: Record<string, Resume> = {};
    const profileMap: Record<string, { fullName: string | null; email: string | null }> = {};

    // fetch jobs
    await Promise.all(
      jobIds.map(async (id) => {
        try {
          const j = await getJob(id);
          if (j) jobMap[id] = j;
        } catch { /* ignore */ }
      }),
    );

    // fetch resumes
    await Promise.all(
      resumeIds.map(async (id) => {
        try {
          const rr = await listMyResumes();
          const r = rr.find((x) => x.id === id);
          if (r) resumeMap[id] = r;
        } catch { /* ignore */ }
      }),
    );

    // fetch profiles for all seekers
    let myProfile: { fullName: string | null; email: string | null } | null = null;
    try {
      myProfile = await getMyProfile();
    } catch { /* ignore */ }
    if (myProfile) {
      seekerIds.forEach((id) => {
        profileMap[id] = myProfile!;
      });
    }

    setJobs(jobMap);
    setResumes(resumeMap);
    setProfiles(profileMap);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Feature 1 — sorted array
  const sortedApps = useMemo(() => {
    const sorted = [...applications].sort((a, b) => {
      if (sortBy === 'matchScore') {
        const sa = a.match_score ?? -1;
        const sb = b.match_score ?? -1;
        return sb - sa; // highest first
      }
      if (sortBy === 'createdAt') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
    return sorted;
  }, [applications, sortBy]);

  // Group into columns while keeping sort order within each column
  const columnsWithItems = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      items: sortedApps.filter((a) => a.status === col.key),
    }));
  }, [sortedApps]);

  // Identify top match (highest match_score)
  const topMatchId = useMemo(() => {
    let bestId: string | null = null;
    let bestScore = -1;
    applications.forEach((a) => {
      const s = a.match_score ?? -1;
      if (s > bestScore) { bestScore = s; bestId = a.id; }
    });
    return bestId;
  }, [applications]);

  // Move handler (status change)
  const move = async (id: string, status: ApplicationStatus) => {
    // include current note if being edited
    const currentNote = noteEditingId === id ? noteDraft : undefined;
    await updateApplicationStatus(id, status, currentNote);
    await refresh();
    setNoteEditingId(null);
    setNoteDraft('');
  };

  // Inline notes
  const startEditNote = (app: ApplicationRow) => {
    setNoteEditingId(app.id);
    setNoteDraft(app.notes ?? '');
  };
  const saveNote = async (id: string) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    await updateApplicationStatus(id, app.status, noteDraft);
    await refresh();
    setNoteEditingId(null);
    setNoteDraft('');
  };
  const cancelEditNote = () => {
    setNoteEditingId(null);
    setNoteDraft('');
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllInColumn = (items: ApplicationRow[], check: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      items.forEach((a) => { if (check) next.add(a.id); else next.delete(a.id); });
      return next;
    });
  };
  const selectAllVisible = (check: boolean) => {
    if (check) setSelectedIds(new Set(sortedApps.map((a) => a.id)));
    else setSelectedIds(new Set());
  };
  const allInColumnSelected = (items: ApplicationRow[]) =>
    items.length > 0 && items.every((a) => selectedIds.has(a.id));

  // Feature 3 — bulk action
  const doBulkAction = async (action: 'shortlist' | 'reject') => {
    const targetStatus = action === 'shortlist' ? ('shortlisted' as ApplicationStatus) : ('rejected' as ApplicationStatus);
    const selectedApps = applications.filter((a) => selectedIds.has(a.id));
    for (const app of selectedApps) {
      try {
        await updateApplicationStatus(
          app.id,
          targetStatus,
          `Bulk ${action}: applied via bulk action (${selectedApps.length} candidates).`,
        );
      } catch { /* continue on error */ }
    }
    setSelectedIds(new Set());
    await refresh();
  };

  // ── render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="!text-3xl">Applications</h1>
        <div className="flex items-center gap-3 text-sm text-dark-200">
          <span>{applications.length} total applications</span>

          {/* feature 2 — reveal identities toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={revealIdentities}
              onChange={(e) => setRevealIdentities(e.target.checked)}
              className="rounded border-gray-300 accent-blue-600"
            />
            <span>Reveal identities</span>
          </label>

          {/* feature 1 — sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-xs"
          >
            <option value="matchScore">Sort: Match Score ↓</option>
            <option value="createdAt">Sort: Newest First</option>
            <option value="status">Sort: By Status</option>
          </select>
        </div>
      </div>

      {/* anonymised warning banner */}
      {!revealIdentities && (
        <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          🔒 Anonymised view — enable &ldquo;Reveal identities&rdquo; to see names and emails.
        </p>
      )}

      {/* ── Bulk-action toolbar ─────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => doBulkAction('shortlist')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
          >
            ✓ Shortlist all
          </button>
          <button
            onClick={() => doBulkAction('reject')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
          >
            ✕ Reject all
          </button>
          <button
            onClick={() => selectAllVisible(false)}
            className="ml-auto text-xs underline text-indigo-600"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* ── Kanban board ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {columnsWithItems.map((col) => {
          const anyInColSelected = allInColumnSelected(col.items);
          return (
            <div key={col.key} className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-2">
              {/* Column header */}
              <div className="flex justify-between items-center">
                <h3 className={`!text-dark-200 text-sm font-semibold ${col.color}`}>
                  {col.label}
                </h3>
                <span className="text-xs text-dark-200">{col.items.length}</span>
              </div>

              {/* Column-level select checkbox (when bulk mode active) */}
              {selectedIds.size > 0 && col.items.length > 0 && (
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anyInColSelected}
                    onChange={(e) => selectAllInColumn(col.items, e.target.checked)}
                    className="rounded border-gray-300 accent-blue-600"
                  />
                  <span className="text-[10px] text-dark-200">all</span>
                </label>
              )}

              {/* Cards */}
              {col.items.map((a) => {
                const job = jobs[a.job_id];
                const resume = resumes[a.resume_id || ''];
                const profile = profiles[a.jobseeker_id];
                const isTop = a.id === topMatchId;
                const isSelected = selectedIds.has(a.id);
                const isEditing = noteEditingId === a.id;

                return (
                  <div
                    key={a.id}
                    className={`relative bg-white rounded-xl p-3 shadow-sm text-xs transition-all ${
                      isTop ? 'ring-2 ring-green-400' : ''
                    } ${isSelected ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}`}
                  >
                    {/* Top-match badge */}
                    {isTop && a.match_score != null && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">
                        ★ {a.match_score}%
                      </span>
                    )}

                    {/* Selection checkbox */}
                    <label className="flex items-start gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(a.id)}
                        className="mt-0.5 rounded border-gray-300 accent-blue-600"
                      />
                      <span className="font-mono text-[10px] text-dark-200 flex-1 truncate">
                        {a.id.slice(0, 8)}
                      </span>
                    </label>

                    {/* Status chip */}
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${statusColor(a.status)} mb-1`}>
                      {COLUMNS.find((c) => c.key === a.status)?.label ?? a.status}
                    </span>

                    {/* Job title */}
                    {job && (
                      <div className="mt-1">
                        <p className="font-semibold text-xs truncate">{job.title}</p>
                      </div>
                    )}

                    {/* Candidate info — anonymised or revealed */}
                    {!revealIdentities ? (
                      <div className="mt-1 opacity-50">
                        <p className="text-[10px] text-dark-200">{MASKED_NAME}</p>
                        <p className="text-[9px] text-dark-200">email hidden</p>
                      </div>
                    ) : (
                      <>
                        {(resume?.jobTitle || resume?.companyName) && (
                          <div className="mt-1">
                            {resume?.jobTitle && <p className="text-[10px] truncate">{resume.jobTitle}</p>}
                            {resume?.companyName && <p className="text-[10px] text-dark-200 truncate">{resume.companyName}</p>}
                          </div>
                        )}
                        {profile && (profile.fullName || profile.email) && (
                          <div className="mt-1 text-[10px] space-y-0.5">
                            {profile.fullName && <p className="truncate">👤 {profile.fullName}</p>}
                            {profile.email && <p className="truncate text-dark-200">✉️ {profile.email}</p>}
                          </div>
                        )}
                      </>
                    )}

                    {/* Match score */}
                    {a.match_score != null && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] font-semibold">Match:</span>
                        <span className={`text-[10px] font-bold px-1 rounded ${scoreBadge(a.match_score)}`}>
                          {a.match_score}/100
                        </span>
                      </div>
                    )}

                    {/* Feature 4 — Notes / inline edit */}
                    {isEditing ? (
                      <div className="mt-1 flex flex-col gap-1">
                        <textarea
                          rows={2}
                          className="text-[10px] resize-none border rounded p-1 w-full"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) saveNote(a.id); }}
                          placeholder="Add a note… (⌘+Enter to save)"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveNote(a.id)}
                            className="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditNote}
                            className="text-[10px] px-2 py-0.5 bg-gray-200 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {a.notes ? (
                          <div
                            className="mt-1 text-[10px] text-dark-200 truncate cursor-pointer hover:underline"
                            title={a.notes}
                            onClick={() => startEditNote(a)}
                          >
                            📝 {a.notes}
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditNote(a)}
                            className="mt-1 text-[10px] text-blue-500 underline"
                          >
                            + Add note
                          </button>
                        )}
                        {/* Activity log link */}
                        <button
                          type="button"
                          onClick={() => setViewingActivityFor(a.id)}
                          className="mt-1 text-[10px] text-gray-400 hover:text-blue-500 underline"
                          title="View activity history"
                        >
                          🕒 History
                        </button>
                      </>
                    )}

                    {/* Move buttons */}
                    <div className="flex flex-wrap gap-0.5 mt-2">
                      {COLUMNS.filter((c) => c.key !== a.status).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => move(a.id, c.key)}
                          className="text-[9px] bg-gray-100 hover:bg-gray-200 rounded px-1.5 py-0.5 transition"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Activity log modal */}
      {viewingActivityFor && (
        <ActivityLogModal applicationId={viewingActivityFor} onClose={() => setViewingActivityFor(null)} />
      )}
    </div>
  );
}

function statusColor(status: ApplicationStatus): string {
  return COLUMNS.find((c) => c.key === status)?.color ?? '';
}
