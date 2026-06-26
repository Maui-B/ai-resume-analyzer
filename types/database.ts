// types/database.ts
// Supabase Database type — hand-written placeholder for typecheck.
// Regenerate with: npx supabase gen types typescript --local > types/database.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

type UserRoleDb = 'jobseeker' | 'recruiter' | 'company_admin';
type JobStatusDb = 'draft' | 'open' | 'paused' | 'closed';
type ApplicationStatusDb =
    | 'submitted'
    | 'reviewed'
    | 'shortlisted'
    | 'interviewing'
    | 'rejected'
    | 'hired';

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    role: UserRoleDb | null;
                    full_name: string | null;
                    company_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    role?: UserRoleDb | null;
                    full_name?: string | null;
                    company_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<{
                    id: string;
                    role: UserRoleDb | null;
                    full_name: string | null;
                    company_id: string | null;
                    created_at: string;
                    updated_at: string;
                }>;
                Relationships: [];
            };
            companies: {
                Row: {
                    id: string;
                    name: string;
                    owner_id: string;
                    website: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    owner_id: string;
                    website?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<{
                    id: string;
                    name: string;
                    owner_id: string;
                    website: string | null;
                    created_at: string;
                    updated_at: string;
                }>;
                Relationships: [];
            };
            company_members: {
                Row: {
                    company_id: string;
                    user_id: string;
                    member_role: 'owner' | 'recruiter';
                    invited_at: string;
                };
                Insert: {
                    company_id: string;
                    user_id: string;
                    member_role?: 'owner' | 'recruiter';
                    invited_at?: string;
                };
                Update: Partial<{
                    company_id: string;
                    user_id: string;
                    member_role: 'owner' | 'recruiter';
                    invited_at: string;
                }>;
                Relationships: [];
            };
            resumes: {
                Row: {
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
                Insert: Omit<
                    Database['public']['Tables']['resumes']['Row'],
                    'id' | 'created_at' | 'updated_at'
                > & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['resumes']['Insert']>;
                Relationships: [];
            };
            jobs: {
                Row: {
                    id: string;
                    company_id: string;
                    posted_by: string;
                    title: string;
                    description: string | null;
                    location: string | null;
                    salary_min: number | null;
                    salary_max: number | null;
                    skills: string[];
                    status: JobStatusDb;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<
                    Database['public']['Tables']['jobs']['Row'],
                    'id' | 'created_at' | 'updated_at'
                > & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
                Relationships: [];
            };
            applications: {
                Row: {
                    id: string;
                    job_id: string;
                    jobseeker_id: string;
                    resume_id: string | null;
                    status: ApplicationStatusDb;
                    match_score: number | null;
                    match_feedback: Json | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<
                    Database['public']['Tables']['applications']['Row'],
                    'id' | 'created_at' | 'updated_at'
                > & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['applications']['Insert']>;
                Relationships: [];
            };
            mock_seeded: {
                Row: {
                    id: boolean;
                    seeded_at: string;
                    seed_version: number;
                };
                Insert: {
                    id?: boolean;
                    seeded_at?: string;
                    seed_version?: number;
                };
                Update: Partial<{
                    id: boolean;
                    seeded_at: string;
                    seed_version: number;
                }>;
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: {
            is_company_member: {
                Args: { c_id: string; u_id: string };
                Returns: boolean;
            };
            is_company_recruiter: {
                Args: { c_id: string; u_id: string };
                Returns: boolean;
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}
