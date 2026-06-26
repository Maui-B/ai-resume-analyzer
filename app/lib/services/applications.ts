// app/lib/services/applications.ts

import { getSupabase } from '../supabase';
import { isDemoMode } from '../demo-mode';
import { mockApplications } from '../mock/applications';

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
    return data;
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
        })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

export async function updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string,
): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const update: Partial<ApplicationRow> = { status };
    if (notes !== undefined) update.notes = notes;
    const { error } = await supabase.from('applications').update(update).eq('id', id);
    if (error) throw error;
}
