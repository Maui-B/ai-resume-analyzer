// app/lib/mock/resumes.ts
// 3 sample resumes for the demo jobseeker. Includes full AI feedback JSON so
// the dashboard renders meaningfully.

const feedbackSenior: Feedback = {
    overallScore: 84,
    ATS: {
        score: 88,
        tips: [
            { type: 'good', tip: 'Clear section headers match common ATS parsers.' },
            { type: 'improve', tip: 'Add more role-specific keywords near the top.' },
        ],
    },
    toneAndStyle: {
        score: 82,
        tips: [
            {
                type: 'good',
                tip: 'Confident, action-oriented language throughout.',
                explanation: 'Verbs like "led", "shipped", "owned" appear in most bullets.',
            },
        ],
    },
    content: {
        score: 86,
        tips: [
            {
                type: 'good',
                tip: 'Quantified impact on three of five recent roles.',
                explanation: 'Concrete numbers (%, $, ms) help the AI evaluator score you higher.',
            },
            {
                type: 'improve',
                tip: 'Trim the 2018 internship — keep last 5 years only.',
                explanation: 'Recruiters skim; ancient context dilutes your strongest story.',
            },
        ],
    },
    structure: {
        score: 78,
        tips: [
            {
                type: 'improve',
                tip: 'Add a 2-line summary at the top.',
                explanation: 'A summary gives the recruiter a hook before they skim your history.',
            },
        ],
    },
    skills: {
        score: 90,
        tips: [
            { type: 'good', tip: 'React + TypeScript + Supabase stack aligns well with target role.', explanation: 'The required skills list explicitly mentions React and Supabase — your resume covers both.' },
        ],
    },
};

const feedbackFullstack: Feedback = {
    overallScore: 71,
    ATS: {
        score: 70,
        tips: [
            { type: 'improve', tip: 'PDF was scanned — text extraction was lossy.' },
        ],
    },
    toneAndStyle: {
        score: 74,
        tips: [
            { type: 'good', tip: 'Consistent voice across roles.', explanation: 'Your bullet points use parallel verb forms, which reads well to both humans and ATS parsers.' },
        ],
    },
    content: {
        score: 70,
        tips: [
            {
                type: 'improve',
                tip: 'Add a project section. Right now it reads like a job list.',
                explanation: 'Side projects signal initiative and let you showcase newer skills.',
            },
        ],
    },
    structure: {
        score: 73,
        tips: [
            { type: 'improve', tip: 'Skills section is buried mid-page; move it higher.', explanation: 'Recruiters scan top-down; skills near the top get more attention in the first 6 seconds.' },
        ],
    },
    skills: {
        score: 68,
        tips: [
            { type: 'improve', tip: 'Mention testing frameworks — Cypress/Playwright.', explanation: 'Testing is an implicit requirement for full-stack roles; listing it signals maturity.' },
        ],
    },
};

const feedbackJunior: Feedback = {
    overallScore: 62,
    ATS: {
        score: 60,
        tips: [
            { type: 'improve', tip: 'Single-column layout works; consider adding a skills column.' },
        ],
    },
    toneAndStyle: {
        score: 70,
        tips: [
            { type: 'good', tip: 'Friendly, human voice — appropriate for junior roles.', explanation: 'A conversational tone signals cultural fit at startups and small teams.' },
        ],
    },
    content: {
        score: 58,
        tips: [
            {
                type: 'improve',
                tip: 'Lead each bullet with the impact, not the task.',
                explanation: '“Reduced p99 latency by 40%” beats “Worked on the latency project”.',
            },
        ],
    },
    structure: {
        score: 65,
        tips: [
            { type: 'good', tip: 'Education is well placed at the bottom.', explanation: 'For junior devs, education anchors the story while experience sections build upward.' },
        ],
    },
    skills: {
        score: 58,
        tips: [
            { type: 'improve', tip: 'List specific libraries, not just "React".', explanation: '"React, Redux, React Query, Next.js" is far more searchable than just "React".' },
        ],
    },
};

export const mockResumes: Resume[] = [
    {
        id: 'res-demo-001',
        companyName: 'Acme Talent Co.',
        jobTitle: 'Senior Frontend Engineer',
        imagePath: '/images/resume_01.png',
        resumePath: '/images/resume_01.png',
        feedback: feedbackSenior,
        createdAt: '2026-06-10T08:00:00Z',
    },
    {
        id: 'res-demo-002',
        companyName: 'BetaWorks',
        jobTitle: 'Full-Stack Developer',
        imagePath: '/images/resume_02.png',
        resumePath: '/images/resume_02.png',
        feedback: feedbackFullstack,
        createdAt: '2026-06-15T08:00:00Z',
    },
    {
        id: 'res-demo-003',
        companyName: 'Various',
        jobTitle: 'Junior Developer',
        imagePath: '/images/resume_03.png',
        resumePath: '/images/resume_03.png',
        feedback: feedbackJunior,
        createdAt: '2026-06-18T08:00:00Z',
    },
];
