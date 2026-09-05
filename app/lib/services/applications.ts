// app/lib/services/applications.ts

import { getSupabase } from '../supabase';
import { isDemoMode } from '../demo-mode';
import { mockApplications } from '../mock/applications';
import type { Json } from '../../../types/database';
import { sendStatusEmail } from '../email.service';
import { getProfile } from './profiles';

type SupabaseApplicationRow = {
    id: string;
    job_id: string;
    jobseeker_id: string;
    resume_id: string | null;
    status: ApplicationStatus;
    match_score: number | null;
    match_feedback: Json | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

function rowToApplication(row: SupabaseApplicationRow): ApplicationRow {
    return {
        id: row.id,
        job_id: row.job_id,
        jobseeker_id: row.jobseeker_id,
        resume_id: row.resume_id,
        status: row.status,
        match_score: row.match_score,
        match_feedback: row.match_feedback as MatchFeedback | null,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export interface ApplicationFilters {
    jobId?: string;
    jobseekerId?: string;
    status?: ApplicationStatus;
}

export async function listApplications(
    filters: ApplicationFilters = {},
): Promise<ApplicationRow[]> {
    if (isDemoMode()) {
        return mockApplications.filter(
            (a) =>
                (!filters.jobId || a.job_id === filters.jobId) &&
                (!filters.jobseekerId || a.jobseeker_id === filters.jobseekerId) &&
                (!filters.status || a.status === filters.status),
        );
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
    if (filters.jobId) query = query.eq('job_id', filters.jobId);
    if (filters.jobseekerId) query = query.eq('jobseeker_id', filters.jobseekerId);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
        return mockApplications.filter(
            (a) =>
                (!filters.jobId || a.job_id === filters.jobId) &&
                (!filters.jobseekerId || a.jobseeker_id === filters.jobseekerId) &&
                (!filters.status || a.status === filters.status),
        );
    }
    return data.map(rowToApplication);
}

export async function createApplication(input: {
    jobId: string;
    resumeId: string;
}): Promise<ApplicationRow> {
    if (isDemoMode()) {
        return {
            id: `app-${Date.now()}`,
            job_id: input.jobId,
            jobseeker_id: '11111111-1111-1111-1111-111111111111',
            resume_id: input.resumeId,
            status: 'submitted',
            match_score: null,
            match_feedback: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data, error } = await supabase
        .from('applications')
        .insert({
            job_id: input.jobId,
            jobseeker_id: user.id,
            resume_id: input.resumeId,
            status: 'submitted',
            match_score: null,
            match_feedback: null,
            notes: null,
        } as never)
        .select('*')
        .single();
    if (error) throw error;
    return rowToApplication(data);
}

export async function updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string,
): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // current user for audit trail
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // apply status/notes update
    const update: Partial<SupabaseApplicationRow> = { status };
    if (notes !== undefined) update.notes = notes;
    const { error } = await supabase.from('applications').update(update as never).eq('id', id);
    if (error) throw error;

    // record activity event — status change
    await recordActivity(supabase, user.id, id, 'status_changed', {
        new_status: status,
    });
    // If notes provided alongside status, also record note edit
    if (notes) {
        await recordActivity(supabase, user.id, id, 'note_edited', { notes });
    }

    // Send status email notification
    try {
        const { data: application } = await supabase
            .from('applications')
            .select('*, jobs(title), profiles(full_name, email)')
            .eq('id', id)
            .single();

        if (application?.profiles?.email) {
            const emailTemplateMap: Record<ApplicationStatus, EmailTemplate> = {
                submitted: 'application_submitted',
                reviewed: 'application_reviewed',
                shortlisted: 'application_shortlisted',
                interviewing: 'application_interviewing',
                rejected: 'application_rejected',
                hired: 'application_hired',
            };

            await sendStatusEmail(
                application.profiles.email,
                `Application Update: ${application.jobs?.title ?? 'Position'}`,
                emailTemplateMap[status],
                {
                    candidate_name: application.profiles.full_name ?? 'Candidate',
                    job_title: application.jobs?.title ?? 'the position',
                }
            );
        }
    } catch (emailError) {
        console.error('Failed to send status email:', emailError);
    }
}

// ── Activity Log Service ──────────────────────────────────────────────

export interface ActivityEvent {
    id: string;
    application_id: string;
    actor_id: string;
    event_type: 'status_changed' | 'note_edited' | 'score_updated' | 'created';
    payload: Record<string, unknown>;
    created_at: string;
}

async function recordActivity(
    supabase: ReturnType<typeof getSupabase>,
    actorId: string,
    applicationId: string,
    eventType: ActivityEvent['event_type'],
    payload: Record<string, unknown>,
): Promise<void> {
    try {
        await supabase
            .from('application_events')
            .insert({
                application_id: applicationId,
                actor_id: actorId,
                event_type: eventType,
                payload,
            } as never);
    } catch { /* non-critical — swallow errors */ }
}

/** Fetch all activity events for an application, newest first */
export async function listActivityEvents(
    applicationId: string,
): Promise<ActivityEvent[]> {
    if (isDemoMode()) return [];
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('application_events')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ActivityEvent[];
}
