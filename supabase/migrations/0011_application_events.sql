-- Migration 0011 — application_events table for per-application activity logs
-- Stores every status change, note edit, and other meaningful actions

CREATE TABLE IF NOT EXISTS public.application_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    actor_id    uuid NOT NULL REFERENCES auth.users(id),
    event_type  text NOT NULL CHECK (event_type IN (
        'status_changed',
        'note_edited',
        'score_updated',
        'created'
    )),
    payload     jsonb DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_application_events_application
    ON public.application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_application_events_created_at
    ON public.application_events(created_at DESC);

-- RLS: company members can read events for their company's applications
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

-- Recruiter/company_admin policy: read events for applications linked to their company's jobs
CREATE POLICY "Company members can read application events"
    ON public.application_events FOR SELECT
    USING (
        application_id IN (
            SELECT id FROM public.applications
            WHERE job_id IN (
                SELECT id FROM public.jobs WHERE company_id = (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            )
        )
    );

-- Owner can insert events
CREATE POLICY "Company owners can insert application events"
    ON public.application_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_members cm
            JOIN profiles p ON p.id = cm.user_id
            WHERE cm.user_id = auth.uid()
              AND p.company_id IN (
                  SELECT company_id FROM public.jobs j2
                  JOIN public.applications a2 ON a2.job_id = j2.id
                  WHERE a2.id = application_id
              )
        )
    );
