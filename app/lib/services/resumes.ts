// app/lib/services/resumes.ts

import { getSupabase, getCurrentUserId } from '../supabase';
import { isDemoMode } from '../demo-mode';
import { mockResumes } from '../mock/resumes';
import type { Json } from '../../../types/database';

export interface ResumeVersion {
    id: string;
    resumeId: string;
    versionNumber: number;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
    createdAt: string;
}

type SupabaseResumeRow = {
    id: string;
    user_id: string;
    job_title: string | null;
    company_name: string | null;
    job_description: string | null;
    image_path: string | null;
    resume_path: string | null;
    feedback: Json | null;
    created_at: string;
    updated_at: string;
};

function rowToResume(row: SupabaseResumeRow): Resume {
    return {
        id: row.id,
        companyName: row.company_name ?? undefined,
        jobTitle: row.job_title ?? undefined,
        imagePath: row.image_path ?? '',
        resumePath: row.resume_path ?? '',
        feedback: (row.feedback as Feedback | null) ?? ({ overallScore: 0, ATS: { score: 0, tips: [] }, toneAndStyle: { score: 0, tips: [] }, content: { score: 0, tips: [] }, structure: { score: 0, tips: [] }, skills: { score: 0, tips: [] } } as Feedback),
        createdAt: row.created_at,
    };
}

export async function listMyResumes(): Promise<Resume[]> {
    if (isDemoMode()) return mockResumes;
    const supabase = getSupabase();
    if (!supabase) return mockResumes;
    const userId = await getCurrentUserId();
    if (!userId) return mockResumes;
    const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return mockResumes; // empty DB → fallback
    return data.map(rowToResume);
}

export async function getResume(id: string): Promise<Resume | null> {
    if (isDemoMode()) {
        return mockResumes.find((r) => r.id === id) ?? null;
    }
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    if (!data) {
        // Fall back to mock for demo feel
        return mockResumes.find((r) => r.id === id) ?? null;
    }
    return rowToResume(data);
}

export async function createResume(input: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    imagePath: string;
    resumePath: string;
}): Promise<Resume> {
    if (isDemoMode()) {
        return {
            id: `res-${Date.now()}`,
            ...input,
            feedback: { overallScore: 0, ATS: { score: 0, tips: [] }, toneAndStyle: { score: 0, tips: [] }, content: { score: 0, tips: [] }, structure: { score: 0, tips: [] }, skills: { score: 0, tips: [] } },
            createdAt: new Date().toISOString(),
        };
    }
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data, error } = await supabase
        .from('resumes')
        .insert({
            user_id: user.id,
            job_title: input.jobTitle,
            company_name: input.companyName,
            job_description: input.jobDescription,
            image_path: input.imagePath,
            resume_path: input.resumePath,
            feedback: null,
        } as never)
        .select('*')
        .single();
    if (error) throw error;
    return rowToResume(data);
}

export async function updateResumeFeedback(id: string, feedback: Feedback): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    
    // Update the current resume's feedback
    // In production, we'd call a database function to create versions
    const { error } = await supabase.from('resumes').update({ 
        feedback: feedback as unknown as Json 
    }).eq('id', id);
    
    if (error) throw error;
}

export async function getResumeVersions(resumeId: string): Promise<ResumeVersion[]> {
    if (isDemoMode()) {
        // In demo mode, return a mock version history
        return [];
    }
    
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('resume_versions')
        .select('*')
        .eq('resume_id', resumeId)
        .order('version_number', { ascending: false });
        
    if (error) throw error;
    if (!data) return [];
    
    // Type assertion needed for now since we're using the raw row type
    return data as unknown as ResumeVersion[];
}

export async function deleteResume(id: string): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) throw error;
}
