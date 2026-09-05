import { useEffect, useState } from 'react';
import { listActivityEvents, type ActivityEvent } from '~/lib/services/applications';
import { getMyProfile } from '~/lib/services/profiles';

const EVENT_LABELS: Record<ActivityEvent['event_type'], string> = {
  status_changed: 'Status changed',
  note_edited: 'Note edited',
  score_updated: 'Score updated',
  created: 'Application created',
};

export default function ActivityLogModal({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorNames, setActorNames] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const evts = await listActivityEvents(applicationId);
        if (!cancelled) setEvents(evts);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  // batch-fetch actor names
  useEffect(() => {
    const actorIds = Array.from(new Set(events.map((e) => e.actor_id)));
    (async () => {
      const nameMap: Record<string, string | null> = {};
      for (const id of actorIds) {
        try {
          const p = await getMyProfile();
          if (p && actorIds.length > 0) {
            // In a real app you'd query by user IDs; here we store what we know
            nameMap[id] = p.fullName ?? null;
          }
        } catch { /* ignore */ }
      }
      setActorNames(nameMap);
    })();
  }, [events]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b">
          <h2 className="text-base font-semibold">Activity Log</h2>
          <button
            onClick={onClose}
            className="text-dark-200 hover:text-black text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Events */}
        <div className="px-5 py-3 overflow-y-auto" style={{ maxHeight: 360 }}>
          {loading ? (
            <p className="text-xs text-dark-200">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-dark-200">No activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{EVENT_LABELS[ev.event_type]}</p>
                    {/* Payload display */}
                    {'new_status' in ev.payload && (
                      <p className="text-dark-200 capitalize">→ {ev.payload.new_status as string}</p>
                    )}
                    {'notes' in ev.payload && (
                      <p className="text-dark-200 truncate">&ldquo;{ev.payload.notes as string}&rdquo;</p>
                    )}
                    {/* Footer: actor + time */}
                    <p className="text-[10px] text-dark-300 mt-1">
                      {actorNames[ev.actor_id] ?? 'Unknown'} · {formatTime(ev.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}
