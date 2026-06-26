// types/index.d.ts
// App-level domain types + DB row types.

// =========================
// App-level types (camelCase, what components consume)
// =========================

interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
    createdAt?: string;
}

interface Feedback {
    overallScore: number;
    ATS: {
        score: number;
        tips: {
            type: 'good' | 'improve';
            tip: string;
        }[];
    };
    toneAndStyle: {
        score: number;
        tips: {
            type: 'good' | 'improve';
            tip: string;
            explanation: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: 'good' | 'improve';
            tip: string;
            explanation: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: 'good' | 'improve';
            tip: string;
            explanation: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: 'good' | 'improve';
            tip: string;
            explanation: string;
        }[];
    };
}

// =========================
// DB row types (snake_case, what the service layer returns from Supabase)
// =========================

type UserRole = 'jobseeker' | 'recruiter' | 'company_admin';
type JobStatus = 'draft' | 'open' | 'paused' | 'closed';
type ApplicationStatus =
    | 'submitted'
    | 'reviewed'
    | 'shortlisted'
    | 'interviewing'
    | 'rejected'
    | 'hired';

interface MatchFeedback {
    matchScore: number;
    missingSkills: string[];
    topStrengths: string[];
    concerns: string[];
    suggestions: string[];
}

interface ProfileRow {
    id: string;
    role: UserRole | null;
    full_name: string | null;
    company_id: string | null;
    created_at: string;
    updated_at: string;
}

interface CompanyRow {
    id: string;
    name: string;
    owner_id: string;
    website: string | null;
    created_at: string;
    updated_at: string;
}

interface CompanyMemberRow {
    company_id: string;
    user_id: string;
    member_role: 'owner' | 'recruiter';
    invited_at: string;
}

interface JobRow {
    id: string;
    company_id: string;
    posted_by: string;
    title: string;
    description: string | null;
    location: string | null;
    salary_min: number | null;
    salary_max: number | null;
    skills: string[];
    status: JobStatus;
    created_at: string;
    updated_at: string;
}

interface ApplicationRow {
    id: string;
    job_id: string;
    jobseeker_id: string;
    resume_id: string | null;
    status: ApplicationStatus;
    match_score: number | null;
    match_feedback: MatchFeedback | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface ResumeRow {
    id: string;
    user_id: string;
    job_title: string | null;
    company_name: string | null;
    job_description: string | null;
    image_path: string | null;
    resume_path: string | null;
    feedback: Feedback | null;
    created_at: string;
    updated_at: string;
}

// =========================
// Legacy Puter types — kept for back-compat until Stage 2 removes them.
// =========================

interface PuterUser {
    uuid: string;
    username: string;
    email_confirmed: boolean;
}

interface FSItem {
    id: string;
    name: string;
    path: string;
    size?: number;
    type?: 'file' | 'directory';
    created_at?: string;
    modified_at?: string;
    accessed_at?: string;
}

interface KVItem {
    key: string;
    value: string;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | ChatMessageContent[];
}

interface ChatMessageContent {
    type: 'text' | 'file';
    text?: string;
    puter_path?: string;
}

interface PuterChatOptions {
    model?: string;
    stream?: boolean;
}

interface AIResponse {
    message: {
        role: 'assistant';
        content: string | { type: string; text: string }[];
    };
}
