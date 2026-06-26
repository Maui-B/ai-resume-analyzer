// app/lib/services/jobs.ts

import { getSupabase } from '../supabase';
import { isDemoMode } from '../demo-mode';
import { mockJobs } from '../mock/jobs';

export interface JobFilters {
    status?: JobStatus;
    companyId?: string;
}

export async function listJobs(filters: JobFilters = {}): Promise<JobRow[]> {
    if (isDemoMode()) {
        return mockJobs.filter((j) => (filters.status ? j.status === filters.status : true));
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.companyId) query = query.eq('company_id', filters.companyId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
        // empty → fall back to mock for demo polish
        return mockJobs.filter((j) => (filters.status ? j.status === filters.status : true));
    }
    return data;
}

export async function getJob(id: string): Promise<JobRow | null> {
    if (isDemoMode()) {
        return mockJobs.find((j) => j.id === id) ?? null;
    }
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ?? mockJobs.find((j) => j.id === id) ?? null;
}

export async function createJob(input: {
    title: string;
    description: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    skills?: string[];
}): Promise<JobRow> {
    if (isDemoMode()) {
        return {
            id: `job-${Date.now()}`,
            company_id: '33333333-3333-3333-3333-333333333333',
            posted_by: '22222222-2222-2222-2222-222222222222',
            title: input.title,
            description: input.description,
            location: input.location ?? null,
            salary_min: input.salaryMin ?? null,
            salary_max: input.salaryMax ?? null,
            skills: input.skills ?? [],
            status: 'open',
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
    if (!profile?.company_id) throw new Error('User is not linked to a company');
    const { data, error } = await supabase
        .from('jobs')
        .insert({
            company_id: profile.company_id,
            posted_by: user.id,
            title: input.title,
            description: input.description,
            location: input.location ?? null,
            salary_min: input.salaryMin ?? null,
            salary_max: input.salaryMax ?? null,
            skills: input.skills ?? [],
            status: 'open',
        })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) throw error;
}
