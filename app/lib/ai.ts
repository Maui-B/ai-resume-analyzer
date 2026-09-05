// app/lib/ai.ts
// AI wrapper. Stage 2: routed through Supabase Edge Functions.

import { env } from './env';
import { prepareInstructions } from '../../constants';
import type { MatchFeedback } from '../services/applications';

interface AIResult {
    feedback: Feedback;
}

/** Analyse a resume against a job description. Returns the structured feedback. */
export async function analyzeResume(input: {
    resumePath: string;
    jobTitle: string;
    jobDescription: string;
}): Promise<AIResult | null> {
    // Call the Supabase Edge Function for AI feedback
    const response = await fetch('/ai-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            resumePath: input.resumePath,
            jobTitle: input.jobTitle,
            jobDescription: input.jobDescription,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('AI analysis error:', errorData);
        throw new Error(errorData.error || 'AI analysis failed');
    }

    const result = await response.json();
    return { feedback: result.feedback };
}

/** Get match score for a job/resume pair. */
export async function getMatchScore(input: {
    jobId: string;
    resumeId: string;
}): Promise<MatchFeedback | null> {
    const response = await fetch('/match-score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jobId: input.jobId,
            resumeId: input.resumeId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Match score error:', errorData);
        throw new Error(errorData.error || 'Match score calculation failed');
    }

    const result = await response.json();
    return result.matchFeedback;
}
